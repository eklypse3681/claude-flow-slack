import { describe, it, expect } from 'vitest';
import {
  isCommand,
  parseCommand,
  isValidClaudeCommand,
  getCommandHelp,
  formatCommandForClaude,
  COMMAND_PREFIX,
  CLAUDE_CODE_COMMANDS,
} from './command-parser.js';

describe('command-parser', () => {
  describe('isCommand', () => {
    it('should return true for commands with prefix', () => {
      expect(isCommand('!/help')).toBe(true);
      expect(isCommand('!/status')).toBe(true);
      expect(isCommand('  !/compact')).toBe(true);
    });

    it('should return false for regular messages', () => {
      expect(isCommand('hello')).toBe(false);
      expect(isCommand('/help')).toBe(false);
      expect(isCommand('!help')).toBe(false);
      expect(isCommand('')).toBe(false);
    });

    it('should handle edge cases', () => {
      expect(isCommand('!/')).toBe(true); // Just prefix
      expect(isCommand('!/  ')).toBe(true);
    });
  });

  describe('parseCommand', () => {
    it('should parse simple commands', () => {
      const result = parseCommand('!/help');
      expect(result).toEqual({
        name: 'help',
        args: [],
        raw: '!/help',
      });
    });

    it('should parse commands with arguments', () => {
      const result = parseCommand('!/config set theme dark');
      expect(result).toEqual({
        name: 'config',
        args: ['set', 'theme', 'dark'],
        raw: '!/config set theme dark',
      });
    });

    it('should lowercase command names', () => {
      const result = parseCommand('!/HELP');
      expect(result?.name).toBe('help');
    });

    it('should trim whitespace', () => {
      const result = parseCommand('  !/help  ');
      expect(result?.name).toBe('help');
    });

    it('should return null for non-commands', () => {
      expect(parseCommand('hello')).toBeNull();
      expect(parseCommand('/help')).toBeNull();
    });

    it('should handle empty command name', () => {
      const result = parseCommand('!/');
      expect(result?.name).toBe('');
      expect(result?.args).toEqual([]);
    });

    it('should handle multiple spaces between args', () => {
      const result = parseCommand('!/config   set    theme');
      expect(result?.args).toEqual(['set', 'theme']);
    });
  });

  describe('isValidClaudeCommand', () => {
    it('should return true for valid Claude Code commands', () => {
      expect(isValidClaudeCommand('help')).toBe(true);
      expect(isValidClaudeCommand('compact')).toBe(true);
      expect(isValidClaudeCommand('config')).toBe(true);
      expect(isValidClaudeCommand('model')).toBe(true);
    });

    it('should return false for invalid commands', () => {
      expect(isValidClaudeCommand('invalid')).toBe(false);
      expect(isValidClaudeCommand('foo')).toBe(false);
      expect(isValidClaudeCommand('')).toBe(false);
    });

    it('should be case sensitive', () => {
      expect(isValidClaudeCommand('Help')).toBe(false);
      expect(isValidClaudeCommand('COMPACT')).toBe(false);
    });
  });

  describe('formatCommandForClaude', () => {
    it('should convert to Claude Code format without args', () => {
      const result = formatCommandForClaude({
        name: 'help',
        args: [],
        raw: '!/help',
      });
      expect(result).toBe('/help');
    });

    it('should include arguments', () => {
      const result = formatCommandForClaude({
        name: 'config',
        args: ['set', 'theme', 'dark'],
        raw: '!/config set theme dark',
      });
      expect(result).toBe('/config set theme dark');
    });

    it('should handle single argument', () => {
      const result = formatCommandForClaude({
        name: 'model',
        args: ['sonnet'],
        raw: '!/model sonnet',
      });
      expect(result).toBe('/model sonnet');
    });
  });

  describe('getCommandHelp', () => {
    it('should return help text', () => {
      const help = getCommandHelp();
      expect(help).toContain('Available Claude Code Commands');
    });

    it('should list all commands', () => {
      const help = getCommandHelp();
      for (const cmd of CLAUDE_CODE_COMMANDS) {
        expect(help).toContain(cmd.name);
        expect(help).toContain(cmd.description);
      }
    });

    it('should include command prefix in examples', () => {
      const help = getCommandHelp();
      expect(help).toContain(COMMAND_PREFIX);
    });

    it('should mention key command', () => {
      const help = getCommandHelp();
      expect(help).toContain('!/key');
      expect(help).toContain('!/keys');
    });
  });

  describe('CLAUDE_CODE_COMMANDS', () => {
    it('should have required commands', () => {
      const commandNames = CLAUDE_CODE_COMMANDS.map((c) => c.name);
      expect(commandNames).toContain('help');
      expect(commandNames).toContain('compact');
      expect(commandNames).toContain('clear');
      expect(commandNames).toContain('status');
      expect(commandNames).toContain('config');
    });

    it('should have descriptions for all commands', () => {
      for (const cmd of CLAUDE_CODE_COMMANDS) {
        expect(cmd.description).toBeTruthy();
        expect(cmd.description.length).toBeGreaterThan(3);
      }
    });
  });
});
