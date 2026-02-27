# Quick Publish Reference

## 🚀 一键发布 (Benchmark)

```bash
bun run publish:benchmark
```

## 📦 发布流程

```
修改代码 → 运行命令 → 等待发布 → 在 Daytona 安装
```

## 💻 Daytona 安装

```bash
# 使用具体版本
npm install -g @open-agent-sdk/cli@0.1.0-canary.202602271430

# 或使用最新 canary
npm install -g @open-agent-sdk/cli@canary
```

## ⚙️ 前置准备

```bash
# 确保已登录 npm
npm whoami

# 如果未登录
npm login
```

## 🔄 还原更改

```bash
# 发布后还原 package.json
git checkout packages/*/package.json
```

## 📋 完整文档

详见 [BENCHMARK-PUBLISHING.md](./BENCHMARK-PUBLISHING.md)
