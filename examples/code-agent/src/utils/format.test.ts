/**
 * Tests for format utilities
 */

import { describe, it, expect } from 'bun:test';
import {
  formatDuration,
  formatToolArgs,
  formatToolResult,
  truncateText,
  createCodeBlock,
  TOOL_ICONS,
  getToolIcon,
} from './format.js';

describe('format utilities', () => {
  describe('formatDuration', () => {
    it('should format duration less than 1 second in milliseconds', () => {
      expect(formatDuration(0.123)).toBe('123ms');
      expect(formatDuration(0.5)).toBe('500ms');
    });

    it('should format duration in seconds', () => {
      expect(formatDuration(1.5)).toBe('1.50s');
      expect(formatDuration(2)).toBe('2.00s');
    });

    it('should format duration in minutes and seconds', () => {
      expect(formatDuration(65)).toBe('1m 5s');
      expect(formatDuration(125)).toBe('2m 5s');
    });
  });

  describe('formatToolArgs', () => {
    it('should format simple arguments', () => {
      const args = { file_path: '/test.txt', limit: 50 };
      const result = formatToolArgs(args);
      expect(result).toContain('file_path: "/test.txt"');
      expect(result).toContain('limit: 50');
    });

    it('should truncate long string values', () => {
      const args = { content: 'a'.repeat(100) };
      const result = formatToolArgs(args);
      expect(result).toContain('...');
      expect(result.length).toBeLessThan(100);
    });

    it('should handle empty args', () => {
      const result = formatToolArgs({});
      expect(result).toBe('');
    });
  });

  describe('formatToolResult', () => {
    it('should format file content result', () => {
      const result = { content: 'file content here' };
      expect(formatToolResult(result)).toBe('file content here');
    });

    it('should format glob result', () => {
      const result = { files: ['a.ts', 'b.ts', 'c.ts'] };
      expect(formatToolResult(result)).toBe('Found 3 files');
    });

    it('should format grep result', () => {
      const result = { matches: [{}, {}, {}] };
      expect(formatToolResult(result)).toBe('Found 3 matches');
    });

    it('should format bash stdout result', () => {
      const result = { stdout: 'command output', stderr: '', exitCode: 0 };
      expect(formatToolResult(result)).toBe('command output');
    });

    it('should format bash error result', () => {
      const result = { stdout: '', stderr: 'error message', exitCode: 1 };
      expect(formatToolResult(result)).toBe('error message');
    });

    it('should format write/edit success result', () => {
      const result = { success: true };
      expect(formatToolResult(result)).toBe('Success');
    });

    it('should handle string result', () => {
      expect(formatToolResult('simple string')).toBe('simple string');
    });

    it('should handle null/undefined result', () => {
      expect(formatToolResult(null)).toBe('null');
      expect(formatToolResult(undefined)).toBe('undefined');
    });

    it('should truncate long results', () => {
      const result = { content: 'a'.repeat(1000) };
      const formatted = formatToolResult(result, 100);
      expect(formatted).toContain('...');
      expect(formatted.length).toBeLessThanOrEqual(103); // 100 + '...'
    });
  });

  describe('truncateText', () => {
    it('should not truncate short text', () => {
      expect(truncateText('short', 100)).toBe('short');
    });

    it('should truncate long text', () => {
      const text = 'a'.repeat(200);
      expect(truncateText(text, 50)).toBe('a'.repeat(50) + '...');
    });

    it('should use custom suffix', () => {
      expect(truncateText('hello world', 5, '[more]')).toBe('hello[more]');
    });
  });

  describe('createCodeBlock', () => {
    it('should create a code block with box characters', () => {
      const lines = ['line 1', 'line 2'];
      const result = createCodeBlock(lines);
      expect(result).toContain('┌');
      expect(result).toContain('└');
      expect(result).toContain('│ line 1');
      expect(result).toContain('│ line 2');
    });

    it('should handle empty lines array', () => {
      const result = createCodeBlock([]);
      expect(result).toContain('┌');
      expect(result).toContain('└');
    });

    it('should limit width', () => {
      const lines = ['this is a very long line that should be truncated'];
      const result = createCodeBlock(lines, 20);
      expect(result).not.toContain('that should be truncated');
    });
  });

  describe('getToolIcon', () => {
    it('should return icon for known tools', () => {
      expect(getToolIcon('read')).toBe(TOOL_ICONS.read);
      expect(getToolIcon('write')).toBe(TOOL_ICONS.write);
      expect(getToolIcon('bash')).toBe(TOOL_ICONS.bash);
    });

    it('should return default icon for unknown tools', () => {
      expect(getToolIcon('unknown')).toBe('🔧');
    });

    it('should be case insensitive', () => {
      expect(getToolIcon('READ')).toBe(TOOL_ICONS.read);
      expect(getToolIcon('Bash')).toBe(TOOL_ICONS.bash);
    });
  });
});
