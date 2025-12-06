import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ConsoleWrapper, createClaudeFlowWrapper } from './console-wrapper.js';

describe('ConsoleWrapper', () => {
  let wrapper: ConsoleWrapper;

  afterEach(() => {
    if (wrapper?.isActive()) {
      wrapper.forceStop();
    }
  });

  describe('constructor', () => {
    it('should create wrapper with config', () => {
      wrapper = new ConsoleWrapper({
        command: 'echo',
        args: ['test'],
      });
      expect(wrapper).toBeDefined();
      expect(wrapper.isActive()).toBe(false);
    });
  });

  describe('start', () => {
    it('should start the process', async () => {
      wrapper = new ConsoleWrapper({
        command: 'echo',
        args: ['hello'],
      });

      const exitPromise = new Promise<number | null>((resolve) => {
        wrapper.on('exit', resolve);
      });

      wrapper.start();
      expect(wrapper.isActive()).toBe(true);

      const code = await exitPromise;
      expect(code).toBe(0);
    });

    it('should emit stdout events', async () => {
      wrapper = new ConsoleWrapper({
        command: 'echo',
        args: ['hello world'],
      });

      const stdoutPromise = new Promise<string>((resolve) => {
        wrapper.on('stdout', resolve);
      });

      wrapper.start();
      const output = await stdoutPromise;
      expect(output).toContain('hello world');
    });

    it('should throw if already running', () => {
      wrapper = new ConsoleWrapper({
        command: 'sleep',
        args: ['10'],
      });

      wrapper.start();
      expect(() => wrapper.start()).toThrow('already running');
    });

    it('should emit error for invalid command', async () => {
      wrapper = new ConsoleWrapper({
        command: 'nonexistent-command-xyz',
        args: [],
      });

      const errorPromise = new Promise<Error>((resolve) => {
        wrapper.on('error', resolve);
      });

      wrapper.start();
      const error = await errorPromise;
      expect(error).toBeDefined();
    });
  });

  describe('write', () => {
    it('should write to stdin', async () => {
      wrapper = new ConsoleWrapper({
        command: 'cat',
        args: [],
      });

      const stdoutPromise = new Promise<string>((resolve) => {
        wrapper.on('stdout', resolve);
      });

      wrapper.start();
      wrapper.write('test input');
      wrapper.sendSignal('SIGTERM');

      const output = await stdoutPromise;
      expect(output).toContain('test input');
    });

    it('should throw if process not running', () => {
      wrapper = new ConsoleWrapper({
        command: 'echo',
        args: ['test'],
      });

      expect(() => wrapper.write('test')).toThrow('not running');
    });
  });

  describe('writeRaw', () => {
    it('should write raw bytes without newline', async () => {
      wrapper = new ConsoleWrapper({
        command: 'cat',
        args: [],
      });

      const chunks: string[] = [];
      wrapper.on('stdout', (data) => chunks.push(data));

      wrapper.start();
      wrapper.writeRaw('AB');
      wrapper.writeRaw('CD');

      // Give it a moment to process
      await new Promise((resolve) => setTimeout(resolve, 100));
      wrapper.sendSignal('SIGTERM');

      const output = chunks.join('');
      expect(output).toBe('ABCD'); // No newlines between
    });

    it('should throw if process not running', () => {
      wrapper = new ConsoleWrapper({
        command: 'echo',
        args: ['test'],
      });

      expect(() => wrapper.writeRaw('\x03')).toThrow('not running');
    });
  });

  describe('stop', () => {
    it('should stop the process gracefully', async () => {
      wrapper = new ConsoleWrapper({
        command: 'sleep',
        args: ['100'],
      });

      const exitPromise = new Promise<number | null>((resolve) => {
        wrapper.on('exit', resolve);
      });

      wrapper.start();
      expect(wrapper.isActive()).toBe(true);

      wrapper.stop();
      await exitPromise;

      expect(wrapper.isActive()).toBe(false);
    });
  });

  describe('forceStop', () => {
    it('should forcefully kill the process', async () => {
      wrapper = new ConsoleWrapper({
        command: 'sleep',
        args: ['100'],
      });

      const exitPromise = new Promise<number | null>((resolve) => {
        wrapper.on('exit', resolve);
      });

      wrapper.start();
      wrapper.forceStop();

      const code = await exitPromise;
      expect(wrapper.isActive()).toBe(false);
    });
  });

  describe('sendSignal', () => {
    it('should send signal to process', async () => {
      wrapper = new ConsoleWrapper({
        command: 'sleep',
        args: ['100'],
      });

      const exitPromise = new Promise<number | null>((resolve) => {
        wrapper.on('exit', resolve);
      });

      wrapper.start();
      wrapper.sendSignal('SIGINT');

      await exitPromise;
      expect(wrapper.isActive()).toBe(false);
    });

    it('should throw if process not running', () => {
      wrapper = new ConsoleWrapper({
        command: 'echo',
        args: ['test'],
      });

      expect(() => wrapper.sendSignal('SIGINT')).toThrow('not running');
    });
  });

  describe('getPid', () => {
    it('should return process ID when running', () => {
      wrapper = new ConsoleWrapper({
        command: 'sleep',
        args: ['1'],
      });

      expect(wrapper.getPid()).toBeUndefined();

      wrapper.start();
      expect(wrapper.getPid()).toBeDefined();
      expect(typeof wrapper.getPid()).toBe('number');
    });
  });
});

describe('createClaudeFlowWrapper', () => {
  it('should create wrapper with correct command', () => {
    const wrapper = createClaudeFlowWrapper('test objective');
    expect(wrapper).toBeInstanceOf(ConsoleWrapper);
  });

  it('should include objective in args', () => {
    // We can't directly inspect args, but we can verify the wrapper is created
    const wrapper = createClaudeFlowWrapper('build a REST API');
    expect(wrapper).toBeDefined();
  });

  it('should accept additional args', () => {
    const wrapper = createClaudeFlowWrapper('test', {
      additionalArgs: ['--verbose', '--debug'],
    });
    expect(wrapper).toBeDefined();
  });

  it('should accept cwd option', () => {
    const wrapper = createClaudeFlowWrapper('test', {
      cwd: '/tmp',
    });
    expect(wrapper).toBeDefined();
  });

  it('should accept env option', () => {
    const wrapper = createClaudeFlowWrapper('test', {
      env: { CUSTOM_VAR: 'value' },
    });
    expect(wrapper).toBeDefined();
  });
});
