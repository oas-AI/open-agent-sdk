/**
 * Tests for TerminalRenderer
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { TerminalRenderer } from './terminal-renderer.js';
import type { ToolCallState } from './tool-manager.js';

describe('TerminalRenderer', () => {
  let renderer: TerminalRenderer;
  let output: string[];

  beforeEach(() => {
    output = [];
    // Mock stdout.write
    const originalWrite = process.stdout.write;
    process.stdout.write = ((str: string) => {
      output.push(str);
      return true;
    }) as typeof process.stdout.write;

    renderer = new TerminalRenderer();
  });

  afterEach(() => {
    // Restore stdout.write would happen in real cleanup
  });

  describe('renderTool', () => {
    it('should render pending tool', () => {
      const tool: ToolCallState = {
        id: 'tool-1',
        name: 'read',
        args: { file_path: '/test.txt' },
        status: 'pending',
        expanded: false,
      };

      const result = renderer.renderTool(tool);
      expect(result).toContain('○');
      expect(result).toContain('read');
      expect(result).toContain('file_path');
    });

    it('should render running tool', () => {
      const tool: ToolCallState = {
        id: 'tool-1',
        name: 'glob',
        args: { pattern: '*.ts' },
        status: 'running',
        startTime: Date.now() - 1000,
        expanded: false,
      };

      const result = renderer.renderTool(tool);
      expect(result).toContain('◐');
      expect(result).toContain('running');
    });

    it('should render completed tool with duration', () => {
      const tool: ToolCallState = {
        id: 'tool-1',
        name: 'read',
        args: { file_path: '/test.txt' },
        status: 'completed',
        startTime: Date.now() - 2000,
        endTime: Date.now(),
        result: { content: 'file content' },
        expanded: false,
      };

      const result = renderer.renderTool(tool);
      expect(result).toContain('◉');
      expect(result).toContain('read');
      expect(result).toContain('2.00s');
    });

    it('should render failed tool', () => {
      const tool: ToolCallState = {
        id: 'tool-1',
        name: 'read',
        args: { file_path: '/nonexistent.txt' },
        status: 'failed',
        error: 'File not found',
        expanded: false,
      };

      const result = renderer.renderTool(tool);
      expect(result).toContain('◎');
      expect(result).toContain('Error:');
      expect(result).toContain('File not found');
    });

    it('should show result when expanded', () => {
      const tool: ToolCallState = {
        id: 'tool-1',
        name: 'read',
        args: { file_path: '/test.txt' },
        status: 'completed',
        result: { content: 'hello world' },
        expanded: true,
      };

      const result = renderer.renderTool(tool);
      expect(result).toContain('hello world');
    });
  });

  describe('renderTools', () => {
    it('should render multiple tools', () => {
      const tools: ToolCallState[] = [
        {
          id: 'tool-1',
          name: 'read',
          args: { file_path: '/a.txt' },
          status: 'completed',
          expanded: false,
        },
        {
          id: 'tool-2',
          name: 'glob',
          args: { pattern: '*.ts' },
          status: 'running',
          expanded: false,
        },
      ];

      const result = renderer.renderTools(tools);
      expect(result).toContain('read');
      expect(result).toContain('glob');
    });

    it('should return empty string for empty tools array', () => {
      const result = renderer.renderTools([]);
      expect(result).toBe('');
    });
  });

  describe('clear', () => {
    it('should not throw when clearing', () => {
      expect(() => renderer.clear()).not.toThrow();
    });
  });

  describe('ANSI escape sequences', () => {
    it('should generate clear line sequence', () => {
      const seq = TerminalRenderer.clearLine();
      expect(seq).toContain('\r');
    });

    it('should generate move up sequence', () => {
      const seq = TerminalRenderer.moveUp(3);
      expect(seq).toContain('[3A');
    });

    it('should generate move down sequence', () => {
      const seq = TerminalRenderer.moveDown(2);
      expect(seq).toContain('[2B');
    });
  });
});
