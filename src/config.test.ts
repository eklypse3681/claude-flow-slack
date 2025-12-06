import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { loadConfig, validateConfig } from './config.js';

describe('config', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('loadConfig', () => {
    it('should load config from environment variables', () => {
      process.env.SLACK_BOT_TOKEN = 'xoxb-test-token';
      process.env.SLACK_APP_TOKEN = 'xapp-test-token';
      process.env.SLACK_CHANNEL_ID = 'C12345';
      process.env.SLACK_MENTION_USER_ID = 'U12345';

      const config = loadConfig();

      expect(config.botToken).toBe('xoxb-test-token');
      expect(config.appToken).toBe('xapp-test-token');
      expect(config.channelId).toBe('C12345');
      expect(config.mentionUserId).toBe('U12345');
    });

    it('should handle optional mentionUserId', () => {
      process.env.SLACK_BOT_TOKEN = 'xoxb-test-token';
      process.env.SLACK_APP_TOKEN = 'xapp-test-token';
      process.env.SLACK_CHANNEL_ID = 'C12345';
      delete process.env.SLACK_MENTION_USER_ID;

      const config = loadConfig();

      expect(config.mentionUserId).toBeUndefined();
    });

    it('should throw if SLACK_BOT_TOKEN is missing', () => {
      delete process.env.SLACK_BOT_TOKEN;
      process.env.SLACK_APP_TOKEN = 'xapp-test-token';
      process.env.SLACK_CHANNEL_ID = 'C12345';

      expect(() => loadConfig()).toThrow('SLACK_BOT_TOKEN');
    });

    it('should throw if SLACK_APP_TOKEN is missing', () => {
      process.env.SLACK_BOT_TOKEN = 'xoxb-test-token';
      delete process.env.SLACK_APP_TOKEN;
      process.env.SLACK_CHANNEL_ID = 'C12345';

      expect(() => loadConfig()).toThrow('SLACK_APP_TOKEN');
    });

    it('should throw if SLACK_CHANNEL_ID is missing', () => {
      process.env.SLACK_BOT_TOKEN = 'xoxb-test-token';
      process.env.SLACK_APP_TOKEN = 'xapp-test-token';
      delete process.env.SLACK_CHANNEL_ID;

      expect(() => loadConfig()).toThrow('SLACK_CHANNEL_ID');
    });
  });

  describe('validateConfig', () => {
    it('should pass for valid config', () => {
      const config = {
        botToken: 'xoxb-valid-token',
        appToken: 'xapp-valid-token',
        channelId: 'C12345',
      };

      expect(() => validateConfig(config)).not.toThrow();
    });

    it('should throw for invalid bot token prefix', () => {
      const config = {
        botToken: 'invalid-token',
        appToken: 'xapp-valid-token',
        channelId: 'C12345',
      };

      expect(() => validateConfig(config)).toThrow('xoxb-');
    });

    it('should throw for invalid app token prefix', () => {
      const config = {
        botToken: 'xoxb-valid-token',
        appToken: 'invalid-token',
        channelId: 'C12345',
      };

      expect(() => validateConfig(config)).toThrow('xapp-');
    });

    it('should handle mentionUserId in validation', () => {
      const config = {
        botToken: 'xoxb-valid-token',
        appToken: 'xapp-valid-token',
        channelId: 'C12345',
        mentionUserId: 'U12345',
      };

      expect(() => validateConfig(config)).not.toThrow();
    });
  });
});
