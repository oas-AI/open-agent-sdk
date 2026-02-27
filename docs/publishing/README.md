# Publishing Documentation

本目录包含 open-agent-sdk 的发布相关文档。

## 📚 文档导航

### 快速开始
- **[QUICK-PUBLISH.md](../QUICK-PUBLISH.md)** - 一页纸快速参考

### Benchmark 发布
- **[BENCHMARK-PUBLISHING.md](../BENCHMARK-PUBLISHING.md)** - Benchmark 专用发布完整指南
- **[PUBLISH-FLOW.md](../PUBLISH-FLOW.md)** - 发布流程详解和场景分析

### 正式版本发布 (TODO)
- 正式版本发布流程 (待实现)
- GitHub Actions 自动发布 (待实现)

## 🎯 使用场景

### 场景 1: Benchmark 测试

**需求**: 快速发布到 npm，在 Daytona 上测试

**方案**: 使用 Benchmark 发布脚本

```bash
bun run publish:benchmark
```

**文档**: [BENCHMARK-PUBLISHING.md](../BENCHMARK-PUBLISHING.md)

### 场景 2: 正式版本发布 (TODO)

**需求**: 发布正式版本 (alpha/beta/rc/stable)

**方案**: 待实现

### 场景 3: 紧急修复 (TODO)

**需求**: 快速发布 hotfix

**方案**: 待实现

## 🔑 关键概念

### Canary 版本

- **格式**: `0.1.0-canary.202602271430`
- **用途**: 快速测试，不影响正式版本
- **特点**: 带时间戳，确保唯一性

### npm 标签 (Tag)

- **latest**: 正式版本 (用户默认安装)
- **canary**: 测试版本 (需要明确指定)
- **alpha/beta/rc**: 预发布版本

### 版本策略

```
正式版本:
    0.1.0-alpha.1  → 内测版本
    0.1.0-beta.1   → 公测版本
    0.1.0-rc.1     → 候选版本
    0.1.0          → 正式版本

Canary 版本:
    0.1.0-canary.202602271430  → 测试版本 (不影响正式版本)
```

## 🛠️ 工具和脚本

### 当前可用

- `scripts/publish-benchmark.ts` - Benchmark 发布脚本
- `bun run publish:benchmark` - 快捷命令

### 计划中

- `scripts/publish-release.ts` - 正式版本发布脚本
- `scripts/bump-version.ts` - 版本管理脚本
- GitHub Actions workflows

## 📋 发布检查清单

### Benchmark 发布前

- [ ] 代码已提交或暂存
- [ ] 测试通过 (`bun test`)
- [ ] 已登录 npm (`npm whoami`)

### 正式版本发布前 (TODO)

- [ ] 所有测试通过
- [ ] 文档已更新
- [ ] CHANGELOG 已更新
- [ ] 版本号符合 semver
- [ ] 已在 staging 环境验证

## 🔗 相关资源

### 内部文档
- [CLAUDE.md](../../CLAUDE.md) - 项目总览
- [REQUIREMENTS.md](../../REQUIREMENTS.md) - 需求文档

### 外部资源
- [npm 发布文档](https://docs.npmjs.com/cli/v9/commands/npm-publish)
- [Semantic Versioning](https://semver.org/)
- [npm 标签文档](https://docs.npmjs.com/cli/v9/commands/npm-dist-tag)

## 🤝 贡献

如果你想改进发布流程，请：

1. 阅读现有文档
2. 在 issue 中讨论你的想法
3. 提交 PR 并附上详细说明

## 📞 获取帮助

- 查看 [BENCHMARK-PUBLISHING.md](../BENCHMARK-PUBLISHING.md) 的故障排除部分
- 在 GitHub 创建 issue
- 联系项目维护者
