import { describe, it, expect } from 'bun:test';
import { Session, SessionState, SessionError, SessionNotIdleError, SessionNotReadyError, SessionAlreadyStreamingError, SessionClosedError } from '../../src/session/session';
import { ReActLoop } from '../../src/agent/react-loop';
import { ToolRegistry } from '../../src/tools/registry';
import { LLMProvider, type LLMChunk } from '../../src/providers/base';
import type { SDKMessage } from '../../src/types/messages';
import type { ToolDefinition } from '../../src/types/tools';

// Mock provider for testing
class MockProvider extends LLMProvider {
  private responses: SDKMessage[][] = [];
  private currentIndex = 0;
  private originalChat: typeof MockProvider.prototype.chat;

  constructor(config: { apiKey: string; model: string }) {
    super(config);
    this.originalChat = MockProvider.prototype.chat.bind(this);
  }

  setResponses(responses: SDKMessage[][]) {
    this.responses = responses;
    this.currentIndex = 0;
    // Reset chat method to original implementation
    this.chat = this.originalChat;
  }

  async *chat(
    messages: SDKMessage[],
    tools?: ToolDefinition[]
  ): AsyncIterable<LLMChunk> {
    const response = this.responses[this.currentIndex++];
    if (!response) {
      yield { type: 'done' };
      return;
    }

    const assistantMsg = response.find((m) => m.type === 'assistant');
    if (assistantMsg && 'content' in assistantMsg) {
      if (assistantMsg.content) {
        yield { type: 'content', delta: assistantMsg.content };
      }
      if ('tool_calls' in assistantMsg && assistantMsg.tool_calls) {
        for (const tc of assistantMsg.tool_calls) {
          yield {
            type: 'tool_call',
            tool_call: {
              id: tc.id,
              name: tc.function.name,
              arguments: tc.function.arguments,
            },
          };
        }
      }
    }

    yield { type: 'usage', usage: { input_tokens: 10, output_tokens: 5 } };
    yield { type: 'done' };
  }
}

