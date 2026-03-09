import { generateObject } from 'ai';
import { getAgentModel } from '@/lib/ai-provider';
import { webSearchTool } from '@/lib/tools';
import { z } from 'zod';

export async function agent2_Demographics(zipcode, userAnswer = null) {
  console.log(`[Demographics] Researching ZIP ${zipcode}...`);

  try {
    const { object } = await generateObject({
      model: getAgentModel('gpt-4.1-nano'),
      tools: { webSearch: webSearchTool },
      maxSteps: 4,
      schema: z.object({
        name: z.string(),
        medianIncome: z.number().describe('Median Household Income (USD) for this ZIP — MUST come from census/search data'),
        priceCeiling: z.number().describe('Theoretical max price the local market can bear for the primary product/service'),
        neighborhoodType: z.string().describe('e.g., "Urban Professional", "University District", "Industrial Corridor", "Rural Agricultural"'),
        populationDensity: z.string().describe('Approximate population density or total population'),
        marketViability: z.string().describe('Can this market support premium pricing?'),
        impact: z.string().describe('How local demographics constrain or enable pricing'),
        reasoning: z.string().describe('Step-by-step derivation with SPECIFIC numbers from search results'),
        sources: z.array(z.string()).describe('URLs referenced — MUST include real census or demographic data URLs'),
        clarificationQuestion: z.string().nullable().describe('Only if ZIP data is truly unavailable. Otherwise null.'),
      }),
      prompt: `You are a local market demographics analyst. Research ZIP code "${zipcode}" to find REAL demographic data.

CRITICAL ACCURACY RULES:
1. You MUST search the web and find ACTUAL median income data — do not return 0 or "unknown"
2. Search at least twice: "median income ${zipcode}" and "${zipcode} demographics population"
3. If you can't find exact ZIP data, search for the city/county level data instead
4. Include the ACTUAL numbers you found, citing the source URL
5. Do NOT return "Data Not provided" — your job is to FIND the data via search

ZIP Code: "${zipcode}"
${userAnswer ? `\nUSER ANSWER TO YOUR PREVIOUS CLARIFICATION QUESTION:\n"${userAnswer}"\nHIGHEST PRIORITY: use this new information to finalize your analysis.` : ''}`,
    });
    return object;
  } catch (err) {
    console.error('[Demographics Error]', err);
    return { name: 'Demographics', medianIncome: 0, priceCeiling: 0, neighborhoodType: 'Error', populationDensity: 'Unknown', marketViability: 'Unknown', impact: 'Failed', reasoning: 'LLM call failed', sources: [], clarificationQuestion: null };
  }
}
