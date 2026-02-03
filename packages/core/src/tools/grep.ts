/**
 * Grep tool - Search file contents using regex patterns
 */

import { readdirSync, statSync, existsSync, readFileSync } from 'fs';
import { resolve, join, relative } from 'path';
import type { Tool, ToolContext, JSONSchema } from '../types/tools';

export interface GrepInput {
  pattern: string;
  path?: string;
  glob?: string;
  multiline?: boolean;
  ignoreCase?: boolean;
  output_mode?: 'files_with_matches' | 'content' | 'count';
  head_limit?: number;
  offset?: number;
  context?: number;
  before_context?: number;
  after_context?: number;
}

export interface GrepMatch {
  file: string;
  line: number;
  content: string;
  context_before?: string[];
  context_after?: string[];
}

export interface GrepOutput {
  matches?: GrepMatch[];
  count?: number;
  files?: string[];
  fileCounts?: Record<string, number>;
  error?: string;
}

const parameters: JSONSchema = {
  type: 'object',
  properties: {
    pattern: {
      type: 'string',
      description: 'Regular expression pattern to search for',
    },
    path: {
      type: 'string',
      description: 'Directory to search in (defaults to cwd)',
    },
    glob: {
      type: 'string',
      description: 'Glob pattern to filter files (e.g., "*.ts")',
    },
    multiline: {
      type: 'boolean',
      description: 'Enable multiline matching (default: false)',
    },
    ignoreCase: {
      type: 'boolean',
      description: 'Case insensitive matching (default: false)',
    },
    output_mode: {
      type: 'string',
      enum: ['files_with_matches', 'content', 'count'],
      description: 'Output format: files_with_matches (file paths only), content (matching lines), count (match counts per file)',
    },
    head_limit: {
      type: 'number',
      description: 'Maximum number of matches to return (default: 100)',
    },
    offset: {
      type: 'number',
      description: 'Number of matches to skip from the beginning',
    },
    context: {
      type: 'number',
      description: 'Number of context lines to show before and after each match (like -C in grep)',
    },
    before_context: {
      type: 'number',
      description: 'Number of context lines to show before each match (like -B in grep)',
    },
    after_context: {
      type: 'number',
      description: 'Number of context lines to show after each match (like -A in grep)',
    },
  },
  required: ['pattern'],
};

const MAX_MATCHES = 100;
const MAX_FILE_SIZE = 1024 * 1024; // 1MB

/**
 * Simple glob matching function
 * Supports: * (any chars), ? (single char), ** (recursive)
 */
function matchGlob(filePath: string, pattern: string): boolean {
  const normalizedPath = filePath.replace(/\\/g, '/');
  const normalizedPattern = pattern.replace(/\\/g, '/');

  // Handle **/ prefix
  if (normalizedPattern.startsWith('**/')) {
    const restPattern = normalizedPattern.slice(3);
    const parts = normalizedPath.split('/');
    for (let i = 0; i < parts.length; i++) {
      const subPath = parts.slice(i).join('/');
      if (matchSimpleGlob(subPath, restPattern)) {
        return true;
      }
    }
    return false;
  }

  return matchSimpleGlob(normalizedPath, normalizedPattern);
}

function matchSimpleGlob(path: string, pattern: string): boolean {
  // Convert simple glob to regex
  let regex = '';
  for (let i = 0; i < pattern.length; i++) {
    const c = pattern[i];
    if (c === '*') {
      regex += '.*';
    } else if (c === '?') {
      regex += '.';
    } else if ('\\^$.|+()[]{}'.includes(c)) {
      regex += '\\' + c;
    } else {
      regex += c;
    }
  }

  const re = new RegExp('^' + regex + '$');
  return re.test(path);
}

interface FileMatchResult {
  filePath: string;
  line: number;
  content: string;
  context_before?: string[];
  context_after?: string[];
}

/**
 * Search a single file for pattern matches
 */
function searchFile(
  filePath: string,
  regex: RegExp,
  matches: FileMatchResult[],
  maxMatches: number,
  beforeContext: number,
  afterContext: number
): void {
  if (matches.length >= maxMatches) {
    return;
  }

  try {
    // Check file size
    const stats = statSync(filePath);
    if (stats.size > MAX_FILE_SIZE) {
      return; // Skip large files
    }

    // Read file content
    const content = readFileSync(filePath, 'utf-8');

    // Check for binary content (null bytes)
    if (content.includes('\x00')) {
      return; // Skip binary files
    }

    const lines = content.split('\n');

    if (regex.multiline) {
      // Multiline mode: search entire content
      const text = content;
      let match;
      regex.lastIndex = 0;

      while ((match = regex.exec(text)) !== null && matches.length < maxMatches) {
        // Find line number for the match
        const linesBefore = text.slice(0, match.index).split('\n');
        const lineNum = linesBefore.length;
        const lineContent = linesBefore[linesBefore.length - 1] + text.slice(match.index).split('\n')[0];

        const result: FileMatchResult = {
          filePath,
          line: lineNum,
          content: lineContent.slice(0, 200), // Limit content length
        };

        // Add context if requested
        if (beforeContext > 0) {
          const startLine = Math.max(0, lineNum - beforeContext - 1);
          result.context_before = lines.slice(startLine, lineNum - 1);
        }
        if (afterContext > 0) {
          const endLine = Math.min(lines.length, lineNum + afterContext);
          result.context_after = lines.slice(lineNum, endLine);
        }

        matches.push(result);

        // Prevent infinite loop on zero-length matches
        if (match[0].length === 0) {
          regex.lastIndex++;
        }
      }
    } else {
      // Line-by-line mode
      for (let i = 0; i < lines.length && matches.length < maxMatches; i++) {
        const line = lines[i];
        regex.lastIndex = 0;

        if (regex.test(line)) {
          const result: FileMatchResult = {
            filePath,
            line: i + 1,
            content: line.slice(0, 200), // Limit content length
          };

          // Add context if requested
          if (beforeContext > 0) {
            const startLine = Math.max(0, i - beforeContext);
            result.context_before = lines.slice(startLine, i);
          }
          if (afterContext > 0) {
            const endLine = Math.min(lines.length, i + 1 + afterContext);
            result.context_after = lines.slice(i + 1, endLine);
          }

          matches.push(result);
        }
      }
    }
  } catch (error) {
    // Skip files we can't read
  }
}

