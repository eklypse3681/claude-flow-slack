import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { SlackFileUpload } from './types.js';

export interface FileHandlerConfig {
  downloadDir: string;
  maxFileSize: number;
  allowedMimeTypes: string[];
}

export const DEFAULT_FILE_HANDLER_CONFIG: FileHandlerConfig = {
  downloadDir: path.join(os.tmpdir(), 'claude-flow-slack'),
  maxFileSize: 50 * 1024 * 1024, // 50MB
  allowedMimeTypes: [
    'text/plain',
    'text/markdown',
    'text/csv',
    'text/html',
    'text/css',
    'text/javascript',
    'application/json',
    'application/xml',
    'application/javascript',
    'application/typescript',
    'image/png',
    'image/jpeg',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    'application/pdf',
  ],
};

export class FileHandler {
  private config: FileHandlerConfig;

  constructor(config: Partial<FileHandlerConfig> = {}) {
    this.config = { ...DEFAULT_FILE_HANDLER_CONFIG, ...config };
    this.ensureDownloadDir();
  }

  private ensureDownloadDir(): void {
    if (!fs.existsSync(this.config.downloadDir)) {
      fs.mkdirSync(this.config.downloadDir, { recursive: true });
    }
  }

  isAllowedMimeType(mimetype: string): boolean {
    // Be permissive - allow common code/text files
    if (mimetype.startsWith('text/')) return true;
    if (mimetype.startsWith('image/')) return true;
    return this.config.allowedMimeTypes.includes(mimetype);
  }

  generateLocalPath(file: SlackFileUpload): string {
    const timestamp = Date.now();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    return path.join(this.config.downloadDir, `${timestamp}-${safeName}`);
  }

  async saveFile(content: Buffer, localPath: string): Promise<void> {
    await fs.promises.writeFile(localPath, content);
  }

  async readFile(localPath: string): Promise<Buffer> {
    return fs.promises.readFile(localPath);
  }

  async deleteFile(localPath: string): Promise<void> {
    try {
      await fs.promises.unlink(localPath);
    } catch (error) {
      // Ignore errors if file doesn't exist
    }
  }

  async cleanup(): Promise<void> {
    try {
      const files = await fs.promises.readdir(this.config.downloadDir);
      const now = Date.now();
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours

      for (const file of files) {
        const filePath = path.join(this.config.downloadDir, file);
        const stats = await fs.promises.stat(filePath);

        if (now - stats.mtimeMs > maxAge) {
          await this.deleteFile(filePath);
        }
      }
    } catch (error) {
      // Ignore cleanup errors
    }
  }

  formatFileReference(localPath: string): string {
    return `[File saved to: ${localPath}]`;
  }

  getDownloadDir(): string {
    return this.config.downloadDir;
  }
}
