import { SlackClient } from './slack-client.js';
import { ConsoleWrapper, createClaudeFlowWrapper } from './console-wrapper.js';
import { OutputBuffer } from './buffer.js';
import { InputDetector } from './input-detector.js';
import { FileHandler } from './file-handler.js';
import {
  parseCommand,
  isCommand,
  getCommandHelp,
  formatCommandForClaude,
  isValidClaudeCommand,
} from './command-parser.js';
import {
  isKeyCommand,
  parseKeyCommand,
  getKeySequence,
  getKeyHelp,
} from './key-handler.js';
import { SlackConfig, SlackFileUpload } from './types.js';

export interface SessionConfig {
  slack: SlackConfig;
  objective: string;
  cwd?: string;
  additionalArgs?: string[];
}

export class Session {
  private slackClient: SlackClient;
  private consoleWrapper: ConsoleWrapper | null = null;
  private outputBuffer: OutputBuffer;
  private inputDetector: InputDetector;
  private fileHandler: FileHandler;
  private config: SessionConfig;
  private isStarted: boolean = false;

  constructor(config: SessionConfig) {
    this.config = config;
    this.slackClient = new SlackClient(config.slack, config.objective);
    this.inputDetector = new InputDetector();
    this.fileHandler = new FileHandler();

    this.outputBuffer = new OutputBuffer(
      async (content: string, isLarge: boolean) => {
        await this.handleBufferFlush(content, isLarge);
      }
    );

    this.setupSlackHandlers();
  }

  private setupSlackHandlers(): void {
    this.slackClient.onMessageReceived((text: string) => {
      this.handleSlackMessage(text);
    });

    this.slackClient.onFileReceived((file: SlackFileUpload) => {
      this.handleSlackFile(file);
    });
  }

  private async handleBufferFlush(content: string, isLarge: boolean): Promise<void> {
    if (!content.trim()) return;

    // Check if input is needed after this output
    this.inputDetector.appendOutput(content);
    const needsInput = this.inputDetector.detectInputNeeded();

    if (isLarge) {
      // Upload as file for large outputs
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      await this.slackClient.uploadFile(content, `output-${timestamp}.txt`, 'Session Output');
    } else {
      // Post as message, with mention if input needed
      await this.slackClient.postMessage(`\`\`\`\n${content}\n\`\`\``, needsInput);
    }

    if (needsInput) {
      this.slackClient.setInputNeeded(true);
      this.inputDetector.clearRecent();
    }
  }

  private handleSlackMessage(text: string): void {
    if (!this.consoleWrapper?.isActive()) {
      this.slackClient.postMessage('_Session is not active._').catch(console.error);
      return;
    }

    // Check if it's a key command (!/key ...)
    if (isKeyCommand(text)) {
      const { keyName, showHelp } = parseKeyCommand(text);

      if (showHelp || !keyName) {
        this.slackClient.postMessage(getKeyHelp()).catch(console.error);
        return;
      }

      const sequence = getKeySequence(keyName);
      if (sequence) {
        this.consoleWrapper.writeRaw(sequence);
        this.slackClient.postMessage(`_Sent key: \`${keyName}\`_`).catch(console.error);
      } else {
        this.slackClient
          .postMessage(`_Unknown key: \`${keyName}\`. Type \`!/key\` for available keys._`)
          .catch(console.error);
      }
      return;
    }

    // Check if it's a command
    if (isCommand(text)) {
      const command = parseCommand(text);

      if (!command) return;

      // Handle built-in commands
      if (command.name === 'status') {
        this.slackClient.postStatus().catch(console.error);
        return;
      }

      if (command.name === 'help' || command.name === 'commands') {
        this.slackClient.postMessage(getCommandHelp()).catch(console.error);
        return;
      }

      if (command.name === 'keys') {
        this.slackClient.postMessage(getKeyHelp()).catch(console.error);
        return;
      }

      // Forward Claude Code commands
      if (isValidClaudeCommand(command.name)) {
        const claudeCommand = formatCommandForClaude(command);
        this.consoleWrapper.write(claudeCommand);
        this.slackClient.setInputNeeded(false);
        return;
      }

      // Unknown command
      this.slackClient
        .postMessage(`_Unknown command: \`${command.name}\`. Type \`!/help\` for available commands._`)
        .catch(console.error);
      return;
    }

    // Regular message - send as input
    this.consoleWrapper.write(text);
    this.slackClient.setInputNeeded(false);
  }

  private async handleSlackFile(file: SlackFileUpload): Promise<void> {
    if (!this.fileHandler.isAllowedMimeType(file.mimetype)) {
      await this.slackClient.postMessage(`_File type not supported: ${file.mimetype}_`);
      return;
    }

    try {
      const localPath = this.fileHandler.generateLocalPath(file);
      const downloadedPath = await this.slackClient.downloadFile(file, this.fileHandler.getDownloadDir());

      // Update the file object with the local path
      file.localPath = downloadedPath;

      // Send the file path to Claude Code
      if (this.consoleWrapper?.isActive()) {
        const fileRef = this.fileHandler.formatFileReference(downloadedPath);
        this.consoleWrapper.write(fileRef);
        await this.slackClient.postMessage(`_File received and saved: ${file.name}_`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await this.slackClient.postMessage(`_Failed to download file: ${errorMessage}_`);
    }
  }

  async start(): Promise<void> {
    if (this.isStarted) {
      throw new Error('Session already started');
    }

    this.isStarted = true;

    // Start Slack client
    await this.slackClient.start();

    // Create thread with objective
    const threadMessage = [
      ':robot_face: *New Hive Mind Session*',
      '',
      `*Objective:* ${this.config.objective}`,
      '',
      '_Session starting..._',
    ].join('\n');

    await this.slackClient.createThread(threadMessage);

    // Start claude-flow process
    this.consoleWrapper = createClaudeFlowWrapper(this.config.objective, {
      cwd: this.config.cwd,
      additionalArgs: this.config.additionalArgs,
    });

    this.consoleWrapper.on('stdout', (data: string) => {
      this.outputBuffer.append(data, 'stdout');
    });

    this.consoleWrapper.on('stderr', (data: string) => {
      this.outputBuffer.append(data, 'stderr');
    });

    this.consoleWrapper.on('exit', async (code: number | null) => {
      await this.outputBuffer.flush();
      await this.slackClient.postCompletion(
        code === 0 ? 'Session completed successfully.' : `Session exited with code ${code}.`
      );
      await this.stop();
    });

    this.consoleWrapper.on('error', async (error: Error) => {
      await this.slackClient.postError(error.message);
      await this.stop();
    });

    this.consoleWrapper.start();
  }

  async stop(): Promise<void> {
    await this.outputBuffer.destroy();

    if (this.consoleWrapper?.isActive()) {
      this.consoleWrapper.stop();
    }

    await this.slackClient.stop();
    await this.fileHandler.cleanup();

    this.isStarted = false;
  }

  getSlackClient(): SlackClient {
    return this.slackClient;
  }
}
