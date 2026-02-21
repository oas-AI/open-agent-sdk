/**
 * Skill system type definitions
 *
 * This module defines all types related to the Skill system,
 * including skill definitions, catalogs, frontmatter, and registry interfaces.
 */

/**
 * Skill frontmatter parsed from YAML header in SKILL.md files
 */
export interface SkillFrontmatter {
  /** Skill name (unique identifier) */
  name: string;

  /** Human-readable description */
  description: string;

  /** Optional version string */
  version?: string;

  /** Optional author information */
  author?: string;

  /** Optional tags for categorization */
  tags?: string[];

  /** Optional dependencies on other skills */
  dependencies?: string[];

  /** Optional default arguments */
  defaults?: Record<string, string>;

  /** Optional flag to indicate if skill is private (not shown in catalog) */
  private?: boolean;

  /** Disable model invocation for this skill */
  disableModelInvocation?: boolean;

  /** Whether this skill can be invoked by user */
  userInvocable?: boolean;

  /** List of allowed tools for this skill */
  allowedTools?: string[];

  /** Model configuration for this skill */
  model?: string;

  /** Additional context for the skill */
  context?: string;

  /** Agent configuration for this skill */
  agent?: {
    /** Agent name */
    name?: string;
    /** Custom instructions for the agent */
    instructions?: string;
  };
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

  /** Source type: 'personal' (from ~/.claude/skills/) or 'project' (from ./.claude/skills/) */
  source: 'personal' | 'project';

  /** Last modified timestamp */
  lastModified?: Date;
}

/**
 * Lightweight catalog item for listing available skills
 * This is a progressive disclosure pattern - minimal info for lists
 */
export interface SkillCatalogItem {
  /** Skill name */
  name: string;

  /** Human-readable description */
  description: string;

  /** Source type */
  source: 'personal' | 'project';

  /** Optional tags */
  tags?: string[];
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
 * Parser options for parsing SKILL.md files
 */
export interface SkillParserOptions {
  /** Whether to validate required fields */
  validate?: boolean;

  /** Custom validation rules */
  customValidators?: Array<(frontmatter: Record<string, unknown>) => string | undefined>;
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
 */
export interface PreprocessorContext {
  /** Positional arguments ($0, $1, $2, etc.) */
  args: string[];

  /** Environment variables */
  env: Record<string, string>;

  /** All arguments joined as string ($ARGUMENTS) */
  arguments: string;
}

/**
 * Skill loading error types
 */
export type SkillLoadErrorType =
  | 'FILE_NOT_FOUND'
  | 'PARSE_ERROR'
  | 'VALIDATION_ERROR'
  | 'DUPLICATE_SKILL'
  | 'IO_ERROR';

/**
 * Skill loading error
 */
export interface SkillLoadError {
  /** Error type */
  type: SkillLoadErrorType;

  /** Error message */
  message: string;

  /** File path that caused the error */
  filePath: string;

  /** Original error (if any) */
  cause?: Error;
}
