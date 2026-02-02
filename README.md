# Open Agent SDK

[![Build in Public](https://img.shields.io/badge/Build%20in%20Public-blue)](https://twitter.com/octane0411)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue)](https://www.typescriptlang.org/)

An open-source alternative to Claude Agent SDK — lightweight, customizable, and provider-agnostic.

[中文文档](./README.zh.md)

---

## What is this?

Open Agent SDK is a TypeScript framework for building AI agents. It provides a developer experience similar to Claude Agent SDK but with full transparency and no vendor lock-in.

**Key features:**
- **ReAct Loop** — Observation-thought-action cycle for autonomous agents
- **Built-in Tools** — File operations (read/write/edit), shell execution, code search (glob/grep)
- **Streaming Support** — Real-time response streaming with token usage tracking
- **Multi-Provider** — Works with OpenAI and Google Gemini
- **Type Safety** — Full TypeScript support with strict type constraints
- **Cancellation** — AbortController support for interrupting long-running operations

## Installation

```bash
npm install @open-agent-sdk/core
```

**Requirements:**
- Bun >= 1.0.0 (primary runtime)
- Node.js >= 20 (with `openai` and `@google/genai` peer dependencies)
- TypeScript >= 5.0

## Quick Start

### Basic Usage

```typescript
import { prompt } from '@open-agent-sdk/core';

const result = await prompt("What files are in the current directory?", {
  model: 'gpt-4o',
  apiKey: process.env.OPENAI_API_KEY,
});

console.log(result.result);
console.log(`Duration: ${result.duration_ms}ms`);
console.log(`Tokens: ${result.usage.input_tokens} in / ${result.usage.output_tokens} out`);
```

### Using Gemini

```typescript
const result = await prompt("Explain quantum computing", {
  model: 'gemini-2.0-flash',
  provider: 'google',
  apiKey: process.env.GEMINI_API_KEY,
});
```

### Advanced Options

```typescript
const result = await prompt("Analyze the codebase", {
  model: 'gpt-4o',
  apiKey: process.env.OPENAI_API_KEY,
  systemPrompt: "You are a code review assistant.",
  maxTurns: 15,
  allowedTools: ['Read', 'Glob', 'Grep'], // Whitelist specific tools
  cwd: './src', // Working directory for file operations
  env: { NODE_ENV: 'development' }, // Environment variables for shell commands
});
```

### With Cancellation

```typescript
const abortController = new AbortController();

// Cancel after 30 seconds
setTimeout(() => abortController.abort(), 30000);

const result = await prompt("Long running analysis...", {
  model: 'gpt-4o',
  apiKey: process.env.OPENAI_API_KEY,
  abortController,
});
```

## API Reference

### `prompt(prompt, options)`

Execute a single prompt with the agent using the ReAct loop.

**Parameters:**
- `prompt` (`string`): User's question or task
- `options` (`PromptOptions`): Configuration object
  - `model` (`string`, **required**): Model identifier (e.g., 'gpt-4o', 'gemini-2.0-flash')
  - `apiKey` (`string`): API key (defaults to `OPENAI_API_KEY` or `GEMINI_API_KEY` env var)
  - `provider` (`'openai' | 'google'`): Provider to use (auto-detected from model name if not specified)
  - `baseURL` (`string`): Base URL for API (OpenAI-compatible endpoints only)
  - `maxTurns` (`number`): Maximum conversation turns (default: 10)
  - `allowedTools` (`string[]`): Allowed tools whitelist (default: all tools)
  - `systemPrompt` (`string`): System prompt for the agent
  - `cwd` (`string`): Working directory for tool execution (default: `process.cwd()`)
  - `env` (`Record<string, string>`): Environment variables for tool execution
  - `abortController` (`AbortController`): For cancellation support

**Returns:** `Promise<PromptResult>`
- `result` (`string`): Final result text from the agent
- `duration_ms` (`number`): Total execution time in milliseconds
- `usage` (`object`): Token usage statistics
  - `input_tokens` (`number`)
  - `output_tokens` (`number`)

### Providers

For direct provider access with streaming:

```typescript
import { OpenAIProvider, GoogleProvider } from '@open-agent-sdk/core';

// OpenAI
const openai = new OpenAIProvider({
  apiKey: process.env.OPENAI_API_KEY,
  model: 'gpt-4o',
});

// Google Gemini
const google = new GoogleProvider({
  apiKey: process.env.GEMINI_API_KEY,
  model: 'gemini-2.0-flash',
});

// Streaming usage
for await (const chunk of openai.chat(messages, tools)) {
  if (chunk.type === 'content') {
    process.stdout.write(chunk.delta || '');
  }
}
```

## Built-in Tools

| Tool | Description | Parameters |
|------|-------------|------------|
| `Read` | Read file contents with line numbers, supports images | `file_path`, `offset?`, `limit?` |
| `Write` | Write content to a file | `file_path`, `content` |
| `Edit` | Edit file with search/replace | `file_path`, `old_string`, `new_string` |
| `Bash` | Execute shell commands | `command`, `timeout?`, `run_in_background?` |
| `Glob` | Find files matching patterns | `pattern`, `path?` |
| `Grep` | Search code with regex | `pattern`, `path?`, `include?` |

## Provider Support

| Provider | Status | Models Tested |
|----------|--------|---------------|
| OpenAI | ✅ Supported | gpt-4o, gpt-4o-mini, gpt-4 |
| Google Gemini | ✅ Supported | gemini-2.0-flash, gemini-1.5-flash |

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        prompt()                              │
│                   (High-level API)                           │
└───────────────────────┬─────────────────────────────────────┘
                        │
            ┌───────────▼───────────┐
            │     ReActLoop         │
            │  (Reason + Act cycle) │
            └───────────┬───────────┘
                        │
        ┌───────────────┼───────────────┐
        ▼               ▼               ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│   Provider   │ │ ToolRegistry │ │   Session    │
│  (OpenAI/    │ │ (Read/Write/ │ │  (InMemory/  │
│   Google)    │ │  Bash/Glob...)│ │   File)      │
└──────────────┘ └──────────────┘ └──────────────┘
```

## Project Status

**Current Version:** v0.1.0

This project is being developed in public. Follow our progress:

- Twitter: [@octane0411](https://twitter.com/octane0411)
- Discussions: [GitHub Discussions](../../discussions)

### Roadmap

| Version | Features | Status |
|---------|----------|--------|
| v0.1.0 | Basic ReAct loop, OpenAI provider, core tools | ✅ Released |
| v0.1.x | Google provider, Bash/Glob/Grep tools, AbortController | ✅ Released |
| v0.2.0 | Session persistence (InMemory/File), multi-turn conversations | 🚧 In Development |
| v0.3.0 | MCP protocol compatibility | 📋 Planned |
| v0.4.0 | Memory system with vector search | 📋 Planned |
| v1.0.0 | Stable release | 📋 Planned |

## Development

```bash
# Clone the repository
git clone https://github.com/Octane0411/open-agent-sdk.git
cd open-agent-sdk

# Install dependencies
bun install

# Run tests
bun test

# Run with coverage
bun test --coverage

# Type checking
cd packages/core && npx tsc --noEmit

# Run demo
GEMINI_API_KEY=your-key bun examples/demo.ts
```

## Why build this?

Claude Agent SDK is excellent but closed-source. We wanted:

1. **Full transparency** — Open code, free to customize
2. **Provider independence** — No lock-in to a single vendor
3. **Lightweight core** — Focused, understandable architecture (~2K lines of code)
4. **Interview-friendly** — Every design decision is explainable

## Contributing

Contributions welcome. Please read [CONTRIBUTING.md](./CONTRIBUTING.md).

## License

[MIT](./LICENSE) © 2026 Octane0411
