import { describe, it, expect } from 'vitest';
import {
  parseKeyName,
  getKeySequence,
  getKeyHelp,
  isKeyCommand,
  parseKeyCommand,
  KEY_MAPPINGS,
} from './key-handler.js';

describe('key-handler', () => {
  describe('parseKeyName', () => {
    it('should parse standard key names', () => {
      expect(parseKeyName('ctrl+c')).toBeTruthy();
      expect(parseKeyName('ctrl+o')).toBeTruthy();
      expect(parseKeyName('escape')).toBeTruthy();
      expect(parseKeyName('enter')).toBeTruthy();
    });

    it('should handle aliases', () => {
      expect(parseKeyName('ctrl-c')).toBeTruthy();
      expect(parseKeyName('esc')).toBeTruthy();
      expect(parseKeyName('return')).toBeTruthy();
      expect(parseKeyName('sigint')).toBeTruthy();
    });

    it('should be case insensitive', () => {
      expect(parseKeyName('CTRL+C')).toBeTruthy();
      expect(parseKeyName('Escape')).toBeTruthy();
      expect(parseKeyName('ENTER')).toBeTruthy();
    });

    it('should handle dynamic ctrl+letter patterns', () => {
      const result = parseKeyName('ctrl+x');
      expect(result).toBeTruthy();
      expect(result?.sequence).toBe('\x18'); // Ctrl+X
    });

    it('should return null for invalid keys', () => {
      expect(parseKeyName('invalid')).toBeNull();
      expect(parseKeyName('ctrl+')).toBeNull();
      expect(parseKeyName('')).toBeNull();
    });

    it('should handle arrow keys', () => {
      expect(parseKeyName('up')).toBeTruthy();
      expect(parseKeyName('down')).toBeTruthy();
      expect(parseKeyName('left')).toBeTruthy();
      expect(parseKeyName('right')).toBeTruthy();
      expect(parseKeyName('arrow-up')).toBeTruthy();
    });
  });

  describe('getKeySequence', () => {
    it('should return correct control sequences', () => {
      expect(getKeySequence('ctrl+c')).toBe('\x03');
      expect(getKeySequence('ctrl+d')).toBe('\x04');
      expect(getKeySequence('ctrl+o')).toBe('\x0F');
      expect(getKeySequence('ctrl+t')).toBe('\x14');
      expect(getKeySequence('ctrl+z')).toBe('\x1A');
    });

    it('should return correct escape sequence', () => {
      expect(getKeySequence('escape')).toBe('\x1B');
      expect(getKeySequence('esc')).toBe('\x1B');
    });

    it('should return correct special key sequences', () => {
      expect(getKeySequence('enter')).toBe('\n');
      expect(getKeySequence('tab')).toBe('\t');
      expect(getKeySequence('backspace')).toBe('\x7F');
    });

    it('should return correct arrow key sequences', () => {
      expect(getKeySequence('up')).toBe('\x1B[A');
      expect(getKeySequence('down')).toBe('\x1B[B');
      expect(getKeySequence('right')).toBe('\x1B[C');
      expect(getKeySequence('left')).toBe('\x1B[D');
    });

    it('should return null for invalid keys', () => {
      expect(getKeySequence('invalid')).toBeNull();
    });

    it('should handle dynamic ctrl sequences', () => {
      // Ctrl+A through Ctrl+Z should all work
      expect(getKeySequence('ctrl+a')).toBe('\x01');
      expect(getKeySequence('ctrl+z')).toBe('\x1A');
      expect(getKeySequence('ctrl+m')).toBe('\x0D'); // Same as Enter/CR
    });
  });

  describe('isKeyCommand', () => {
    it('should recognize key commands', () => {
      expect(isKeyCommand('!/key ctrl+c')).toBe(true);
      expect(isKeyCommand('!/key escape')).toBe(true);
      expect(isKeyCommand('!/key')).toBe(true);
      expect(isKeyCommand('!/keys')).toBe(true);
    });

    it('should be case insensitive', () => {
      expect(isKeyCommand('!/KEY ctrl+c')).toBe(true);
      expect(isKeyCommand('!/Key Escape')).toBe(true);
    });

    it('should handle whitespace', () => {
      expect(isKeyCommand('  !/key ctrl+c  ')).toBe(true);
    });

    it('should not match non-key commands', () => {
      expect(isKeyCommand('!/help')).toBe(false);
      expect(isKeyCommand('!/keyboard')).toBe(false);
      expect(isKeyCommand('hello')).toBe(false);
    });
  });

  describe('parseKeyCommand', () => {
    it('should parse key name', () => {
      const result = parseKeyCommand('!/key ctrl+c');
      expect(result.keyName).toBe('ctrl+c');
      expect(result.showHelp).toBe(false);
    });

    it('should handle help request', () => {
      expect(parseKeyCommand('!/key').showHelp).toBe(true);
      expect(parseKeyCommand('!/keys').showHelp).toBe(true);
    });

    it('should lowercase key name', () => {
      const result = parseKeyCommand('!/key CTRL+C');
      expect(result.keyName).toBe('ctrl+c');
    });

    it('should handle extra whitespace', () => {
      const result = parseKeyCommand('!/key   ctrl+c  ');
      expect(result.keyName).toBe('ctrl+c');
    });
  });

  describe('getKeyHelp', () => {
    it('should return help text', () => {
      const help = getKeyHelp();
      expect(help).toContain('Available Key Sequences');
    });

    it('should list common shortcuts', () => {
      const help = getKeyHelp();
      expect(help).toContain('ctrl+c');
      expect(help).toContain('ctrl+o');
      expect(help).toContain('escape');
    });

    it('should include descriptions', () => {
      const help = getKeyHelp();
      expect(help).toContain('Interrupt');
      expect(help).toContain('Escape');
    });

    it('should mention dynamic ctrl patterns', () => {
      const help = getKeyHelp();
      expect(help).toContain('ctrl+<letter>');
    });
  });

  describe('KEY_MAPPINGS', () => {
    it('should have essential keys', () => {
      const names = KEY_MAPPINGS.map((k) => k.name);
      expect(names).toContain('ctrl+c');
      expect(names).toContain('ctrl+o');
      expect(names).toContain('ctrl+t');
      expect(names).toContain('escape');
      expect(names).toContain('enter');
    });

    it('should have valid sequences', () => {
      for (const mapping of KEY_MAPPINGS) {
        expect(mapping.sequence).toBeTruthy();
        expect(mapping.sequence.length).toBeGreaterThan(0);
      }
    });

    it('should have descriptions', () => {
      for (const mapping of KEY_MAPPINGS) {
        expect(mapping.description).toBeTruthy();
      }
    });

    it('should have unique names', () => {
      const names = KEY_MAPPINGS.map((k) => k.name);
      const uniqueNames = [...new Set(names)];
      expect(names.length).toBe(uniqueNames.length);
    });
  });
});