/**
 * Recursively find and search files
 */
function findAndSearch(
  dir: string,
  pattern: string,
  glob: string | undefined,
  regex: RegExp,
  baseDir: string,
  matches: FileMatchResult[],
  maxMatches: number,
  beforeContext: number,
  afterContext: number,
  visited: Set<string> = new Set()
): void {
  if (matches.length >= maxMatches) {
    return;
  }

  // Prevent infinite loops from symlinks
  try {
    const realPath = statSync(dir);
    if (!realPath.isDirectory() || visited.has(dir)) {
      return;
    }
    visited.add(dir);
  } catch {
    return;
  }

  try {
    const entries = readdirSync(dir);

    for (const entry of entries) {
      if (matches.length >= maxMatches) {
        return;
      }

      const fullPath = join(dir, entry);
      const relativePath = relative(baseDir, fullPath);

      try {
        const stats = statSync(fullPath);

        if (stats.isDirectory()) {
          // Recurse into subdirectories
          findAndSearch(
            fullPath,
            pattern,
            glob,
            regex,
            baseDir,
            matches,
            maxMatches,
            beforeContext,
            afterContext,
            visited
          );
        } else if (stats.isFile()) {
          // Check glob filter if specified
          if (glob && !matchGlob(relativePath, glob)) {
            continue;
          }

          // Search the file
          searchFile(fullPath, regex, matches, maxMatches, beforeContext, afterContext);
        }
      } catch {
        // Skip entries we can't stat
      }
    }
  } catch {
    // Skip directories we can't read
  }
}

export class GrepTool implements Tool<GrepInput, GrepOutput> {
  name = 'Grep';
  description =
    'Search file contents using regular expressions. Returns matching lines with file path and line number. Supports glob filtering and multiline matching.';
  parameters = parameters;

  handler = async (
    input: GrepInput,
    context: ToolContext
  ): Promise<GrepOutput> => {
    try {
      // Resolve search directory
      const searchDir = input.path
        ? resolve(context.cwd, input.path)
        : context.cwd;

      if (!existsSync(searchDir)) {
        return { error: `Path "${input.path}" does not exist` };
      }

      const stats = statSync(searchDir);
      if (!stats.isDirectory()) {
        return { error: `Path "${input.path}" is not a directory` };
      }

      // Validate pattern
      if (!input.pattern || input.pattern.trim() === '') {
        return { error: 'Pattern is required' };
      }

      // Create regex
      let regex: RegExp;
      try {
        const flags = `g${input.ignoreCase ? 'i' : ''}${input.multiline ? 'm' : ''}`;
        regex = new RegExp(input.pattern, flags);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return { error: `Invalid regex pattern: ${message}` };
      }

      // Determine output mode
      const outputMode = input.output_mode ?? 'content';

      // Determine max matches (for content mode)
      const maxMatches = input.head_limit ?? MAX_MATCHES;

      // Determine context lines
      const beforeContext = input.before_context ?? input.context ?? 0;
      const afterContext = input.after_context ?? input.context ?? 0;

      // Find and search files
      const matches: FileMatchResult[] = [];
      findAndSearch(
        searchDir,
        input.pattern,
        input.glob,
        regex,
        searchDir,
        matches,
        outputMode === 'content' ? maxMatches + (input.offset ?? 0) : Infinity,
        beforeContext,
        afterContext
      );

      // Apply offset
      const offset = input.offset ?? 0;
      const offsetMatches = matches.slice(offset);

      // Format output based on mode
      switch (outputMode) {
        case 'files_with_matches': {
          const files = [...new Set(offsetMatches.map((m) => m.filePath))];
          return { files };
        }
        case 'count': {
          const fileCounts: Record<string, number> = {};
          for (const match of offsetMatches) {
            fileCounts[match.filePath] = (fileCounts[match.filePath] ?? 0) + 1;
          }
          return { fileCounts };
        }
        case 'content':
        default: {
          const limitedMatches = offsetMatches.slice(0, maxMatches);
          return {
            matches: limitedMatches.map((m) => ({
              file: m.filePath,
              line: m.line,
              content: m.content,
              context_before: m.context_before,
              context_after: m.context_after,
            })),
            count: limitedMatches.length,
          };
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { error: `Grep error: ${message}` };
    }
  };
}

// Export singleton instance
export const grepTool = new GrepTool();
