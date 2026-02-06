/**
 * Hook input helpers tests
 * Tests for all 12 hook input creation functions
 */

import { describe, test, expect } from 'bun:test';
import {
  createPreToolUseInput,
  createPostToolUseInput,
  createSessionStartInput,
  createSessionEndInput,
  createSubagentStartInput,
  createSubagentStopInput,
  createNotificationInput,
  createStopInput,
  createPreCompactInput,
  createUserPromptSubmitInput,
} from '../../src/hooks/inputs';
import {
  createPermissionRequestInput,
  createPostToolUseFailureInput,
} from '../../src/hooks/inputs';

const SESSION_ID = 'test-session-123';
const CWD = '/home/user/project';

describe('Hook Input Helpers', () => {
  describe('createUserPromptSubmitInput', () => {
    test('should create correct UserPromptSubmit input', () => {
      const input = createUserPromptSubmitInput(SESSION_ID, CWD, 'Hello, world!');

      expect(input.hook_event_name).toBe('UserPromptSubmit');
      expect(input.session_id).toBe(SESSION_ID);
      expect(input.cwd).toBe(CWD);
      expect(input.prompt).toBe('Hello, world!');
    });

    test('should include optional fields', () => {
      const input = createUserPromptSubmitInput(
        SESSION_ID, CWD, 'test prompt', '/tmp/transcript.json', 'default'
      );

      expect(input.transcript_path).toBe('/tmp/transcript.json');
      expect(input.permission_mode).toBe('default');
    });
  });

  describe('createStopInput', () => {
    test('should create correct Stop input with active hook', () => {
      const input = createStopInput(SESSION_ID, CWD, true);

      expect(input.hook_event_name).toBe('Stop');
      expect(input.session_id).toBe(SESSION_ID);
      expect(input.cwd).toBe(CWD);
      expect(input.stop_hook_active).toBe(true);
    });

    test('should create Stop input with inactive hook', () => {
      const input = createStopInput(SESSION_ID, CWD, false);
      expect(input.stop_hook_active).toBe(false);
    });
  });

  describe('createNotificationInput', () => {
    test('should create correct Notification input', () => {
      const input = createNotificationInput(SESSION_ID, CWD, 'Task completed');

      expect(input.hook_event_name).toBe('Notification');
      expect(input.message).toBe('Task completed');
      expect(input.title).toBeUndefined();
    });

    test('should include optional title', () => {
      const input = createNotificationInput(SESSION_ID, CWD, 'Task completed', 'Success');

      expect(input.message).toBe('Task completed');
      expect(input.title).toBe('Success');
    });
  });

  describe('createPreCompactInput', () => {
    test('should create correct PreCompact input for manual trigger', () => {
      const input = createPreCompactInput(SESSION_ID, CWD, 'manual');

      expect(input.hook_event_name).toBe('PreCompact');
      expect(input.trigger).toBe('manual');
      expect(input.custom_instructions).toBeNull();
    });

    test('should create PreCompact input for auto trigger with instructions', () => {
      const input = createPreCompactInput(SESSION_ID, CWD, 'auto', 'Keep code context');

      expect(input.trigger).toBe('auto');
      expect(input.custom_instructions).toBe('Keep code context');
    });
  });

  describe('All 12 hook events have input helpers', () => {
    test('PreToolUse', () => {
      const input = createPreToolUseInput(SESSION_ID, CWD, 'Bash', { command: 'ls' });
      expect(input.hook_event_name).toBe('PreToolUse');
    });

    test('PostToolUse', () => {
      const input = createPostToolUseInput(SESSION_ID, CWD, 'Bash', { command: 'ls' }, { output: 'file.txt' });
      expect(input.hook_event_name).toBe('PostToolUse');
    });

    test('PostToolUseFailure', () => {
      const input = createPostToolUseFailureInput(SESSION_ID, CWD, 'Bash', { command: 'ls' }, 'error');
      expect(input.hook_event_name).toBe('PostToolUseFailure');
    });

    test('SessionStart', () => {
      const input = createSessionStartInput(SESSION_ID, CWD);
      expect(input.hook_event_name).toBe('SessionStart');
    });

    test('SessionEnd', () => {
      const input = createSessionEndInput(SESSION_ID, CWD);
      expect(input.hook_event_name).toBe('SessionEnd');
    });

    test('SubagentStart', () => {
      const input = createSubagentStartInput(SESSION_ID, CWD, 'sub-1', 'explorer', 'find files');
      expect(input.hook_event_name).toBe('SubagentStart');
    });

    test('SubagentStop', () => {
      const input = createSubagentStopInput(SESSION_ID, CWD, true);
      expect(input.hook_event_name).toBe('SubagentStop');
    });

    test('PermissionRequest', () => {
      const input = createPermissionRequestInput(SESSION_ID, CWD, 'Bash', { command: 'rm -rf /' });
      expect(input.hook_event_name).toBe('PermissionRequest');
    });

    test('UserPromptSubmit', () => {
      const input = createUserPromptSubmitInput(SESSION_ID, CWD, 'hello');
      expect(input.hook_event_name).toBe('UserPromptSubmit');
    });

    test('Stop', () => {
      const input = createStopInput(SESSION_ID, CWD, true);
      expect(input.hook_event_name).toBe('Stop');
    });

    test('Notification', () => {
      const input = createNotificationInput(SESSION_ID, CWD, 'done');
      expect(input.hook_event_name).toBe('Notification');
    });

    test('PreCompact', () => {
      const input = createPreCompactInput(SESSION_ID, CWD, 'manual');
      expect(input.hook_event_name).toBe('PreCompact');
    });
  });
});
