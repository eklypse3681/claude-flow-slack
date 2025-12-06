import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { FileHandler, DEFAULT_FILE_HANDLER_CONFIG } from './file-handler.js';

describe('FileHandler', () => {
  let handler: FileHandler;
  let testDir: string;

  beforeEach(() => {
    testDir = path.join(os.tmpdir(), `claude-flow-slack-test-${Date.now()}`);
    handler = new FileHandler({ downloadDir: testDir });
  });

  afterEach(async () => {
    await handler.cleanup();
    try {
      fs.rmSync(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('constructor', () => {
    it('should create download directory', () => {
      expect(fs.existsSync(testDir)).toBe(true);
    });

    it('should use default config values', () => {
      const defaultHandler = new FileHandler();
      expect(defaultHandler.getDownloadDir()).toBe(DEFAULT_FILE_HANDLER_CONFIG.downloadDir);
    });
  });

  describe('isAllowedMimeType', () => {
    it('should allow text mime types', () => {
      expect(handler.isAllowedMimeType('text/plain')).toBe(true);
      expect(handler.isAllowedMimeType('text/markdown')).toBe(true);
      expect(handler.isAllowedMimeType('text/csv')).toBe(true);
      expect(handler.isAllowedMimeType('text/html')).toBe(true);
      expect(handler.isAllowedMimeType('text/javascript')).toBe(true);
    });

    it('should allow image mime types', () => {
      expect(handler.isAllowedMimeType('image/png')).toBe(true);
      expect(handler.isAllowedMimeType('image/jpeg')).toBe(true);
      expect(handler.isAllowedMimeType('image/gif')).toBe(true);
      expect(handler.isAllowedMimeType('image/webp')).toBe(true);
      expect(handler.isAllowedMimeType('image/svg+xml')).toBe(true);
    });

    it('should allow application mime types in allowlist', () => {
      expect(handler.isAllowedMimeType('application/json')).toBe(true);
      expect(handler.isAllowedMimeType('application/pdf')).toBe(true);
      expect(handler.isAllowedMimeType('application/javascript')).toBe(true);
    });

    it('should allow any text/* types', () => {
      expect(handler.isAllowedMimeType('text/x-python')).toBe(true);
      expect(handler.isAllowedMimeType('text/x-typescript')).toBe(true);
    });

    it('should allow any image/* types', () => {
      expect(handler.isAllowedMimeType('image/bmp')).toBe(true);
      expect(handler.isAllowedMimeType('image/tiff')).toBe(true);
    });

    it('should reject disallowed types', () => {
      expect(handler.isAllowedMimeType('application/octet-stream')).toBe(false);
      expect(handler.isAllowedMimeType('application/x-executable')).toBe(false);
      expect(handler.isAllowedMimeType('video/mp4')).toBe(false);
    });
  });

  describe('generateLocalPath', () => {
    it('should generate path in download directory', () => {
      const file = { id: '1', name: 'test.txt', mimetype: 'text/plain', url: 'http://example.com/test.txt' };
      const localPath = handler.generateLocalPath(file);
      expect(localPath.startsWith(testDir)).toBe(true);
    });

    it('should include filename', () => {
      const file = { id: '1', name: 'myfile.txt', mimetype: 'text/plain', url: 'http://example.com/test.txt' };
      const localPath = handler.generateLocalPath(file);
      expect(localPath).toContain('myfile.txt');
    });

    it('should sanitize filenames', () => {
      const file = { id: '1', name: 'bad<name>.txt', mimetype: 'text/plain', url: 'http://example.com/test.txt' };
      const localPath = handler.generateLocalPath(file);
      expect(localPath).not.toContain('<');
      expect(localPath).not.toContain('>');
    });

    it('should add timestamp prefix', () => {
      const file = { id: '1', name: 'test.txt', mimetype: 'text/plain', url: 'http://example.com/test.txt' };
      const localPath = handler.generateLocalPath(file);
      // Path should have timestamp-filename pattern
      const basename = path.basename(localPath);
      expect(basename).toMatch(/^\d+-test\.txt$/);
    });
  });

  describe('saveFile', () => {
    it('should save file content', async () => {
      const content = Buffer.from('test content');
      const filePath = path.join(testDir, 'test-save.txt');

      await handler.saveFile(content, filePath);

      expect(fs.existsSync(filePath)).toBe(true);
      expect(fs.readFileSync(filePath).toString()).toBe('test content');
    });
  });

  describe('readFile', () => {
    it('should read file content', async () => {
      const filePath = path.join(testDir, 'test-read.txt');
      fs.writeFileSync(filePath, 'read test');

      const content = await handler.readFile(filePath);
      expect(content.toString()).toBe('read test');
    });
  });

  describe('deleteFile', () => {
    it('should delete existing file', async () => {
      const filePath = path.join(testDir, 'test-delete.txt');
      fs.writeFileSync(filePath, 'delete me');

      await handler.deleteFile(filePath);
      expect(fs.existsSync(filePath)).toBe(false);
    });

    it('should not throw for non-existent file', async () => {
      await expect(handler.deleteFile('/nonexistent/path.txt')).resolves.toBeUndefined();
    });
  });

  describe('formatFileReference', () => {
    it('should format file reference', () => {
      const ref = handler.formatFileReference('/path/to/file.txt');
      expect(ref).toContain('/path/to/file.txt');
      expect(ref).toContain('File saved');
    });
  });

  describe('cleanup', () => {
    it('should delete old files', async () => {
      // Create a file and backdate its mtime
      const oldFile = path.join(testDir, 'old-file.txt');
      fs.writeFileSync(oldFile, 'old content');

      // Set mtime to 2 days ago
      const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
      fs.utimesSync(oldFile, twoDaysAgo, twoDaysAgo);

      await handler.cleanup();
      expect(fs.existsSync(oldFile)).toBe(false);
    });

    it('should keep recent files', async () => {
      const recentFile = path.join(testDir, 'recent-file.txt');
      fs.writeFileSync(recentFile, 'recent content');

      await handler.cleanup();
      expect(fs.existsSync(recentFile)).toBe(true);
    });
  });

  describe('getDownloadDir', () => {
    it('should return download directory', () => {
      expect(handler.getDownloadDir()).toBe(testDir);
    });
  });

  describe('DEFAULT_FILE_HANDLER_CONFIG', () => {
    it('should have reasonable defaults', () => {
      expect(DEFAULT_FILE_HANDLER_CONFIG.maxFileSize).toBeGreaterThan(0);
      expect(DEFAULT_FILE_HANDLER_CONFIG.allowedMimeTypes.length).toBeGreaterThan(0);
      expect(DEFAULT_FILE_HANDLER_CONFIG.downloadDir).toBeTruthy();
    });
  });
});
