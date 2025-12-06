export interface SlackConfig {
  botToken: string;
  appToken: string;
  channelId: string;
  mentionUserId?: string;
}

export interface SessionState {
  threadTs: string | null;
  channelId: string;
  startedAt: Date;
  objective: string;
  status: 'initializing' | 'running' | 'waiting_for_input' | 'completed' | 'error';
  lastActivity: Date;
  messageCount: number;
}

export interface BufferedMessage {
  content: string;
  timestamp: Date;
  source: 'stdout' | 'stderr';
}

export interface SlackCommand {
  name: string;
  args: string[];
  raw: string;
}

export interface SlackFileUpload {
  id: string;
  name: string;
  mimetype: string;
  url: string;
  localPath?: string;
}

export interface InputRequest {
  prompt: string;
  timestamp: Date;
}