describe('Session', () => {
  function createTestSession(): { session: Session; mockProvider: MockProvider; registry: ToolRegistry } {
    const registry = new ToolRegistry();
    const mockProvider = new MockProvider({ apiKey: 'test', model: 'test' });
    const loop = new ReActLoop(mockProvider, registry, { maxTurns: 5 });
    const session = new Session(loop, { model: 'test-model', provider: 'test-provider' });
    return { session, mockProvider, registry };
  }

  describe('creation', () => {
    it('should create session with correct properties', () => {
      const { session } = createTestSession();

      expect(session.id).toBeDefined();
      expect(session.model).toBe('test-model');
      expect(session.provider).toBe('test-provider');
      expect(session.createdAt).toBeGreaterThan(0);
      expect(session.state).toBe(SessionState.IDLE);
    });

    it('should generate unique IDs for different sessions', () => {
      const { session: session1 } = createTestSession();
      const { session: session2 } = createTestSession();

      expect(session1.id).not.toBe(session2.id);
    });
  });

  describe('send()', () => {
    it('should add user message and change state to ready', async () => {
      const { session } = createTestSession();

      expect(session.state).toBe(SessionState.IDLE);

      await session.send('Hello');

      expect(session.state).toBe(SessionState.READY);
      const messages = session.getMessages();
      expect(messages).toHaveLength(1);
      expect(messages[0].type).toBe('user');
    });

    it('should throw when send() called in non-idle state', async () => {
      const { session } = createTestSession();

      await session.send('Hello');
      expect(session.state).toBe(SessionState.READY);

      await expect(session.send('Another message')).rejects.toThrow(SessionNotIdleError);
    });

    it('should throw when send() called in closed state', async () => {
      const { session } = createTestSession();

      await session.close();
      expect(session.state).toBe(SessionState.CLOSED);

      await expect(session.send('Hello')).rejects.toThrow(SessionClosedError);
    });
  });

  describe('stream()', () => {
    it('should yield messages and change state', async () => {
      const { session, mockProvider } = createTestSession();

      mockProvider.setResponses([
        [{ type: 'assistant', content: 'Response' }],
      ]);

      await session.send('Hello');
      expect(session.state).toBe(SessionState.READY);

      const messages: SDKMessage[] = [];
      for await (const message of session.stream()) {
        messages.push(message);
      }

      expect(messages.length).toBeGreaterThan(0);
      expect(session.state).toBe(SessionState.IDLE);
    });

    it('should throw when stream() called in non-ready state', async () => {
      const { session } = createTestSession();

      expect(session.state).toBe(SessionState.IDLE);

      const generator = session.stream();
      await expect(generator.next()).rejects.toThrow(SessionNotReadyError);
    });

    it('should prevent concurrent stream calls', async () => {
      const { session, mockProvider } = createTestSession();

      mockProvider.setResponses([
        [{ type: 'assistant', content: 'Response 1' }],
        [{ type: 'assistant', content: 'Response 2' }],
      ]);

      await session.send('Hello');

      // Start first stream
      const stream1 = session.stream();
      await stream1.next(); // Start the stream

      // Try to start second stream while first is running
      const stream2 = session.stream();
      await expect(stream2.next()).rejects.toThrow(SessionAlreadyStreamingError);

      // Complete first stream
      for await (const _ of stream1) {
        // Consume remaining messages
      }
    });

    it('should yield assistant messages during stream', async () => {
      const { session, mockProvider } = createTestSession();

      mockProvider.setResponses([
        [{ type: 'assistant', content: 'Hello there' }],
      ]);

      await session.send('Hi');

      const messages: SDKMessage[] = [];
      for await (const message of session.stream()) {
        messages.push(message);
      }

      const assistantMessages = messages.filter((m) => m.type === 'assistant');
      expect(assistantMessages.length).toBeGreaterThan(0);
    });

    it('should yield tool_result messages during stream', async () => {
      const { session, mockProvider, registry } = createTestSession();

      // Import ReadTool for this test
      const { ReadTool } = await import('../../src/tools/read');
      registry.register(new ReadTool());

      mockProvider.setResponses([
        [
          {
            type: 'assistant',
            content: '',
            tool_calls: [
              {
                id: 'call_1',
                type: 'function',
                function: {
                  name: 'Read',
                  arguments: JSON.stringify({ file_path: '/nonexistent.txt' }),
                },
              },
            ],
          },
        ],
        [{ type: 'assistant', content: 'Done' }],
      ]);

      await session.send('Read a file');

      const messages: SDKMessage[] = [];
      for await (const message of session.stream()) {
        messages.push(message);
      }

      const toolResultMessages = messages.filter((m) => m.type === 'tool_result');
      expect(toolResultMessages.length).toBeGreaterThan(0);
    });
  });

  describe('getMessages()', () => {
    it('should return readonly message history', async () => {
      const { session, mockProvider } = createTestSession();

      mockProvider.setResponses([
        [{ type: 'assistant', content: 'Response' }],
      ]);

      await session.send('Hello');

      for await (const _ of session.stream()) {
        // Consume stream
      }

      const messages = session.getMessages();
      expect(messages.length).toBeGreaterThan(0);

      // Should be readonly - attempting to modify should not affect internal state
      // (TypeScript would catch this at compile time)
    });
  });

  describe('close()', () => {
    it('should change state to closed', async () => {
      const { session } = createTestSession();

      expect(session.state).toBe(SessionState.IDLE);

      await session.close();

      expect(session.state).toBe(SessionState.CLOSED);
    });

    it('should throw when operations called after close', async () => {
      const { session } = createTestSession();

      await session.close();

      await expect(session.send('Hello')).rejects.toThrow(SessionClosedError);

      const generator = session.stream();
      await expect(generator.next()).rejects.toThrow(SessionClosedError);
    });
  });

  describe('async dispose pattern', () => {
    it('should support await using pattern', async () => {
      const { session } = createTestSession();

      // Test that the session has the asyncDispose symbol method
      expect(typeof session[Symbol.asyncDispose]).toBe('function');

      // Call it directly to verify it closes the session
      await session[Symbol.asyncDispose]();

      expect(session.state).toBe(SessionState.CLOSED);
    });
  });

  describe('state transitions', () => {
    it('should follow correct state transitions: idle -> ready -> running -> idle', async () => {
      const { session, mockProvider } = createTestSession();

      mockProvider.setResponses([
        [{ type: 'assistant', content: 'Response' }],
      ]);

      expect(session.state).toBe(SessionState.IDLE);

      await session.send('Hello');
      expect(session.state).toBe(SessionState.READY);

      const stream = session.stream();
      await stream.next(); // Start streaming
      expect(session.state).toBe(SessionState.RUNNING);

      for await (const _ of stream) {
        // Complete stream
      }
      expect(session.state).toBe(SessionState.IDLE);
    });

    it('should transition to error state on error and back to idle', async () => {
      const { session, mockProvider } = createTestSession();

      // Mock provider that throws an error
      mockProvider.setResponses([]);

      await session.send('Hello');

      // Override the provider's chat method to throw
      const originalChat = mockProvider.chat.bind(mockProvider);
      mockProvider.chat = async function* () {
        throw new Error('Test error');
      };

      try {
        for await (const _ of session.stream()) {
          // This should throw
        }
      } catch (e) {
        // Expected
      }

      // After error, should be back to idle (or error state depending on implementation)
      // The session should be recoverable
      expect(session.state === SessionState.IDLE || session.state === SessionState.ERROR).toBe(true);
    });

    it('should be recoverable after error', async () => {
      const { session, mockProvider } = createTestSession();

      // First call fails
      await session.send('Hello');
      mockProvider.chat = async function* () {
        throw new Error('Test error');
      };

      try {
        for await (const _ of session.stream()) {}
      } catch {
        // Expected
      }

      // Session should be recoverable (back to IDLE)
      expect(session.state).toBe(SessionState.IDLE);

      // Second call should succeed
      mockProvider.setResponses([[{ type: 'assistant', content: 'Recovered' }]]);
      await session.send('Try again');

      const messages: SDKMessage[] = [];
      for await (const message of session.stream()) {
        messages.push(message);
      }

      expect(session.state).toBe(SessionState.IDLE);
      expect(messages.length).toBeGreaterThan(0);
    });
  });

  describe('multi-turn conversation', () => {
    it('should support multiple send/stream cycles', async () => {
      const { session, mockProvider } = createTestSession();

      // First turn
      mockProvider.setResponses([[{ type: 'assistant', content: 'Response 1' }]]);
      await session.send('Hello');

      for await (const _ of session.stream()) {}

      expect(session.state).toBe(SessionState.IDLE);
      expect(session.getMessages()).toHaveLength(2); // user + assistant

      // Second turn
      mockProvider.setResponses([[{ type: 'assistant', content: 'Response 2' }]]);
      await session.send('How are you?');

      for await (const _ of session.stream()) {}

      expect(session.state).toBe(SessionState.IDLE);
      expect(session.getMessages()).toHaveLength(4); // 2 user + 2 assistant

      // Third turn
      mockProvider.setResponses([[{ type: 'assistant', content: 'Response 3' }]]);
      await session.send('Goodbye');

      const finalMessages: SDKMessage[] = [];
      for await (const message of session.stream()) {
        finalMessages.push(message);
      }

      expect(session.state).toBe(SessionState.IDLE);
      expect(session.getMessages()).toHaveLength(6);
      expect(finalMessages[0].type).toBe('assistant');
    });

    it('should accumulate message history correctly', async () => {
      const { session, mockProvider } = createTestSession();

      mockProvider.setResponses([
        [{ type: 'assistant', content: 'First reply' }],
        [{ type: 'assistant', content: 'Second reply' }],
      ]);

      // First turn
      await session.send('Message 1');
      for await (const _ of session.stream()) {}

      const history1 = session.getMessages();
      expect(history1[0].type).toBe('user');
      expect(history1[1].type).toBe('assistant');

      // Second turn - history should be preserved
      await session.send('Message 2');
      for await (const _ of session.stream()) {}

      const history2 = session.getMessages();
      expect(history2).toHaveLength(4);
      expect(history2[0].type).toBe('user');
      expect(history2[1].type).toBe('assistant');
      expect(history2[2].type).toBe('user');
      expect(history2[3].type).toBe('assistant');
    });
  });

  describe('concurrency constraints', () => {
    it('should throw when send() called during streaming', async () => {
      const { session, mockProvider } = createTestSession();

      mockProvider.setResponses([[{ type: 'assistant', content: 'Long response...' }]]);

      await session.send('Hello');
      const stream = session.stream();
      await stream.next(); // Start streaming

      expect(session.state).toBe(SessionState.RUNNING);

      // Should reject send() during streaming
      await expect(session.send('Another message')).rejects.toThrow(SessionNotIdleError);

      // Clean up
      for await (const _ of stream) {}
    });
  });
});
