/**
 * Skill parser module
 *
 * This module provides functions to parse SKILL.md files,
 * extracting YAML frontmatter and markdown content.
 */

import type {
  SkillFrontmatter,
  SkillDefinition,
  SkillParserOptions,
  SkillParseResult,
} from './types';

/**
 * Regular expression to match YAML frontmatter block
 * Matches content between --- delimiters at the start of the file
 */
const FRONTMATTER_REGEX = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/;

/**
 * Parse a SKILL.md file content
 *
 * @param markdown - The raw markdown content of the skill file
 * @param filePath - The file path where the skill was loaded from
 * @param source - The source type ('personal' or 'project')
 * @param options - Optional parser configuration
 * @returns SkillParseResult with success status and parsed skill or error
 */
export function parseSkillFile(
  markdown: string,
  filePath: string,
  source: 'personal' | 'project',
  options: SkillParserOptions = {}
): SkillParseResult {
  // Extract frontmatter and content
  const frontmatterResult = parseFrontmatter(markdown);
  if (!frontmatterResult.success) {
    return {
      success: false,
      error: frontmatterResult.error,
    };
  }

  const content = extractContent(markdown);
  const frontmatter = frontmatterResult.data as Record<string, unknown>;

  // Validate if requested (default to true)
  const shouldValidate = options.validate !== false;
  if (shouldValidate) {
    const validationErrors = validateFrontmatter(frontmatter, options.customValidators);
    if (validationErrors.length > 0) {
      return {
        success: false,
        error: validationErrors.join('; '),
      };
    }
  }

  // Check required fields exist
  if (!frontmatter.name) {
    return {
      success: false,
      error: 'Missing required field: name',
    };
  }
  if (!frontmatter.description) {
    return {
      success: false,
      error: 'Missing required field: description',
    };
  }

  // Build skill definition
  const skill: SkillDefinition = {
    frontmatter: frontmatter as unknown as SkillFrontmatter,
    content,
    filePath,
    source,
  };

  return {
    success: true,
    skill,
  };
}

/**
 * Parse YAML frontmatter from markdown content
 *
 * @param markdown - The markdown content with frontmatter
 * @returns Object with success status and parsed data or error
 */
export function parseFrontmatter(markdown: string): {
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
} {
  const match = FRONTMATTER_REGEX.exec(markdown);

  if (!match) {
    return {
      success: false,
      error: 'Missing YAML frontmatter',
    };
  }

  const yamlContent = match[1];

  // Simple YAML parser for basic cases
  try {
    const data = parseSimpleYaml(yamlContent);
    return {
      success: true,
      data,
    };
  } catch (error) {
    return {
      success: false,
      error: 'Failed to parse YAML frontmatter',
    };
  }
}

/**
 * Simple YAML parser for basic frontmatter
 * Supports: strings, numbers, booleans, arrays, and simple nested objects
 *
 * @param yaml - YAML content string
 * @returns Parsed object
 */
function parseSimpleYaml(yaml: string): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const lines = yaml.split(/\r?\n/);
  const nestedObjects: { key: string; indent: number; obj: Record<string, unknown> }[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();

    // Skip empty lines and comments
    if (!trimmedLine || trimmedLine.startsWith('#')) {
      continue;
    }

    // Calculate indentation
    const indent = line.length - line.trimStart().length;

    // Check if we're exiting nested objects
    while (nestedObjects.length > 0 && indent <= nestedObjects[nestedObjects.length - 1].indent) {
      nestedObjects.pop();
    }

    // Parse key-value pair
    const colonIndex = trimmedLine.indexOf(':');
    if (colonIndex === -1) {
      continue;
    }

    const key = trimmedLine.substring(0, colonIndex).trim();
    let value: unknown = trimmedLine.substring(colonIndex + 1).trim();

    // Handle empty value (could be start of nested object)
    if (value === '') {
      // Check if next line is indented (nested object)
      if (i + 1 < lines.length) {
        const nextLine = lines[i + 1];
        const nextIndent = nextLine.length - nextLine.trimStart().length;
        if (nextIndent > indent) {
          const nestedObj: Record<string, unknown> = {};
          nestedObjects.push({ key, indent, obj: nestedObj });

          if (nestedObjects.length === 1) {
            result[key] = nestedObj;
          } else {
            const parent = nestedObjects[nestedObjects.length - 2];
            parent.obj[key] = nestedObj;
          }
          continue;
        }
      }
      value = '';
    }

    // Parse value based on type
    value = parseYamlValue(value as string);

    // Store in appropriate location
    if (nestedObjects.length > 0) {
      const current = nestedObjects[nestedObjects.length - 1];
      current.obj[key] = value;
    } else {
      result[key] = value;
    }
  }

  return result;
}

