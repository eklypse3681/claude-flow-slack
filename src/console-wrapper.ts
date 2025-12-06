import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import stripAnsi from 'strip-ansi';

export interface ConsoleWrapperConfig {
  command: string;
  args: string[];
  cwd?: string;
  env?: NodeJS.ProcessEnv;
}

export interface ConsoleWrapperEvents {
  stdout: (data: string) => void;
  stderr: (data: string) => void;
  exit: (code: number | null) => void;
  error: (error: Error) => void;
}

export class ConsoleWrapper extends EventEmitter {
  private process: ChildProcess | null = null;
  private config: ConsoleWrapperConfig;
  private isRunning: boolean = false;

  constructor(config: ConsoleWrapperConfig) {
    super();
    this.config = config;
  }

  start(): void {
    if (this.isRunning) {
      throw new Error('Process is already running');
    }

    this.process = spawn(this.config.command, this.config.args, {
      cwd: this.config.cwd,
      env: { ...process.env, ...this.config.env },
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    this.isRunning = true;

    this.process.stdout?.on('data', (data: Buffer) => {
      const text = stripAnsi(data.toString());
      this.emit('stdout', text);
    });

    this.process.stderr?.on('data', (data: Buffer) => {
      const text = stripAnsi(data.toString());
      this.emit('stderr', text);
    });

    this.process.on('exit', (code) => {
      this.isRunning = false;
      this.emit('exit', code);
    });

    this.process.on('error', (error) => {
      this.isRunning = false;
      this.emit('error', error);
    });
  }

  write(input: string): void {
    if (!this.process || !this.isRunning) {
      throw new Error('Process is not running');
    }

    this.process.stdin?.write(input + '\n');
  }

  writeRaw(data: string): void {
    if (!this.process || !this.isRunning) {
      throw new Error('Process is not running');
    }

    // Write raw bytes without adding newline - used for control sequences
    this.process.stdin?.write(data);
  }

  sendSignal(signal: NodeJS.Signals): void {
    if (!this.process || !this.isRunning) {
      throw new Error('Process is not running');
    }

    this.process.kill(signal);
  }

  stop(): void {
    if (this.process && this.isRunning) {
      this.process.kill('SIGTERM');
    }
  }

  forceStop(): void {
    if (this.process && this.isRunning) {
      this.process.kill('SIGKILL');
    }
  }

  isActive(): boolean {
    return this.isRunning;
  }

  getPid(): number | undefined {
    return this.process?.pid;
  }
}

export function createClaudeFlowWrapper(
  objective: string,
  options: {
    cwd?: string;
    additionalArgs?: string[];
    env?: NodeJS.ProcessEnv;
  } = {}
): ConsoleWrapper {
  const args = ['hive-mind', 'spawn', '--objective', objective];

  if (options.additionalArgs) {
    args.push(...options.additionalArgs);
  }

  return new ConsoleWrapper({
    command: 'claude-flow',
    args,
    cwd: options.cwd,
    env: options.env,
  });
}
