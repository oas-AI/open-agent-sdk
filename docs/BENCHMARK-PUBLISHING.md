# Benchmark Publishing Guide

快速发布 SDK + CLI 到 npm 用于 Daytona benchmark 测试。

## 🎯 使用场景

当你需要在 Daytona 上运行 benchmark 测试时：

1. 修改了 SDK 代码，需要发布新版本
2. 修改了 CLI 代码，需要发布新版本
3. 需要确保 CLI 使用最新的 SDK

## 🚀 一键发布

```bash
bun run publish:benchmark
```

这个命令会自动：
1. ✅ 生成 canary 版本号（带时间戳）
2. ✅ 运行 SDK 测试
3. ✅ 构建 SDK
4. ✅ 发布 SDK 到 npm
5. ✅ 等待 npm 索引
6. ✅ 更新 CLI 依赖到最新 SDK
7. ✅ 发布 CLI 到 npm
8. ✅ 输出安装命令

## 📦 版本号说明

使用 canary 版本号格式：`0.1.0-canary.YYYYMMDDHHMM`

示例：
- `0.1.0-canary.202602271430` - 2026年2月27日 14:30
- `0.1.0-canary.202602271445` - 2026年2月27日 14:45

优点：
- 不影响正式版本（0.1.0-alpha.1 等）
- 时间戳确保唯一性
- 可以通过时间追溯版本

## 📋 完整流程示例

### 场景：修复了 SDK 的 bug，需要重新测试

```bash
# 1. 修改 SDK 代码
vim packages/core/src/agent/react.ts

# 2. 运行本地测试
bun test

# 3. 一键发布
bun run publish:benchmark

# 输出示例：
# ╔════════════════════════════════════════════════════════╗
# ║     Benchmark Publishing Tool - SDK + CLI             ║
# ╚════════════════════════════════════════════════════════╝
#
# 📦 Generated canary version: 0.1.0-canary.202602271430
#
# 📝 Updating SDK version...
#    ✓ packages/core/package.json → 0.1.0-canary.202602271430
#
# 🧪 Running SDK tests...
#    ✓ All tests passed
#
# ▶ Building SDK
#    ✓ Build completed
#
# 📤 Publishing SDK to npm...
#    ✓ Published open-agent-sdk@0.1.0-canary.202602271430
#
# ⏳ Waiting for open-agent-sdk@0.1.0-canary.202602271430...
#    ✓ Package is now available on npm
#
# 📝 Updating CLI version and SDK dependency...
#    ✓ packages/cli/package.json → 0.1.0-canary.202602271430
#    ✓ CLI now depends on open-agent-sdk@0.1.0-canary.202602271430
#
# 📤 Publishing CLI to npm...
#    ✓ Published @open-agent-sdk/cli@0.1.0-canary.202602271430
#
# ╔════════════════════════════════════════════════════════╗
# ║                 ✅ PUBLISH COMPLETE!                   ║
# ╚════════════════════════════════════════════════════════╝
#
# 📦 Published packages:
#    • open-agent-sdk@0.1.0-canary.202602271430
#    • @open-agent-sdk/cli@0.1.0-canary.202602271430
#
# 🚀 Install on Daytona:
#    npm install -g @open-agent-sdk/cli@0.1.0-canary.202602271430

# 4. 在 Daytona 上安装
npm install -g @open-agent-sdk/cli@0.1.0-canary.202602271430

# 5. 运行 benchmark
oas benchmark

# 6. (可选) 还原 package.json 修改
git checkout packages/*/package.json
```

## 🔧 前置准备

### 1. 配置 npm 认证

确保你已经登录 npm：

```bash
npm login
```

验证登录状态：

```bash
npm whoami
```

### 2. 检查权限

确保你有发布权限：
- `open-agent-sdk` 包的发布权限
- `@open-agent-sdk/cli` 包的发布权限

## ⚠️ 注意事项

### 1. 未提交的更改

如果有未提交的更改，脚本会警告：

