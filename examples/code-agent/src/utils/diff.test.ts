/**
 * Diff工具测试
 */

import { describe, it, expect } from 'bun:test';
import { computeDiff, formatDiff, getDiffStats } from './diff.js';

describe('diff', () => {
  describe('computeDiff', () => {
    it('should return empty array for identical content', () => {
      const original = 'line1\nline2\nline3';
      const modified = 'line1\nline2\nline3';
      const hunks = computeDiff(original, modified);
      expect(hunks.length).toBe(0);
    });

    it('should detect added lines', () => {
      const original = 'line1\nline2';
      const modified = 'line1\nline2\nline3';
      const hunks = computeDiff(original, modified);

      expect(hunks.length).toBeGreaterThan(0);
      const lastHunk = hunks[hunks.length - 1];
      const addedLines = lastHunk.lines.filter(l => l.type === 'added');
      expect(addedLines.length).toBe(1);
      expect(addedLines[0].content).toBe('line3');
    });

    it('should detect removed lines', () => {
      const original = 'line1\nline2\nline3';
      const modified = 'line1\nline3';
      const hunks = computeDiff(original, modified);

      expect(hunks.length).toBeGreaterThan(0);
      const removedLines = hunks[0].lines.filter(l => l.type === 'removed');
      expect(removedLines.length).toBe(1);
      expect(removedLines[0].content).toBe('line2');
    });

    it('should detect modified lines', () => {
      const original = 'line1\nline2\nline3';
      const modified = 'line1\nmodified\nline3';
      const hunks = computeDiff(original, modified);

      expect(hunks.length).toBeGreaterThan(0);
      const hunk = hunks[0];
      const removedLines = hunk.lines.filter(l => l.type === 'removed');
      const addedLines = hunk.lines.filter(l => l.type === 'added');

      expect(removedLines.length).toBe(1);
      expect(removedLines[0].content).toBe('line2');
      expect(addedLines.length).toBe(1);
      expect(addedLines[0].content).toBe('modified');
    });
  });

  describe('formatDiff', () => {
    it('should return no changes message for identical content', () => {
      const result = formatDiff('same', 'same');
      expect(result).toContain('no changes');
    });

    it('should format diff with colors', () => {
      const original = 'line1\nline2';
      const modified = 'line1\nmodified';
      const result = formatDiff(original, modified);

      // 应该包含hunk头部
      expect(result).toContain('@@');
      // 应该包含减号（删除）
      expect(result).toContain('-');
      // 应该包含加号（新增）
      expect(result).toContain('+');
    });
  });

  describe('getDiffStats', () => {
    it('should count added and removed lines', () => {
      const original = 'line1\nline2\nline3';
      const modified = 'line1\nmodified\nline3\nline4';
      const stats = getDiffStats(original, modified);

      expect(stats.removed).toBe(1); // line2 removed
      expect(stats.added).toBe(2);   // modified and line4 added
    });

    it('should return zero for identical content', () => {
      const stats = getDiffStats('same', 'same');
      expect(stats.added).toBe(0);
      expect(stats.removed).toBe(0);
    });
  });
});
