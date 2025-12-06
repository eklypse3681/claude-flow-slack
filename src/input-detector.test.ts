import { describe, it, expect, beforeEach } from 'vitest';
import { InputDetector, DEFAULT_INPUT_PATTERNS } from './input-detector.js';

describe('InputDetector', () => {
  let detector: InputDetector;

  beforeEach(() => {
    detector = new InputDetector();
  });

  describe('basic pattern detection', () => {
    it('should detect question marks at end of line', () => {
      detector.appendOutput('What would you like to do?');
      expect(detector.detectInputNeeded()).toBe(true);
    });

    it('should detect "please provide" patterns', () => {
      detector.appendOutput('Please provide the file path');
      expect(detector.detectInputNeeded()).toBe(true);
    });

    it('should detect "waiting for" patterns', () => {
      detector.appendOutput('Waiting for your response');
      expect(detector.detectInputNeeded()).toBe(true);
    });

    it('should detect "what would you" patterns', () => {
      detector.appendOutput('What would you like me to do next');
      expect(detector.detectInputNeeded()).toBe(true);
    });

    it('should detect "which option" patterns', () => {
      detector.appendOutput('Which option do you prefer');
      expect(detector.detectInputNeeded()).toBe(true);
    });

    it('should detect "do you want" patterns', () => {
      detector.appendOutput('Do you want to continue');
      expect(detector.detectInputNeeded()).toBe(true);
    });

    it('should detect "should I" patterns', () => {
      detector.appendOutput('Should I proceed with the changes');
      expect(detector.detectInputNeeded()).toBe(true);
    });

    it('should detect "would you like" patterns', () => {
      detector.appendOutput('Would you like me to fix this');
      expect(detector.detectInputNeeded()).toBe(true);
    });

    it('should detect AskUserQuestion patterns', () => {
      detector.appendOutput('[Which database do you want?]');
      expect(detector.detectInputNeeded()).toBe(true);
    });

    it('should detect "Option" patterns', () => {
      detector.appendOutput('Option 1: Continue\nOption 2: Cancel');
      expect(detector.detectInputNeeded()).toBe(true);
    });

    it('should detect "Choose" patterns', () => {
      detector.appendOutput('Choose your preferred method:');
      expect(detector.detectInputNeeded()).toBe(true);
    });

    it('should detect "Select" patterns', () => {
      detector.appendOutput('Select one of the following:');
      expect(detector.detectInputNeeded()).toBe(true);
    });
  });

  describe('non-matching content', () => {
    it('should not detect regular output', () => {
      detector.appendOutput('Processing files...');
      expect(detector.detectInputNeeded()).toBe(false);
    });

    it('should not detect code output', () => {
      detector.appendOutput('function getData() { return data; }');
      expect(detector.detectInputNeeded()).toBe(false);
    });

    it('should not detect informational messages', () => {
      detector.appendOutput('File saved successfully.');
      expect(detector.detectInputNeeded()).toBe(false);
    });

    it('should not detect mid-sentence questions', () => {
      detector.appendOutput('The question is whether this works, but we know it does.');
      expect(detector.detectInputNeeded()).toBe(false);
    });
  });

  describe('debouncing', () => {
    it('should debounce rapid detections', () => {
      detector.appendOutput('What do you want?');
      expect(detector.detectInputNeeded()).toBe(true);

      // Immediate second detection should be debounced
      detector.appendOutput('Which option?');
      expect(detector.detectInputNeeded()).toBe(false);
    });
  });

  describe('clearRecent', () => {
    it('should clear recent output', () => {
      detector.appendOutput('What do you want?');
      expect(detector.detectInputNeeded()).toBe(true);

      detector.clearRecent();
      expect(detector.getRecentOutput()).toBe('');
    });

    it('should reset debounce state', () => {
      detector.appendOutput('What do you want?');
      detector.detectInputNeeded();
      detector.clearRecent();

      // Should be able to detect again after clear
      detector.appendOutput('Which option?');
      expect(detector.detectInputNeeded()).toBe(true);
    });
  });

  describe('appendOutput', () => {
    it('should accumulate output', () => {
      detector.appendOutput('Hello ');
      detector.appendOutput('World');
      expect(detector.getRecentOutput()).toBe('Hello World');
    });

    it('should limit recent output size', () => {
      // Append more than maxRecentLength (2000)
      const longContent = 'x'.repeat(3000);
      detector.appendOutput(longContent);
      expect(detector.getRecentOutput().length).toBeLessThanOrEqual(2000);
    });

    it('should keep recent content when trimming', () => {
      const prefix = 'a'.repeat(1500);
      const suffix = 'What do you want?';
      detector.appendOutput(prefix);
      detector.appendOutput(suffix);

      // Should still detect the pattern in recent content
      expect(detector.detectInputNeeded()).toBe(true);
    });
  });

  describe('addPattern', () => {
    it('should allow adding custom patterns', () => {
      detector.addPattern(/CUSTOM_PROMPT:/);
      detector.appendOutput('CUSTOM_PROMPT: Enter value');
      expect(detector.detectInputNeeded()).toBe(true);
    });

    it('should work alongside default patterns', () => {
      detector.addPattern(/CUSTOM:/);

      detector.appendOutput('What do you want?');
      expect(detector.detectInputNeeded()).toBe(true);

      detector.clearRecent();

      detector.appendOutput('CUSTOM: test');
      expect(detector.detectInputNeeded()).toBe(true);
    });
  });

  describe('custom config', () => {
    it('should use custom debounce time', () => {
      const customDetector = new InputDetector({ debounceMs: 0 });

      customDetector.appendOutput('What?');
      expect(customDetector.detectInputNeeded()).toBe(true);

      customDetector.appendOutput('Which?');
      // With 0 debounce, should still detect (though timing is tricky)
      expect(customDetector.detectInputNeeded()).toBe(true);
    });
  });

  describe('DEFAULT_INPUT_PATTERNS', () => {
    it('should have reasonable number of patterns', () => {
      expect(DEFAULT_INPUT_PATTERNS.length).toBeGreaterThan(5);
    });

    it('should all be valid RegExp', () => {
      for (const pattern of DEFAULT_INPUT_PATTERNS) {
        expect(pattern).toBeInstanceOf(RegExp);
      }
    });
  });
});
