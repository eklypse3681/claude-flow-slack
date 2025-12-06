import { SlackConfig } from './types.js';

export function loadConfig(): SlackConfig {
  const botToken = process.env.SLACK_BOT_TOKEN;
  const appToken = process.env.SLACK_APP_TOKEN;
  const channelId = process.env.SLACK_CHANNEL_ID;
  const mentionUserId = process.env.SLACK_MENTION_USER_ID;

  if (!botToken) {
    throw new Error('SLACK_BOT_TOKEN environment variable is required');
  }
  if (!appToken) {
    throw new Error('SLACK_APP_TOKEN environment variable is required');
  }
  if (!channelId) {
    throw new Error('SLACK_CHANNEL_ID environment variable is required');
  }

  return {
    botToken,
    appToken,
    channelId,
    mentionUserId,
  };
}

export function validateConfig(config: SlackConfig): void {
  if (!config.botToken.startsWith('xoxb-')) {
    throw new Error('SLACK_BOT_TOKEN must be a bot token (starts with xoxb-)');
  }
  if (!config.appToken.startsWith('xapp-')) {
    throw new Error('SLACK_APP_TOKEN must be an app token (starts with xapp-)');
  }
}
