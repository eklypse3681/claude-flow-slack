// Key sequence handler for sending control characters and special keys to Claude Code

export interface KeyMapping {
  name: string;
  aliases: string[];
  sequence: string;
  description: string;
}

// Control character mappings
// Ctrl+A = \x01, Ctrl+B = \x02, etc.
export const KEY_MAPPINGS: KeyMapping[] = [
  // Common Claude Code shortcuts
  { name: 'ctrl+c', aliases: ['ctrl-c', 'sigint'], sequence: '\x03', description: 'Interrupt/Cancel' },
  { name: 'ctrl+d', aliases: ['ctrl-d', 'eof'], sequence: '\x04', description: 'End of file' },
  { name: 'ctrl+o', aliases: ['ctrl-o'], sequence: '\x0F', description: 'Open file picker' },
  { name: 'ctrl+t', aliases: ['ctrl-t'], sequence: '\x14', description: 'Toggle tool' },
  { name: 'ctrl+z', aliases: ['ctrl-z', 'suspend'], sequence: '\x1A', description: 'Suspend' },
  { name: 'ctrl+\\', aliases: ['ctrl-\\', 'sigquit'], sequence: '\x1C', description: 'Quit' },

  // Navigation (readline style)
  { name: 'ctrl+a', aliases: ['ctrl-a'], sequence: '\x01', description: 'Beginning of line' },
  { name: 'ctrl+e', aliases: ['ctrl-e'], sequence: '\x05', description: 'End of line' },
  { name: 'ctrl+b', aliases: ['ctrl-b'], sequence: '\x02', description: 'Back one character' },
  { name: 'ctrl+f', aliases: ['ctrl-f'], sequence: '\x06', description: 'Forward one character' },
  { name: 'ctrl+p', aliases: ['ctrl-p'], sequence: '\x10', description: 'Previous line/history' },
  { name: 'ctrl+n', aliases: ['ctrl-n'], sequence: '\x0E', description: 'Next line/history' },

  // Editing
  { name: 'ctrl+k', aliases: ['ctrl-k'], sequence: '\x0B', description: 'Kill to end of line' },
  { name: 'ctrl+u', aliases: ['ctrl-u'], sequence: '\x15', description: 'Kill to beginning of line' },
  { name: 'ctrl+w', aliases: ['ctrl-w'], sequence: '\x17', description: 'Kill previous word' },
  { name: 'ctrl+y', aliases: ['ctrl-y'], sequence: '\x19', description: 'Yank (paste)' },
  { name: 'ctrl+l', aliases: ['ctrl-l', 'clear'], sequence: '\x0C', description: 'Clear screen' },

  // Special keys
  { name: 'escape', aliases: ['esc'], sequence: '\x1B', description: 'Escape key' },
  { name: 'enter', aliases: ['return', 'newline'], sequence: '\n', description: 'Enter/Return' },
  { name: 'tab', aliases: [], sequence: '\t', description: 'Tab (autocomplete)' },
  { name: 'backspace', aliases: ['bs'], sequence: '\x7F', description: 'Backspace' },

  // Arrow keys (ANSI escape sequences)
  { name: 'up', aliases: ['arrow-up'], sequence: '\x1B[A', description: 'Up arrow' },
  { name: 'down', aliases: ['arrow-down'], sequence: '\x1B[B', description: 'Down arrow' },
  { name: 'right', aliases: ['arrow-right'], sequence: '\x1B[C', description: 'Right arrow' },
  { name: 'left', aliases: ['arrow-left'], sequence: '\x1B[D', description: 'Left arrow' },

  // Function keys (common ANSI sequences)
  { name: 'f1', aliases: [], sequence: '\x1BOP', description: 'F1' },
  { name: 'f2', aliases: [], sequence: '\x1BOQ', description: 'F2' },
  { name: 'f3', aliases: [], sequence: '\x1BOR', description: 'F3' },
  { name: 'f4', aliases: [], sequence: '\x1BOS', description: 'F4' },
];

export function parseKeyName(input: string): KeyMapping | null {
  const normalized = input.toLowerCase().trim();

  for (const mapping of KEY_MAPPINGS) {
    if (mapping.name === normalized) {
      return mapping;
    }
    if (mapping.aliases.includes(normalized)) {
      return mapping;
    }
  }

  // Handle dynamic ctrl+<letter> patterns
  const ctrlMatch = normalized.match(/^ctrl[+-]([a-z])$/);
  if (ctrlMatch) {
    const letter = ctrlMatch[1];
    const charCode = letter.charCodeAt(0) - 96; // 'a' = 1, 'b' = 2, etc.
    if (charCode >= 1 && charCode <= 26) {
      return {
        name: `ctrl+${letter}`,
        aliases: [],
        sequence: String.fromCharCode(charCode),
        description: `Ctrl+${letter.toUpperCase()}`,
      };
    }
  }

  return null;
}

export function getKeySequence(keyName: string): string | null {
  const mapping = parseKeyName(keyName);
  return mapping?.sequence ?? null;
}

export function getKeyHelp(): string {
  const lines = ['*Available Key Sequences:*', ''];

  const categories: { [key: string]: KeyMapping[] } = {
    'Claude Code Shortcuts': KEY_MAPPINGS.filter((k) =>
      ['ctrl+c', 'ctrl+o', 'ctrl+t', 'ctrl+z', 'escape'].includes(k.name)
    ),
    'Navigation': KEY_MAPPINGS.filter((k) =>
      ['ctrl+a', 'ctrl+e', 'ctrl+b', 'ctrl+f', 'ctrl+p', 'ctrl+n', 'up', 'down', 'left', 'right'].includes(k.name)
    ),
    'Editing': KEY_MAPPINGS.filter((k) =>
      ['ctrl+k', 'ctrl+u', 'ctrl+w', 'ctrl+y', 'ctrl+l', 'backspace', 'tab'].includes(k.name)
    ),
    'Special': KEY_MAPPINGS.filter((k) =>
      ['enter', 'escape'].includes(k.name)
    ),
  };

  for (const [category, keys] of Object.entries(categories)) {
    lines.push(`*${category}:*`);
    for (const key of keys) {
      const aliases = key.aliases.length > 0 ? ` (${key.aliases.join(', ')})` : '';
      lines.push(`  • \`!/key ${key.name}\`${aliases} - ${key.description}`);
    }
    lines.push('');
  }

  lines.push('_You can also use \`!/key ctrl+<letter>\` for any Ctrl combination._');

  return lines.join('\n');
}

export function isKeyCommand(text: string): boolean {
  const trimmed = text.trim().toLowerCase();
  return trimmed.startsWith('!/key ') || trimmed === '!/key' || trimmed === '!/keys';
}

export function parseKeyCommand(text: string): { keyName: string | null; showHelp: boolean } {
  const trimmed = text.trim().toLowerCase();

  if (trimmed === '!/key' || trimmed === '!/keys') {
    return { keyName: null, showHelp: true };
  }

  const match = trimmed.match(/^!\/key\s+(.+)$/);
  if (match) {
    return { keyName: match[1], showHelp: false };
  }

  return { keyName: null, showHelp: false };
}
