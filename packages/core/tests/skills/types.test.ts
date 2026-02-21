import { describe, it, expect } from 'bun:test';
import type {
  SkillFrontmatter,
  SkillDefinition,
  SkillCatalogItem,
  SkillLoaderOptions,
  SkillRegistry,
  SkillParserOptions,
  SkillParseResult,
  PreprocessorContext,
  SkillLoadError,
  SkillLoadErrorType,
} from '../../src/skills/types';

describe('SkillFrontmatter', () => {
  it('should accept valid frontmatter with required fields', () => {
    const frontmatter: SkillFrontmatter = {
      name: 'test-skill',
      description: 'A test skill',
    };

    expect(frontmatter.name).toBe('test-skill');
    expect(frontmatter.description).toBe('A test skill');
  });

  it('should accept frontmatter with all optional fields', () => {
    const frontmatter: SkillFrontmatter = {
      name: 'test-skill',
      description: 'A test skill',
      version: '1.0.0',
      author: 'Test Author',
      tags: ['test', 'example'],
      dependencies: ['other-skill'],
      defaults: { key: 'value' },
      private: false,
    };

    expect(frontmatter.version).toBe('1.0.0');
    expect(frontmatter.author).toBe('Test Author');
    expect(frontmatter.tags).toEqual(['test', 'example']);
    expect(frontmatter.dependencies).toEqual(['other-skill']);
    expect(frontmatter.defaults).toEqual({ key: 'value' });
    expect(frontmatter.private).toBe(false);
  });

  it('should accept empty tags array', () => {
    const frontmatter: SkillFrontmatter = {
      name: 'test-skill',
      description: 'A test skill',
      tags: [],
    };

    expect(frontmatter.tags).toEqual([]);
  });

  it('should accept empty dependencies array', () => {
    const frontmatter: SkillFrontmatter = {
      name: 'test-skill',
      description: 'A test skill',
      dependencies: [],
    };

    expect(frontmatter.dependencies).toEqual([]);
  });

  it('should accept empty defaults object', () => {
    const frontmatter: SkillFrontmatter = {
      name: 'test-skill',
      description: 'A test skill',
      defaults: {},
    };

    expect(frontmatter.defaults).toEqual({});
  });
});

describe('SkillDefinition', () => {
  it('should accept valid skill definition', () => {
    const skill: SkillDefinition = {
      frontmatter: {
        name: 'test-skill',
        description: 'A test skill',
      },
      content: '# Test Skill\n\nThis is the content.',
      filePath: '/path/to/skill.md',
      source: 'project',
    };

    expect(skill.frontmatter.name).toBe('test-skill');
    expect(skill.content).toBe('# Test Skill\n\nThis is the content.');
    expect(skill.filePath).toBe('/path/to/skill.md');
    expect(skill.source).toBe('project');
  });

  it('should accept skill definition with lastModified', () => {
    const now = new Date();
    const skill: SkillDefinition = {
      frontmatter: {
        name: 'test-skill',
        description: 'A test skill',
      },
      content: 'Content',
      filePath: '/path/to/skill.md',
      source: 'personal',
      lastModified: now,
    };

    expect(skill.lastModified).toBe(now);
    expect(skill.source).toBe('personal');
  });

  it('should support both personal and project sources', () => {
    const personalSkill: SkillDefinition = {
      frontmatter: { name: 'personal-skill', description: 'Personal' },
      content: '',
      filePath: '~/.claude/skills/personal.md',
      source: 'personal',
    };

    const projectSkill: SkillDefinition = {
      frontmatter: { name: 'project-skill', description: 'Project' },
      content: '',
      filePath: './.claude/skills/project.md',
      source: 'project',
    };

    expect(personalSkill.source).toBe('personal');
    expect(projectSkill.source).toBe('project');
  });
});

describe('SkillCatalogItem', () => {
  it('should accept valid catalog item with required fields', () => {
    const item: SkillCatalogItem = {
      name: 'test-skill',
      description: 'A test skill',
      source: 'project',
    };

    expect(item.name).toBe('test-skill');
    expect(item.description).toBe('A test skill');
    expect(item.source).toBe('project');
  });

  it('should accept catalog item with tags', () => {
    const item: SkillCatalogItem = {
      name: 'test-skill',
      description: 'A test skill',
      source: 'personal',
      tags: ['utility', 'helper'],
    };

    expect(item.tags).toEqual(['utility', 'helper']);
  });

  it('should work as a lightweight representation', () => {
    // Catalog items should not contain full content
    const item: SkillCatalogItem = {
      name: 'lightweight-skill',
      description: 'Just the essentials',
      source: 'project',
    };

    // Verify it doesn't have content property
    const keys = Object.keys(item);
    expect(keys).not.toContain('content');
    expect(keys).not.toContain('filePath');
  });
});

