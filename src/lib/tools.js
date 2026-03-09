import { tool } from 'ai';
import { z } from 'zod';
import { performWebSearch } from './search';

export const webSearchTool = tool({
  description: 'Search the internet for real-time data on prices, competitors, and trends.',
  parameters: z.object({
    query: z.string().describe('The search query to look up on the web.')
  }).strict(),
  execute: async ({ query }) => {
    return await performWebSearch(query);
  },
});