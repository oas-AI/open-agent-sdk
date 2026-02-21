/**
 * Skill system type definitions
 *
 * Simplified version aligned with Claude Code behavior.
 */

/**
 * Skill frontmatter parsed from YAML header in SKILL.md files
 * Aligned with Claude Code: minimal required fields
 */
export interface SkillFrontmatter {
  /** Skill name (unique identifier) */
  name: string;

  /** Human-readable description */
  description: string;

  /** List of allowed tools for this skill */
  allowedTools?: string[];

  /** Model configuration for this skill */
  model?: string;
}

/**
 * Complete skill definition including frontmatter, content, and metadata
 */
export interface SkillDefinition {
  /** Parsed frontmatter */
  frontmatter: SkillFrontmatter;

  /** Markdown content (without frontmatter) */
  content: string;

  /** Full file path where the skill was loaded from */
  filePath: string;

  /** Source type: 'personal' or 'project' */
  source: 'personal' | 'project';

  /** Last modified timestamp */
  lastModified?: Date;
}

/**
 * Lightweight catalog item for listing available skills
 * Progressive disclosure pattern - minimal info for lists
 */
export interface SkillCatalogItem {
  /** Skill name */
  name: string;

  /** Human-readable description */
  description: string;

  /** Source type */
  source: 'personal' | 'project';
}

/**
 * Options for loading skills
 */
export interface SkillLoaderOptions {
  /** Additional directories to scan for skills */
  additionalDirs?: string[];

  /** Whether to include personal skills (~/.claude/skills/) */
  includePersonal?: boolean;

  /** Whether to include project skills (./.claude/skills/) */
  includeProject?: boolean;

  /** Whether to include legacy commands (.claude/commands/*.md) */
  includeLegacyCommands?: boolean;
}

/**
 * Skill registry interface for managing loaded skills
 */
export interface SkillRegistry {
  /** Load all skills from configured sources */
  loadAll(): Promise<SkillDefinition[]>;

  /** Get catalog of all available skills (lightweight) */
  getAll(): SkillCatalogItem[];

  /** Get a specific skill by name (full definition) */
  get(name: string): SkillDefinition | undefined;

  /** Check if a skill exists */
  has(name: string): boolean;

  /** Clear all loaded skills */
  clear(): void;
}

/**
 * Result of parsing a SKILL.md file
 */
export interface SkillParseResult {
  /** Whether parsing was successful */
  success: boolean;

  /** Parsed skill definition (if successful) */
  skill?: SkillDefinition;

  /** Error message (if failed) */
  error?: string;
}

/**
 * Preprocessor context for argument substitution
 * Simplified: only supports $ARGUMENTS (Claude Code compatible)
 */
export interface PreprocessorContext {
  /** All arguments joined as string ($ARGUMENTS) */
  arguments: string;
}
