# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Craft Agents is an open-source Electron desktop app for multitasking with AI agents. Built on the Claude Agent SDK, it provides a document-centric workflow with MCP server integration, multi-session inbox management, and customizable permission modes.

**Key Principle:** This project is built with Craft Agents itself—no code editors. Any customization is just a prompt away.

## Commands

### Development
```bash
bun run electron:dev          # Hot reload development (recommended)
bun run electron:start        # Build and run once
bun run electron:dev:logs     # Tail Electron logs (macOS)
```

### Build
```bash
bun run electron:build        # Build all (main + preload + renderer + resources)
bun run electron:dist:mac     # Package for macOS
bun run electron:dist:win     # Package for Windows
bun run electron:dist:linux   # Package for Linux
```

### Quality
```bash
bun run typecheck:all         # Type check core + shared packages
bun run lint                  # Lint electron + shared
bun run lint:electron         # Lint electron app only
bun test                      # Run all tests
```

### Utilities
```bash
bun run fresh-start           # Reset all configuration
bun run fresh-start:token     # Reset auth token only
bun run print:system-prompt   # Debug system prompt generation
```

## Architecture

### Monorepo Structure
- **apps/electron/** - Desktop GUI (Electron + React + Vite)
- **packages/core/** - Shared TypeScript types (`@craft-agent/core`)
- **packages/shared/** - Business logic (`@craft-agent/shared`)
- **packages/ui/** - React components (`@craft-agent/ui`)
- **packages/mermaid/** - Diagram rendering (`@craft-agent/mermaid`)

### Electron Multi-Process Model
- **Main Process** (`apps/electron/src/main/`) - Window management, IPC handlers, agent sessions, filesystem access
- **Preload Script** (`apps/electron/src/preload/`) - Context bridge exposing `electronAPI`
- **Renderer Process** (`apps/electron/src/renderer/`) - React UI with Vite HMR

### Data Storage
All user data lives at `~/.craft-agent/`:
```
~/.craft-agent/
├── config.json              # Workspaces, auth type
├── credentials.enc          # AES-256-GCM encrypted credentials
├── preferences.json         # User preferences
├── theme.json               # App-level theme
└── workspaces/{id}/
    ├── sessions/            # Session JSONL files
    ├── sources/             # MCP servers, APIs, local filesystems
    ├── skills/              # Custom agent skills
    ├── statuses/            # Workflow status configuration
    └── permissions.json     # Workspace-level safety rules
```

## Key Concepts

### CraftAgent (`packages/shared/src/agent/craft-agent.ts`)
Wraps the Claude Agent SDK. Handles MCP connections, tool permissions via PreToolUse/PostToolUse hooks, large response summarization, and permission mode integration.

### Permission Modes (`packages/shared/src/agent/mode-manager.ts`)
Per-session permission system:
| Mode | Display | Behavior |
|------|---------|----------|
| `safe` | Explore | Read-only, blocks writes |
| `ask` | Ask to Edit | Prompts for approval (default) |
| `allow-all` | Auto | Auto-approves all commands |

**Keyboard shortcut:** SHIFT+TAB cycles modes in chat.

### Sources (`packages/shared/src/sources/`)
External data connections: MCP servers (stdio or SSE), REST APIs (Google, Slack, Microsoft), local filesystems. Each source has its own `config.json` and optional `guide.md`.

### Session-Scoped Tools (`packages/shared/src/agent/session-scoped-tools.ts`)
Tools for OAuth triggers, credential prompts, source testing, and plan submission. Use callback registry for events like `onOAuthSuccess`, `onSourcesChanged`.

### Theme System (`packages/shared/src/config/theme.ts`)
Cascading themes: app-level → workspace-level (last wins). 6-color system: `background`, `foreground`, `accent`, `info`, `success`, `destructive`. Dark mode via `dark: {}` overrides.

## Package Imports

Use subpath exports:
```typescript
import { CraftAgent } from '@craft-agent/shared/agent';
import { loadStoredConfig } from '@craft-agent/shared/config';
import { getCredentialManager } from '@craft-agent/shared/credentials';
import { CraftMcpClient } from '@craft-agent/shared/mcp';
import type { Session, Message } from '@craft-agent/core';
```

## Custom ESLint Rules

The Electron app enforces architectural patterns via custom rules in `apps/electron/eslint-rules/`:
- `no-direct-navigation-state` - Use `navigate()` function
- `no-localstorage` - Use config API instead
- `no-direct-platform-check` - Use Platform abstraction
- `no-hardcoded-path-separator` - Cross-platform path handling

## Security Notes

- **Credentials:** All secrets stored in AES-256-GCM encrypted file (`credentials.enc`)
- **MCP Isolation:** Sensitive env vars filtered when spawning local MCP servers
- **OAuth Separation:** Craft OAuth is only for Craft API, never for MCP authentication

## Environment Variables

OAuth integrations require credentials in `.env`:
```bash
GOOGLE_OAUTH_CLIENT_ID=...
GOOGLE_OAUTH_CLIENT_SECRET=...
SLACK_OAUTH_CLIENT_ID=...
SLACK_OAUTH_CLIENT_SECRET=...
MICROSOFT_OAUTH_CLIENT_ID=...
```

## Additional Documentation

- `packages/core/CLAUDE.md` - Type definitions reference
- `packages/shared/CLAUDE.md` - Business logic details
- `packages/shared/assets/docs/` - Feature documentation (themes, etc.)
