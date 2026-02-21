/**
 * Skill parser module
 *
 * Simplified version using standard yaml library.
 * Aligned with Claude Code behavior.
 */

import { parse } from 'yaml';
import type { SkillFrontmatter, SkillDefinition, SkillParseResult } from './types';

/**
 * Regular expression to match YAML frontmatter block
 */
const FRONTMATTER_REGEX = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/;

/**
 * Parse a SKILL.md file content
 */
export function parseSkillFile(
  markdown: string,
  filePath: string,
  source: 'personal' | 'project'
): SkillParseResult {
  // Extract frontmatter and content
  const frontmatterResult = parseFrontmatter(markdown);
  if (!frontmatterResult.success || !frontmatterResult.data) {
    return { success: false, error: frontmatterResult.error || 'Failed to parse frontmatter' };
  }

  const content = extractContent(markdown);
  const data = frontmatterResult.data;

  // Validate required fields
  if (!data.name || typeof data.name !== 'string') {
    return { success: false, error: 'Missing required field: name' };
  }
  if (!data.description || typeof data.description !== 'string') {
    return { success: false, error: 'Missing required field: description' };
  }

  // Build skill definition with only allowed fields
  const frontmatter: SkillFrontmatter = {
    name: data.name,
    description: data.description,
  };

  // Only add optional fields if they exist and are valid
  if (data.allowedTools !== undefined) {
    if (Array.isArray(data.allowedTools)) {
      frontmatter.allowedTools = data.allowedTools;
    }
  }
  if (data.model !== undefined && typeof data.model === 'string') {
    frontmatter.model = data.model;
  }

  const skill: SkillDefinition = {
    frontmatter,
    content,
    filePath,
    source,
  };

  return { success: true, skill };
}

/**
 * Parse YAML frontmatter from markdown content
 */
export function parseFrontmatter(markdown: string): {
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
} {
  const match = FRONTMATTER_REGEX.exec(markdown);

  if (!match) {
    return { success: false, error: 'Missing YAML frontmatter' };
  }

  const yamlContent = match[1];

  try {
    const data = parse(yamlContent) as Record<string, unknown>;
    return { success: true, data };
  } catch (error) {
    return { success: false, error: 'Failed to parse YAML frontmatter' };
  }
}

/**
 * Extract markdown content after frontmatter
 */
export function extractContent(markdown: string): string {
  const match = FRONTMATTER_REGEX.exec(markdown);

  if (!match) {
    return markdown;
  }

  return match[2] || '';
}

/**
 * Validate frontmatter data - simplified
 */
export function validateFrontmatter(frontmatter: Record<string, unknown>): string[] {
  const errors: string[] = [];

  if (!frontmatter.name || typeof frontmatter.name !== 'string') {
    errors.push('Missing required field: name');
  }

  if (!frontmatter.description || typeof frontmatter.description !== 'string') {
    errors.push('Missing required field: description');
  }

  if (frontmatter.allowedTools !== undefined && !Array.isArray(frontmatter.allowedTools)) {
    errors.push('Field "allowedTools" must be an array');
  }

  if (frontmatter.model !== undefined && typeof frontmatter.model !== 'string') {
    errors.push('Field "model" must be a string');
  }

  return errors;
}
