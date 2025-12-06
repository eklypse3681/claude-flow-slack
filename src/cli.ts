#!/usr/bin/env node

import { loadConfig, validateConfig } from './config.js';
import { Session } from './session.js';

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  // Parse command line arguments
  let objective: string | undefined;
  let cwd: string | undefined;
  const additionalArgs: string[] = [];

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--objective' || arg === '-o') {
      objective = args[++i];
    } else if (arg === '--cwd' || arg === '-d') {
      cwd = args[++i];
    } else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    } else if (arg === '--version' || arg === '-v') {
      console.log('claude-flow-slack v0.1.0');
      process.exit(0);
    } else if (arg === '--') {
      // Everything after -- is passed to claude-flow
      additionalArgs.push(...args.slice(i + 1));
      break;
    } else if (!arg.startsWith('-')) {
      // Positional argument is the objective
      objective = arg;
    } else {
      console.error(`Unknown option: ${arg}`);
      printHelp();
      process.exit(1);
    }
  }

  if (!objective) {
    console.error('Error: Objective is required');
    printHelp();
    process.exit(1);
  }

  // Load and validate config
  let config;
  try {
    config = loadConfig();
    validateConfig(config);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`Configuration error: ${message}`);
    console.error('');
    console.error('Required environment variables:');
    console.error('  SLACK_BOT_TOKEN   - Slack bot token (xoxb-...)');
    console.error('  SLACK_APP_TOKEN   - Slack app token (xapp-...)');
    console.error('  SLACK_CHANNEL_ID  - Channel ID to post to');
    console.error('');
    console.error('Optional environment variables:');
    console.error('  SLACK_MENTION_USER_ID - User ID to @mention when input needed');
    process.exit(1);
  }

  // Create and start session
  const session = new Session({
    slack: config,
    objective,
    cwd,
    additionalArgs,
  });

  // Handle shutdown signals
  const shutdown = async (signal: string) => {
    console.log(`\nReceived ${signal}, shutting down...`);
    await session.stop();
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  try {
    console.log('Starting claude-flow-slack session...');
    console.log(`Objective: ${objective}`);
    console.log(`Channel: ${config.channelId}`);
    console.log('');
    await session.start();
    console.log('Session started. Check Slack for the thread.');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`Failed to start session: ${message}`);
    process.exit(1);
  }
}

function printHelp(): void {
  console.log(`
claude-flow-slack - Slack integration for claude-flow hive-mind

USAGE:
  claude-flow-slack [OPTIONS] <objective>
  claude-flow-slack --objective "your objective here"

OPTIONS:
  -o, --objective <text>   The objective for the hive-mind session
  -d, --cwd <path>         Working directory for claude-flow
  -h, --help               Show this help message
  -v, --version            Show version

ENVIRONMENT VARIABLES (required):
  SLACK_BOT_TOKEN          Slack bot token (starts with xoxb-)
  SLACK_APP_TOKEN          Slack app token (starts with xapp-)
  SLACK_CHANNEL_ID         Channel ID to create threads in

ENVIRONMENT VARIABLES (optional):
  SLACK_MENTION_USER_ID    User ID to @mention when input is needed

EXAMPLES:
  claude-flow-slack "Build a REST API for user management"
  claude-flow-slack --objective "Fix the login bug" --cwd /path/to/project

SLACK THREAD COMMANDS:
  !/help                   Show available commands
  !/status                 Show session status
  !/compact                Compact conversation context
  !/clear                  Clear conversation history
  (and all other Claude Code slash commands)

For more information, see: https://github.com/eklypse3681/claude-flow-slack
`);
}

main().catch((error) => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
