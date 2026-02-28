/**
 * Session storage interfaces and implementations
 * Supports in-memory (default) and file-based persistence
 */

/// <reference lib="esnext" />
/// <reference types="bun" />

import type { SDKMessage } from '../types/messages';
import type { PermissionMode } from '../permissions/types';
import type { HooksConfig } from '../hooks/types';
import type { OutputFormat } from '../types/output-format';

/** Session data structure for storage */
export interface SessionData {
  /** Unique session identifier */
  id: string;
  /** Model identifier (e.g., 'gpt-4o') */
  model: string;
  /** Provider identifier (e.g., 'openai') */
  provider: string;
  /** Session creation timestamp */
  createdAt: number;
  /** Last update timestamp */
  updatedAt: number;
  /** Message history */
  messages: SDKMessage[];
  /** Session options (excluding storage to avoid circular reference) */
  options: Omit<SessionOptions, 'storage'>;

  // Fork tracking fields
  /** Parent session ID if this session was forked */
  parentSessionId?: string;
  /** Timestamp when this session was forked */
  forkedAt?: number;
}

/** Session configuration options */
export interface SessionOptions {
  /** Model identifier (required) */
  model: string;
  /** Provider identifier (optional, defaults to auto-detect) */
  provider?: string;
  /** API key (optional, can use env var) */
  apiKey?: string;
  /** Maximum number of turns (optional) */
  maxTurns?: number;
  /** Allowed tool names (optional, defaults to all) */
  allowedTools?: string[];
  /** System prompt (optional) */
  systemPrompt?: string;
  /** Working directory (optional) */
  cwd?: string;
  /** Environment variables (optional) */
  env?: Record<string, string>;
  /** AbortController for cancellation (optional) */
  abortController?: AbortController;
  /** Storage implementation (optional, defaults to InMemoryStorage) */
  storage?: SessionStorage;
  /** Permission mode for the session (optional, default: 'default') */
  permissionMode?: PermissionMode;
  /** Required to be true when using bypassPermissions mode (optional) */
  allowDangerouslySkipPermissions?: boolean;
  /** MCP servers configuration (optional) */
  mcpServers?: Record<string, unknown>;
  /** Hooks configuration (optional) */
  hooks?: HooksConfig;
  /** Output format for structured responses (optional) */
  outputFormat?: OutputFormat;
  /** Enable file checkpointing for rollback support (optional) */
  enableFileCheckpointing?: boolean;
}

/** Storage interface for session persistence */
export interface SessionStorage {
  /** Save session data (writes header + all messages — used for initial creation and resume) */
  save(data: SessionData): Promise<void>;
  /**
   * Append a single message to an existing session.
   * Called immediately when each message is generated so data survives crashes.
   * The session must already exist (save() must have been called first).
   */
  append(id: string, message: SDKMessage): Promise<void>;
  /** Load session by ID, returns null if not found */
  load(id: string): Promise<SessionData | null>;
  /** Delete session by ID */
  delete(id: string): Promise<void>;
  /** List all session IDs */
  list(): Promise<string[]>;
  /** Check if session exists */
  exists(id: string): Promise<boolean>;
}

/** File storage options */
export interface FileStorageOptions {
  /** Directory path for session files (takes priority over cwd) */
  directory?: string;
  /** Working directory to derive project-grouped storage path */
  cwd?: string;
}

