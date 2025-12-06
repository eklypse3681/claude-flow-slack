export interface InputDetectorConfig {
  patterns: RegExp[];
  debounceMs: number;
}

export const DEFAULT_INPUT_PATTERNS: RegExp[] = [
  // Claude Code asking for input
  /\?\s*$/,
  /please (provide|enter|specify|input)/i,
  /waiting for (input|response|your)/i,
  /what (would you|do you|should)/i,
  /which (option|one|approach)/i,
  /do you want (to|me to)/i,
  /should I/i,
  /would you like/i,
  /can you (provide|specify|tell)/i,
  /enter your/i,
  /type your/i,
  // AskUserQuestion tool patterns
  /\[.*\?\]/,
  /Option \d+:/i,
  /Choose.*:/i,
  /Select.*:/i,
];

export const DEFAULT_INPUT_DETECTOR_CONFIG: InputDetectorConfig = {
  patterns: DEFAULT_INPUT_PATTERNS,
  debounceMs: 500,
};

export class InputDetector {
  private config: InputDetectorConfig;
  private lastDetection: Date | null = null;
  private recentOutput: string = '';
  private readonly maxRecentLength = 2000;

  constructor(config: Partial<InputDetectorConfig> = {}) {
    this.config = { ...DEFAULT_INPUT_DETECTOR_CONFIG, ...config };
    if (config.patterns) {
      this.config.patterns = [...DEFAULT_INPUT_PATTERNS, ...config.patterns];
    }
  }

  appendOutput(content: string): void {
    this.recentOutput += content;
    // Keep only the most recent output for pattern matching
    if (this.recentOutput.length > this.maxRecentLength) {
      this.recentOutput = this.recentOutput.slice(-this.maxRecentLength);
    }
  }

  detectInputNeeded(): boolean {
    // Check each pattern against recent output
    for (const pattern of this.config.patterns) {
      if (pattern.test(this.recentOutput)) {
        const now = new Date();

        // Debounce to avoid multiple detections
        if (
          this.lastDetection &&
          now.getTime() - this.lastDetection.getTime() < this.config.debounceMs
        ) {
          return false;
        }

        this.lastDetection = now;
        return true;
      }
    }

    return false;
  }

  clearRecent(): void {
    this.recentOutput = '';
    this.lastDetection = null;
  }

  getRecentOutput(): string {
    return this.recentOutput;
  }

  addPattern(pattern: RegExp): void {
    this.config.patterns.push(pattern);
  }
}
