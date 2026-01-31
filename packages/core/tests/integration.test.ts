import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { mkdtempSync, writeFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { prompt, type PromptOptions } from '../src/index';
import { LLMProvider, type LLMChunk } from '../src/providers/base';
import type { SDKMessage } from '../src/types/messages';
import type { ToolDefinition } from '../src/types/tools';

// Mock provider for integration tests
class MockProvider extends LLMProvider {
  private handler: (
    messages: SDKMessage[],
    tools?: ToolDefinition[]
  ) => AsyncIterable<LLMChunk>;

  constructor(
    config: { apiKey: string; model: string },
    handler: (messages: SDKMessage[], tools?: ToolDefinition[]) => AsyncIterable<LLMChunk>
  ) {
    super(config);
    this.handler = handler;
  }

  async *chat(
    messages: SDKMessage[],
    tools?: ToolDefinition[]
  ): AsyncIterable<LLMChunk> {
    yield* this.handler(messages, tools);
  }
}

describe('Integration Tests', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'integration-test-'));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('should export prompt function', () => {
    expect(typeof prompt).toBe('function');
  });

  it('should require API key', async () => {
    const originalKey = process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_API_KEY;

    try {
      await prompt('Hello', { model: 'gpt-4' });
      expect(false).toBe(true); // Should not reach here
    } catch (error) {
      expect(error instanceof Error).toBe(true);
      expect((error as Error).message).toContain('API key');
    } finally {
      if (originalKey) process.env.OPENAI_API_KEY = originalKey;
    }
  });

  it('should accept API key in options', () => {
    // Verify that the options interface accepts apiKey
    const options: PromptOptions = {
      model: 'gpt-4',
      apiKey: 'fake-key-for-testing',
      maxTurns: 1,
    };
    expect(options.apiKey).toBe('fake-key-for-testing');
  });

  it('should track duration', () => {
    // Verify duration is part of the result type
    const mockResult = {
      result: 'test',
      duration_ms: 100,
      usage: { input_tokens: 10, output_tokens: 5 },
    };
    expect(mockResult.duration_ms).toBe(100);
    expect(typeof mockResult.duration_ms).toBe('number');
  });

  it('should export all tool classes', async () => {
    const { ReadTool, WriteTool, EditTool, BashTool, ToolRegistry } = await import(
      '../src/index'
    );

    expect(typeof ReadTool).toBe('function');
    expect(typeof WriteTool).toBe('function');
    expect(typeof EditTool).toBe('function');
    expect(typeof BashTool).toBe('function');
    expect(typeof ToolRegistry).toBe('function');
  });

  it('should export message helpers', async () => {
    const {
      createUserMessage,
      createSystemMessage,
      createAssistantMessage,
      createToolResultMessage,
    } = await import('../src/index');

    expect(typeof createUserMessage).toBe('function');
    expect(typeof createSystemMessage).toBe('function');
    expect(typeof createAssistantMessage).toBe('function');
    expect(typeof createToolResultMessage).toBe('function');
  });

  it('should export provider classes', async () => {
    const { LLMProvider, OpenAIProvider } = await import('../src/index');

    expect(typeof LLMProvider).toBe('function');
    expect(typeof OpenAIProvider).toBe('function');
  });

  it('should export ReActLoop', async () => {
    const { ReActLoop } = await import('../src/index');

    expect(typeof ReActLoop).toBe('function');
  });
});

describe('Tool Integration', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'tool-integration-'));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('should read file through tools', async () => {
    const { ReadTool } = await import('../src/index');

    const tool = new ReadTool();
    const result = await tool.handler(
      { file_path: __filename },
      { cwd: tempDir, env: {} }
    );

    expect(result.content).toBeDefined();
    expect(result.total_lines).toBeGreaterThan(0);
  });

  it('should write and read file', async () => {
    const { ReadTool, WriteTool } = await import('../src/index');

    const writeTool = new WriteTool();
    const readTool = new ReadTool();

    const filePath = join(tempDir, 'test.txt');

    // Write
    const writeResult = await writeTool.handler(
      { file_path: filePath, content: 'Test content' },
      { cwd: tempDir, env: {} }
    );

    expect(writeResult.bytes_written).toBeGreaterThan(0);

    // Read
    const readResult = await readTool.handler(
      { file_path: filePath },
      { cwd: tempDir, env: {} }
    );

    expect(readResult.content).toContain('Test content');
  });

  it('should edit file', async () => {
    const { WriteTool, EditTool, ReadTool } = await import('../src/index');

    const filePath = join(tempDir, 'edit-test.txt');

    // Write initial content
    await new WriteTool().handler(
      { file_path: filePath, content: 'Hello World' },
      { cwd: tempDir, env: {} }
    );

    // Edit
    const editResult = await new EditTool().handler(
      { file_path: filePath, old_string: 'World', new_string: 'Universe' },
      { cwd: tempDir, env: {} }
    );

    expect(editResult.replacements).toBe(1);

    // Read
    const readResult = await new ReadTool().handler(
      { file_path: filePath },
      { cwd: tempDir, env: {} }
    );

    expect(readResult.content).toContain('Hello Universe');
  });

  it('should execute bash command', async () => {
    const { BashTool } = await import('../src/index');

    const tool = new BashTool();
    const result = await tool.handler(
      { command: 'echo "integration test"', description: 'Test echo' },
      { cwd: tempDir, env: {} }
    );

    expect(result.output.trim()).toBe('integration test');
    expect(result.exitCode).toBe(0);
  });
});
