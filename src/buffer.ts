import { BufferedMessage } from './types.js';

export interface BufferConfig {
  maxBufferSize: number;
  flushIntervalMs: number;
  maxMessageLength: number;
}

export const DEFAULT_BUFFER_CONFIG: BufferConfig = {
  maxBufferSize: 3000,
  flushIntervalMs: 2000,
  maxMessageLength: 3900, // Slack limit is 4000, leave room for formatting
};

export class OutputBuffer {
  private buffer: BufferedMessage[] = [];
  private flushTimer: NodeJS.Timeout | null = null;
  private config: BufferConfig;
  private onFlush: (content: string, isLarge: boolean) => Promise<void>;

  constructor(
    onFlush: (content: string, isLarge: boolean) => Promise<void>,
    config: Partial<BufferConfig> = {}
  ) {
    this.config = { ...DEFAULT_BUFFER_CONFIG, ...config };
    this.onFlush = onFlush;
  }

  append(content: string, source: 'stdout' | 'stderr' = 'stdout'): void {
    if (!content || content.trim() === '') return;

    this.buffer.push({
      content,
      timestamp: new Date(),
      source,
    });

    const totalSize = this.getBufferSize();

    // Flush immediately if buffer is getting large
    if (totalSize >= this.config.maxBufferSize) {
      this.flush();
    } else if (!this.flushTimer) {
      // Set timer for batched flush
      this.flushTimer = setTimeout(() => {
        this.flush();
      }, this.config.flushIntervalMs);
    }
  }

  private getBufferSize(): number {
    return this.buffer.reduce((sum, msg) => sum + msg.content.length, 0);
  }

  async flush(): Promise<void> {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }

    if (this.buffer.length === 0) return;

    const messages = this.buffer;
    this.buffer = [];

    const combined = messages.map((m) => m.content).join('');
    const isLarge = combined.length > this.config.maxMessageLength;

    await this.onFlush(combined, isLarge);
  }

  async destroy(): Promise<void> {
    await this.flush();
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
  }

  getBufferedContent(): string {
    return this.buffer.map((m) => m.content).join('');
  }

  getPendingCount(): number {
    return this.buffer.length;
  }
}
