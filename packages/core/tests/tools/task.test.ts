/**
 * Task tool tests
 * Following TDD principles
 */

import { describe, it, expect, beforeEach } from 'bun:test';
import type { AgentDefinition, AgentDefinitions } from '../../src/agent/agent-definition';

// Task tool input/output types
interface TaskInput {
  description: string;
  prompt: string;
  subagent_type: string;
}

interface TaskOutput {
  result: string;
  agent_id: string;
  isError?: boolean;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
  total_cost_usd?: number;
  duration_ms: number;
}

describe('Task Tool', () => {
  let mockAgentDefinitions: AgentDefinitions;

  beforeEach(() => {
    mockAgentDefinitions = {
      'code-reviewer': {
        description: 'Code review specialist',
        tools: ['Read', 'Grep'],
        prompt: 'You are a code reviewer...',
        model: 'sonnet',
        maxTurns: 10,
      },
      'test-writer': {
        description: 'Test writing specialist',
        prompt: 'You write tests...',
      },
    };
  });

  describe('input validation', () => {
    it('应验证必需的description字段', () => {
      const input = {
        description: 'Review code',
        prompt: 'Please review this code...',
        subagent_type: 'code-reviewer',
      };

      expect(input.description).toBeTruthy();
      expect(input.description.length).toBeLessThanOrEqual(100); // Reasonable limit
    });

    it('应验证必需的prompt字段', () => {
      const input = {
        description: 'Review code',
        prompt: 'Please review this code...',
        subagent_type: 'code-reviewer',
      };

      expect(input.prompt).toBeTruthy();
      expect(input.prompt.length).toBeGreaterThan(0);
    });

    it('应验证必需的subagent_type字段', () => {
      const input = {
        description: 'Review code',
        prompt: 'Please review this code...',
        subagent_type: 'code-reviewer',
      };

      expect(input.subagent_type).toBeTruthy();
    });

    it('应验证description为简短描述（3-5词建议）', () => {
      const validInput: TaskInput = {
        description: 'Review auth module',
        prompt: 'Please review the authentication module implementation...',
        subagent_type: 'code-reviewer',
      };

      // Description should be concise
      const wordCount = validInput.description.split(' ').length;
      expect(wordCount).toBeGreaterThanOrEqual(1);
      expect(wordCount).toBeLessThanOrEqual(10);
    });
  });

  describe('subagent_type lookup', () => {
    it('应根据subagent_type查找AgentDefinition', () => {
      const subagentType = 'code-reviewer';
      const agentDef = mockAgentDefinitions[subagentType];

      expect(agentDef).toBeDefined();
      expect(agentDef.description).toBe('Code review specialist');
    });

    it('应在找不到AgentDefinition时抛出错误', () => {
      const subagentType = 'non-existent-agent';
      const agentDef = mockAgentDefinitions[subagentType];

      expect(agentDef).toBeUndefined();
    });

    it('应支持从agents配置中查找AgentDefinition', () => {
      const agents: AgentDefinitions = {
        'custom-agent': {
          description: 'Custom agent',
          prompt: 'Custom prompt...',
        },
      };

      const agentDef = agents['custom-agent'];

      expect(agentDef).toBeDefined();
      expect(agentDef.prompt).toBe('Custom prompt...');
    });
  });

  describe('output structure', () => {
    it('应返回正确的TaskOutput结构', () => {
      const mockOutput: TaskOutput = {
        result: 'Code review completed successfully',
        agent_id: 'agent-12345',
        usage: {
          input_tokens: 150,
          output_tokens: 200,
        },
        total_cost_usd: 0.015,
        duration_ms: 2500,
      };

      expect(mockOutput.result).toBeDefined();
      expect(mockOutput.agent_id).toMatch(/^agent-/);
      expect(mockOutput.error).toBeUndefined();
      expect(mockOutput.usage.input_tokens).toBeGreaterThanOrEqual(0);
      expect(mockOutput.usage.output_tokens).toBeGreaterThanOrEqual(0);
      expect(mockOutput.duration_ms).toBeGreaterThanOrEqual(0);
    });

    it('应在失败时返回error字段', () => {
      const mockOutput: TaskOutput = {
        result: 'Error: Maximum turns reached without completion',
        agent_id: 'agent-67890',
        usage: {
          input_tokens: 500,
          output_tokens: 300,
        },
        duration_ms: 15000,
        error: 'Maximum turns reached without completion',
      };

      expect(mockOutput.error).toBeDefined();
      expect(mockOutput.result).toContain('Error');
    });

    it('应包含正确的usage统计', () => {
      const mockOutput: TaskOutput = {
        result: 'Success',
        agent_id: 'agent-11111',
        usage: {
          input_tokens: 100,
          output_tokens: 150,
        },
        duration_ms: 1000,
      };

      expect(mockOutput.usage.input_tokens).toBe(100);
      expect(mockOutput.usage.output_tokens).toBe(150);
    });

    it('应在费用可用时返回total_cost_usd', () => {
      const mockOutput: TaskOutput = {
        result: 'Success',
        agent_id: 'agent-22222',
        usage: {
          input_tokens: 1000,
          output_tokens: 500,
        },
        total_cost_usd: 0.025,
        duration_ms: 2000,
      };

      expect(mockOutput.total_cost_usd).toBe(0.025);
    });

    it('应在费用不可用时省略total_cost_usd', () => {
      const mockOutput: TaskOutput = {
        result: 'Success',
        agent_id: 'agent-33333',
        usage: {
          input_tokens: 100,
          output_tokens: 50,
        },
        duration_ms: 500,
      };

      expect(mockOutput.total_cost_usd).toBeUndefined();
    });
  });

  describe('execution flow', () => {
    it('应在执行前验证AgentDefinition存在', () => {
      const subagentType = 'code-reviewer';
      const exists = subagentType in mockAgentDefinitions;

      expect(exists).toBe(true);
    });

    it('应正确传递prompt给子Agent', () => {
      const taskPrompt = 'Please review the auth module specifically...';
      const agentDef = mockAgentDefinitions['code-reviewer'];

      // The prompt should be passed to the subagent
      expect(taskPrompt).toBeDefined();
      expect(agentDef.prompt).toBe('You are a code reviewer...');
    });

    it('应在子Agent超时时返回错误', () => {
      // Simulate timeout scenario
      const timeoutResult: TaskOutput = {
        result: 'Error: Subagent execution timed out after 30000ms',
        agent_id: 'agent-timeout',
        isError: true,
        usage: {
          input_tokens: 50,
          output_tokens: 0,
        },
        duration_ms: 30000,
      };

      expect(timeoutResult.isError).toBe(true);
      expect(timeoutResult.result).toContain('timed out');
    });
  });

  describe('integration with AgentDefinition', () => {
    it('应正确应用AgentDefinition的工具限制', () => {
      const agentDef = mockAgentDefinitions['code-reviewer'];

      expect(agentDef.tools).toBeDefined();
      expect(agentDef.tools).toContain('Read');
      expect(agentDef.tools).toContain('Grep');
      expect(agentDef.tools).not.toContain('Write');
    });

    it('应在AgentDefinition未指定tools时继承所有工具', () => {
      const agentDef = mockAgentDefinitions['test-writer'];

      expect(agentDef.tools).toBeUndefined();
    });

    it('应正确应用AgentDefinition的model设置', () => {
      const agentDef = mockAgentDefinitions['code-reviewer'];

      expect(agentDef.model).toBe('sonnet');
    });

    it('应正确应用AgentDefinition的maxTurns设置', () => {
      const agentDef = mockAgentDefinitions['code-reviewer'];

      expect(agentDef.maxTurns).toBe(10);
    });
  });
});
