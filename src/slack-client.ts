import { App, LogLevel } from '@slack/bolt';
import { WebClient } from '@slack/web-api';
import { SlackConfig, SessionState, SlackFileUpload } from './types.js';
import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import * as http from 'http';

export class SlackClient {
  private app: App;
  private client: WebClient;
  private config: SlackConfig;
  private state: SessionState;
  private onMessage: ((text: string) => void) | null = null;
  private onFile: ((file: SlackFileUpload) => void) | null = null;

  constructor(config: SlackConfig, objective: string) {
    this.config = config;
    this.client = new WebClient(config.botToken);
    this.app = new App({
      token: config.botToken,
      appToken: config.appToken,
      socketMode: true,
      logLevel: LogLevel.ERROR,
    });

    this.state = {
      threadTs: null,
      channelId: config.channelId,
      startedAt: new Date(),
      objective,
      status: 'initializing',
      lastActivity: new Date(),
      messageCount: 0,
    };

    this.setupListeners();
  }

  private setupListeners(): void {
    // Listen for messages in the thread
    this.app.message(async ({ message, say }) => {
      // Type guard for message with thread_ts
      if (!('thread_ts' in message) || !('text' in message)) return;

      const msg = message as { thread_ts?: string; text?: string; user?: string; files?: Array<{ id: string; name: string; mimetype: string; url_private: string }> };

      // Only respond to messages in our thread
      if (msg.thread_ts !== this.state.threadTs) return;

      // Ignore bot messages (including our own)
      if ('bot_id' in message) return;

      this.state.lastActivity = new Date();

      // Handle file uploads
      if (msg.files && msg.files.length > 0) {
        for (const file of msg.files) {
          const slackFile: SlackFileUpload = {
            id: file.id,
            name: file.name,
            mimetype: file.mimetype,
            url: file.url_private,
          };

          if (this.onFile) {
            this.onFile(slackFile);
          }
        }
      }

      // Handle text messages
      if (msg.text && this.onMessage) {
        this.onMessage(msg.text);
      }
    });
  }

  async start(): Promise<void> {
    await this.app.start();
  }

  async stop(): Promise<void> {
    await this.app.stop();
  }

  async createThread(initialMessage: string): Promise<string> {
    const result = await this.client.chat.postMessage({
      channel: this.config.channelId,
      text: initialMessage,
    });

    if (!result.ts) {
      throw new Error('Failed to create thread: no timestamp returned');
    }

    this.state.threadTs = result.ts;
    this.state.status = 'running';
    this.state.messageCount++;

    return result.ts;
  }

  async postMessage(text: string, mention: boolean = false): Promise<void> {
    if (!this.state.threadTs) {
      throw new Error('Thread not created yet. Call createThread first.');
    }

    let finalText = text;
    if (mention && this.config.mentionUserId) {
      finalText = `<@${this.config.mentionUserId}> ${text}`;
    }

    await this.client.chat.postMessage({
      channel: this.config.channelId,
      thread_ts: this.state.threadTs,
      text: finalText,
    });

    this.state.messageCount++;
    this.state.lastActivity = new Date();
  }

  async uploadFile(content: string, filename: string, title?: string): Promise<void> {
    if (!this.state.threadTs) {
      throw new Error('Thread not created yet. Call createThread first.');
    }

    await this.client.files.uploadV2({
      channel_id: this.config.channelId,
      thread_ts: this.state.threadTs,
      content,
      filename,
      title: title || filename,
    });

    this.state.messageCount++;
    this.state.lastActivity = new Date();
  }

  async downloadFile(file: SlackFileUpload, destDir: string): Promise<string> {
    const destPath = path.join(destDir, file.name);

    return new Promise((resolve, reject) => {
      const fileStream = fs.createWriteStream(destPath);
      const protocol = file.url.startsWith('https') ? https : http;

      protocol.get(
        file.url,
        {
          headers: {
            Authorization: `Bearer ${this.config.botToken}`,
          },
        },
        (response) => {
          response.pipe(fileStream);
          fileStream.on('finish', () => {
            fileStream.close();
            resolve(destPath);
          });
        }
      ).on('error', (err) => {
        fs.unlink(destPath, () => {}); // Clean up partial file
        reject(err);
      });
    });
  }

  async postStatus(): Promise<void> {
    const duration = Math.floor(
      (new Date().getTime() - this.state.startedAt.getTime()) / 1000
    );
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;

    const statusText = [
      '*Session Status*',
      `• *Status:* ${this.state.status}`,
      `• *Objective:* ${this.state.objective}`,
      `• *Duration:* ${minutes}m ${seconds}s`,
      `• *Messages:* ${this.state.messageCount}`,
      `• *Last Activity:* ${this.state.lastActivity.toISOString()}`,
    ].join('\n');

    await this.postMessage(statusText);
  }

  async postCompletion(summary?: string): Promise<void> {
    this.state.status = 'completed';

    const completionText = [
      ':white_check_mark: *Session Completed*',
      summary ? `\n${summary}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    await this.postMessage(completionText);
  }

  async postError(error: string): Promise<void> {
    this.state.status = 'error';
    await this.postMessage(`:x: *Error:* ${error}`, true);
  }

  setInputNeeded(needed: boolean): void {
    this.state.status = needed ? 'waiting_for_input' : 'running';
  }

  onMessageReceived(callback: (text: string) => void): void {
    this.onMessage = callback;
  }

  onFileReceived(callback: (file: SlackFileUpload) => void): void {
    this.onFile = callback;
  }

  getState(): SessionState {
    return { ...this.state };
  }

  getThreadTs(): string | null {
    return this.state.threadTs;
  }
}
