/**
 * TerminalRenderer - Handles dynamic terminal rendering for tool calls
 */

import chalk from 'chalk';
import type { ToolCallState } from './tool-manager.js';
import type { FileCache } from './file-cache.js';
import {
  getToolIcon,
  formatDuration,
  formatToolArgs,
  formatToolResult,
  getStatusIndicator,
  createCodeBlock,
} from './format.js';
import { formatDiff, formatDiffSummary, getDiffStats } from './diff.js';

export class TerminalRenderer {
  private lastRenderedLines = 0;
  private fileCache?: FileCache;

  /**
   * Set the file cache for retrieving original content
   */
  setFileCache(fileCache: FileCache): void {
    this.fileCache = fileCache;
  }

  /**
   * ANSI escape sequence to clear current line
   */
  static clearLine(): string {
    return '\r\x1b[K';
  }

  /**
   * ANSI escape sequence to move cursor up N lines
   */
  static moveUp(lines: number): string {
    return `\x1b[${lines}A`;
  }

  /**
   * ANSI escape sequence to move cursor down N lines
   */
  static moveDown(lines: number): string {
    return `\x1b[${lines}B`;
  }

  /**
   * ANSI escape sequence to hide cursor
   */
  static hideCursor(): string {
    return '\x1b[?25l';
  }

  /**
   * ANSI escape sequence to show cursor
   */
  static showCursor(): string {
    return '\x1b[?25h';
  }

  /**
   * Clear the previously rendered content
   */
  clear(): void {
    if (this.lastRenderedLines > 0) {
      // Move cursor up and clear lines
      let output = TerminalRenderer.moveUp(this.lastRenderedLines);
      for (let i = 0; i < this.lastRenderedLines; i++) {
        output += TerminalRenderer.clearLine();
        if (i < this.lastRenderedLines - 1) {
          output += '\n';
        }
      }
      output += TerminalRenderer.moveUp(this.lastRenderedLines);
      process.stdout.write(output);
      this.lastRenderedLines = 0;
    }
  }

  /**
   * Render a single tool call
   */
  renderTool(tool: ToolCallState): string {
    const lines: string[] = [];
    const icon = getToolIcon(tool.name);
    const statusIcon = getStatusIndicator(tool.status);

    // Status color
    let statusColor: (text: string) => string;
    switch (tool.status) {
      case 'pending':
        statusColor = chalk.gray;
        break;
      case 'running':
        statusColor = chalk.yellow;
        break;
      case 'completed':
        statusColor = chalk.green;
        break;
      case 'failed':
        statusColor = chalk.red;
        break;
      default:
        statusColor = chalk.gray;
    }

    // Header line with status icon and tool name
    let header = `${statusColor(statusIcon)} ${icon} ${chalk.bold(tool.name)}`;

    // Add duration for completed/failed tools
    if (tool.status === 'completed' || tool.status === 'failed') {
      const duration = this.calculateDuration(tool);
      if (duration !== undefined) {
        header += chalk.gray(` (${formatDuration(duration)})`);
      }
    } else if (tool.status === 'running') {
      header += chalk.yellow(' (running...)');
    }

    lines.push(header);

    // Arguments
    const argsStr = formatToolArgs(tool.args);
    if (argsStr) {
      const indentedArgs = argsStr
        .split('\n')
        .map(line => `  ${chalk.gray(line)}`)
        .join('\n');
      lines.push(indentedArgs);
    }

    // Result or error
    if (tool.status === 'failed' && tool.error) {
      lines.push('');
      lines.push(`  ${chalk.red('Error:')} ${tool.error}`);
    } else if ((tool.status === 'completed' || tool.expanded) && tool.result !== undefined) {
      // Special handling for Write and Edit tools
      if (tool.name === 'Write' || tool.name === 'Edit') {
        const filePath = tool.args.file_path as string | undefined;
        if (filePath) {
          lines.push('');
          lines.push(...this.renderFileChange(tool.name, filePath, tool.result));
        } else {
          // Fallback to standard result display
          this.appendStandardResult(lines, tool.result);
        }
      } else {
        this.appendStandardResult(lines, tool.result);
      }
    }

    return lines.join('\n');
  }

