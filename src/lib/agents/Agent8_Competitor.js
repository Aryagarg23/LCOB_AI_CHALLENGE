import { generateObject } from 'ai';
import { getAgentModel } from '@/lib/ai-provider';
import { webSearchTool } from '@/lib/tools';
import { z } from 'zod';

export async function agent8_CompetitorAI(zipcode, productType, businessType, businessName = '', isExistingBusiness = true, userAnswer = null) {
  console.log(`[Competitors] Mapping competitive landscape for ${businessType} in ${zipcode}...`);

  try {
    const isPreLaunch = !isExistingBusiness;
    const { object } = await generateObject({
      model: getAgentModel('gpt-4.1-nano'),
      tools: { webSearch: webSearchTool },
      maxSteps: 5,
      schema: z.object({
        name: z.string(),
        avgCompetitorPrice: z.number().describe('Average price charged by local competitors for comparable products/services'),
        competitors: z.array(z.object({
          name: z.string(),
          priceRange: z.string(),
          strengths: z.string(),
          weaknesses: z.string(),
          sourceUrl: z.string().describe('URL where this competitor was found — MUST be a real URL'),
        })).describe('Competitors found via ACTUAL web search results'),
        marketSaturation: z.string().describe('Low / Medium / High — how crowded is this market?'),
        strategyMode: z.string().describe('Recommended strategy: "Undercut", "Differentiate", "Premium Niche", "Blue Ocean"'),
        impact: z.string().describe('How competition constrains or enables pricing'),
        reasoning: z.string().describe('Detailed competitive analysis citing specific search results and URLs'),
        sources: z.array(z.string()).describe('URLs of competitor websites, reviews, directories where you ACTUALLY found them'),
        clarificationQuestion: z.string().nullable().describe(isPreLaunch ? 'Since this is PRE-LAUNCH, ask who they consider their aspirational competitors or role models. Otherwise null.' : 'If you cannot find their specific business or direct local competitors, ask who their main competitors are. Otherwise null.'),
      }),
      prompt: `You are a competitive intelligence analyst. Research the REAL competitive landscape for ${businessType || 'retail'} businesses near ZIP "${zipcode}" selling "${productType}".

CRITICAL ACCURACY RULES:
1. ONLY report competitors you ACTUALLY find via web search with real URLs. Do NOT invent business names.
2. If you search and find no specific competitors, say "No specific local competitors found via web search"
3. The client's business is called "${businessName}" — DO NOT list it as a competitor. Find DIFFERENT businesses selling similar products nearby.
4. For each competitor you DO find, include the URL where you found them
5. If this is a commodity business (farming, mining, etc.), note that competition is price-based at commodity exchanges, not local retail
6. Report WHOLESALE/COMMODITY prices, not retail prices, for commodity businesses

Search at least 3 times:
1. "${businessType} near ${zipcode}"
2. "best ${productType} shops near University of Cincinnati" or "best ${productType} near ${zipcode}"
3. "${productType} shops ${zipcode} reviews"

If you cannot find real competitors with real URLs, report an empty competitors array and explain in reasoning that data was not available — this is ALWAYS better than fabricating businesses.

ZIP: "${zipcode}", Business: "${businessType}", Product: "${productType}", Client Name: "${businessName}"
${isPreLaunch ? 'Context: THIS IS A PRE-LAUNCH / NEW BUSINESS. Focus on the market they are ABOUT to enter.' : `Context: THIS IS AN EXISTING BUSINESS called "${businessName}". Find their actual local competition — other ${businessType} businesses nearby that are NOT "${businessName}".`}
${userAnswer ? `\nUSER ANSWER TO YOUR PREVIOUS CLARIFICATION QUESTION:\n"${userAnswer}"\nHIGHEST PRIORITY: use this new information to finalize your analysis.` : ''}`,
    });
    return object;
  } catch (err) {
    console.error('[Competitors Error]', err);
    return { name: 'Competitive Landscape', avgCompetitorPrice: 0, competitors: [], marketSaturation: 'Unknown', strategyMode: 'Error', impact: 'Failed', reasoning: 'LLM call failed', sources: [], clarificationQuestion: null };
  }
}
