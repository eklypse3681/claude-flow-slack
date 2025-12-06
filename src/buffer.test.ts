import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { OutputBuffer, DEFAULT_BUFFER_CONFIG } from './buffer.js';

describe('OutputBuffer', () => {
  let flushCallback: ReturnType<typeof vi.fn>;
  let buffer: OutputBuffer;

  beforeEach(() => {
    vi.useFakeTimers();
    flushCallback = vi.fn().mockResolvedValue(undefined);
    buffer = new OutputBuffer(flushCallback);
  });

  afterEach(async () => {
    await buffer.destroy();
    vi.useRealTimers();
  });

  describe('append', () => {
    it('should buffer content without immediate flush', () => {
      buffer.append('hello');
      expect(flushCallback).not.toHaveBeenCalled();
      expect(buffer.getBufferedContent()).toBe('hello');
    });

    it('should ignore empty content', () => {
      buffer.append('');
      buffer.append('   ');
      expect(buffer.getPendingCount()).toBe(0);
    });

    it('should accumulate multiple appends', () => {
      buffer.append('hello');
      buffer.append(' world');
      expect(buffer.getBufferedContent()).toBe('hello world');
      expect(buffer.getPendingCount()).toBe(2);
    });
  });

  describe('timed flush', () => {
    it('should flush after configured interval', async () => {
      buffer.append('hello');
      expect(flushCallback).not.toHaveBeenCalled();

      await vi.advanceTimersByTimeAsync(DEFAULT_BUFFER_CONFIG.flushIntervalMs);

      expect(flushCallback).toHaveBeenCalledTimes(1);
      expect(flushCallback).toHaveBeenCalledWith('hello', false);
    });

    it('should combine content in timed flush', async () => {
      buffer.append('hello ');
      buffer.append('world');

      await vi.advanceTimersByTimeAsync(DEFAULT_BUFFER_CONFIG.flushIntervalMs);

      expect(flushCallback).toHaveBeenCalledWith('hello world', false);
    });

    it('should not flush empty buffer on timer', async () => {
      await vi.advanceTimersByTimeAsync(DEFAULT_BUFFER_CONFIG.flushIntervalMs);
      expect(flushCallback).not.toHaveBeenCalled();
    });
  });

  describe('size-based flush', () => {
    it('should flush immediately when buffer exceeds max size', async () => {
      const largeContent = 'x'.repeat(DEFAULT_BUFFER_CONFIG.maxBufferSize + 1);
      buffer.append(largeContent);

      // Should flush immediately, not wait for timer
      expect(flushCallback).toHaveBeenCalledTimes(1);
    });

    it('should mark large content as isLarge', async () => {
      const hugeContent = 'x'.repeat(DEFAULT_BUFFER_CONFIG.maxMessageLength + 100);
      buffer.append(hugeContent);

      expect(flushCallback).toHaveBeenCalledWith(hugeContent, true);
    });
  });

  describe('manual flush', () => {
    it('should flush immediately when called', async () => {
      buffer.append('hello');
      await buffer.flush();

      expect(flushCallback).toHaveBeenCalledWith('hello', false);
    });

    it('should clear buffer after flush', async () => {
      buffer.append('hello');
      await buffer.flush();

      expect(buffer.getBufferedContent()).toBe('');
      expect(buffer.getPendingCount()).toBe(0);
    });

    it('should handle flush of empty buffer gracefully', async () => {
      await buffer.flush();
      expect(flushCallback).not.toHaveBeenCalled();
    });
  });

  describe('destroy', () => {
    it('should flush remaining content', async () => {
      buffer.append('final message');
      await buffer.destroy();

      expect(flushCallback).toHaveBeenCalledWith('final message', false);
    });

    it('should clear timers', async () => {
      buffer.append('hello');
      await buffer.destroy();

      // Advance timers - should not trigger another flush
      await vi.advanceTimersByTimeAsync(DEFAULT_BUFFER_CONFIG.flushIntervalMs * 2);
      expect(flushCallback).toHaveBeenCalledTimes(1);
    });
  });

  describe('custom config', () => {
    it('should use custom flush interval', async () => {
      const customFlush = vi.fn().mockResolvedValue(undefined);
      const customBuffer = new OutputBuffer(customFlush, { flushIntervalMs: 5000 });

      customBuffer.append('hello');

      await vi.advanceTimersByTimeAsync(2000);
      expect(customFlush).not.toHaveBeenCalled();

      await vi.advanceTimersByTimeAsync(3000);
      expect(customFlush).toHaveBeenCalled();

      await customBuffer.destroy();
    });

    it('should use custom max buffer size', async () => {
      const customFlush = vi.fn().mockResolvedValue(undefined);
      const customBuffer = new OutputBuffer(customFlush, { maxBufferSize: 10 });

      customBuffer.append('12345678901'); // 11 chars, exceeds 10

      expect(customFlush).toHaveBeenCalled();
      await customBuffer.destroy();
    });
  });

  describe('source tracking', () => {
    it('should track stdout source', () => {
      buffer.append('stdout content', 'stdout');
      expect(buffer.getBufferedContent()).toBe('stdout content');
    });

    it('should track stderr source', () => {
      buffer.append('error content', 'stderr');
      expect(buffer.getBufferedContent()).toBe('error content');
    });

    it('should combine stdout and stderr in order', () => {
      buffer.append('out1', 'stdout');
      buffer.append('err1', 'stderr');
      buffer.append('out2', 'stdout');
      expect(buffer.getBufferedContent()).toBe('out1err1out2');
    });
  });
});
