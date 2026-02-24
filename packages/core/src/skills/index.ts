/**
 * Skills module public API
 *
 * Skills are automatically discovered and loaded from:
 * - ~/.claude/skills/ (personal skills)
 * - .claude/skills/ (project skills)
 *
 * Users trigger skills via slash commands: /skill-name
 *
 * This module only exports types for TypeScript users.
 * Implementation details are used internally by Session.
 */

// Export types only - implementation is internal
export type {
  SkillFrontmatter,
  SkillDefinition,
  SkillCatalogItem,
  SkillLoaderOptions,
  SkillRegistry,
  SkillParseResult,
  PreprocessorContext,
} from './types';
