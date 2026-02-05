/**
 * FileChangeSummary - 追踪和汇总文件修改
 */

import chalk from 'chalk';
import { getDiffStats } from './diff.js';

/**
 * 单个文件的变更记录
 */
export interface FileChange {
  filePath: string;
  operation: 'write' | 'edit';
  added: number;
  removed: number;
}

/**
 * 文件变更追踪器
 * 用于记录一次对话中的所有Write/Edit操作
 */
export class FileChangeTracker {
  private changes: FileChange[] = [];

  /**
   * 记录Write操作
   * @param filePath - 文件路径
   * @param originalContent - 原始内容（如果是覆盖已有文件）
   * @param newContent - 新内容
   */
  trackWrite(filePath: string, originalContent: string | undefined, newContent: string): void {
    let added = 0;
    let removed = 0;

    if (originalContent !== undefined) {
      // 覆盖已有文件 - 计算diff
      const stats = getDiffStats(originalContent, newContent);
      added = stats.added;
      removed = stats.removed;
    } else {
      // 新文件 - 计算行数
      added = newContent.split('\n').length;
      removed = 0;
    }

    this.changes.push({
      filePath,
      operation: 'write',
      added,
      removed,
    });
  }

  /**
   * 记录Edit操作
   * @param filePath - 文件路径
   * @param originalContent - 原始内容
   * @param newContent - 修改后的内容
   */
  trackEdit(filePath: string, originalContent: string, newContent: string): void {
    const stats = getDiffStats(originalContent, newContent);

    this.changes.push({
      filePath,
      operation: 'edit',
      added: stats.added,
      removed: stats.removed,
    });
  }

  /**
   * 获取所有变更记录
   */
  getChanges(): FileChange[] {
    return [...this.changes];
  }

  /**
   * 获取变更汇总
   */
  getSummary(): { totalAdded: number; totalRemoved: number; fileCount: number } {
    const totalAdded = this.changes.reduce((sum, c) => sum + c.added, 0);
    const totalRemoved = this.changes.reduce((sum, c) => sum + c.removed, 0);
    return {
      totalAdded,
      totalRemoved,
      fileCount: this.changes.length,
    };
  }

  /**
   * 是否有变更记录
   */
  hasChanges(): boolean {
    return this.changes.length > 0;
  }

  /**
   * 清空变更记录
   */
  clear(): void {
    this.changes = [];
  }

  /**
   * 格式化输出汇总信息
   */
  formatSummary(): string {
    if (this.changes.length === 0) {
      return '';
    }

    const lines: string[] = [];
    const { totalAdded, totalRemoved } = this.getSummary();

    lines.push('');
    lines.push(chalk.cyan(`📝 Files Modified (${this.changes.length}):`));
    lines.push('');

    // 显示每个文件的变更
    for (const change of this.changes) {
      const fileName = this.truncatePath(change.filePath, 30);
      const added = change.added > 0 ? chalk.green(`+${change.added}`) : chalk.gray('+0');
      const removed = change.removed > 0 ? chalk.red(`-${change.removed}`) : chalk.gray('-0');
      const icon = change.operation === 'write' ? '✏️' : '🔧';

      lines.push(`  ${icon} ${fileName.padEnd(32)} ${added}, ${removed} lines`);
    }

    // 总计行
    if (this.changes.length > 1) {
      lines.push(chalk.gray('  ' + '─'.repeat(50)));
      const totalAddedStr = chalk.green(`+${totalAdded}`);
      const totalRemovedStr = chalk.red(`-${totalRemoved}`);
      lines.push(`  ${'Total:'.padEnd(33)} ${totalAddedStr}, ${totalRemovedStr} lines`);
    }

    return lines.join('\n');
  }

  /**
   * 截断路径显示
   */
  private truncatePath(filePath: string, maxLength: number): string {
    if (filePath.length <= maxLength) {
      return filePath;
    }

    // 保留文件名，截断中间路径
    const parts = filePath.split('/');
    const fileName = parts[parts.length - 1];

    if (fileName.length >= maxLength - 3) {
      return '...' + fileName.slice(-(maxLength - 3));
    }

    const prefixLength = maxLength - fileName.length - 3;
    return filePath.slice(0, prefixLength) + '...' + fileName;
  }
}

/**
 * 创建文件变更追踪器
 */
export function createFileChangeTracker(): FileChangeTracker {
  return new FileChangeTracker();
}
