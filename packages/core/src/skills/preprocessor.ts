/**
 * Skill preprocessor module
 *
 * Simplified version aligned with Claude Code:
 * Only supports $ARGUMENTS substitution.
 */

import type { PreprocessorContext } from './types';

/**
 * Preprocess skill content by substituting $ARGUMENTS
 * Aligned with Claude Code: only supports $ARGUMENTS
 *
 * @param content - The skill content to preprocess
 * @param context - Preprocessor context with arguments
 * @returns Processed content with substitutions applied
 */
export function preprocessContent(
  content: string,
  context: PreprocessorContext
): string {
  return content.replace(/\$ARGUMENTS/g, context.arguments);
}

/**
 * Create a preprocessor context from arguments
 *
 * @param args - Array of arguments
 * @returns PreprocessorContext object
 */
export function createPreprocessorContext(args: string[]): PreprocessorContext {
  return {
    arguments: args.join(' '),
  };
}
