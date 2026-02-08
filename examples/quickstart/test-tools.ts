/**
 * Open Agent SDK 工具调用测试
 * 测试各种内置工具功能
 *
 * 运行方式:
 *   GEMINI_API_KEY=your_key npx tsx test-tools.ts
 */

import { prompt } from 'open-agent-sdk';

async function main() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('❌ 请设置 GEMINI_API_KEY 环境变量');
    console.error('示例: GEMINI_API_KEY=AIza... npx tsx test-tools.ts\n');
    process.exit(1);
  }

  console.log('🛠️  Open Agent SDK 工具测试 (gemini-3-pro-preview)\n');
  console.log('=' .repeat(60));

  // 测试 1: Glob 工具
  console.log('\n🔍 测试 1: Glob 文件搜索');
  console.log('查找所有 .ts 文件...\n');

  try {
    const result = await prompt(
      '使用 Glob 工具查找当前目录下所有的 .ts 文件，列出文件名。',
      {
        model: 'gemini-3-pro-preview',
        apiKey,
        provider: 'google',
        allowedTools: ['Glob'],
        maxTurns: 3,
      }
    );

    console.log('✅ 结果:');
    console.log(result.result);
    console.log(`\n⏱️  耗时: ${result.duration_ms}ms`);
  } catch (error) {
    console.error('❌ 测试失败:', error);
  }

  // 测试 2: Bash 工具
  console.log('\n' + '='.repeat(60));
  console.log('\n⚡ 测试 2: Bash 命令执行');
  console.log('获取系统信息...\n');

  try {
    const result = await prompt(
      '使用 Bash 工具执行 "uname -a" 和 "node --version"，然后告诉我系统信息和 Node.js 版本。',
      {
        model: 'gemini-3-pro-preview',
        apiKey,
        provider: 'google',
        allowedTools: ['Bash'],
        maxTurns: 3,
      }
    );

    console.log('✅ 结果:');
    console.log(result.result);
    console.log(`\n⏱️  耗时: ${result.duration_ms}ms`);
  } catch (error) {
    console.error('❌ 测试失败:', error);
  }

  // 测试 3: WebSearch 工具
  console.log('\n' + '='.repeat(60));
  console.log('\n🌐 测试 3: Web 搜索');
  console.log('搜索最新 TypeScript 版本...\n');

  try {
    const result = await prompt(
      '搜索 "TypeScript 5.8 new features"，然后告诉我 TypeScript 5.8 的主要新特性。',
      {
        model: 'gemini-3-pro-preview',
        apiKey,
        provider: 'google',
        allowedTools: ['WebSearch'],
        maxTurns: 5,
      }
    );

    console.log('✅ 结果:');
    console.log(result.result);
    console.log(`\n⏱️  耗时: ${result.duration_ms}ms`);
  } catch (error) {
    console.error('❌ 测试失败:', error);
  }

  console.log('\n' + '='.repeat(60));
  console.log('\n✨ 工具测试完成!');
}

main().catch(console.error);
