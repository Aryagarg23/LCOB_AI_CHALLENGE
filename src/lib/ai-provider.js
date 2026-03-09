import { createOpenAI } from '@ai-sdk/openai';
// Future: import { createAnthropic } from '@ai-sdk/anthropic';
// Future: import { createGoogleGenerativeAI } from '@ai-sdk/google';

/**
 * Centralized AI Provider Configuration
 * This ensures all 9 Agents pull from the exact same LLM configuration point.
 * This file allows users to swap between OpenAI, Anthropic, Gemini, etc. in one place.
 */
export function getAgentModel(customModelName = 'gpt-4.1-nano') {
  // Currently defaults to OpenAI.
  // To swap to Anthropic or Gemini, install the respective @ai-sdk package,
  // ensure the API Key is set in your .env, and swap the instantiation below.
  
  const openai = createOpenAI({
    apiKey: process.env.OPENAI_API_KEY || 'dummy-key',
  });

  // Example swap: 
  // const gemini = createGoogleGenerativeAI({ apiKey: process.env.GOOGLE_API_KEY });
  // return gemini('gemini-1.5-pro');

  return openai(customModelName, { structuredOutputs: false });
}
