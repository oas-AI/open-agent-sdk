# Open Agent SDK

[![Build in Public](https://img.shields.io/badge/Build%20in%20Public-blue)](https://twitter.com/octane0411)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue)](https://www.typescriptlang.org/)

Claude Agent SDK 的开源替代品 —— 轻量、可定制、无供应商锁定。

[English Documentation](./README.md)

---

## 这是什么？

Open Agent SDK 是一个用于构建 AI Agent 的 TypeScript 框架。它提供了与 Claude Agent SDK 类似的开发体验，但完全开源透明，没有供应商锁定。

**核心特性：**
- **ReAct 循环** —— 观察-思考-行动的自主 Agent 循环
- **内置工具** —— 文件操作（读/写/编辑）、Shell 执行、代码搜索（Glob/Grep）
- **流式支持** —— 实时响应流和 Token 使用量追踪
- **多供应商** —— 支持 OpenAI 和 Google Gemini
- **类型安全** —— 完整的 TypeScript 支持，严格的类型约束
- **取消支持** —— 通过 AbortController 中断长时间运行的操作

## 安装

```bash
npm install @open-agent-sdk/core
```

**环境要求：**
- Bun >= 1.0.0（主要运行环境）
- Node.js >= 20（需安装 `openai` 和 `@google/genai` 依赖）
- TypeScript >= 5.0

## 快速开始

### 基础用法

```typescript
import { prompt } from '@open-agent-sdk/core';

const result = await prompt("当前目录有哪些文件？", {
  model: 'gpt-4o',
  apiKey: process.env.OPENAI_API_KEY,
});

console.log(result.result);
console.log(`耗时: ${result.duration_ms}ms`);
console.log(`Token: ${result.usage.input_tokens} 输入 / ${result.usage.output_tokens} 输出`);
```

### 使用 Gemini

```typescript
const result = await prompt("解释量子计算", {
  model: 'gemini-2.0-flash',
  provider: 'google',
  apiKey: process.env.GEMINI_API_KEY,
});
```

### 高级选项

```typescript
const result = await prompt("分析代码库", {
  model: 'gpt-4o',
  apiKey: process.env.OPENAI_API_KEY,
  systemPrompt: "你是一个代码审查助手。",
  maxTurns: 15,
  allowedTools: ['Read', 'Glob', 'Grep'], // 白名单指定工具
  cwd: './src', // 文件操作的工作目录
  env: { NODE_ENV: 'development' }, // Shell 命令的环境变量
});
```

### 取消操作

```typescript
const abortController = new AbortController();

// 30 秒后取消
setTimeout(() => abortController.abort(), 30000);

const result = await prompt("长时间运行的分析...", {
  model: 'gpt-4o',
  apiKey: process.env.OPENAI_API_KEY,
  abortController,
});
```

## API 参考

### `prompt(prompt, options)`

使用 ReAct 循环执行单个提示。

**参数：**
- `prompt` (`string`): 用户的问题或任务
- `options` (`PromptOptions`): 配置对象
  - `model` (`string`, **必需**): 模型标识符（如 'gpt-4o', 'gemini-2.0-flash'）
  - `apiKey` (`string`): API 密钥（默认从 `OPENAI_API_KEY` 或 `GEMINI_API_KEY` 环境变量读取）
  - `provider` (`'openai' | 'google'`): 使用的供应商（未指定时从模型名自动检测）
  - `baseURL` (`string`): API 基础 URL（仅支持 OpenAI 兼容端点）
  - `maxTurns` (`number`): 最大对话轮数（默认：10）
  - `allowedTools` (`string[]`): 允许使用的工具白名单（默认：所有工具）
  - `systemPrompt` (`string`): Agent 的系统提示词
  - `cwd` (`string`): 工具执行的工作目录（默认：`process.cwd()`）
  - `env` (`Record<string, string>`): 工具执行的环境变量
  - `abortController` (`AbortController`): 用于取消操作

**返回：** `Promise<PromptResult>`
- `result` (`string`): Agent 返回的最终结果文本
- `duration_ms` (`number`): 总执行时间（毫秒）
- `usage` (`object`): Token 使用统计
  - `input_tokens` (`number`): 输入 Token 数
  - `output_tokens` (`number`): 输出 Token 数

### Provider

直接访问 Provider 以使用流式响应：

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

// 流式使用
for await (const chunk of openai.chat(messages, tools)) {
  if (chunk.type === 'content') {
    process.stdout.write(chunk.delta || '');
  }
}
```

## 内置工具

| 工具 | 描述 | 参数 |
|------|------|------|
| `Read` | 读取文件内容（带行号），支持图片 | `file_path`, `offset?`, `limit?` |
| `Write` | 写入内容到文件 | `file_path`, `content` |
| `Edit` | 使用查找替换编辑文件 | `file_path`, `old_string`, `new_string` |
| `Bash` | 执行 Shell 命令 | `command`, `timeout?`, `run_in_background?` |
| `Glob` | 查找匹配模式的文件 | `pattern`, `path?` |
| `Grep` | 使用正则搜索代码 | `pattern`, `path?`, `include?` |

## 供应商支持

| 供应商 | 状态 | 已测试模型 |
|--------|------|-----------|
| OpenAI | ✅ 已支持 | gpt-4o, gpt-4o-mini, gpt-4 |
| Google Gemini | ✅ 已支持 | gemini-2.0-flash, gemini-1.5-flash |

## 架构

```
┌─────────────────────────────────────────────────────────────┐
│                        prompt()                              │
│                   (高级 API)                                 │
└───────────────────────┬─────────────────────────────────────┘
                        │
            ┌───────────▼───────────┐
            │     ReActLoop         │
            │  (推理 + 行动循环)     │
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

## 项目状态

**当前版本：** v0.1.0

本项目正在公开开发中。关注我们的进展：

- Twitter: [@octane0411](https://twitter.com/octane0411)
- 讨论区: [GitHub Discussions](../../discussions)

### 路线图

| 版本 | 特性 | 状态 |
|---------|----------|--------|
| v0.1.0 | 基础 ReAct 循环、OpenAI 供应商、核心工具 | ✅ 已发布 |
| v0.1.x | Google 供应商、Bash/Glob/Grep 工具、AbortController | ✅ 已发布 |
| v0.2.0 | Session 持久化（内存/文件）、多轮对话 | 🚧 开发中 |
| v0.3.0 | MCP 协议兼容 | 📋 计划中 |
| v0.4.0 | 向量搜索记忆系统 | 📋 计划中 |
| v1.0.0 | 稳定版本 | 📋 计划中 |

## 开发

```bash
# 克隆仓库
git clone https://github.com/Octane0411/open-agent-sdk.git
cd open-agent-sdk

# 安装依赖
bun install

# 运行测试
bun test

# 覆盖率测试
bun test --coverage

# 类型检查
cd packages/core && npx tsc --noEmit

# 运行演示
GEMINI_API_KEY=your-key bun examples/demo.ts
```

## 为什么构建这个项目？

Claude Agent SDK 非常优秀，但是闭源的。我们想要：

1. **完全透明** —— 代码开源，可自由定制
2. **供应商独立** —— 不被单一供应商锁定
3. **轻量核心** —— 专注、易理解的架构（约 2000 行代码）
4. **面试友好** —— 每个设计决策都可解释

## 贡献

欢迎贡献。请阅读 [CONTRIBUTING.md](./CONTRIBUTING.md)。

## 许可证

[MIT](./LICENSE) © 2026 Octane0411