/**
 * Parse a YAML value string to appropriate JavaScript type
 *
 * @param value - YAML value string
 * @returns Parsed value
 */
function parseYamlValue(value: string): unknown {
  // Empty string
  if (value === '') {
    return '';
  }

  // Quoted string
  if ((value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }

  // Array notation [item1, item2]
  if (value.startsWith('[') && value.endsWith(']')) {
    const inner = value.slice(1, -1);
    if (inner.trim() === '') {
      return [];
    }
    return inner.split(',').map(item => parseYamlValue(item.trim()));
  }

  // Boolean
  if (value === 'true') return true;
  if (value === 'false') return false;

  // Null
  if (value === 'null' || value === '~') return null;

  // Number
  if (/^-?\d+$/.test(value)) {
    return parseInt(value, 10);
  }
  if (/^-?\d+\.\d+$/.test(value)) {
    return parseFloat(value);
  }

  // String (default)
  return value;
}

/**
 * Extract markdown content after frontmatter
 *
 * @param markdown - The full markdown content
 * @returns Content after frontmatter (trimmed)
 */
export function extractContent(markdown: string): string {
  const match = FRONTMATTER_REGEX.exec(markdown);

  if (!match) {
    // No frontmatter, return entire content
    return markdown;
  }

  return match[2] || '';
}

/**
 * Validate frontmatter data
 *
 * @param frontmatter - The parsed frontmatter object
 * @param customValidators - Optional array of custom validation functions
 * @returns Array of error messages (empty if valid)
 */
export function validateFrontmatter(
  frontmatter: Record<string, unknown>,
  customValidators?: Array<(fm: Record<string, unknown>) => string | undefined>
): string[] {
  const errors: string[] = [];

  // Check required fields
  if (!frontmatter.name) {
    errors.push('Missing required field: name');
  } else if (typeof frontmatter.name !== 'string' || frontmatter.name.trim() === '') {
    errors.push('Missing required field: name');
  }

  if (!frontmatter.description) {
    errors.push('Missing required field: description');
  } else if (typeof frontmatter.description !== 'string' || frontmatter.description.trim() === '') {
    errors.push('Missing required field: description');
  }

  // Validate tags is array if present
  if (frontmatter.tags !== undefined && !Array.isArray(frontmatter.tags)) {
    errors.push('Field "tags" must be an array');
  }

  // Validate dependencies is array if present
  if (frontmatter.dependencies !== undefined && !Array.isArray(frontmatter.dependencies)) {
    errors.push('Field "dependencies" must be an array');
  }

  // Validate allowedTools is array if present
  if (frontmatter.allowedTools !== undefined && !Array.isArray(frontmatter.allowedTools)) {
    errors.push('Field "allowedTools" must be an array');
  }

  // Validate disableModelInvocation is boolean if present
  if (frontmatter.disableModelInvocation !== undefined && typeof frontmatter.disableModelInvocation !== 'boolean') {
    errors.push('Field "disableModelInvocation" must be a boolean');
  }

  // Validate userInvocable is boolean if present
  if (frontmatter.userInvocable !== undefined && typeof frontmatter.userInvocable !== 'boolean') {
    errors.push('Field "userInvocable" must be a boolean');
  }

  // Validate model is string if present
  if (frontmatter.model !== undefined && typeof frontmatter.model !== 'string') {
    errors.push('Field "model" must be a string');
  }

  // Validate context is string if present
  if (frontmatter.context !== undefined && typeof frontmatter.context !== 'string') {
    errors.push('Field "context" must be a string');
  }

  // Validate agent is object if present
  if (frontmatter.agent !== undefined && (typeof frontmatter.agent !== 'object' || frontmatter.agent === null)) {
    errors.push('Field "agent" must be an object');
  }

  // Run custom validators
  if (customValidators) {
    for (const validator of customValidators) {
      const error = validator(frontmatter);
      if (error) {
        errors.push(error);
      }
    }
  }

  return errors;
}
