/**
 * Open Agent SDK Session 测试
 * 使用 gemini-3-pro-preview 模型进行多轮对话
 *
 * 运行方式:
 *   GEMINI_API_KEY=your_key npx tsx test-session.ts
 */

import { createSession } from 'open-agent-sdk';

async function main() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('❌ 请设置 GEMINI_API_KEY 环境变量');
    console.error('示例: GEMINI_API_KEY=AIza... npx tsx test-session.ts\n');
    process.exit(1);
  }

  console.log('🚀 Open Agent SDK Session 测试 (gemini-3-pro-preview)\n');
  console.log('=' .repeat(60));

  // 创建 session
  const session = createSession({
    model: 'gemini-3-pro-preview',
    apiKey,
    provider: 'google',
    systemPrompt: '你是一个乐于助人的 AI 助手，回答简洁明了。',
  });

  try {
    // 第一轮对话
    console.log('\n💬 用户: 你好！请帮我计算 123 * 456');
    await session.send('你好！请帮我计算 123 * 456');

    console.log('🤖 助手:');
    for await (const message of session.stream()) {
      if (message.type === 'assistant') {
        process.stdout.write(message.content);
      }
    }
    console.log('\n');

    // 第二轮对话（上下文保持）
    console.log('=' .repeat(60));
    console.log('\n💬 用户: 刚才的结果再加 1000 是多少？');
    await session.send('刚才的结果再加 1000 是多少？');

    console.log('🤖 助手:');
    for await (const message of session.stream()) {
      if (message.type === 'assistant') {
        process.stdout.write(message.content);
      }
    }
    console.log('\n');

    // 第三轮对话
    console.log('=' .repeat(60));
    console.log('\n💬 用户: 用 Python 写个函数来计算这个');
    await session.send('用 Python 写个函数来计算这个');

    console.log('🤖 助手:');
    for await (const message of session.stream()) {
      if (message.type === 'assistant') {
        process.stdout.write(message.content);
      }
    }
    console.log('\n');

    console.log('=' .repeat(60));
    console.log('\n✨ Session 测试完成!');

  } catch (error) {
    console.error('❌ 测试失败:', error);
  } finally {
    session.close();
  }
}

main().catch(console.error);
