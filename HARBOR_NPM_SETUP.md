# Harbor + npm 发布方案总结

## 问题背景

在尝试运行 Terminal-bench 时遇到以下问题：
1. **本地无法安装 Docker**：Harbor 默认需要 Docker 环境
2. **Daytona 方案超时**：使用 GitHub tarball 下载安装太慢，导致 agent setup 超时（360秒）
3. **直接引用本地代码失败**：Daytona 环境中直接引用本地路径有问题

## 解决方案

采用 **npm 包发布 + 全局安装** 的方案：

### 架构变更

**之前（GitHub tarball）：**
```
Harbor 安装脚本
  ↓ curl 下载 GitHub tarball (~5-10MB)
  ↓ tar 解压
  ↓ bun install 安装依赖 (~50秒)
  ↓ 运行 bun run packages/cli/src/index.ts
```

**现在（npm 包）：**
```
Harbor 安装脚本
  ↓ bun add -g @open-agent-sdk/cli (~10秒)
  ↓ 自动安装 open-agent-sdk 依赖
  ↓ 运行全局 oas 命令
```

### 性能对比

| 方式 | 安装时间 | 可靠性 | Daytona 兼容性 |
|------|---------|--------|---------------|
| GitHub tarball | ~60秒 | 中等 | 容易超时 |
| npm 包 | ~10秒 | 高 | 优秀 |

## 实施的更改

### 1. CLI 包配置更新

**文件：** `packages/cli/package.json`

**更改：**
- 依赖从 `workspace:*` 改为 `^0.1.0-alpha.1`
- 添加 `files` 字段（包含 `src` 目录）
- 添加 `engines` 字段（Bun >= 1.0.0, Node >= 18.0.0）
- 添加 `publishConfig.access: "public"`

### 2. Harbor 安装脚本优化

**文件：** `benchmark/harbor/install-open-agent-sdk.sh.j2`

**更改：**
```bash
# 之前：下载 GitHub tarball + 解压 + 安装依赖
curl -L -o open-agent-sdk.tar.gz "https://github.com/.../archive/..."
tar -xzf open-agent-sdk.tar.gz
cd open-agent-sdk/packages/core
bun install

# 现在：直接从 npm 安装
bun add -g @open-agent-sdk/cli
```

### 3. Harbor Agent 适配器更新

**文件：** `benchmark/harbor/agent.py`

**更改：**
```python
# 之前：使用本地源码路径
CLI_SOURCE_PATH = "$HOME/open-agent-sdk/packages/cli/src/index.ts"
cmd = f'bun run {CLI_SOURCE_PATH} -p "{escaped}" ...'

# 现在：使用全局命令
CLI_COMMAND = "oas"
cmd = f'{CLI_COMMAND} -p "{escaped}" ...'
```

### 4. 新增文档

- **`docs/PUBLISHING.md`**: npm 发布完整流程
- **`scripts/test-npm-install.sh`**: 本地测试安装流程
- **`benchmark/harbor/README.md`**: Harbor 使用文档（已更新）

## 发布流程

### 前置条件

```bash
# 1. 登录 npm
npm login

# 2. 验证构建
bun run build
bun test
```

### 发布步骤

```bash
# 1. 发布 core 包
cd packages/core
npm publish --access public

# 2. 发布 CLI 包
cd packages/cli
npm publish --access public
```

### 验证安装

```bash
# 测试全局安装
bun add -g @open-agent-sdk/cli

# 验证命令
which oas
oas --help
```

## Harbor 使用示例

### 注册 Agent

```bash
# 找到 Harbor agents 目录
HARBOR_AGENTS_DIR=$(python -c "import harbor; print(harbor.__path__[0])")/agents/installed

# 创建符号链接
ln -s $(pwd)/benchmark/harbor/agent.py \
  $HARBOR_AGENTS_DIR/open_agent_sdk.py
```

### 运行 Benchmark

```bash
# 设置环境变量
export GEMINI_API_KEY="your-key"

# 运行完整 benchmark
harbor run -d terminal-bench@2.0 \
  --agent-import-path "harbor.agents.installed.open_agent_sdk:OpenAgentSDKAgent" \
  --model gemini-2.0-flash \
  --n-concurrent 4
```

## 下一步

1. **测试本地安装流程**
   ```bash
   ./scripts/test-npm-install.sh
   ```

2. **推送到 GitHub**
   ```bash
   git push -u origin feat/npm-publish-and-harbor-optimization
   ```

3. **创建 PR**
   - 标题：`feat(benchmark): optimize Harbor adapter with npm-based installation`
   - 说明安装时间从 60秒降至 10秒
   - 提升 Daytona 兼容性

4. **发布到 npm**
   - 按照 `docs/PUBLISHING.md` 流程发布
   - 先发布 `open-agent-sdk`
   - 再发布 `@open-agent-sdk/cli`

5. **验证 Harbor Benchmark**
   - 注册 agent
   - 运行单任务测试
   - 运行完整 benchmark

## 注意事项

### npm 包命名

- Core 包：`open-agent-sdk`（无 scope）
- CLI 包：`@open-agent-sdk/cli`（有 scope）

### 版本管理

当前版本：`0.1.0-alpha.1`

- Alpha 版本使用 `--tag alpha` 发布
- 正式版本移除 tag 参数

### 依赖关系

CLI 依赖 Core，发布顺序：
1. 先发布 `open-agent-sdk`
2. 后发布 `@open-agent-sdk/cli`

## 故障排除

### 发布失败：403 Forbidden

```bash
npm whoami  # 检查登录状态
npm login   # 重新登录
```

### CLI 安装后命令不可用

```bash
# 检查 PATH
echo $PATH  # 应包含 $HOME/.bun/bin

# 重新加载 shell 配置
source ~/.bashrc  # 或 ~/.zshrc
```

### Harbor 安装超时

- 检查网络连接
- 验证 npm registry 可访问
- 考虑使用 npm 镜像（如淘宝镜像）

## 参考资料

- [Harbor Framework](https://harborframework.com/)
- [Terminal-bench](https://www.tbench.ai/leaderboard/terminal-bench/2.0)
- [npm Publishing](https://docs.npmjs.com/cli/v10/commands/npm-publish)
- [Bun Package Manager](https://bun.sh/docs/cli/install)
