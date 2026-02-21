/**
 * Skill preprocessor module
 *
 * This module provides functionality to preprocess skill content,
 * performing argument and environment variable substitution.
 */

import type { PreprocessorContext } from './types';

/**
 * Preprocess skill content by substituting variables
 *
 * Supports:
 * - $0, $1, $2, ... - Positional arguments
 * - $ARGUMENTS - All arguments joined as string
 * - $ENV_VAR - Environment variables
 *
 * @param content - The skill content to preprocess
 * @param context - Preprocessor context with args and env
 * @returns Processed content with substitutions applied
 */
export function preprocessContent(
  content: string,
  context: PreprocessorContext
): string {
  let result = content;

  // Replace $ARGUMENTS first (before positional args to avoid conflicts)
  result = result.replace(/\$ARGUMENTS/g, context.arguments);

  // Replace positional arguments $0, $1, $2, etc.
  // Match $ followed by one or more digits
  result = result.replace(/\$(\d+)/g, (match, indexStr) => {
    const index = parseInt(indexStr, 10);
    if (index < context.args.length) {
      return context.args[index];
    }
    return match; // Keep original if index out of bounds
  });

  // Replace environment variables ${VAR_NAME} or $VAR_NAME
  // First handle ${VAR_NAME} format
  result = result.replace(/\$\{([A-Z_][A-Z0-9_]*)\}/g, (match, varName) => {
    if (varName in context.env) {
      return context.env[varName];
    }
    return match; // Keep original if variable not found
  });

  // Then handle $VAR_NAME format
  result = result.replace(/\$([A-Z_][A-Z0-9_]*)/g, (match, varName) => {
    if (varName in context.env) {
      return context.env[varName];
    }
    return match; // Keep original if variable not found
  });

  return result;
}

/**
 * Create a preprocessor context from process arguments
 *
 * @param args - Array of arguments (defaults to process.argv.slice(2))
 * @param env - Environment variables (defaults to process.env)
 * @returns PreprocessorContext object
 */
export function createPreprocessorContext(
  args?: string[],
  env?: Record<string, string>
): PreprocessorContext {
  const actualArgs = args ?? process.argv.slice(2);
  const actualEnv = env ?? (process.env as Record<string, string>);

  return {
    args: actualArgs,
    env: actualEnv,
    arguments: actualArgs.join(' '),
  };
}
