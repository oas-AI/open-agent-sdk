/**
 * TerminalRenderer - Handles dynamic terminal rendering for tool calls
 */

import chalk from 'chalk';
import type { ToolCallState } from './tool-manager.js';
import {
  getToolIcon,
  formatDuration,
  formatToolArgs,
  formatToolResult,
  getStatusIndicator,
  createCodeBlock,
} from './format.js';

export class TerminalRenderer {
  private lastRenderedLines = 0;

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
      const resultStr = formatToolResult(tool.result);
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

    return lines.join('\n');
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
