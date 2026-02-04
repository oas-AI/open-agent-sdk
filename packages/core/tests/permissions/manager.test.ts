import { describe, test, expect } from 'bun:test';
import { PermissionManager } from '../../src/permissions/manager';
import { PermissionMode, PermissionResult } from '../../src/permissions/types';

describe('PermissionManager', () => {
  describe('Mode Tests', () => {
    test('bypassPermissions mode with allowDangerouslySkipPermissions=true should auto-approve', async () => {
      const manager = new PermissionManager({
        mode: 'bypassPermissions',
        allowDangerouslySkipPermissions: true,
      });

      const result = await manager.checkPermission(
        'Bash',
        { command: 'rm -rf /' },
        { signal: new AbortController().signal }
      );

      expect(result.approved).toBe(true);
      expect(result.error).toBeUndefined();
    });

    test('bypassPermissions mode without allowDangerouslySkipPermissions should throw', () => {
      expect(() => {
        new PermissionManager({
          mode: 'bypassPermissions',
          allowDangerouslySkipPermissions: false,
        });
      }).toThrow('allowDangerouslySkipPermissions must be true to use bypassPermissions mode');
    });

    test('bypassPermissions mode with undefined allowDangerouslySkipPermissions should throw', () => {
      expect(() => {
        new PermissionManager({
          mode: 'bypassPermissions',
        });
      }).toThrow('allowDangerouslySkipPermissions must be true to use bypassPermissions mode');
    });

    test('plan mode should deny all tools with message', async () => {
      const manager = new PermissionManager({
        mode: 'plan',
      });

      const result = await manager.checkPermission(
        'Bash',
        { command: 'echo hello' },
        { signal: new AbortController().signal }
      );

      expect(result.approved).toBe(false);
      expect(result.error).toBe('Tool execution blocked in plan mode');
    });

    test('plan mode should record tool calls to planLog', async () => {
      const manager = new PermissionManager({
        mode: 'plan',
      });

      await manager.checkPermission('Read', { file_path: '/tmp/test' }, { signal: new AbortController().signal });
      await manager.checkPermission('Bash', { command: 'echo hello' }, { signal: new AbortController().signal });
      await manager.checkPermission('Write', { file_path: '/tmp/test', content: 'hello' }, { signal: new AbortController().signal });

      const planLog = manager.getPlanLog();
      expect(planLog).toHaveLength(3);
      expect(planLog[0].toolName).toBe('Read');
      expect(planLog[1].toolName).toBe('Bash');
      expect(planLog[2].toolName).toBe('Write');
      expect(planLog[0].input).toEqual({ file_path: '/tmp/test' });
      expect(planLog[0].timestamp).toBeGreaterThan(0);
    });

    test('plan mode clearPlanLog should clear the log', async () => {
      const manager = new PermissionManager({
        mode: 'plan',
      });

      await manager.checkPermission('Read', { file_path: '/tmp/test' }, { signal: new AbortController().signal });
      expect(manager.getPlanLog()).toHaveLength(1);

      manager.clearPlanLog();
      expect(manager.getPlanLog()).toHaveLength(0);
    });

    test('acceptEdits mode should auto-approve edit tools', async () => {
      const manager = new PermissionManager({
        mode: 'acceptEdits',
      });

      const editResult = await manager.checkPermission(
        'Edit',
        { file_path: '/tmp/test', old_string: 'foo', new_string: 'bar' },
        { signal: new AbortController().signal }
      );

      const writeResult = await manager.checkPermission(
        'Write',
        { file_path: '/tmp/test', content: 'hello' },
        { signal: new AbortController().signal }
      );

      expect(editResult.approved).toBe(true);
      expect(writeResult.approved).toBe(true);
    });

    test('acceptEdits mode should require permission for non-edit sensitive tools', async () => {
      const manager = new PermissionManager({
        mode: 'acceptEdits',
      });

      const result = await manager.checkPermission(
        'Bash',
        { command: 'echo hello' },
        { signal: new AbortController().signal }
      );

      expect(result.approved).toBe(false);
      expect(result.error).toBe('Permission denied: Bash');
    });

    test('acceptEdits mode should auto-approve non-sensitive tools', async () => {
      const manager = new PermissionManager({
        mode: 'acceptEdits',
      });

      const result = await manager.checkPermission(
        'Read',
        { file_path: '/tmp/test' },
        { signal: new AbortController().signal }
      );

      expect(result.approved).toBe(true);
    });

    test('default mode should auto-approve non-sensitive tools', async () => {
      const manager = new PermissionManager({
        mode: 'default',
      });

      const readResult = await manager.checkPermission(
        'Read',
        { file_path: '/tmp/test' },
        { signal: new AbortController().signal }
      );

      const globResult = await manager.checkPermission(
        'Glob',
        { pattern: '*.ts' },
        { signal: new AbortController().signal }
      );

      const grepResult = await manager.checkPermission(
        'Grep',
        { pattern: 'foo' },
        { signal: new AbortController().signal }
      );

      expect(readResult.approved).toBe(true);
      expect(globResult.approved).toBe(true);
      expect(grepResult.approved).toBe(true);
    });

    test('default mode should require permission for sensitive tools without canUseTool', async () => {
      const manager = new PermissionManager({
        mode: 'default',
      });

      const result = await manager.checkPermission(
        'Bash',
        { command: 'echo hello' },
        { signal: new AbortController().signal }
      );

      expect(result.approved).toBe(false);
      expect(result.error).toBe('Permission denied: Bash');
    });

    test('default mode should deny Write tool without canUseTool', async () => {
      const manager = new PermissionManager({
        mode: 'default',
      });

      const result = await manager.checkPermission(
        'Write',
        { file_path: '/tmp/test', content: 'hello' },
        { signal: new AbortController().signal }
      );

      expect(result.approved).toBe(false);
      expect(result.error).toBe('Permission denied: Write');
    });

    test('default mode should deny Edit tool without canUseTool', async () => {
      const manager = new PermissionManager({
        mode: 'default',
      });

      const result = await manager.checkPermission(
        'Edit',
        { file_path: '/tmp/test', old_string: 'foo', new_string: 'bar' },
        { signal: new AbortController().signal }
      );

      expect(result.approved).toBe(false);
      expect(result.error).toBe('Permission denied: Edit');
    });
  });

  describe('CanUseTool Callback Tests', () => {
    test('should call canUseTool callback for sensitive tools in default mode', async () => {
      let called = false;
      let receivedToolName = '';
      let receivedInput: Record<string, unknown> = {};

      const canUseTool = async (
        toolName: string,
        input: Record<string, unknown>
      ): Promise<PermissionResult> => {
        called = true;
        receivedToolName = toolName;
        receivedInput = input;
        return { behavior: 'allow', updatedInput: input };
      };

      const manager = new PermissionManager({
        mode: 'default',
        canUseTool,
      });

      await manager.checkPermission(
        'Bash',
        { command: 'echo hello' },
        { signal: new AbortController().signal }
      );

      expect(called).toBe(true);
      expect(receivedToolName).toBe('Bash');
      expect(receivedInput).toEqual({ command: 'echo hello' });
    });

    test('should allow when canUseTool returns behavior=allow', async () => {
      const canUseTool = async (): Promise<PermissionResult> => {
        return { behavior: 'allow', updatedInput: { command: 'modified' } };
      };

      const manager = new PermissionManager({
        mode: 'default',
        canUseTool,
      });

      const result = await manager.checkPermission(
        'Bash',
        { command: 'echo hello' },
        { signal: new AbortController().signal }
      );

      expect(result.approved).toBe(true);
      expect(result.updatedInput).toEqual({ command: 'modified' });
    });

    test('should deny when canUseTool returns behavior=deny', async () => {
      const canUseTool = async (): Promise<PermissionResult> => {
        return { behavior: 'deny', message: 'User rejected this action' };
      };

      const manager = new PermissionManager({
        mode: 'default',
        canUseTool,
      });

      const result = await manager.checkPermission(
        'Bash',
        { command: 'echo hello' },
        { signal: new AbortController().signal }
      );

      expect(result.approved).toBe(false);
      expect(result.error).toBe('User rejected this action');
    });

    test('should pass AbortSignal to canUseTool', async () => {
      let receivedSignal: AbortSignal | undefined;

      const canUseTool = async (
        _toolName: string,
        _input: Record<string, unknown>,
        context: { signal: AbortSignal }
      ): Promise<PermissionResult> => {
        receivedSignal = context.signal;
        return { behavior: 'allow', updatedInput: {} };
      };

      const manager = new PermissionManager({
        mode: 'default',
        canUseTool,
      });

      const controller = new AbortController();
      await manager.checkPermission('Bash', {}, { signal: controller.signal });

      expect(receivedSignal).toBe(controller.signal);
    });

    test('should not call canUseTool for non-sensitive tools', async () => {
      let called = false;

      const canUseTool = async (): Promise<PermissionResult> => {
        called = true;
        return { behavior: 'allow', updatedInput: {} };
      };

      const manager = new PermissionManager({
        mode: 'default',
        canUseTool,
      });

      const result = await manager.checkPermission(
        'Read',
        { file_path: '/tmp/test' },
        { signal: new AbortController().signal }
      );

      expect(called).toBe(false);
      expect(result.approved).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty tool name as non-sensitive', async () => {
      const manager = new PermissionManager({
        mode: 'default',
      });

      const result = await manager.checkPermission(
        '',
        {},
        { signal: new AbortController().signal }
      );

      expect(result.approved).toBe(true);
    });

    test('should handle unknown tool name as non-sensitive', async () => {
      const manager = new PermissionManager({
        mode: 'default',
      });

      const result = await manager.checkPermission(
        'UnknownTool',
        {},
        { signal: new AbortController().signal }
      );

      expect(result.approved).toBe(true);
    });

    test('setMode should change mode', () => {
      const manager = new PermissionManager({
        mode: 'default',
      });

      expect(manager.getMode()).toBe('default');

      manager.setMode('plan');
      expect(manager.getMode()).toBe('plan');

      manager.setMode('acceptEdits');
      expect(manager.getMode()).toBe('acceptEdits');
    });

    test('mode change should affect subsequent checks', async () => {
      const manager = new PermissionManager({
        mode: 'default',
      });

      // In default mode, Write is denied
      const result1 = await manager.checkPermission(
        'Write',
        { file_path: '/tmp/test', content: 'hello' },
        { signal: new AbortController().signal }
      );
      expect(result1.approved).toBe(false);

      // Change to acceptEdits mode
      manager.setMode('acceptEdits');

      // Now Write is allowed
      const result2 = await manager.checkPermission(
        'Write',
        { file_path: '/tmp/test', content: 'hello' },
        { signal: new AbortController().signal }
      );
      expect(result2.approved).toBe(true);
    });

    test('WebSearch should be sensitive tool', async () => {
      const manager = new PermissionManager({
        mode: 'default',
      });

      const result = await manager.checkPermission(
        'WebSearch',
        { query: 'test' },
        { signal: new AbortController().signal }
      );

      expect(result.approved).toBe(false);
      expect(result.error).toBe('Permission denied: WebSearch');
    });

    test('WebFetch should be sensitive tool', async () => {
      const manager = new PermissionManager({
        mode: 'default',
      });

      const result = await manager.checkPermission(
        'WebFetch',
        { url: 'https://example.com' },
        { signal: new AbortController().signal }
      );

      expect(result.approved).toBe(false);
      expect(result.error).toBe('Permission denied: WebFetch');
    });
  });
});
