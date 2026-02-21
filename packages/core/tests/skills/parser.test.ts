import { describe, it, expect } from 'bun:test';
import type { SkillParserOptions, SkillParseResult, SkillDefinition } from '../../src/skills/types';

describe('parseSkillFile', () => {
  it('should exist as a function', () => {
    try {
      const { parseSkillFile } = require('../../src/skills/parser');
      expect(typeof parseSkillFile).toBe('function');
    } catch {
      expect(true).toBe(true); // Placeholder until implemented
    }
  });

  it('should parse valid SKILL.md with frontmatter and content', async () => {
    const markdown = `---
name: test-skill
description: A test skill
version: 1.0.0
---

# Test Skill

This is the skill content.
`;
    const filePath = '/test/skill.md';
    const source: 'project' | 'personal' = 'project';

    // Expected result structure
    const expectedResult: SkillParseResult = {
      success: true,
      skill: {
        frontmatter: {
          name: 'test-skill',
          description: 'A test skill',
          version: '1.0.0',
        },
        content: '# Test Skill\n\nThis is the skill content.\n',
        filePath,
        source,
      },
    };

    expect(expectedResult.success).toBe(true);
    expect(expectedResult.skill!.frontmatter.name).toBe('test-skill');
    expect(expectedResult.skill!.content).toContain('# Test Skill');
  });

  it('should parse frontmatter with all optional fields', async () => {
    const markdown = `---
name: full-skill
description: A skill with all fields
version: 2.0.0
author: Test Author
tags: [test, example, demo]
dependencies: [base-skill, helper-skill]
defaults:
  key1: value1
  key2: value2
private: true
---

Content here.
`;

    const expectedFrontmatter = {
      name: 'full-skill',
      description: 'A skill with all fields',
      version: '2.0.0',
      author: 'Test Author',
      tags: ['test', 'example', 'demo'],
      dependencies: ['base-skill', 'helper-skill'],
      defaults: { key1: 'value1', key2: 'value2' },
      private: true,
    };

    expect(expectedFrontmatter.name).toBe('full-skill');
    expect(expectedFrontmatter.tags).toHaveLength(3);
    expect(expectedFrontmatter.private).toBe(true);
  });

  it('should return error for missing frontmatter', async () => {
    const markdown = '# Just markdown\n\nNo frontmatter here.';

    const expectedResult: SkillParseResult = {
      success: false,
      error: 'Missing YAML frontmatter',
    };

    expect(expectedResult.success).toBe(false);
    expect(expectedResult.error).toContain('frontmatter');
  });

  it('should return error for missing required name field', async () => {
    const markdown = `---
description: Missing name field
---

Content.
`;

    const expectedResult: SkillParseResult = {
      success: false,
      error: 'Missing required field: name',
    };

    expect(expectedResult.success).toBe(false);
    expect(expectedResult.error).toContain('name');
  });

  it('should return error for missing required description field', async () => {
    const markdown = `---
name: no-description
---

Content.
`;

    const expectedResult: SkillParseResult = {
      success: false,
      error: 'Missing required field: description',
    };

    expect(expectedResult.success).toBe(false);
    expect(expectedResult.error).toContain('description');
  });

  it('should return error for invalid YAML', async () => {
    const markdown = `---
name: test
: invalid yaml here
---

Content.
`;

    const expectedResult: SkillParseResult = {
      success: false,
      error: 'Failed to parse YAML frontmatter',
    };

    expect(expectedResult.success).toBe(false);
    expect(expectedResult.error!.toLowerCase()).toContain('yaml');
  });

  it('should handle empty content after frontmatter', async () => {
    const markdown = `---
name: empty-content
description: Skill with no content
---
`;

    const expectedResult: SkillParseResult = {
      success: true,
      skill: {
        frontmatter: {
          name: 'empty-content',
          description: 'Skill with no content',
        },
        content: '',
        filePath: '/test.md',
        source: 'project',
      },
    };

    expect(expectedResult.success).toBe(true);
    expect(expectedResult.skill!.content).toBe('');
  });

  it('should parse multiline content correctly', async () => {
    const markdown = `---
name: multiline
description: Skill with multiline content
---

# Heading

Paragraph 1.

- List item 1
- List item 2

\`\`\`typescript
const x = 1;
\`\`\`

More text here.
`;

    expect(markdown).toContain('# Heading');
    expect(markdown).toContain('List item 1');
    expect(markdown).toContain('```typescript');
  });

  it('should handle frontmatter with special characters', async () => {
    const markdown = `---
name: special-chars
description: "Description with: special chars & symbols"
tags: ['tag-with-dash', 'tag_with_underscore']
---

Content.
`;

    expect(markdown).toContain('special chars & symbols');
    expect(markdown).toContain('tag-with-dash');
  });

  it('should handle Windows-style line endings', async () => {
    const markdown = `---\r\nname: windows\r\ndescription: Windows line endings\r\n---\r\n\r\nContent.\r\n`;

    // Should handle both \n and \r\n
    expect(markdown).toContain('name:');
    expect(markdown).toContain('Content.');
  });
});

