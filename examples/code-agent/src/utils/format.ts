/**
 * Format utilities for tool results and display
 */

/** Tool icon mapping */
export const TOOL_ICONS: Record<string, string> = {
  read: '📖',
  write: '✏️',
  edit: '🔧',
  bash: '🐚',
  glob: '🔍',
  grep: '🎯',
};

/** Get icon for a tool name */
export function getToolIcon(toolName: string): string {
  return TOOL_ICONS[toolName.toLowerCase()] || '🔧';
}

/** Format duration in human-readable format */
export function formatDuration(seconds: number): string {
  if (seconds < 1) {
    return `${Math.round(seconds * 1000)}ms`;
  }
  if (seconds < 60) {
    return `${seconds.toFixed(2)}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}m ${remainingSeconds}s`;
}

/** Format tool arguments for display */
export function formatToolArgs(args: Record<string, unknown>, maxLength: number = 60): string {
  const entries = Object.entries(args);
  if (entries.length === 0) {
    return '';
  }

  return entries
    .map(([key, value]) => {
      let valueStr: string;
      if (typeof value === 'string') {
        valueStr = `"${value}"`;
      } else {
        valueStr = JSON.stringify(value);
      }

      // Truncate long values
      if (valueStr.length > maxLength) {
        valueStr = valueStr.slice(0, maxLength - 3) + '...';
      }

      return `${key}: ${valueStr}`;
    })
    .join('\n');
}

/** Format tool result for display */
export function formatToolResult(result: unknown, maxLength: number = 500): string {
  if (result === null) return 'null';
  if (result === undefined) return 'undefined';
  if (typeof result !== 'object') return String(result);

  const resultObj = result as Record<string, unknown>;

  // Handle glob results
  if (resultObj.files !== undefined && Array.isArray(resultObj.files)) {
    const count = resultObj.files.length;
    if (count === 0) return 'No files found';
    return `Found ${count} file${count === 1 ? '' : 's'}`;
  }

  // Handle grep results
  if (resultObj.matches !== undefined && Array.isArray(resultObj.matches)) {
    const count = resultObj.matches.length;
    if (count === 0) return 'No matches found';
    return `Found ${count} match${count === 1 ? '' : 'es'}`;
  }

  // Handle file content
  if (resultObj.content !== undefined) {
    const content = String(resultObj.content);
    return truncateText(content, maxLength);
  }

  // Handle bash results
  if (resultObj.stdout !== undefined || resultObj.stderr !== undefined) {
    const stdout = String(resultObj.stdout || '');
    const stderr = String(resultObj.stderr || '');
    const exitCode = resultObj.exitCode as number | undefined;

    if (exitCode !== 0 && stderr) {
      return truncateText(stderr, maxLength);
    }
    return truncateText(stdout || stderr, maxLength);
  }

  // Handle success results
  if (resultObj.success === true) {
    return 'Success';
  }

  // Handle error results
  if (resultObj.error !== undefined) {
    return `Error: ${resultObj.error}`;
  }

  // Default: stringify with truncation
  const str = JSON.stringify(result);
  return truncateText(str, maxLength);
}

/** Truncate text with ellipsis */
export function truncateText(text: string, maxLength: number, suffix: string = '...'): string {
  if (text.length <= maxLength) {
    return text;
  }
  return text.slice(0, maxLength) + suffix;
}

/** Create a box-drawn code block */
export function createCodeBlock(lines: string[], maxWidth: number = 80): string {
  if (lines.length === 0) {
    return '┌' + '─'.repeat(maxWidth - 2) + '┐\n' + '└' + '─'.repeat(maxWidth - 2) + '┘';
  }

  // Calculate actual width needed
  const contentWidth = Math.min(
    maxWidth - 4, // Account for borders and padding
    Math.max(...lines.map(line => line.length))
  );

  const topBorder = '┌' + '─'.repeat(contentWidth + 2) + '┐';
  const bottomBorder = '└' + '─'.repeat(contentWidth + 2) + '┘';

  const contentLines = lines.map(line => {
    const truncated = line.slice(0, contentWidth);
    const padding = ' '.repeat(contentWidth - truncated.length);
    return '│ ' + truncated + padding + ' │';
  });

  return [topBorder, ...contentLines, bottomBorder].join('\n');
}

/** Format file content with line numbers */
export function formatFileContent(content: string, startLine: number = 1, maxLines: number = 50): string {
  const lines = content.split('\n');
  const displayedLines = lines.slice(0, maxLines);

  const lineNumberWidth = String(startLine + displayedLines.length - 1).length;

  const formatted = displayedLines.map((line, index) => {
    const lineNum = String(startLine + index).padStart(lineNumberWidth, ' ');
    return `${lineNum} │ ${line}`;
  });

  if (lines.length > maxLines) {
    const remaining = lines.length - maxLines;
    formatted.push(`${' '.repeat(lineNumberWidth)} │ ... ${remaining} more line${remaining === 1 ? '' : 's'}`);
  }

  return formatted.join('\n');
}

/** Get status indicator character */
export function getStatusIndicator(status: string): string {
  switch (status) {
    case 'pending':
      return '○';
    case 'running':
      return '◐';
    case 'completed':
      return '◉';
    case 'failed':
      return '◎';
    default:
      return '○';
  }
}

/** Get status color for chalk */
export function getStatusColor(status: string): string {
  switch (status) {
    case 'pending':
      return 'gray';
    case 'running':
      return 'yellow';
    case 'completed':
      return 'green';
    case 'failed':
      return 'red';
    default:
      return 'gray';
  }
}
