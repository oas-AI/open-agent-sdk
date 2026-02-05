/**
 * AgentDefinition type and validation tests
 * Following TDD principles
 */

import { describe, it, expect } from 'bun:test';
import {
  AgentDefinitionSchema,
  validateAgentDefinition,
  safeValidateAgentDefinition,
  createAgentDefinition,
  hasCustomTools,
  inheritsModel,
  hasCustomMaxTurns,
  hasCustomPermissionMode,
  type AgentDefinition,
} from '../../src/agent/agent-definition';

describe('AgentDefinition', () => {
  describe('validation', () => {
    it('应正确验证必需字段（description, prompt）', () => {
      const valid = {
        description: 'Code reviewer agent',
        prompt: 'You are a code reviewer...',
      };

      const result = AgentDefinitionSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('应在缺少description时验证失败', () => {
      const invalid = {
        prompt: 'You are a code reviewer...',
      };

      const result = AgentDefinitionSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('应在缺少prompt时验证失败', () => {
      const invalid = {
        description: 'Code reviewer agent',
      };

      const result = AgentDefinitionSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('应在description为空字符串时验证失败', () => {
      const invalid = {
        description: '',
        prompt: 'You are a code reviewer...',
      };

      const result = AgentDefinitionSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('应在prompt为空字符串时验证失败', () => {
      const invalid = {
        description: 'Code reviewer agent',
        prompt: '',
      };

      const result = AgentDefinitionSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe('optional fields', () => {
    it('应处理tools字段（工具列表）', () => {
      const withTools = {
        description: 'Code reviewer',
        prompt: 'Review code...',
        tools: ['Read', 'Grep'],
      };

      const result = AgentDefinitionSchema.safeParse(withTools);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.tools).toEqual(['Read', 'Grep']);
      }
    });

    it('应处理省略tools字段（表示继承父Agent全部工具）', () => {
      const withoutTools = {
        description: 'Code reviewer',
        prompt: 'Review code...',
      };

      const result = AgentDefinitionSchema.safeParse(withoutTools);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.tools).toBeUndefined();
      }
    });

    it('应验证model字段的合法值', () => {
      const validModels = ['sonnet', 'opus', 'haiku', 'inherit'];

      for (const model of validModels) {
        const agent = {
          description: 'Test agent',
          prompt: 'Test...',
          model,
        };

        const result = AgentDefinitionSchema.safeParse(agent);
        expect(result.success).toBe(true);
      }
    });

    it('应在model为非法值时验证失败', () => {
      const invalid = {
        description: 'Test agent',
        prompt: 'Test...',
        model: 'invalid-model',
      };

      const result = AgentDefinitionSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('应处理省略model字段（表示继承父Agent模型）', () => {
      const withoutModel = {
        description: 'Test agent',
        prompt: 'Test...',
      };

      const result = AgentDefinitionSchema.safeParse(withoutModel);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.model).toBeUndefined();
      }
    });

    it('应处理maxTurns字段', () => {
      const withMaxTurns = {
        description: 'Test agent',
        prompt: 'Test...',
        maxTurns: 10,
      };

      const result = AgentDefinitionSchema.safeParse(withMaxTurns);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.maxTurns).toBe(10);
      }
    });

    it('应在maxTurns为非正数时验证失败', () => {
      const invalid = {
        description: 'Test agent',
        prompt: 'Test...',
        maxTurns: 0,
      };

      const result = AgentDefinitionSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('应处理permissionMode字段', () => {
      const validModes = ['default', 'acceptEdits', 'bypassPermissions', 'plan'];

      for (const mode of validModes) {
        const agent = {
          description: 'Test agent',
          prompt: 'Test...',
          permissionMode: mode,
        };

        const result = AgentDefinitionSchema.safeParse(agent);
        expect(result.success).toBe(true);
      }
    });
  });

  describe('complex scenarios', () => {
    it('应验证完整的AgentDefinition', () => {
      const fullDefinition: AgentDefinition = {
        description: 'Code reviewer specializing in TypeScript',
        tools: ['Read', 'Grep', 'Glob'],
        prompt: 'You are an expert TypeScript code reviewer...',
        model: 'sonnet',
        maxTurns: 15,
        permissionMode: 'acceptEdits',
      };

      const result = AgentDefinitionSchema.safeParse(fullDefinition);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.description).toBe(fullDefinition.description);
        expect(result.data.tools).toEqual(fullDefinition.tools);
        expect(result.data.prompt).toBe(fullDefinition.prompt);
        expect(result.data.model).toBe(fullDefinition.model);
        expect(result.data.maxTurns).toBe(fullDefinition.maxTurns);
        expect(result.data.permissionMode).toBe(fullDefinition.permissionMode);
      }
    });

    it('应验证最小化的AgentDefinition', () => {
      const minimalDefinition = {
        description: 'Simple agent',
        prompt: 'Do something...',
      };

      const result = AgentDefinitionSchema.safeParse(minimalDefinition);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.tools).toBeUndefined();
        expect(result.data.model).toBeUndefined();
        expect(result.data.maxTurns).toBeUndefined();
        expect(result.data.permissionMode).toBeUndefined();
      }
    });
  });

  describe('helper functions', () => {
    describe('validateAgentDefinition', () => {
      it('应成功验证有效的定义', () => {
        const valid = {
          description: 'Test agent',
          prompt: 'Test...',
        };

        const result = validateAgentDefinition(valid);
        expect(result.description).toBe(valid.description);
        expect(result.prompt).toBe(valid.prompt);
      });

      it('应在验证失败时抛出错误', () => {
        const invalid = {
          description: '',
          prompt: 'Test...',
        };

        expect(() => validateAgentDefinition(invalid)).toThrow();
      });
    });

    describe('safeValidateAgentDefinition', () => {
      it('应成功验证并返回数据', () => {
        const valid = {
          description: 'Test agent',
          prompt: 'Test...',
        };

        const result = safeValidateAgentDefinition(valid);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.description).toBe(valid.description);
        }
      });

      it('应在验证失败时返回错误', () => {
        const invalid = {
          description: '',
          prompt: 'Test...',
        };

        const result = safeValidateAgentDefinition(invalid);
        expect(result.success).toBe(false);
      });
    });

    describe('createAgentDefinition', () => {
      it('应创建包含必需字段的AgentDefinition', () => {
        const definition = createAgentDefinition('Test agent', 'Test prompt');

        expect(definition.description).toBe('Test agent');
        expect(definition.prompt).toBe('Test prompt');
        expect(definition.tools).toBeUndefined();
        expect(definition.model).toBeUndefined();
      });
    });

    describe('hasCustomTools', () => {
      it('应在定义了tools时返回true', () => {
        const definition = createAgentDefinition('Test', 'Test');
        definition.tools = ['Read'];

        expect(hasCustomTools(definition)).toBe(true);
      });

      it('应在未定义tools时返回false', () => {
        const definition = createAgentDefinition('Test', 'Test');

        expect(hasCustomTools(definition)).toBe(false);
      });
    });

    describe('inheritsModel', () => {
      it('应在model为undefined时返回true', () => {
        const definition = createAgentDefinition('Test', 'Test');

        expect(inheritsModel(definition)).toBe(true);
      });

      it('应在model为inherit时返回true', () => {
        const definition = createAgentDefinition('Test', 'Test');
        definition.model = 'inherit';

        expect(inheritsModel(definition)).toBe(true);
      });

      it('应在model为具体值时返回false', () => {
        const definition = createAgentDefinition('Test', 'Test');
        definition.model = 'sonnet';

        expect(inheritsModel(definition)).toBe(false);
      });
    });

    describe('hasCustomMaxTurns', () => {
      it('应在定义了maxTurns时返回true', () => {
        const definition = createAgentDefinition('Test', 'Test');
        definition.maxTurns = 10;

        expect(hasCustomMaxTurns(definition)).toBe(true);
      });

      it('应在未定义maxTurns时返回false', () => {
        const definition = createAgentDefinition('Test', 'Test');

        expect(hasCustomMaxTurns(definition)).toBe(false);
      });
    });

    describe('hasCustomPermissionMode', () => {
      it('应在定义了permissionMode时返回true', () => {
        const definition = createAgentDefinition('Test', 'Test');
        definition.permissionMode = 'acceptEdits';

        expect(hasCustomPermissionMode(definition)).toBe(true);
      });

      it('应在未定义permissionMode时返回false', () => {
        const definition = createAgentDefinition('Test', 'Test');

        expect(hasCustomPermissionMode(definition)).toBe(false);
      });
    });
  });
});
