/**
 * Diff工具 - 计算和格式化文件变更
 * 提供类似git diff的终端展示格式
 */

import chalk from 'chalk';

/**
 * 差异行类型
 */
export type DiffLineType = 'context' | 'added' | 'removed';

/**
 * 差异行
 */
export interface DiffLine {
  type: DiffLineType;
  content: string;
  oldLineNum?: number;
  newLineNum?: number;
}

/**
 * 差异块（hunk）
 */
export interface DiffHunk {
  oldStart: number;
  oldCount: number;
  newStart: number;
  newCount: number;
  lines: DiffLine[];
}

/**
 * 计算两个文本的差异
 * 使用简单的行级LCS（最长公共子序列）算法
 */
export function computeDiff(original: string, modified: string): DiffHunk[] {
  const oldLines = original.split('\n');
  const newLines = modified.split('\n');

  // 使用动态规划计算LCS
  const dp: number[][] = Array(oldLines.length + 1)
    .fill(null)
    .map(() => Array(newLines.length + 1).fill(0));

  for (let i = 1; i <= oldLines.length; i++) {
    for (let j = 1; j <= newLines.length; j++) {
      if (oldLines[i - 1] === newLines[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // 回溯构建diff
  const hunks: DiffHunk[] = [];
  let currentHunk: DiffHunk | null = null;
  let oldIdx = oldLines.length;
  let newIdx = newLines.length;
  const changes: { type: DiffLineType; oldLine?: string; newLine?: string; oldNum?: number; newNum?: number }[] = [];

  while (oldIdx > 0 || newIdx > 0) {
    if (oldIdx > 0 && newIdx > 0 && oldLines[oldIdx - 1] === newLines[newIdx - 1]) {
      // 相同行
      changes.unshift({
        type: 'context',
        oldLine: oldLines[oldIdx - 1],
        newLine: newLines[newIdx - 1],
        oldNum: oldIdx,
        newNum: newIdx,
      });
      oldIdx--;
      newIdx--;
    } else if (newIdx > 0 && (oldIdx === 0 || dp[oldIdx][newIdx - 1] >= dp[oldIdx - 1][newIdx])) {
      // 新增行
      changes.unshift({
        type: 'added',
        newLine: newLines[newIdx - 1],
        newNum: newIdx,
      });
      newIdx--;
    } else {
      // 删除行
      changes.unshift({
        type: 'removed',
        oldLine: oldLines[oldIdx - 1],
        oldNum: oldIdx,
      });
      oldIdx--;
    }
  }

  // 将changes分组为hunks（每段变更周围保留3行上下文）
  const contextLines = 3;
  let hunkStart = 0;

  while (hunkStart < changes.length) {
    // 找到下一个变更
    while (hunkStart < changes.length && changes[hunkStart].type === 'context') {
      hunkStart++;
    }

    if (hunkStart >= changes.length) break;

    // 找到hunk的开始（包含前3行上下文）
    const hunkBegin = Math.max(0, hunkStart - contextLines);

    // 找到hunk的结束（包含后3行上下文）
    let hunkEnd = hunkStart;
    let contextCount = 0;
    while (hunkEnd < changes.length && contextCount < contextLines) {
      if (changes[hunkEnd].type === 'context') {
        contextCount++;
      } else {
        contextCount = 0;
      }
      hunkEnd++;
    }

    // 构建hunk
    const hunkChanges = changes.slice(hunkBegin, hunkEnd);
    const hunk = createHunk(hunkChanges);
    hunks.push(hunk);

    hunkStart = hunkEnd;
  }

  return hunks;
}

/**
 * 从变更列表创建hunk
 */
function createHunk(changes: { type: DiffLineType; oldLine?: string; newLine?: string; oldNum?: number; newNum?: number }[]): DiffHunk {
  const lines: DiffLine[] = [];
  let oldStart = 0;
  let newStart = 0;
  let oldCount = 0;
  let newCount = 0;

  for (const change of changes) {
    const line: DiffLine = {
      type: change.type,
      content: change.oldLine ?? change.newLine ?? '',
    };

    if (change.type !== 'added') {
      line.oldLineNum = change.oldNum;
      if (change.oldNum) {
        if (oldStart === 0) oldStart = change.oldNum;
        oldCount++;
      }
    }

    if (change.type !== 'removed') {
      line.newLineNum = change.newNum;
      if (change.newNum) {
        if (newStart === 0) newStart = change.newNum;
        newCount++;
      }
    }

    lines.push(line);
  }

  return {
    oldStart: oldStart || 1,
    oldCount,
    newStart: newStart || 1,
    newCount,
    lines,
  };
}

/**
 * 格式化hunk头部（@@ -start,count +start,count @@）
 */
function formatHunkHeader(hunk: DiffHunk): string {
  const oldRange = hunk.oldCount === 1 ? `${hunk.oldStart}` : `${hunk.oldStart},${hunk.oldCount}`;
  const newRange = hunk.newCount === 1 ? `${hunk.newStart}` : `${hunk.newStart},${hunk.newCount}`;
  return `@@ -${oldRange} +${newRange} @@`;
}

/**
 * 格式化单行diff
 */
function formatDiffLine(line: DiffLine): string {
  const prefix = line.type === 'added' ? '+' : line.type === 'removed' ? '-' : ' ';
  const content = line.content;

  // 使用chalk添加颜色
  switch (line.type) {
    case 'added':
      return chalk.green(`${prefix} ${content}`);
    case 'removed':
      return chalk.red(`${prefix} ${content}`);
    case 'context':
    default:
      return chalk.gray(`${prefix} ${content}`);
  }
}

/**
 * 格式化整个diff为字符串
 */
export function formatDiff(original: string, modified: string): string {
  if (original === modified) {
    return chalk.gray('(no changes)');
  }

  const hunks = computeDiff(original, modified);

  if (hunks.length === 0) {
    return chalk.gray('(no changes)');
  }

  const lines: string[] = [];

  for (const hunk of hunks) {
    lines.push(chalk.cyan(formatHunkHeader(hunk)));

    for (const line of hunk.lines) {
      lines.push(formatDiffLine(line));
    }
  }

  return lines.join('\n');
}

/**
 * 获取diff统计信息
 */
export function getDiffStats(original: string, modified: string): { added: number; removed: number } {
  const hunks = computeDiff(original, modified);
  let added = 0;
  let removed = 0;

  for (const hunk of hunks) {
    for (const line of hunk.lines) {
      if (line.type === 'added') added++;
      if (line.type === 'removed') removed++;
    }
  }

  return { added, removed };
}

/**
 * 格式化简化的diff摘要（用于展示）
 */
export function formatDiffSummary(original: string, modified: string, maxLines: number = 20): string {
  const diff = formatDiff(original, modified);
  const lines = diff.split('\n');

  if (lines.length <= maxLines) {
    return diff;
  }

  // 截断显示
  const truncated = lines.slice(0, maxLines);
  truncated.push(chalk.gray(`... and ${lines.length - maxLines} more lines ...`));
  return truncated.join('\n');
}
