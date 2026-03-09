import { tool } from 'ai';
import { z } from 'zod';
import { performWebSearch } from './search';

export const webSearchTool = tool({
  description: 'A powerful DuckDuckGo scraper. Use this tool autonomously when you need real-time, qualitative information from the open internet. Do not use this for general knowledge, but DO use it for current events, hyper-local pricing menus, social media sentiment, macro rates, or competitor analysis.',
  parameters: z.object({
    query: z.string().describe('The specific search query to look up on the open internet.')
  }),
  execute: async ({ query }) => {
    return await performWebSearch(query);
  },
});