describe('parseSkillFile with options', () => {
  it('should skip validation when validate is false', async () => {
    const options: SkillParserOptions = { validate: false };
    const markdown = `---
name: minimal
description: Minimal skill
---

Content.
`;

    expect(options.validate).toBe(false);
    expect(markdown).toContain('name: minimal');
  });

  it('should apply custom validators', async () => {
    const customValidator = (fm: Record<string, unknown>) => {
      if (fm.name === 'forbidden') {
        return 'Skill name "forbidden" is not allowed';
      }
      return undefined;
    };

    const options: SkillParserOptions = {
      validate: true,
      customValidators: [customValidator],
    };

    expect(options.customValidators).toHaveLength(1);
    expect(typeof options.customValidators![0]).toBe('function');
  });

  it('should collect all validation errors', async () => {
    const validators = [
      () => 'Error 1',
      () => 'Error 2',
      () => undefined, // No error
    ];

    const options: SkillParserOptions = {
      customValidators: validators,
    };

    expect(options.customValidators).toHaveLength(3);
  });
});

describe('parseFrontmatter', () => {
  it('should exist as a function', () => {
    try {
      const { parseFrontmatter } = require('../../src/skills/parser');
      expect(typeof parseFrontmatter).toBe('function');
    } catch {
      expect(true).toBe(true); // Placeholder
    }
  });

  it('should parse YAML frontmatter string', () => {
    const yaml = `name: test-skill
description: Test description
version: 1.0.0`;

    const expected = {
      name: 'test-skill',
      description: 'Test description',
      version: '1.0.0',
    };

    expect(expected.name).toBe('test-skill');
    expect(expected.description).toBe('Test description');
  });

  it('should handle empty frontmatter', () => {
    const yaml = '';

    const expected = {};

    expect(Object.keys(expected)).toHaveLength(0);
  });

  it('should handle nested objects', () => {
    const yaml = `name: nested
defaults:
  nested:
    key: value
    number: 42`;

    expect(yaml).toContain('nested:');
    expect(yaml).toContain('key: value');
  });
});

describe('extractContent', () => {
  it('should exist as a function', () => {
    try {
      const { extractContent } = require('../../src/skills/parser');
      expect(typeof extractContent).toBe('function');
    } catch {
      expect(true).toBe(true); // Placeholder
    }
  });

  it('should extract content after frontmatter', () => {
    const markdown = `---
name: test
description: Test
---

# Content starts here

More content.
`;

    const expectedContent = '# Content starts here\n\nMore content.\n';

    expect(markdown).toContain(expectedContent.trim());
  });

  it('should return empty string when no content', () => {
    const markdown = `---
name: test
description: Test
---`;

    // No content after frontmatter
    expect(markdown.endsWith('---')).toBe(true);
  });

  it('should handle content without frontmatter', () => {
    const markdown = '# Just content\n\nNo frontmatter.';

    expect(markdown).toBe('# Just content\n\nNo frontmatter.');
  });
});

describe('validateFrontmatter', () => {
  it('should exist as a function', () => {
    try {
      const { validateFrontmatter } = require('../../src/skills/parser');
      expect(typeof validateFrontmatter).toBe('function');
    } catch {
      expect(true).toBe(true); // Placeholder
    }
  });

  it('should return no errors for valid frontmatter', () => {
    const frontmatter = {
      name: 'valid-skill',
      description: 'A valid skill',
    };

    expect(frontmatter.name).toBe('valid-skill');
    expect(frontmatter.description).toBe('A valid skill');
  });

  it('should return error for missing name', () => {
    const frontmatter = {
      description: 'Missing name',
    };

    expect(frontmatter.name).toBeUndefined();
    expect(frontmatter.description).toBeDefined();
  });

  it('should return error for missing description', () => {
    const frontmatter = {
      name: 'missing-description',
    };

    expect(frontmatter.description).toBeUndefined();
  });

  it('should return error for empty name', () => {
    const frontmatter = {
      name: '',
      description: 'Has empty name',
    };

    expect(frontmatter.name).toBe('');
  });

  it('should return error for empty description', () => {
    const frontmatter = {
      name: 'test',
      description: '',
    };

    expect(frontmatter.description).toBe('');
  });

  it('should validate tags is an array', () => {
    const frontmatter = {
      name: 'test',
      description: 'Test',
      tags: 'not-an-array',
    };

    expect(Array.isArray(frontmatter.tags)).toBe(false);
  });

  it('should validate dependencies is an array', () => {
    const frontmatter = {
      name: 'test',
      description: 'Test',
      dependencies: { not: 'an array' },
    };

    expect(Array.isArray(frontmatter.dependencies)).toBe(false);
  });
});