/** Encode a path for use as a directory name (replaces / with -) */
function encodePath(cwd: string): string {
  return cwd.replace(/\//g, '-');
}

/** Single entry in the sessions index */
interface SessionIndexEntry {
  id: string;
  firstPrompt: string;
  messageCount: number;
  created: number;
  modified: number;
}

/** Sessions index file structure */
interface SessionsIndex {
  projectPath: string;
  sessions: SessionIndexEntry[];
}

/**
 * In-memory storage implementation (default)
 * Data is lost when process exits
 */
export class InMemoryStorage implements SessionStorage {
  private sessions = new Map<string, SessionData>();

  async save(data: SessionData): Promise<void> {
    this.sessions.set(data.id, { ...data });
  }

  async append(id: string, message: SDKMessage): Promise<void> {
    const existing = this.sessions.get(id);
    if (existing) {
      existing.messages.push(message);
      existing.updatedAt = Date.now();
    }
  }

  async load(id: string): Promise<SessionData | null> {
    const data = this.sessions.get(id);
    return data ? { ...data } : null;
  }

  async delete(id: string): Promise<void> {
    this.sessions.delete(id);
  }

  async list(): Promise<string[]> {
    return Array.from(this.sessions.keys());
  }

  async exists(id: string): Promise<boolean> {
    return this.sessions.has(id);
  }
}

/**
 * JSONL session header - first line of each .jsonl file
 * Contains session metadata without the full message list
 */
interface SessionHeader {
  type: 'session_header';
  id: string;
  model: string;
  provider: string;
  createdAt: number;
  updatedAt: number;
  options: Omit<SessionOptions, 'storage'>;
  parentSessionId?: string;
  forkedAt?: number;
}

/**
 * File-based storage implementation
 * Persists sessions as JSONL files: first line is session header, subsequent lines are SDKMessages
 */
export class FileStorage implements SessionStorage {
  private directory: string;

  constructor(options: FileStorageOptions = {}) {
    const homeDir = process.env.HOME || process.env.USERPROFILE || '.';
    if (options.directory) {
      this.directory = options.directory;
    } else if (options.cwd) {
      this.directory = `${homeDir}/.open-agent/projects/${encodePath(options.cwd)}`;
    } else {
      this.directory = `${homeDir}/.open-agent/sessions`;
    }
  }

  private get indexPath(): string {
    return `${this.directory}/sessions-index.json`;
  }

  private async readIndex(): Promise<SessionsIndex> {
    const file = Bun.file(this.indexPath);
    const text = await file.text();
    return JSON.parse(text) as SessionsIndex;
  }

  private async writeIndex(index: SessionsIndex): Promise<void> {
    await Bun.write(this.indexPath, JSON.stringify(index, null, 2) + '\n');
  }

  private async upsertIndexEntry(data: SessionData): Promise<void> {
    let index: SessionsIndex;
    try {
      index = await this.readIndex();
    } catch {
      index = { projectPath: '', sessions: [] };
    }

    const firstUserMessage = data.messages.find(
      (m) => m.type === 'user'
    );
    let firstPrompt = '';
    if (firstUserMessage && firstUserMessage.type === 'user') {
      const content = firstUserMessage.message.content;
      firstPrompt = typeof content === 'string' ? content : '';
    }

    const entry: SessionIndexEntry = {
      id: data.id,
      firstPrompt,
      messageCount: data.messages.length,
      created: data.createdAt,
      modified: data.updatedAt,
    };

    const idx = index.sessions.findIndex((s) => s.id === data.id);
    if (idx >= 0) {
      index.sessions[idx] = entry;
    } else {
      index.sessions.push(entry);
    }

    await this.writeIndex(index);
  }

  private async removeIndexEntry(id: string): Promise<void> {
    try {
      const index = await this.readIndex();
      index.sessions = index.sessions.filter((s) => s.id !== id);
      await this.writeIndex(index);
    } catch {
      // Index missing — nothing to remove
    }
  }

  private getFilePath(id: string): string {
    // Validate ID is UUID format (auto-generated by SDK)
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      throw new Error(
        `Invalid session ID format: ${id}. Expected UUID format (e.g., 550e8400-e29b-41d4-a716-446655440000). ` +
        `Custom session IDs are not supported in v0.2.0.`
      );
    }
    return `${this.directory}/${id}.jsonl`;
  }

  async save(data: SessionData): Promise<void> {
    const filePath = this.getFilePath(data.id);

    // Ensure directory exists
    await this.ensureDir(this.directory);

    // First line: session header (metadata)
    const header: SessionHeader = {
      type: 'session_header',
      id: data.id,
      model: data.model,
      provider: data.provider,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
      options: data.options,
      parentSessionId: data.parentSessionId,
      forkedAt: data.forkedAt,
    };

    const lines: string[] = [JSON.stringify(header)];

    // Subsequent lines: one SDKMessage per line
    for (const message of data.messages) {
      lines.push(JSON.stringify(message));
    }

    await Bun.write(filePath, lines.join('\n') + '\n');
    await this.upsertIndexEntry(data);
  }

  async append(id: string, message: SDKMessage): Promise<void> {
    const filePath = this.getFilePath(id);

    const file = Bun.file(filePath);
    if (!(await file.exists())) {
      // File doesn't exist yet (createSession not called first) — skip silently
      return;
    }

    const { appendFileSync } = await import('fs');
    appendFileSync(filePath, JSON.stringify(message) + '\n');
  }

  async load(id: string): Promise<SessionData | null> {
    const filePath = this.getFilePath(id);

    try {
      const file = Bun.file(filePath);
      if (!(await file.exists())) {
        return null;
      }
      const content = await file.text();
      const lines = content.split('\n').filter((l) => l.trim() !== '');
      if (lines.length === 0) {
        return null;
      }

      const header = JSON.parse(lines[0]) as SessionHeader;
      if (header.type !== 'session_header') {
        return null;
      }

      const messages: SDKMessage[] = [];
      for (const line of lines.slice(1)) {
        messages.push(JSON.parse(line) as SDKMessage);
      }

      return {
        id: header.id,
        model: header.model,
        provider: header.provider,
        createdAt: header.createdAt,
        updatedAt: header.updatedAt,
        messages,
        options: header.options,
        parentSessionId: header.parentSessionId,
        forkedAt: header.forkedAt,
      };
    } catch {
      return null;
    }
  }

  async delete(id: string): Promise<void> {
    const filePath = this.getFilePath(id);

    try {
      const file = Bun.file(filePath);
      if (await file.exists()) {
        await file.delete();
      }
    } catch {
      // Ignore errors for non-existent files
    }
    await this.removeIndexEntry(id);
  }

  async list(): Promise<string[]> {
    try {
      const idx = await this.readIndex();
      return idx.sessions.map((s) => s.id);
    } catch {
      // Fallback: directory scan
      try {
        const proc = Bun.spawn(['ls', '-1', this.directory]);
        const output = await new Response(proc.stdout).text();
        return output
          .split('\n')
          .filter((f) => f.endsWith('.jsonl'))
          .map((f) => f.replace(/\.jsonl$/, ''))
          .filter((id) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id));
      } catch {
        return [];
      }
    }
  }

  async exists(id: string): Promise<boolean> {
    const filePath = this.getFilePath(id);
    try {
      return await Bun.file(filePath).exists();
    } catch {
      return false;
    }
  }

  private async ensureDir(dir: string): Promise<void> {
    await Bun.spawn(['mkdir', '-p', dir]).exited;
  }
}
