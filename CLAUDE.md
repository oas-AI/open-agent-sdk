# Open Agent SDK - Claude Code Project Context

## Quick Navigation

| Document | Content |
|----------|---------|
| [Architecture Decision Records](docs/adr/) | Technical decision background |
| [Requirements](REQUIREMENTS.md) | Feature requirements, version planning |
| [Gap Analysis](docs/gap-analysis.md) | Comparison with Claude Agent SDK |

## Project Structure

```
open-agent-sdk/
├── CLAUDE.md              # This file: project context entry
├── README.md              # Project documentation
├── package.json           # Bun workspaces configuration
├── REQUIREMENTS.md        # Product requirements
└── packages/
    └── core/              # Core SDK
        ├── src/
        │   ├── index.ts      # Public API
        │   ├── types/        # Message, tool types
        │   ├── tools/        # Read/Write/Edit/Bash/Glob/Grep/WebSearch/WebFetch/Task
        │   ├── providers/    # OpenAI/Google providers
        │   ├── agent/        # ReAct loop, subagent system
        │   ├── session/      # Session management
        │   ├── permissions/  # Permission system
        │   └── hooks/        # Hooks framework
        └── tests/
```

## Architecture Decisions

The project uses a **core + extensions** packaging strategy. See [ADR 001](docs/adr/001-monorepo-structure.md) for details.

## Tech Stack

- **Language**: TypeScript 5.x (strict mode)
- **Runtime**: Bun
- **Testing**: Bun built-in test framework
- **Core Dependencies**: `ai` (Vercel AI SDK), `@ai-sdk/google`, `zod`

## Common Commands

```bash
bun install          # Install dependencies
bun test             # Run tests
bun test --coverage  # Run tests with coverage
bun run build        # Build
```

## Coding Standards

- **TDD**: Write tests first, then implementation
- **Test Directory**: Test files go in `tests/` directory (sibling to `src/`), e.g., `tests/permissions/manager.test.ts`
- **Coverage**: > 80%
- **Types**: All public APIs must have complete types
- **Structure**: `types/` (types), `tools/` (tools), `providers/` (providers), `agent/` (core logic), `session/` (session management), `permissions/` (permission system), `hooks/` (hooks framework)

## Testing with LLM API

When running tests that require LLM API access:
- Load environment variables from the `.env` file (contains API keys and proxy configurations)
- This applies to running specific tests or the full test suite

```bash
# Example: Run tests with env variables
env $(cat /path/to/.env | xargs) bun test

# Example: Run specific test file
env $(cat /path/to/.env | xargs) bun test tests/providers/openai.test.ts
```

## Related Documents

- [Requirements](REQUIREMENTS.md) - Complete feature requirements
- [Claude Agent SDK Reference](docs/dev/claude-agent-sdk-ts.md) - Reference product API
- [Claude Agent SDK V2 Preview](docs/dev/claude-agent-sdk-ts-v2/) - V2 interface design reference
- [Gap Analysis](docs/gap-analysis.md) - Feature gap analysis with Claude Agent SDK

## Known Issues

### Test Failures (Non-Critical)

The following test failures are known and tracked but not critical for core functionality:

1. **AbortController Race Conditions** (2 tests)
   - `abort-controller.test.ts`: `should check abort signal at start of each turn`
   - `integration.test.ts`: `should abort operation when signal is triggered`
   - **Cause**: Timing-sensitive tests with race conditions between abort signal and tool execution
   - **Impact**: Low - abort functionality works correctly in real usage

2. **Google Provider Tool Message Format** (3 tests)
   - `tools.test.ts`: 2 Google Provider tool tests
   - `streaming.test.ts`: 1 Google Provider stream test
   - **Cause**: Vercel AI SDK message format incompatibility with Google Gemini API for tool results
   - **Impact**: Low - Read/Write tools work; complex tool chains may have issues

3. **E2E Timeout Issues** (2 tests)
   - `abort.test.ts`: `should abort Google session stream` (timeout threshold too strict)
   - `session-resume.test.ts`: `should handle session not found` (needs investigation)
   - **Cause**: API latency variability and test timing assumptions
   - **Impact**: Low - functionality works, tests need adjustment
