import { SlackCommand } from './types.js';

export const COMMAND_PREFIX = '!/';

export const CLAUDE_CODE_COMMANDS = [
  { name: 'help', description: 'Show help information' },
  { name: 'clear', description: 'Clear conversation history' },
  { name: 'compact', description: 'Compact conversation to save context' },
  { name: 'config', description: 'View or modify configuration' },
  { name: 'cost', description: 'Show token usage and cost' },
  { name: 'doctor', description: 'Run diagnostic checks' },
  { name: 'init', description: 'Initialize Claude Code in a project' },
  { name: 'login', description: 'Log in to Claude' },
  { name: 'logout', description: 'Log out from Claude' },
  { name: 'memory', description: 'View or edit memory files' },
  { name: 'model', description: 'View or change the model' },
  { name: 'permissions', description: 'View or modify permissions' },
  { name: 'pr-comments', description: 'View PR comments' },
  { name: 'review', description: 'Request a code review' },
  { name: 'status', description: 'Show current session status' },
  { name: 'vim', description: 'Toggle vim mode' },
] as const;

export type ClaudeCodeCommand = (typeof CLAUDE_CODE_COMMANDS)[number]['name'];

export function isCommand(text: string): boolean {
  return text.trim().startsWith(COMMAND_PREFIX);
}

export function parseCommand(text: string): SlackCommand | null {
  const trimmed = text.trim();

  if (!isCommand(trimmed)) {
    return null;
  }

  const withoutPrefix = trimmed.slice(COMMAND_PREFIX.length);
  const parts = withoutPrefix.split(/\s+/);
  const name = parts[0]?.toLowerCase() || '';
  const args = parts.slice(1);

  return {
    name,
    args,
    raw: trimmed,
  };
}

export function isValidClaudeCommand(name: string): boolean {
  return CLAUDE_CODE_COMMANDS.some((cmd) => cmd.name === name);
}

export function getCommandHelp(): string {
  const lines = ['*Available Claude Code Commands:*', ''];

  for (const cmd of CLAUDE_CODE_COMMANDS) {
    lines.push(`• \`${COMMAND_PREFIX}${cmd.name}\` - ${cmd.description}`);
  }

  lines.push('');
  lines.push('*Special Commands:*');
  lines.push(`• \`!/key <keyname>\` - Send a key sequence (e.g., \`!/key ctrl+o\`, \`!/key esc\`)`);
  lines.push(`• \`!/keys\` - Show all available key sequences`);
  lines.push('');
  lines.push('_Type any command to send it to the Claude Code session._');

  return lines.join('\n');
}

export function formatCommandForClaude(command: SlackCommand): string {
  // Convert our !/command format to Claude Code's /command format
  return `/${command.name}${command.args.length > 0 ? ' ' + command.args.join(' ') : ''}`;
}
