/**
 * Tests for ToolManager class
 */

import { describe, it, expect, beforeEach } from 'bun:test';
import { ToolManager, type ToolCallState } from './tool-manager.js';

describe('ToolManager', () => {
  let manager: ToolManager;

  beforeEach(() => {
    manager = new ToolManager();
  });

  describe('addTool', () => {
    it('should add a new tool with pending status', () => {
      manager.addTool('tool-1', 'read', { file_path: '/test.txt' });

      const tools = manager.getTools();
      expect(tools).toHaveLength(1);
      expect(tools[0].id).toBe('tool-1');
      expect(tools[0].name).toBe('read');
      expect(tools[0].status).toBe('pending');
      expect(tools[0].args).toEqual({ file_path: '/test.txt' });
      expect(tools[0].expanded).toBe(false);
    });

    it('should add multiple tools', () => {
      manager.addTool('tool-1', 'read', { file_path: '/test1.txt' });
      manager.addTool('tool-2', 'glob', { pattern: '*.ts' });

      const tools = manager.getTools();
      expect(tools).toHaveLength(2);
    });
  });

  describe('updateToolStatus', () => {
    it('should update status from pending to running', () => {
      manager.addTool('tool-1', 'read', { file_path: '/test.txt' });
      manager.updateToolStatus('tool-1', 'running');

      const tool = manager.getTool('tool-1');
      expect(tool?.status).toBe('running');
      expect(tool?.startTime).toBeDefined();
    });

    it('should update status to completed', () => {
      manager.addTool('tool-1', 'read', { file_path: '/test.txt' });
      manager.updateToolStatus('tool-1', 'running');
      manager.updateToolStatus('tool-1', 'completed');

      const tool = manager.getTool('tool-1');
      expect(tool?.status).toBe('completed');
      expect(tool?.endTime).toBeDefined();
    });

    it('should update status to failed', () => {
      manager.addTool('tool-1', 'read', { file_path: '/test.txt' });
      manager.updateToolStatus('tool-1', 'failed');

      const tool = manager.getTool('tool-1');
      expect(tool?.status).toBe('failed');
      expect(tool?.endTime).toBeDefined();
    });

    it('should throw error for non-existent tool', () => {
      expect(() => manager.updateToolStatus('non-existent', 'running')).toThrow();
    });
  });

  describe('setToolResult', () => {
    it('should set result for a tool', () => {
      manager.addTool('tool-1', 'read', { file_path: '/test.txt' });
      const result = { content: 'file content' };
      manager.setToolResult('tool-1', result);

      const tool = manager.getTool('tool-1');
      expect(tool?.result).toEqual(result);
    });

    it('should throw error for non-existent tool', () => {
      expect(() => manager.setToolResult('non-existent', {})).toThrow();
    });
  });

  describe('setToolError', () => {
    it('should set error for a tool', () => {
      manager.addTool('tool-1', 'read', { file_path: '/test.txt' });
      manager.setToolError('tool-1', 'File not found');

      const tool = manager.getTool('tool-1');
      expect(tool?.error).toBe('File not found');
      expect(tool?.status).toBe('failed');
    });

    it('should throw error for non-existent tool', () => {
      expect(() => manager.setToolError('non-existent', 'error')).toThrow();
    });
  });

  describe('toggleExpanded', () => {
    it('should toggle expanded state', () => {
      manager.addTool('tool-1', 'read', { file_path: '/test.txt' });

      manager.toggleExpanded('tool-1');
      expect(manager.getTool('tool-1')?.expanded).toBe(true);

      manager.toggleExpanded('tool-1');
      expect(manager.getTool('tool-1')?.expanded).toBe(false);
    });

    it('should throw error for non-existent tool', () => {
      expect(() => manager.toggleExpanded('non-existent')).toThrow();
    });
  });

  describe('getDuration', () => {
    it('should return duration for completed tool', () => {
      manager.addTool('tool-1', 'read', { file_path: '/test.txt' });
      manager.updateToolStatus('tool-1', 'running');

      // Simulate time passing
      const tool = manager.getTool('tool-1');
      if (tool) {
        tool.startTime = Date.now() - 1000; // 1 second ago
      }

      manager.updateToolStatus('tool-1', 'completed');
      const duration = manager.getDuration('tool-1');

      expect(duration).toBeGreaterThanOrEqual(1);
    });

    it('should return undefined for pending tool', () => {
      manager.addTool('tool-1', 'read', { file_path: '/test.txt' });
      expect(manager.getDuration('tool-1')).toBeUndefined();
    });
  });

  describe('clear', () => {
    it('should clear all tools', () => {
      manager.addTool('tool-1', 'read', { file_path: '/test1.txt' });
      manager.addTool('tool-2', 'glob', { pattern: '*.ts' });

      manager.clear();

      expect(manager.getTools()).toHaveLength(0);
    });
  });

  describe('hasRunningTools', () => {
    it('should return true when tools are running', () => {
      manager.addTool('tool-1', 'read', { file_path: '/test.txt' });
      manager.updateToolStatus('tool-1', 'running');

      expect(manager.hasRunningTools()).toBe(true);
    });

    it('should return false when no tools are running', () => {
      manager.addTool('tool-1', 'read', { file_path: '/test.txt' });
      manager.updateToolStatus('tool-1', 'completed');

      expect(manager.hasRunningTools()).toBe(false);
    });
  });
});