describe('SkillLoaderOptions', () => {
  it('should accept empty options object', () => {
    const options: SkillLoaderOptions = {};
    expect(options).toBeDefined();
  });

  it('should accept all loader options', () => {
    const options: SkillLoaderOptions = {
      additionalDirs: ['/custom/dir1', '/custom/dir2'],
      includePersonal: true,
      includeProject: true,
      includeLegacyCommands: false,
    };

    expect(options.additionalDirs).toEqual(['/custom/dir1', '/custom/dir2']);
    expect(options.includePersonal).toBe(true);
    expect(options.includeProject).toBe(true);
    expect(options.includeLegacyCommands).toBe(false);
  });

  it('should accept partial options', () => {
    const options1: SkillLoaderOptions = { includePersonal: false };
    const options2: SkillLoaderOptions = { additionalDirs: ['/custom'] };

    expect(options1.includePersonal).toBe(false);
    expect(options2.additionalDirs).toEqual(['/custom']);
  });
});

describe('SkillRegistry', () => {
  it('should define registry interface with loadAll method', () => {
    const mockRegistry: SkillRegistry = {
      loadAll: async () => [],
      getAll: () => [],
      get: (_name: string) => undefined,
      has: (_name: string) => false,
      clear: () => {},
    };

    expect(typeof mockRegistry.loadAll).toBe('function');
    expect(typeof mockRegistry.getAll).toBe('function');
    expect(typeof mockRegistry.get).toBe('function');
    expect(typeof mockRegistry.has).toBe('function');
    expect(typeof mockRegistry.clear).toBe('function');
  });

  it('should return SkillDefinition from get method', async () => {
    const mockSkill: SkillDefinition = {
      frontmatter: { name: 'test', description: 'Test' },
      content: '',
      filePath: '/test.md',
      source: 'project',
    };

    const mockRegistry: SkillRegistry = {
      loadAll: async () => [mockSkill],
      getAll: () => [{ name: 'test', description: 'Test', source: 'project' }],
      get: (name: string) => (name === 'test' ? mockSkill : undefined),
      has: (name: string) => name === 'test',
      clear: () => {},
    };

    const result = mockRegistry.get('test');
    expect(result).toBe(mockSkill);
    expect(mockRegistry.has('test')).toBe(true);
    expect(mockRegistry.has('nonexistent')).toBe(false);
  });

  it('should return SkillCatalogItem array from getAll', async () => {
    const mockRegistry: SkillRegistry = {
      loadAll: async () => [],
      getAll: () => [
        { name: 'skill1', description: 'First', source: 'project' },
        { name: 'skill2', description: 'Second', source: 'personal' },
      ],
      get: () => undefined,
      has: () => false,
      clear: () => {},
    };

    const catalog = mockRegistry.getAll();
    expect(catalog).toHaveLength(2);
    expect(catalog[0].name).toBe('skill1');
    expect(catalog[1].source).toBe('personal');
  });
});

describe('SkillParserOptions', () => {
  it('should accept empty parser options', () => {
    const options: SkillParserOptions = {};
    expect(options).toBeDefined();
  });

  it('should accept validate option', () => {
    const options: SkillParserOptions = {
      validate: true,
    };

    expect(options.validate).toBe(true);
  });

  it('should accept custom validators', () => {
    const validator = (fm: Record<string, unknown>) => {
      if (!fm.name) return 'Name is required';
      return undefined;
    };

    const options: SkillParserOptions = {
      validate: true,
      customValidators: [validator],
    };

    expect(options.customValidators).toHaveLength(1);
    expect(typeof options.customValidators![0]).toBe('function');
  });

  it('should accept multiple custom validators', () => {
    const validator1 = () => undefined;
    const validator2 = () => undefined;

    const options: SkillParserOptions = {
      customValidators: [validator1, validator2],
    };

    expect(options.customValidators).toHaveLength(2);
  });
});

