import { generateObject } from 'ai';
import { getAgentModel } from '@/lib/ai-provider';
import { webSearchTool } from '@/lib/tools';
import { z } from 'zod';

export async function agent5_MacroFed(inputs, userAnswer = null) {
  console.log(`[Macro] Researching macroeconomic indicators...`);

  try {
    const { object } = await generateObject({
      model: getAgentModel('gpt-4.1-nano'),
      tools: { web_search: webSearchTool },
      maxSteps: 3,
      schema: z.object({
        name: z.string(),
        inflationRate: z.number().describe('Current US CPI inflation rate (%)'),
        interestRate: z.number().describe('Current Federal Funds Rate (%)'),
        spendingOutlook: z.string().describe('"Expanding", "Stable", or "Contracting"'),
        macroMultiplier: z.number().describe('Price adjustment multiplier (0.90 recession → 1.10 boom)'),
        impact: z.string().describe('How macro conditions affect consumer spending in this sector'),
        reasoning: z.string().describe('Citing specific data points found'),
        sources: z.array(z.string()).describe('URLs from FRED, BLS, Federal Reserve, news'),
        clarificationQuestion: z.null().describe('Always null — uses public data only'),
      }),
      prompt: `You are a macroeconomics analyst. Find the CURRENT US inflation rate, Federal Funds rate, and consumer spending outlook.

Search for "current US inflation rate 2026" and "federal funds rate today". Find real numbers, not estimates. Cite sources.
CONTEXT: ${JSON.stringify(inputs)}
${userAnswer ? `\nUSER ANSWER TO YOUR PREVIOUS CLARIFICATION QUESTION:\n"${userAnswer}"\nHIGHEST PRIORITY: use this new information to finalize your analysis.` : ''}`,
    });
    return object;
  } catch (err) {
    console.error('[Macro Error]', err);
    return { name: 'Macroeconomics', inflationRate: 3.0, interestRate: 5.0, spendingOutlook: 'Error', macroMultiplier: 1.0, impact: 'Failed', reasoning: 'LLM call failed', sources: [], clarificationQuestion: null };
  }
}
