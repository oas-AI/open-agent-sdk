# Testing Guide

## Overview

This project follows **pragmatic TDD**: write tests first for complex logic, tests-after-implementation is acceptable for simple changes.

## When to Use TDD (Tests First)

### ✅ Always Use TDD For:

1. **Core Agent Logic**
   - ReAct loop implementation
   - Tool execution flow
   - Subagent spawning and communication
   - Error handling in agent loop

2. **New Tool Implementations**
   - Tool interface compliance
   - Parameter validation
   - Error cases
   - Edge cases (empty input, special characters, etc.)

3. **Provider Integrations**
   - API call handling
   - Response parsing
   - Retry logic
   - Abort signal handling

4. **Permission System**
   - Rule evaluation
   - Permission inheritance
   - Deny/allow logic
   - Edge cases

### ✅ Tests After Implementation OK For:

1. **Simple Utility Functions**
   - String formatting
   - Array manipulation
   - Type guards

2. **Documentation Updates**
   - README changes
   - Comment updates

3. **Configuration Changes**
   - Package.json updates
   - TypeScript config

4. **Obvious Bug Fixes**
   - Typo corrections
   - Clear logic errors

## Test Organization

### Directory Structure

Tests mirror the `src/` directory structure:

```
packages/core/
├── src/
│   ├── agent/
│   │   └── react-loop.ts
│   ├── tools/
│   │   └── bash.ts
│   └── providers/
│       └── openai.ts
└── tests/
    ├── agent/
    │   └── react-loop.test.ts
    ├── tools/
    │   └── bash.test.ts
    └── providers/
        └── openai.test.ts
```

### File Naming

- Test files end with `.test.ts`
- Match source file name: `foo.ts` → `foo.test.ts`

## Test Types

### Unit Tests

**Purpose**: Test individual functions/classes in isolation

**Characteristics**:
- Fast (< 100ms per test)
- No external dependencies
- Use mocks for dependencies

**Example**:
```typescript
import { describe, test, expect } from 'bun:test';
import { validateToolInput } from '../src/tools/validation';

describe('validateToolInput', () => {
  test('accepts valid input', () => {
    const result = validateToolInput({ command: 'ls' });
    expect(result.success).toBe(true);
  });

  test('rejects missing required fields', () => {
    const result = validateToolInput({});
    expect(result.success).toBe(false);
  });
});
```

### Integration Tests

**Purpose**: Test interaction with real external systems (LLM APIs)

**Characteristics**:
- Slower (seconds per test)
- Requires `.env` file with API keys
- Tests real API behavior

**Example**:
```typescript
import { describe, test, expect } from 'bun:test';
import { OpenAIProvider } from '../src/providers/openai';

describe('OpenAIProvider Integration', () => {
  test('completes simple prompt', async () => {
    const provider = new OpenAIProvider({
      apiKey: process.env.OPENAI_API_KEY!,
    });

    const response = await provider.complete('Say hello');
    expect(response.content).toContain('hello');
  });
});
```

## Environment Setup for Integration Tests

### Required Environment Variables

Create `.env` file in project root:

```bash
# OpenAI
OPENAI_API_KEY=sk-...
OPENAI_BASE_URL=https://api.openai.com/v1  # Optional proxy

# Google
GOOGLE_API_KEY=...

# Proxy (if needed)
HTTP_PROXY=http://localhost:7890
HTTPS_PROXY=http://localhost:7890
```

### Running Tests with Environment

```bash
# Run all tests with environment variables
env $(cat .env | xargs) bun test

# Run specific test file
env $(cat .env | xargs) bun test tests/providers/openai.test.ts

# Run tests matching pattern
env $(cat .env | xargs) bun test --test-name-pattern "OpenAI"
```

### Skipping Integration Tests

Use `describeIf` pattern to skip tests when API keys are missing:

```typescript
import { describe, test, expect } from 'bun:test';

const hasOpenAIKey = !!process.env.OPENAI_API_KEY;

describe.skipIf(!hasOpenAIKey)('OpenAI Integration', () => {
  test('completes prompt', async () => {
    // Test code
  });
});
```

