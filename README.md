# claude-flow-slack

Slack integration for claude-flow hive-mind. Interact with Claude Code sessions via Slack threads instead of the console.

## Features

- **Thread-based sessions**: Each hive-mind session creates a new thread in your Slack channel
- **Batched output**: Console output is buffered and batched to respect Slack rate limits
- **@mentions on input**: Automatically mentions you when Claude needs input
- **File uploads**: Upload files/images from Slack directly to Claude Code
- **Claude Code commands**: All Claude Code slash commands available via `!/command` syntax
- **Key sequences**: Send control keys like `!/key ctrl+o`, `!/key esc`
- **Session status**: Check session state with `!/status`

## Installation

```bash
npm install -g claude-flow-slack
```

Or install from source:

```bash
git clone https://github.com/eklypse3681/claude-flow-slack.git
cd claude-flow-slack
npm install
npm run build
npm link
```

## Slack App Setup

1. Go to [api.slack.com/apps](https://api.slack.com/apps) and create a new app
2. Choose "From scratch" and give it a name (e.g., "Claude Flow")
3. Go to **OAuth & Permissions** and add these Bot Token Scopes:
   - `channels:history` - Read messages in channels
   - `channels:read` - View basic channel info
   - `chat:write` - Send messages
   - `files:read` - Download files users share
   - `files:write` - Upload files
   - `users:read` - View user info (for mentions)

4. Go to **Socket Mode** and enable it
5. Generate an **App-Level Token** with `connections:write` scope
6. Go to **Event Subscriptions** and enable events. Subscribe to:
   - `message.channels` - Messages in public channels

7. Install the app to your workspace
8. Copy:
   - **Bot User OAuth Token** (starts with `xoxb-`)
   - **App-Level Token** (starts with `xapp-`)
   - **Channel ID** where sessions will post (right-click channel > View channel details)

## Configuration

Set these environment variables on your VM:

```bash
# Required
export SLACK_BOT_TOKEN="xoxb-your-bot-token"
export SLACK_APP_TOKEN="xapp-your-app-token"
export SLACK_CHANNEL_ID="C1234567890"

# Optional - user to @mention when input is needed
export SLACK_MENTION_USER_ID="U1234567890"
```

## Usage

Start a hive-mind session with Slack integration:

```bash
claude-flow-slack "Build a REST API for user management"
```

Or with options:

```bash
claude-flow-slack --objective "Fix the login bug" --cwd /path/to/project
```

### Slack Thread Commands

Once a session is running, interact via the Slack thread:

| Command | Description |
|---------|-------------|
| `!/help` | Show available commands |
| `!/status` | Show session status |
| `!/keys` | Show available key sequences |
| `!/key ctrl+o` | Send Ctrl+O (file picker) |
| `!/key esc` | Send Escape |
| `!/compact` | Compact conversation context |
| `!/clear` | Clear conversation history |
| `!/config` | View/modify configuration |
| `!/cost` | Show token usage and cost |
| `!/model` | View/change the model |

Regular messages (without `!/` prefix) are sent as input to Claude Code.

### File Uploads

Upload files or images directly in the Slack thread. They'll be downloaded and made available to Claude Code.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                            VM                                    │
│  ┌─────────────────┐       ┌─────────────────────────────────┐  │
│  │  claude-flow    │ stdin │                                 │  │
│  │  hive-mind      │◄──────│     claude-flow-slack           │  │
│  │  spawn          │       │                                 │  │
│  │                 │stdout │  ┌─────────┐    ┌───────────┐  │  │
│  │                 │──────►│  │ Buffer  │───►│ Slack API │  │  │
│  └─────────────────┘       │  └─────────┘    └───────────┘  │  │
│                            │        ▲              │         │  │
│                            │        │              ▼         │  │
│                            │  ┌─────────────────────────┐   │  │
│                            │  │   Input Detector        │   │  │
│                            │  │   Command Parser        │   │  │
│                            │  │   Key Handler           │   │  │
│                            │  └─────────────────────────┘   │  │
│                            └─────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                                        │
                                        │ WebSocket
                                        ▼
                              ┌─────────────────┐
                              │  Slack Thread   │
                              │  #hive-mind     │
                              └─────────────────┘
```

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Watch mode
npm run dev
```

## API

For programmatic usage:

```typescript
import { Session } from 'claude-flow-slack';

const session = new Session({
  slack: {
    botToken: process.env.SLACK_BOT_TOKEN,
    appToken: process.env.SLACK_APP_TOKEN,
    channelId: process.env.SLACK_CHANNEL_ID,
    mentionUserId: process.env.SLACK_MENTION_USER_ID,
  },
  objective: 'Build something amazing',
  cwd: '/path/to/project',
});

await session.start();
```

## License

MIT