  /**
   * Render file change (Write/Edit) with diff
   */
  private renderFileChange(toolName: string, filePath: string, result: unknown): string[] {
    const lines: string[] = [];
    const originalContent = this.fileCache?.getOriginal(filePath);

    if (toolName === 'Write') {
      // For Write tool, show content preview or diff
      if (originalContent !== undefined) {
        // File was overwritten - show diff
        const newContent = typeof result === 'string' ? result : JSON.stringify(result, null, 2);
        lines.push(`  ${chalk.yellow('⚠ Overwriting existing file:')} ${chalk.cyan(filePath)}`);
        lines.push('');
        lines.push(chalk.gray('  Changes:'));
        const diff = formatDiffSummary(originalContent, newContent, 15);
        const indentedDiff = diff.split('\n').map(l => `    ${l}`).join('\n');
        lines.push(indentedDiff);
      } else {
        // New file - show preview
        lines.push(`  ${chalk.green('✓ Creating new file:')} ${chalk.cyan(filePath)}`);
        const content = typeof result === 'string' ? result : JSON.stringify(result, null, 2);
        const contentLines = content.split('\n');
        if (contentLines.length > 0) {
          lines.push('');
          lines.push(chalk.gray('  Preview:'));
          const previewLines = contentLines.slice(0, 10);
          const codeBlock = createCodeBlock(previewLines, 72);
          const indentedBlock = codeBlock.split('\n').map(l => `    ${l}`).join('\n');
          lines.push(indentedBlock);
          if (contentLines.length > 10) {
            lines.push(chalk.gray(`    ... and ${contentLines.length - 10} more lines`));
          }
        }
      }
    } else if (toolName === 'Edit' && originalContent !== undefined) {
      // For Edit tool, show diff
      lines.push(`  ${chalk.cyan('File:')} ${filePath}`);
      lines.push('');
      lines.push(chalk.gray('  Changes:'));

      // Get the new content from the result
      let newContent: string;
      if (typeof result === 'string') {
        newContent = result;
      } else if (result && typeof result === 'object' && 'content' in result) {
        newContent = String(result.content);
      } else {
        newContent = JSON.stringify(result, null, 2);
      }

      const stats = getDiffStats(originalContent, newContent);
      const diff = formatDiffSummary(originalContent, newContent, 15);
      const indentedDiff = diff.split('\n').map(l => `    ${l}`).join('\n');
      lines.push(indentedDiff);
      lines.push('');
      lines.push(`  ${chalk.green(`+${stats.added}`)} ${chalk.red(`-${stats.removed}`)} lines`);
    } else {
      // Fallback
      lines.push(`  ${chalk.cyan('File:')} ${filePath}`);
      this.appendStandardResult(lines, result);
    }

    return lines;
  }

  /**
   * Append standard result formatting
   */
  private appendStandardResult(lines: string[], result: unknown): void {
    const resultStr = formatToolResult(result);
    if (resultStr) {
      lines.push('');
      lines.push(`  ${chalk.gray('Result:')}`);

      // Format result in a code block if it's multi-line
      const resultLines = resultStr.split('\n');
      if (resultLines.length > 1 || resultStr.length > 50) {
        const codeBlock = createCodeBlock(resultLines, 76);
        const indentedBlock = codeBlock
          .split('\n')
          .map(line => `  ${line}`)
          .join('\n');
        lines.push(indentedBlock);
      } else {
        lines.push(`    ${resultStr}`);
      }
    }
  }

  /**
   * Render multiple tools
   */
  renderTools(tools: ToolCallState[]): string {
    if (tools.length === 0) {
      return '';
    }

    const rendered = tools.map(tool => this.renderTool(tool));
    return rendered.join('\n\n');
  }

  /**
   * Render and display tools to terminal
   */
  display(tools: ToolCallState[]): void {
    // Clear previous output
    this.clear();

    if (tools.length === 0) {
      return;
    }

    // Render new output
    const output = this.renderTools(tools);
    const lines = output.split('\n');
    this.lastRenderedLines = lines.length;

    process.stdout.write(output + '\n');
  }

  /**
   * Calculate duration in seconds
   */
  private calculateDuration(tool: ToolCallState): number | undefined {
    if (!tool.startTime) {
      return undefined;
    }
    const endTime = tool.endTime || Date.now();
    return (endTime - tool.startTime) / 1000;
  }
}

/**
 * Spinner for running tools animation
 */
export class ToolSpinner {
  private frames = ['◐', '◓', '◑', '◒'];
  private interval: NodeJS.Timeout | null = null;
  private currentFrame = 0;

  start(onFrame: (frame: string) => void, intervalMs: number = 100): void {
    if (this.interval) return;

    this.interval = setInterval(() => {
      const frame = this.frames[this.currentFrame];
      onFrame(frame);
      this.currentFrame = (this.currentFrame + 1) % this.frames.length;
    }, intervalMs);
  }

  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }
}
