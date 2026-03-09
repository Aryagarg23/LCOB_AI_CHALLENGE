import { generateText, tool } from 'ai';
import { z } from 'zod';
import { createOpenAI } from '@ai-sdk/openai';
import fs from 'fs';

export const webSearchTool = tool({
  description: 'A test tool.',
  parameters: z.object({
    query: z.string()
  }),
  execute: async ({ query }) => {
    return "Tool executed: " + query;
  },
});

const customFetch = async (url, options) => {
  fs.writeFileSync('payload.json', options.body || '');
  return fetch(url, options); // still call the real thing to trigger the error
};

const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'fake',
  fetch: customFetch
});

async function testAgent() {
  try {
    const { text, toolCalls } = await generateText({
      model: openai('gpt-4o-mini', { structuredOutputs: false }),
      tools: { webSearch: webSearchTool },
      maxSteps: 2,
      prompt: 'Search for the weather in Tokyo using the webSearch tool. Just do it.',
    });
    console.log('Result text:', text);
  } catch (err) {
    console.log('Intercepted and caught error. Read payload.json');
  }
}

testAgent();