describe('SkillParseResult', () => {
  it('should represent successful parse result', () => {
    const skill: SkillDefinition = {
      frontmatter: { name: 'test', description: 'Test' },
      content: '',
      filePath: '/test.md',
      source: 'project',
    };

    const result: SkillParseResult = {
      success: true,
      skill,
    };

    expect(result.success).toBe(true);
    expect(result.skill).toBe(skill);
    expect(result.error).toBeUndefined();
  });

  it('should represent failed parse result', () => {
    const result: SkillParseResult = {
      success: false,
      error: 'Invalid frontmatter: missing name',
    };

    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid frontmatter: missing name');
    expect(result.skill).toBeUndefined();
  });
});

describe('PreprocessorContext', () => {
  it('should accept valid preprocessor context', () => {
    const context: PreprocessorContext = {
      args: ['arg1', 'arg2', 'arg3'],
      env: { HOME: '/home/user', PATH: '/usr/bin' },
      arguments: 'arg1 arg2 arg3',
    };

    expect(context.args).toEqual(['arg1', 'arg2', 'arg3']);
    expect(context.env.HOME).toBe('/home/user');
    expect(context.arguments).toBe('arg1 arg2 arg3');
  });

  it('should accept empty args array', () => {
    const context: PreprocessorContext = {
      args: [],
      env: {},
      arguments: '',
    };

    expect(context.args).toEqual([]);
    expect(context.arguments).toBe('');
  });

  it('should accept single argument', () => {
    const context: PreprocessorContext = {
      args: ['single'],
      env: {},
      arguments: 'single',
    };

    expect(context.args).toEqual(['single']);
    expect(context.arguments).toBe('single');
  });

  it('should accept complex environment variables', () => {
    const context: PreprocessorContext = {
      args: [],
      env: {
        API_KEY: 'secret123',
        'COMPLEX_VAR-NAME': 'value',
        EMPTY_VAR: '',
      },
      arguments: '',
    };

    expect(context.env.API_KEY).toBe('secret123');
    expect(context.env['COMPLEX_VAR-NAME']).toBe('value');
    expect(context.env.EMPTY_VAR).toBe('');
  });
});

describe('SkillLoadError', () => {
  it('should accept FILE_NOT_FOUND error', () => {
    const error: SkillLoadError = {
      type: 'FILE_NOT_FOUND',
      message: 'Skill file not found at /path/to/skill.md',
      filePath: '/path/to/skill.md',
    };

    expect(error.type).toBe('FILE_NOT_FOUND');
    expect(error.message).toContain('not found');
    expect(error.filePath).toBe('/path/to/skill.md');
  });

  it('should accept PARSE_ERROR', () => {
    const error: SkillLoadError = {
      type: 'PARSE_ERROR',
      message: 'Failed to parse YAML frontmatter',
      filePath: '/path/to/skill.md',
      cause: new Error('Invalid YAML'),
    };

    expect(error.type).toBe('PARSE_ERROR');
    expect(error.cause).toBeInstanceOf(Error);
  });

  it('should accept VALIDATION_ERROR', () => {
    const error: SkillLoadError = {
      type: 'VALIDATION_ERROR',
      message: 'Missing required field: name',
      filePath: '/path/to/skill.md',
    };

    expect(error.type).toBe('VALIDATION_ERROR');
  });

  it('should accept DUPLICATE_SKILL error', () => {
    const error: SkillLoadError = {
      type: 'DUPLICATE_SKILL',
      message: 'Skill "test-skill" already exists',
      filePath: '/another/path/to/test.md',
    };

    expect(error.type).toBe('DUPLICATE_SKILL');
  });

  it('should accept IO_ERROR', () => {
    const error: SkillLoadError = {
      type: 'IO_ERROR',
      message: 'Permission denied when reading file',
      filePath: '/restricted/skill.md',
      cause: new Error('EACCES'),
    };

    expect(error.type).toBe('IO_ERROR');
  });
});

describe('SkillLoadErrorType', () => {
  it('should accept all valid error type values', () => {
    const types: SkillLoadErrorType[] = [
      'FILE_NOT_FOUND',
      'PARSE_ERROR',
      'VALIDATION_ERROR',
      'DUPLICATE_SKILL',
      'IO_ERROR',
    ];

    expect(types).toHaveLength(5);
    expect(types).toContain('FILE_NOT_FOUND');
    expect(types).toContain('PARSE_ERROR');
    expect(types).toContain('VALIDATION_ERROR');
    expect(types).toContain('DUPLICATE_SKILL');
    expect(types).toContain('IO_ERROR');
  });
});
