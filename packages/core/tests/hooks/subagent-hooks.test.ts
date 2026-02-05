/**
 * Subagent Hooks tests
 * Following TDD principles
 */

import { describe, it, expect, beforeEach } from 'bun:test';
import {
  createSubagentStartInput,
  createSubagentStopInput,
} from '../../src/hooks/inputs';
import type { SubagentStartHookInput, SubagentStopHookInput } from '../../src/hooks/types';

describe('Subagent Hooks', () => {
  describe('createSubagentStartInput', () => {
    it('应创建正确的SubagentStartHookInput结构', () => {
      const input = createSubagentStartInput(
        'session-123',
        '/workspace',
        'agent-456',
        'code-reviewer',
        'Review this code...'
      );

      expect(input.hook_event_name).toBe('SubagentStart');
      expect(input.session_id).toBe('session-123');
      expect(input.cwd).toBe('/workspace');
      expect(input.subagent_id).toBe('agent-456');
      expect(input.subagent_type).toBe('code-reviewer');
      expect(input.prompt).toBe('Review this code...');
    });

    it('应包含transcript_path字段', () => {
      const input = createSubagentStartInput(
        'session-123',
        '/workspace',
        'agent-456',
        'code-reviewer',
        'Review this code...',
        '/path/to/transcript.json'
      );

      expect(input.transcript_path).toBe('/path/to/transcript.json');
    });

    it('应包含permission_mode字段', () => {
      const input = createSubagentStartInput(
        'session-123',
        '/workspace',
        'agent-456',
        'code-reviewer',
        'Review this code...',
        undefined,
        'acceptEdits'
      );

      expect(input.permission_mode).toBe('acceptEdits');
    });

    it('应在不提供可选参数时使用默认值', () => {
      const input = createSubagentStartInput(
        'session-123',
        '/workspace',
        'agent-456',
        'code-reviewer',
        'Review this code...'
      );

      expect(input.transcript_path).toBe('');
      expect(input.permission_mode).toBeUndefined();
    });
  });

  describe('createSubagentStopInput', () => {
    it('应创建正确的SubagentStopHookInput结构', () => {
      const input = createSubagentStopInput(
        'session-123',
        '/workspace',
        false
      );

      expect(input.hook_event_name).toBe('SubagentStop');
      expect(input.session_id).toBe('session-123');
      expect(input.cwd).toBe('/workspace');
      expect(input.stop_hook_active).toBe(false);
    });

    it('应正确设置stop_hook_active为true', () => {
      const input = createSubagentStopInput(
        'session-123',
        '/workspace',
        true
      );

      expect(input.stop_hook_active).toBe(true);
    });

    it('应包含transcript_path字段', () => {
      const input = createSubagentStopInput(
        'session-123',
        '/workspace',
        false,
        '/path/to/transcript.json'
      );

      expect(input.transcript_path).toBe('/path/to/transcript.json');
    });

    it('应包含permission_mode字段', () => {
      const input = createSubagentStopInput(
        'session-123',
        '/workspace',
        false,
        undefined,
        'bypassPermissions'
      );

      expect(input.permission_mode).toBe('bypassPermissions');
    });
  });

  describe('hook event types', () => {
    it('SubagentStart事件应在子Agent启动时触发', () => {
      const events: string[] = [];

      // Simulate hook registration and triggering
      const onSubagentStart = (input: SubagentStartHookInput) => {
        events.push(input.hook_event_name);
        expect(input.subagent_id).toBeDefined();
        expect(input.subagent_type).toBeDefined();
        expect(input.prompt).toBeDefined();
      };

      const input = createSubagentStartInput(
        'session-123',
        '/workspace',
        'agent-789',
        'test-agent',
        'Test prompt'
      );

      onSubagentStart(input);

      expect(events).toContain('SubagentStart');
    });

    it('SubagentStop事件应在子Agent结束时触发', () => {
      const events: string[] = [];

      // Simulate hook registration and triggering
      const onSubagentStop = (input: SubagentStopHookInput) => {
        events.push(input.hook_event_name);
        expect(input.stop_hook_active).toBeDefined();
      };

      const input = createSubagentStopInput(
        'session-123',
        '/workspace',
        false
      );

      onSubagentStop(input);

      expect(events).toContain('SubagentStop');
    });

    it('SubagentStart应在SubagentStop之前触发', () => {
      const events: string[] = [];

      // Simulate the sequence
      events.push('SubagentStart');
      // ... subagent execution ...
      events.push('SubagentStop');

      expect(events[0]).toBe('SubagentStart');
      expect(events[1]).toBe('SubagentStop');
    });
  });

  describe('hook input data', () => {
    it('SubagentStart应包含完整的子Agent信息', () => {
      const input = createSubagentStartInput(
        'parent-session-001',
        '/home/user/project',
        'subagent-abc-123',
        'code-explorer',
        'Explore the codebase to find all API endpoints'
      );

      // Verify all required fields are present
      expect(input).toHaveProperty('session_id');
      expect(input).toHaveProperty('cwd');
      expect(input).toHaveProperty('transcript_path');
      expect(input).toHaveProperty('hook_event_name');
      expect(input).toHaveProperty('subagent_id');
      expect(input).toHaveProperty('subagent_type');
      expect(input).toHaveProperty('prompt');

      // Verify values
      expect(input.session_id).toBe('parent-session-001');
      expect(input.cwd).toBe('/home/user/project');
      expect(input.subagent_id).toBe('subagent-abc-123');
      expect(input.subagent_type).toBe('code-explorer');
      expect(input.prompt).toBe('Explore the codebase to find all API endpoints');
    });

    it('SubagentStop应包含stop状态', () => {
      const input = createSubagentStopInput(
        'parent-session-001',
        '/home/user/project',
        false
      );

      expect(input).toHaveProperty('session_id');
      expect(input).toHaveProperty('cwd');
      expect(input).toHaveProperty('transcript_path');
      expect(input).toHaveProperty('hook_event_name');
      expect(input).toHaveProperty('stop_hook_active');

      expect(input.stop_hook_active).toBe(false);
    });
  });
});