```
⚠️  Warning: You have uncommitted changes
Continue anyway? (y/N):
```

建议先提交或暂存更改。

### 2. 测试失败

如果测试失败，发布会中止：

```
❌ Tests failed! Please fix the tests before publishing.
```

修复测试后重新运行。

### 3. npm 认证失败

如果 npm 认证失败：

```
❌ Failed to publish SDK. Check your npm credentials.
   Run: npm login
```

重新登录后重试。

### 4. package.json 被修改

发布后，`package.json` 文件会被修改为 canary 版本。

**选项 1: 还原更改**（推荐）
```bash
git checkout packages/*/package.json
```

**选项 2: 提交更改**
```bash
git add packages/*/package.json
git commit -m "chore: bump to canary version for benchmark"
```

## 📊 Canary 版本管理

### 查看所有 canary 版本

```bash
# 查看 SDK canary 版本
npm view open-agent-sdk versions --json | grep canary

# 查看 CLI canary 版本
npm view @open-agent-sdk/cli versions --json | grep canary
```

### 安装最新 canary

```bash
# 安装最新 canary 版本
npm install -g @open-agent-sdk/cli@canary
```

### 清理旧的 canary 版本

canary 版本会累积，可以定期清理：

```bash
# 废弃旧的 canary 版本
npm deprecate open-agent-sdk@0.1.0-canary.202602271430 "Old canary version"
```

## 🐛 故障排除

### 问题 1: npm 索引延迟

**症状**: CLI 发布后，安装时找不到 SDK 依赖

**解决**:
```bash
# 等待 1-2 分钟后重试
npm install -g @open-agent-sdk/cli@0.1.0-canary.202602271430
```

### 问题 2: 版本冲突

**症状**: `npm publish` 报错版本已存在

**原因**: 同一分钟内发布了多次

**解决**: 等待一分钟后重试（版本号会自动更新）

### 问题 3: 测试超时

**症状**: 测试运行时间过长

**解决**:
```bash
# 跳过测试（不推荐）
# 手动发布
cd packages/core
npm publish --access public --tag canary

cd ../cli
# 手动更新 package.json 的依赖版本
npm publish --access public --tag canary
```

## 📈 发布流程图

```
开发者本地
    │
    ▼
┌─────────────────────┐
│ 修改代码 (SDK/CLI)  │
└─────────────────────┘
    │
    ▼
┌─────────────────────┐
│ bun run             │
│ publish:benchmark   │
└─────────────────────┘
    │
    ├─ 生成 canary 版本号
    ├─ 运行测试
    ├─ 构建 SDK
    ├─ 发布 SDK → npm
    ├─ 等待 npm 索引
    ├─ 更新 CLI 依赖
    └─ 发布 CLI → npm
    │
    ▼
┌─────────────────────┐
│ 输出安装命令        │
└─────────────────────┘
    │
    ▼
在 Daytona 上
    │
    ▼
┌─────────────────────┐
│ npm install -g      │
│ @open-agent-sdk/cli │
│ @canary             │
└─────────────────────┘
    │
    ▼
┌─────────────────────┐
│ 运行 benchmark      │
└─────────────────────┘
    │
    ▼
发现问题？
    │
    └─ 回到"修改代码"步骤
```

## 🎯 最佳实践

1. **每次 benchmark 前发布**
   - 确保使用最新代码
   - 使用 canary 版本避免影响正式版本

2. **记录版本号**
   - 在 benchmark 结果中记录使用的版本号
   - 方便追溯问题

3. **定期清理**
   - 每周清理旧的 canary 版本
   - 保持 npm registry 整洁

4. **测试先行**
   - 发布前确保测试通过
   - 避免发布有问题的代码

## 📞 相关资源

- [npm 发布文档](https://docs.npmjs.com/cli/v9/commands/npm-publish)
- [npm 标签文档](https://docs.npmjs.com/cli/v9/commands/npm-dist-tag)
- [Semantic Versioning](https://semver.org/)
