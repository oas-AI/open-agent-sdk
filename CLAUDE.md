# Open Agent SDK - Claude Code Project Context

## Project Overview

Open Agent SDK is a TypeScript SDK for building AI agents with tool use, ReAct loop, and multi-provider support. Architecture follows **core + extensions** pattern (see [ADR 001](docs/adr/001-monorepo-structure.md)).

## Navigation Hub

| Document | Purpose |
|----------|---------|
| [Requirements](REQUIREMENTS.md) | Feature requirements, version planning |
| [Gap Analysis](docs/gap-analysis.md) | Comparison with Claude Agent SDK |
| [Architecture Decisions](docs/adr/) | Technical decision records |
| [Git Workflow](docs/workflows/git-workflow.md) | Worktrees, branching, PR process |
| [Testing Guide](docs/workflows/testing-guide.md) | TDD guidelines, environment setup |

## Project Structure

```
open-agent-sdk/
├── CLAUDE.md              # This file: Claude Code context
├── package.json           # Bun workspaces configuration
├── REQUIREMENTS.md        # Product requirements
└── packages/
    └── core/              # Core SDK package
        ├── src/
        │   ├── index.ts      # Public API exports
        │   ├── types/        # Message, tool, provider types
        │   ├── tools/        # Tool implementations
        │   ├── providers/    # LLM provider adapters
        │   ├── agent/        # ReAct loop, subagent system
        │   ├── session/      # Session management
        │   ├── permissions/  # Permission system
        │   ├── skills/       # Skill loading system
        │   └── hooks/        # Hooks framework
        └── tests/            # Test files (mirror src/ structure)
```

## Tech Stack

- **Language**: TypeScript 5.x (strict mode)
- **Runtime**: Bun
- **Testing**: Bun built-in test framework
- **Core Dependencies**: `ai` (Vercel AI SDK), `@ai-sdk/google`, `zod`

## Common Commands

```bash
bun install          # Install dependencies
bun test             # Run all tests
bun test --coverage  # Run tests with coverage report
bun run build        # Build packages
bun run typecheck    # Type checking without emit
```

## Key Decision Rules

### When to Use TDD

**Use TDD (tests first) for:**
- Core agent logic (ReAct loop, tool execution)
- New tool implementations
- Provider integrations
- Permission system changes

**Tests after implementation OK for:**
- Simple utility functions
- Documentation updates
- Configuration changes
- Bug fixes with obvious solutions

### When to Use Git Worktrees

**Recommended for:**
- All feature development
- Refactoring work
- Experimental changes

**Optional for:**
- Typo fixes in docs
- Single-line bug fixes
- Emergency hotfixes

**See [Git Workflow Guide](docs/workflows/git-workflow.md) for detailed usage.**

### Commit Standards

- **Format**: Conventional Commits (`type(scope): description`)
- **Frequency**: Commit after each logical unit of work
- **Language**: English for all commit messages and PR content
- **Guideline**: Each commit should be self-contained (tests pass)

**See [Git Workflow Guide](docs/workflows/git-workflow.md) for examples and PR guidelines.**

## Coding Standards

### Code Organization

- **Test Location**: `tests/` directory (sibling to `src/`), mirroring source structure
  - Example: `src/permissions/manager.ts` → `tests/permissions/manager.test.ts`
- **Directory Structure**: Follow existing patterns in `src/`
  - `types/` - Type definitions and interfaces
  - `tools/` - Tool implementations
  - `providers/` - LLM provider adapters
  - `agent/` - Core agent logic
  - `session/` - Session management
  - `permissions/` - Permission system
  - `skills/` - Skill loading and execution
  - `hooks/` - Hooks framework

### Type Safety

- **Public APIs**: Must have complete type definitions
- **Internal Code**: Leverage TypeScript strict mode
- **Type Exports**: Export types from `src/types/index.ts`

### Test Coverage

- **Target**: > 80% coverage
- **Focus**: Core logic, edge cases, error handling
- **Integration Tests**: Require `.env` file with API keys (see Testing Guide)

## Testing with LLM APIs

**Environment Setup:**
Tests that call real LLM APIs require environment variables from `.env` file:

```bash
# Run tests with environment variables
env $(cat .env | xargs) bun test

# Run specific test file
env $(cat .env | xargs) bun test tests/providers/openai.test.ts
```

**See [Testing Guide](docs/workflows/testing-guide.md) for mock vs. integration testing guidelines.**

## Provider Compatibility

### Google Provider (Gemini)
- ✅ Fully compatible with Google native API
- Default model: `gemini-3-flash-preview`

### OpenAI Provider
- ✅ Works with OpenAI API
- ✅ Compatible with DeepSeek, OpenRouter (via `baseURL`)
- ⚠️ Gemini's OpenAI-compatible endpoint has limitations (missing `index` field in tool calls)
  - **Workaround**: Use Google Provider for Gemini models

## Related References

- [Claude Agent SDK TypeScript](docs/dev/claude-agent-sdk-ts.md) - Reference product API
- [Claude Agent SDK V2 Preview](docs/dev/claude-agent-sdk-ts-v2/) - V2 interface design
