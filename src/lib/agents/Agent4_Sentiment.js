import { generateObject } from 'ai';
import { getAgentModel } from '@/lib/ai-provider';
import { webSearchTool } from '@/lib/tools';
import { z } from 'zod';

export async function agent4_Sentiment(brandName, recentReviews, isExistingBusiness = true, userAnswer = null) {
  console.log(`[Sentiment] Scanning reviews for "${brandName}"...`);

  try {
    const isPreLaunch = !isExistingBusiness;
    const { object } = await generateObject({
      model: getAgentModel('gpt-4.1-nano'),
      tools: { webSearch: webSearchTool },
      maxSteps: 5,
      schema: z.object({
        name: z.string(),
        sentimentScore: z.number().min(-1.0).max(1.0).describe('Sentiment: -1.0 (backlash) to 1.0 (viral hype)'),
        rawData: z.object({
          positiveThemes: z.array(z.string()),
          negativeThemes: z.array(z.string())
        }),
        impact: z.string().describe('How sentiment influences the pricing hype multiplier'),
        reasoning: z.string().describe('Analysis citing specific quotes, review snippets, or findings'),
        sources: z.array(z.string()).describe('URLs of review pages, social media, articles'),
        clarificationQuestion: z.string().nullable().describe(isPreLaunch ? 'Since this is a PRE-LAUNCH business, do NOT ask about past customer feedback. Ask an open-ended question about how they want their future customers to feel. Otherwise null.' : 'If you cannot find this specific established business online, ask the user what platforms their customers review them on. Otherwise null.'),
      }),
      prompt: `You are a social sentiment analyst. Quantify public perception of "${brandName}" using web data and any user-provided reviews.

Search at least twice:
1. "${brandName} reviews"
2. "${brandName} social media perception"

${isPreLaunch 
  ? 'Context: THIS IS A PRE-LAUNCH / NEW BUSINESS with no existing reviews. Search for sentiment about similar concepts.' 
  : 'Context: THIS IS AN ESTABLISHED BUSINESS. Your singular priority is finding real online reviews and sentiment specifically for this exact business name.'}
Cite every URL. Quote specific review snippets in reasoning.

User-Provided Reviews: "${recentReviews || 'None provided'}"
${userAnswer ? `\nUSER ANSWER TO YOUR PREVIOUS CLARIFICATION QUESTION:\n"${userAnswer}"\nHIGHEST PRIORITY: use this new information to finalize your analysis.` : ''}`,
    });
    return object;
  } catch (err) {
    console.error('[Sentiment Error]', err);
    return { name: 'Sentiment', sentimentScore: 0, rawData: { positiveThemes: [], negativeThemes: [] }, impact: 'Failed', reasoning: 'LLM call failed', sources: [], clarificationQuestion: null };
  }
}
