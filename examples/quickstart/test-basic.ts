/**
 * Open Agent SDK 基础测试
 * 使用 gemini-3-pro-preview 模型
 *
 * 运行方式:
 *   GEMINI_API_KEY=your_key npx tsx test-basic.ts
 */

import { prompt } from 'open-agent-sdk';

async function main() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('❌ 请设置 GEMINI_API_KEY 环境变量');
    console.error('示例: GEMINI_API_KEY=AIza... npx tsx test-basic.ts\n');
    process.exit(1);
  }

  console.log('🚀 Open Agent SDK NPM 测试 (gemini-3-pro-preview)\n');
  console.log('=' .repeat(60));

  // 测试 1: 简单问答
  console.log('\n📋 测试 1: 简单问答');
  console.log('问题: TypeScript 和 JavaScript 的主要区别是什么？\n');

  try {
    const result = await prompt(
      'TypeScript 和 JavaScript 的主要区别是什么？请用3点说明。',
      {
        model: 'gemini-3-pro-preview',
        apiKey,
        provider: 'google',
        maxTurns: 1,
      }
    );

    console.log('✅ 回答:');
    console.log(result.result);
    console.log(`\n⏱️  耗时: ${result.duration_ms}ms`);
    console.log(`📝 Token: ${result.usage.input_tokens} in / ${result.usage.output_tokens} out`);
  } catch (error) {
    console.error('❌ 测试失败:', error);
  }

  // 测试 2: 文件操作
  console.log('\n' + '='.repeat(60));
  console.log('\n📁 测试 2: 文件系统操作');
  console.log('指令: 列出当前目录的所有文件\n');

  try {
    const result = await prompt(
      '请列出当前目录的所有文件，并告诉我有多少个 TypeScript 文件。',
      {
        model: 'gemini-3-pro-preview',
        apiKey,
        provider: 'google',
        maxTurns: 5,
        allowedTools: ['Read', 'Glob', 'Bash'],
      }
    );

    console.log('✅ 回答:');
    console.log(result.result);
    console.log(`\n⏱️  耗时: ${result.duration_ms}ms`);
  } catch (error) {
    console.error('❌ 测试失败:', error);
  }

  // 测试 3: 代码分析
  console.log('\n' + '='.repeat(60));
  console.log('\n💻 测试 3: 代码分析');
  console.log('指令: 分析 package.json 的内容\n');

  try {
    const result = await prompt(
      '请读取 package.json 文件，并分析这个项目的依赖情况。',
      {
        model: 'gemini-3-pro-preview',
        apiKey,
        provider: 'google',
        maxTurns: 5,
        allowedTools: ['Read'],
      }
    );

    console.log('✅ 回答:');
    console.log(result.result);
    console.log(`\n⏱️  耗时: ${result.duration_ms}ms`);
  } catch (error) {
    console.error('❌ 测试失败:', error);
  }

  console.log('\n' + '='.repeat(60));
  console.log('\n✨ 所有测试完成!');
}

main().catch(console.error);
