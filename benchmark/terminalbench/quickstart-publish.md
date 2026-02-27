# 快速开始：发布到 npm

本文档提供最简化的发布流程。详细文档见 [harbor-npm-setup.md](./harbor-npm-setup.md)。

## 1. 准备工作

```bash
# 确保在正确的分支
git branch --show-current
# 应该显示：feat/npm-publish-and-harbor-optimization

# 登录 npm
npm login

# 验证登录
npm whoami
```

## 2. 构建和测试

```bash
# 构建 core 包
cd packages/core
bun run build

# 运行测试
cd ../..
bun test

# 测试本地安装流程（可选）
./scripts/test-npm-install.sh
```

## 3. 发布到 npm

```bash
# 发布 core 包
cd packages/core
npm publish --access public
cd ../..

# 等待几秒，让 npm registry 同步

# 发布 CLI 包
cd packages/cli
npm publish --access public
cd ../..
```

## 4. 验证发布

```bash
# 检查包是否可见
npm view open-agent-sdk
npm view @open-agent-sdk/cli

# 测试全局安装
bun add -g @open-agent-sdk/cli

# 验证命令
which oas
oas --help

# 清理测试安装
bun remove -g @open-agent-sdk/cli
```

## 5. 测试 Harbor Adapter

```bash
# 安装 Harbor（如果还没安装）
pip install harbor

# 注册 agent
ln -s $(pwd)/benchmark/terminalbench/harbor/agent.py \
  $(python -c "import harbor; print(harbor.__path__[0])")/agents/installed/open_agent_sdk.py

# 设置 API Key
export GEMINI_API_KEY="your-key-here"

# 运行单任务测试
harbor jobs start \
  --path examples/tasks/hello-world \
  --agent-import-path "harbor.agents.installed.open_agent_sdk:OpenAgentSDKAgent" \
  --model gemini-2.0-flash
```

## 6. 推送到 GitHub 并创建 PR

```bash
# 推送分支
git push -u origin feat/npm-publish-and-harbor-optimization

# 创建 PR（使用 gh CLI）
gh pr create \
  --title "feat(benchmark): optimize Harbor adapter with npm-based installation" \
  --body "$(cat <<'EOF'
## Summary
Optimize Harbor benchmark adapter to use npm packages instead of GitHub tarball downloads, reducing installation time from ~60s to ~10s.

## Changes
- Update CLI package.json for npm publishing
- Optimize Harbor install script to use `bun add -g @open-agent-sdk/cli`
- Update Harbor agent.py to use global `oas` command
- Add comprehensive documentation (harbor-npm-setup.md, quickstart-publish.md)
- Add test script for local verification

## Benefits
- 10x faster installation (60s → 10s)
- Better Daytona compatibility
- Reduced timeout risks
- More reliable (npm registry vs GitHub)

## Verification
- [x] Local build successful
- [x] Tests passing
- [x] Packages published to npm
- [x] Global CLI installation works
- [ ] Harbor benchmark tested (pending)

## Next Steps
1. Merge this PR
2. Test Harbor benchmark with published packages
3. Update Terminal-bench leaderboard submission
EOF
)"
```

## 故障排除

### 发布失败

```bash
# 检查登录状态
npm whoami

# 检查包名是否已存在
npm view open-agent-sdk
npm view @open-agent-sdk/cli

# 如果包名被占用，需要修改 package.json 中的包名
```

### 测试失败

```bash
# 检查构建
cd packages/core
bun run build
ls -la dist/

# 检查依赖
bun install
```

### Harbor 测试失败

```bash
# 检查 agent 注册
ls -la $(python -c "import harbor; print(harbor.__path__[0])")/agents/installed/

# 检查环境变量
echo $GEMINI_API_KEY

# 查看 Harbor 日志
harbor jobs start --help
```

## 完整文档

- [harbor-npm-setup.md](./harbor-npm-setup.md) - 完整设置指南
- `docs/dev/PUBLISHING.md` - 详细发布流程（开发文档，不在 git 中）
- [harbor/README.md](./harbor/README.md) - Harbor 使用文档
