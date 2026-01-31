/**
 * Basic usage example for Open Agent SDK
 *
 * Run with:
 *   OPENAI_API_KEY=your-key bun examples/basic-usage.ts
 */

import { prompt } from '../src/index';

async function main() {
  // Example 1: Simple question
  console.log('Example 1: Simple question');
  try {
    const result = await prompt('What is 2 + 2?', {
      model: 'gpt-4o-mini', // or 'gpt-4', 'gpt-4o'
    });
    console.log('Result:', result.result);
    console.log('Duration:', result.duration_ms, 'ms');
    console.log('Usage:', result.usage);
  } catch (error) {
    console.error('Error:', error);
  }

  console.log('\n---\n');

  // Example 2: With file operations
  console.log('Example 2: File operations');
  try {
    const result = await prompt(
      'Create a file called hello.txt with the content "Hello from Open Agent SDK!"',
      {
        model: 'gpt-4o-mini',
        systemPrompt:
          'You are a helpful assistant with access to file tools. Use the Write tool to create files.',
      }
    );
    console.log('Result:', result.result);
  } catch (error) {
    console.error('Error:', error);
  }

  console.log('\n---\n');

  // Example 3: Using Gemini (via OpenAI compatibility)
  console.log('Example 3: Gemini compatibility');
  try {
    const result = await prompt('What is the capital of France?', {
      model: 'gemini-1.5-flash',
      baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
      apiKey: process.env.GEMINI_API_KEY || '',
    });
    console.log('Result:', result.result);
  } catch (error) {
    console.error('Error (expected if GEMINI_API_KEY not set):', error);
  }
}

main();
