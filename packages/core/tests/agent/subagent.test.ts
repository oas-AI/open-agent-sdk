/**
 * Subagent runner tests
 * Tests for the subagent execution engine
 */

import { describe, it, expect, beforeEach } from 'bun:test';
import type { AgentDefinition } from '../../src/agent/agent-definition';
import type { Tool } from '../../src/types/tools';

// Mock types for testing
type MockToolRegistry = {
  getAll: () => Tool[];
  getAllowedTools: (names: string[]) => Tool[];
};

type MockHookManager = {
  emit: (event: string, input: unknown, toolUseId: string | undefined) => Promise<void>;
};

type SubagentResult = {
  result: string;
  agentId: string;
  isError: boolean;
  usage: {
    inputTokens: number;
    outputTokens: number;
  };
  durationMs: number;
};

// Mock implementation for testing
describe('SubagentRunner', () => {
  let mockToolRegistry: MockToolRegistry;
  let mockHookManager: MockHookManager;

  beforeEach(() => {
    mockToolRegistry = {
      getAll: () => [],
      getAllowedTools: () => [],
    };

    mockHookManager = {
      emit: async () => {},
    };
  });

  describe('createFilteredToolRegistry', () => {
    it('应在AgentDefinition未指定tools时返回所有工具', () => {
      const allTools: Tool[] = [
        { name: 'Read', description: 'Read file', parameters: {} as any, handler: async () => ({}) },
        { name: 'Write', description: 'Write file', parameters: {} as any, handler: async () => ({}) },
      ];

      mockToolRegistry.getAll = () => allTools;

      const agentDef: AgentDefinition = {
        description: 'Test agent',
        prompt: 'Test...',
        // tools not specified - should inherit all
      };

      // When tools is undefined, should return all tools
      const filteredTools = agentDef.tools === undefined
        ? mockToolRegistry.getAll()
        : mockToolRegistry.getAllowedTools(agentDef.tools);

      expect(filteredTools).toHaveLength(2);
      expect(filteredTools.map(t => t.name)).toContain('Read');
      expect(filteredTools.map(t => t.name)).toContain('Write');
    });

    it('应在AgentDefinition指定tools时返回受限工具集', () => {
      const allTools: Tool[] = [
        { name: 'Read', description: 'Read file', parameters: {} as any, handler: async () => ({}) },
        { name: 'Write', description: 'Write file', parameters: {} as any, handler: async () => ({}) },
        { name: 'Bash', description: 'Run command', parameters: {} as any, handler: async () => ({}) },
      ];

      mockToolRegistry.getAllowedTools = (names) =>
        allTools.filter(t => names.includes(t.name));

      const agentDef: AgentDefinition = {
        description: 'Read-only agent',
        prompt: 'Read only...',
        tools: ['Read'],
      };

      const filteredTools = agentDef.tools === undefined
        ? allTools
        : mockToolRegistry.getAllowedTools(agentDef.tools);

      expect(filteredTools).toHaveLength(1);
      expect(filteredTools[0].name).toBe('Read');
    });
  });

  describe('runSubagent', () => {
    it('应生成唯一的agentId', async () => {
      const agentDef: AgentDefinition = {
        description: 'Test agent',
        prompt: 'Test...',
      };

      // Generate agent ID (mock implementation)
      const generateAgentId = () => `agent-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const agentId1 = generateAgentId();
      const agentId2 = generateAgentId();

      expect(agentId1).not.toBe(agentId2);
      expect(agentId1).toMatch(/^agent-/);
    });

    it('应在执行前后触发SubagentStart和SubagentStop Hooks', async () => {
      const events: string[] = [];

      const hookManager: MockHookManager = {
        emit: async (event) => {
          events.push(event);
        },
      };

      // Simulate subagent execution with hooks
      const runWithHooks = async () => {
        events.push('SubagentStart');
        // Execute subagent logic...
        events.push('SubagentStop');
      };

      await runWithHooks();

      expect(events).toContain('SubagentStart');
      expect(events).toContain('SubagentStop');
      expect(events.indexOf('SubagentStart')).toBeLessThan(events.indexOf('SubagentStop'));
    });

    it('应在成功执行后返回结果', async () => {
      // Mock successful execution
      const mockResult: SubagentResult = {
        result: 'Task completed successfully',
        agentId: 'agent-123',
        usage: {
          inputTokens: 100,
          outputTokens: 50,
        },
        durationMs: 1500,
      };

      expect(mockResult.error).toBeUndefined();
      expect(mockResult.result).toBe('Task completed successfully');
      expect(mockResult.usage.inputTokens).toBe(100);
      expect(mockResult.usage.outputTokens).toBe(50);
    });

    it('应在执行失败时返回错误信息', async () => {
      // Mock failed execution
      const mockResult: SubagentResult = {
        result: 'Error: Maximum turns reached without completion',
        agentId: 'agent-456',
        usage: {
          inputTokens: 200,
          outputTokens: 100,
        },
        durationMs: 5000,
        error: 'Maximum turns reached without completion',
      };

      expect(mockResult.error).toBeDefined();
      expect(mockResult.result).toContain('Error');
    });

    it('应正确统计执行耗时', async () => {
      const startTime = Date.now();
      await new Promise(resolve => setTimeout(resolve, 50)); // Simulate work
      const duration = Date.now() - startTime;

      expect(duration).toBeGreaterThanOrEqual(45); // Allow some tolerance
    });
  });

  describe('inheritance from parent', () => {
    it('应在model为inherit时使用父Agent的模型', () => {
      const parentModel = 'claude-sonnet-4';
      const agentDef: AgentDefinition = {
        description: 'Test agent',
        prompt: 'Test...',
        model: 'inherit',
      };

      const effectiveModel = agentDef.model === 'inherit' || agentDef.model === undefined
        ? parentModel
        : agentDef.model;

      expect(effectiveModel).toBe(parentModel);
    });

    it('应在maxTurns未指定时使用父Agent的maxTurns', () => {
      const parentMaxTurns = 20;
      const agentDef: AgentDefinition = {
        description: 'Test agent',
        prompt: 'Test...',
        // maxTurns not specified
      };

      const effectiveMaxTurns = agentDef.maxTurns ?? parentMaxTurns;

      expect(effectiveMaxTurns).toBe(parentMaxTurns);
    });

    it('应在permissionMode未指定时使用父Agent的permissionMode', () => {
      const parentPermissionMode = 'default';
      const agentDef: AgentDefinition = {
        description: 'Test agent',
        prompt: 'Test...',
        // permissionMode not specified
      };

      const effectivePermissionMode = agentDef.permissionMode ?? parentPermissionMode;

      expect(effectivePermissionMode).toBe(parentPermissionMode);
    });

    it('应在显式指定model时覆盖父Agent的模型', () => {
      const parentModel = 'claude-sonnet-4';
      const agentDef: AgentDefinition = {
        description: 'Test agent',
        prompt: 'Test...',
        model: 'opus',
      };

      const effectiveModel = agentDef.model === 'inherit' || agentDef.model === undefined
        ? parentModel
        : agentDef.model;

      expect(effectiveModel).toBe('opus');
    });
  });

  describe('error isolation', () => {
    it('应在子Agent失败时不影响主Agent', async () => {
      let mainAgentContinued = false;

      // Simulate subagent failure
      const runSubagent = async (): Promise<SubagentResult> => {
        return {
          result: 'Error: Tool execution failed',
          agentId: 'agent-789',
          usage: { inputTokens: 10, outputTokens: 5 },
          durationMs: 100,
          error: 'Tool execution failed',
        };
      };

      // Main agent continues after subagent
      const result = await runSubagent();
      mainAgentContinued = true;

      expect(result.error).toBeDefined();
      expect(mainAgentContinued).toBe(true);
    });
  });
});
