# ADR 002: 放宽 Tool 接口的泛型约束

## 背景

在实现 Open Agent SDK 的 Tool 系统时，我们遇到了 TypeScript 类型约束的问题：

```typescript
// 原始设计：强制要求索引签名
interface ToolInput {
  [key: string]: unknown;
}

// 具体工具输入没有索引签名
interface ReadInput {
  file_path: string;
  offset?: number;
}

// 导致类型错误
class ReadTool implements Tool<ReadInput, ReadOutput> {}
// ❌ Error: ReadInput 缺少索引签名
```

## 问题分析

这个问题的本质是：**TypeScript 的结构类型系统 vs 运行时外部输入的不确定性**。

### 为什么严格约束会失败

1. **子类型必须满足父类型的所有约束**
   - `ToolInput` 要求 `[key: string]: unknown`
   - `ReadInput` 只有特定属性，不满足"任意字符串键"的要求

2. **LLM 输出的本质**
   - 工具参数来自 LLM 的 JSON 输出
   - 编译时无法保证完全符合预期类型
   - 必须依赖运行时验证

## 决策

采用**方案 C**：放宽 `Tool` 接口的泛型约束

### 修改内容

```typescript
// 之前：强制约束
export interface Tool<TInput extends ToolInput, TOutput extends ToolOutput> {
  handler: ToolHandler<TInput, TOutput>;
}

// 之后：可选泛型，默认 unknown
export interface Tool<TInput = unknown, TOutput = unknown> {
  handler: ToolHandler<TInput, TOutput>;
}
```

### 同时修改

```typescript
// 移除 ToolInput/ToolOutput 的索引签名要求
type ToolInput = Record<string, unknown>;  // → 改为 unknown
type ToolOutput = Record<string, unknown>; // → 改为 unknown
```

## 权衡

### 优点

- ✅ 具体工具类型（`ReadInput`, `BashInput`）无需添加索引签名
- ✅ 保持类型提示：调用方仍能看到具体输入类型
- ✅ 符合行业实践：Zod 等库也是编译时宽松 + 运行时验证

### 缺点

- ⚠️ 编译时检查减弱：不匹配的输入类型不会报错
- ⚠️ 需要依赖运行时验证确保参数正确

## 缓解措施

1. **运行时验证**：每个工具的 handler 内部验证输入
   ```typescript
   async handler(input: unknown) {
     const parsed = ReadInputSchema.parse(input);  // 使用 Zod
     // ...
   }
   ```

2. **清晰的错误消息**：验证失败时给出明确的错误信息

3. **测试覆盖**：确保所有工具的路径都有测试覆盖

## 替代方案（已否决）

| 方案 | 说明 | 否决原因 |
|------|------|---------|
| A. 给所有输入加索引签名 | `[key: string]: unknown` | 破坏类型精确性，误导用户 |
| B. 完全移除泛型 | `Tool` 不带类型参数 | 失去 IDE 类型提示 |
| D. 使用 any | `input: any` | 过于宽松，放弃类型安全 |

## 参考

- [TypeScript 协变/逆变](https://www.typescriptlang.org/docs/handbook/2/generics.html)
- [Zod 运行时验证](https://zod.dev)
- [Google GenAI SDK 的类型设计](https://github.com/googleapis/js-genai)
