/**
 * Glob tool - Find files matching glob patterns
 */

import { readdirSync, statSync, existsSync } from 'fs';
import { resolve, join, relative } from 'path';
import type { Tool, ToolContext, JSONSchema } from '../types/tools';

export interface GlobInput {
  pattern: string;
  path?: string;
  sort?: 'alphabetical' | 'mtime';
}

export interface GlobOutput {
  files?: string[];
  count?: number;
  error?: string;
}

const parameters: JSONSchema = {
  type: 'object',
  properties: {
    pattern: {
      type: 'string',
      description: 'Glob pattern to match files (e.g., "**/*.ts", "src/*.js")',
    },
    path: {
      type: 'string',
      description: 'Directory to search in (defaults to cwd)',
    },
    sort: {
      type: 'string',
      enum: ['alphabetical', 'mtime'],
      description: 'Sort order: alphabetical (default) or mtime (modification time, newest first)',
    },
  },
  required: ['pattern'],
};

const MAX_RESULTS = 1000;

/**
 * Validate glob pattern for invalid syntax
 */
function validatePattern(pattern: string): void {
  // Check for unclosed character class
  const openBrackets = (pattern.match(/\[/g) || []).length;
  const closeBrackets = (pattern.match(/\]/g) || []).length;
  if (openBrackets !== closeBrackets) {
    throw new Error('Invalid character class in pattern: unclosed bracket');
  }

  // Check for unclosed brace expansion
  const openBraces = (pattern.match(/\{/g) || []).length;
  const closeBraces = (pattern.match(/\}/g) || []).length;
  if (openBraces !== closeBraces) {
    throw new Error('Invalid brace expansion in pattern: unclosed brace');
  }
}

/**
 * Convert a glob pattern to a RegExp
 * Supports: * (any chars except /), ** (recursive), ? (single char)
 */
function globToRegExp(pattern: string): RegExp {
  // Validate pattern first
  validatePattern(pattern);

  let regex = '';
  let i = 0;

  while (i < pattern.length) {
    const c = pattern[i];

    if (c === '*') {
      if (pattern[i + 1] === '*') {
        // ** matches any path segments including /
        regex += '.*';
        i += 2;
      } else {
        // * matches any chars except /
        regex += '[^/]*';
        i++;
      }
    } else if (c === '?') {
      // ? matches single char except /
      regex += '[^/]';
      i++;
    } else if (c === '[') {
      // Character class [...]
      const end = pattern.indexOf(']', i);
      if (end === -1) {
        throw new Error('Invalid character class in pattern');
      }
      regex += pattern.slice(i, end + 1);
      i = end + 1;
    } else if (c === '{') {
      // Brace expansion {a,b,c}
      const end = pattern.indexOf('}', i);
      if (end === -1) {
        throw new Error('Invalid brace expansion in pattern');
      }
      const options = pattern.slice(i + 1, end).split(',');
      regex += '(?:' + options.map(escapeRegex).join('|') + ')';
      i = end + 1;
    } else if ('\\^$.|+()'.includes(c)) {
      // Escape special regex chars
      regex += '\\' + c;
      i++;
    } else {
      regex += c;
      i++;
    }
  }

  return new RegExp('^' + regex + '$');
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Match a file path against a glob pattern
 */
function matchGlob(filePath: string, pattern: string): boolean {
  // Normalize path separators
  const normalizedPath = filePath.replace(/\\/g, '/');
  const normalizedPattern = pattern.replace(/\\/g, '/');

  // Handle **/ prefix - match at any depth
  if (normalizedPattern.startsWith('**/')) {
    const restPattern = normalizedPattern.slice(3);
    const restRegex = globToRegExp(restPattern);
    // Check if the path ends with something matching restPattern
    const parts = normalizedPath.split('/');
    for (let i = 0; i < parts.length; i++) {
      const subPath = parts.slice(i).join('/');
      if (restRegex.test(subPath)) {
        return true;
      }
    }
    return false;
  }

  // Handle patterns with /**/ in the middle
  if (normalizedPattern.includes('/**/')) {
    const parts = normalizedPattern.split('/**/');
    const prefixRegex = globToRegExp(parts[0]);
    const suffixRegex = globToRegExp(parts.slice(1).join('/'));

    if (!prefixRegex.test(normalizedPath)) {
      return false;
    }

    // Check if suffix matches at any position after prefix
    const prefixMatch = prefixRegex.exec(normalizedPath);
    if (prefixMatch) {
      const afterPrefix = normalizedPath.slice(prefixMatch[0].length);
      // Try matching suffix at different positions
      const pathParts = afterPrefix.split('/');
      for (let i = 0; i < pathParts.length; i++) {
        const candidate = pathParts.slice(i).join('/');
        if (candidate && suffixRegex.test(candidate)) {
          return true;
        }
      }
    }
    return false;
  }

  const regex = globToRegExp(normalizedPattern);
  return regex.test(normalizedPath);
}

interface FileResult {
  path: string;
  mtime: number;
}

/**
 * Recursively find files matching the pattern
 */
function findFiles(
  dir: string,
  pattern: string,
  baseDir: string,
  results: FileResult[],
  visited: Set<string> = new Set()
): void {
  if (results.length >= MAX_RESULTS) {
    return;
  }

  // Prevent infinite loops from symlinks
  const realPath = statSync(dir).isDirectory() ? dir : null;
  if (!realPath || visited.has(realPath)) {
    return;
  }
  visited.add(realPath);

  try {
    const entries = readdirSync(dir);

    for (const entry of entries) {
      if (results.length >= MAX_RESULTS) {
        return;
      }

      const fullPath = join(dir, entry);
      const relativePath = relative(baseDir, fullPath);
      const stats = statSync(fullPath);

      if (stats.isDirectory()) {
        // Recurse into subdirectories
        findFiles(fullPath, pattern, baseDir, results, visited);
      } else if (stats.isFile()) {
        // Check if file matches pattern
        if (matchGlob(relativePath, pattern)) {
          results.push({
            path: fullPath,
            mtime: stats.mtime.getTime(),
          });
        }
      }
    }
  } catch (error) {
    // Skip directories we can't read
  }
}

export class GlobTool implements Tool<GlobInput, GlobOutput> {
  name = 'Glob';
  description =
    'Find files matching a glob pattern. Supports * (any chars), ** (recursive), ? (single char). Returns sorted file paths.';
  parameters = parameters;

  handler = async (
    input: GlobInput,
    context: ToolContext
  ): Promise<GlobOutput> => {
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

      // Validate pattern syntax before searching
      try {
        validatePattern(input.pattern);
      } catch (validationError) {
        const message = validationError instanceof Error ? validationError.message : String(validationError);
        return { error: message };
      }

      // Find matching files
      const results: FileResult[] = [];
      findFiles(searchDir, input.pattern, searchDir, results);

      // Sort results
      const sortMode = input.sort ?? 'alphabetical';
      if (sortMode === 'mtime') {
        // Sort by modification time desc (newest first)
        results.sort((a, b) => b.mtime - a.mtime);
      } else {
        // Sort alphabetically
        results.sort((a, b) => a.path.localeCompare(b.path));
      }

      return {
        files: results.map((r) => r.path),
        count: results.length,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { error: `Glob error: ${message}` };
    }
  };
}

// Export singleton instance
export const globTool = new GlobTool();