## Test Coverage

### Coverage Target

- **Overall**: > 80%
- **Core Logic**: > 90% (agent loop, tools, providers)
- **Utilities**: > 70%

### Running Coverage

```bash
# Generate coverage report
bun test --coverage

# View HTML report
open coverage/index.html
```

### What to Cover

**High Priority**:
- Core agent logic (ReAct loop)
- Tool implementations
- Provider integrations
- Permission system
- Error handling paths

**Medium Priority**:
- Utility functions
- Type guards
- Validation logic

**Low Priority**:
- Type definitions (no runtime logic)
- Simple getters/setters
- Configuration files

## Mocking Guidelines

### When to Mock

- **External APIs**: Mock in unit tests, use real in integration tests
- **File System**: Mock to avoid test pollution
- **Time**: Mock `Date.now()` for deterministic tests
- **Random**: Mock `Math.random()` for reproducible tests

### When NOT to Mock

- **Internal modules**: Test real interactions when possible
- **Simple utilities**: No need to mock pure functions
- **Type definitions**: No runtime behavior to mock

### Example: Mocking with Bun

```typescript
import { describe, test, expect, mock } from 'bun:test';

describe('Agent with mocked provider', () => {
  test('handles provider errors', async () => {
    const mockProvider = {
      complete: mock(() => {
        throw new Error('API error');
      }),
    };

    const agent = new Agent({ provider: mockProvider });
    await expect(agent.run('test')).rejects.toThrow('API error');
  });
});
```

## Test Naming Conventions

### Describe Blocks

```typescript
// Test a class
describe('ClassName', () => { ... });

// Test a function
describe('functionName', () => { ... });

// Test a feature
describe('Feature: OAuth authentication', () => { ... });
```

### Test Cases

```typescript
// Use active voice, describe behavior
test('returns user data when authenticated', () => { ... });
test('throws error when API key is invalid', () => { ... });
test('retries failed requests up to 3 times', () => { ... });

// Avoid passive voice or vague descriptions
// ❌ test('should work', () => { ... });
// ❌ test('test case 1', () => { ... });
```

## Common Patterns

### Testing Async Functions

```typescript
test('async operation completes', async () => {
  const result = await asyncFunction();
  expect(result).toBe('expected');
});
```

### Testing Errors

```typescript
test('throws on invalid input', () => {
  expect(() => {
    dangerousFunction();
  }).toThrow('Invalid input');
});

test('rejects promise on error', async () => {
  await expect(asyncFunction()).rejects.toThrow('Error message');
});
```

### Testing Abort Signals

```typescript
test('respects abort signal', async () => {
  const controller = new AbortController();
  const promise = longRunningOperation(controller.signal);

  // Abort after 100ms
  setTimeout(() => controller.abort(), 100);

  await expect(promise).rejects.toThrow('aborted');
});
```

## CI/CD Testing

### GitHub Actions

Tests run automatically on:
- Pull requests
- Pushes to main branch

### CI Environment Variables

- Integration tests are **skipped** in CI (no API keys)
- Only unit tests and mocked tests run in CI
- Coverage reports are generated and uploaded

## Troubleshooting

### Tests Fail Locally but Pass in CI

- Check for environment-specific dependencies (API keys, file paths)
- Ensure tests are deterministic (no random values, fixed timestamps)

### Tests Pass Locally but Fail in CI

- Check for missing environment variables
- Verify dependencies are installed (`bun install`)
- Look for timing issues (increase timeouts)

### Flaky Tests

- Add explicit waits instead of relying on timing
- Use `test.retry()` for inherently flaky tests (network calls)
- Investigate race conditions

### Coverage Too Low

- Add tests for uncovered branches
- Focus on core logic first
- Consider if uncovered code is dead code (remove it)

## Quick Reference

```bash
# Run all tests
bun test

# Run with coverage
bun test --coverage

# Run specific file
bun test tests/agent/react-loop.test.ts

# Run with pattern
bun test --test-name-pattern "OpenAI"

# Run with environment variables
env $(cat .env | xargs) bun test

# Watch mode
bun test --watch
```
