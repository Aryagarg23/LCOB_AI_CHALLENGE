import { generateObject } from 'ai';
import { getAgentModel } from '@/lib/ai-provider';
import { webSearchTool } from '@/lib/tools';
import { z } from 'zod';

export async function agent1_Vision(inputAesthetic, imageUrl, businessAgeMonths = undefined, userAnswer = null) {
  console.log('[Vision] Analyzing brand aesthetic profile...');

  try {
    const isPreLaunch = businessAgeMonths !== undefined && Number(businessAgeMonths) <= 0;
    const basePrompt = `You are a brand aesthetics and visual identity analyst. Evaluate the business description below and assign a Hedonic Premium Score — a measure of how strongly the brand's look and feel justifies premium pricing.

Use web_search to research comparable businesses in this category and how design/presentation quality correlates with willingness-to-pay.

Cite all URLs found in your sources array. Explain step-by-step reasoning.

Business Aesthetic Description: "${inputAesthetic}"
${isPreLaunch ? 'Context: THIS IS A PRE-LAUNCH / NEW BUSINESS. It does not exist yet. Keep your analysis focused on the proposed vision.' : ''}
${userAnswer ? `\nUSER ANSWER TO YOUR PREVIOUS CLARIFICATION QUESTION:\n"${userAnswer}"\nHIGHEST PRIORITY: use this new information to finalize your analysis.` : ''}`;

    let requestBody = {
      model: getAgentModel('gpt-4.1-nano'),
      tools: { webSearch: webSearchTool },
      maxSteps: 3,
      schema: z.object({
        name: z.string(),
        score: z.number().min(-1).max(1).describe('Hedonic Premium Score: -1.0 (budget/discount) to 1.0 (ultra-premium/luxury)'),
        classification: z.string().describe('Category (e.g., "Premium Boutique", "Mid-Market Retail", "Discount Outlet", "Artisan Workshop")'),
        impact: z.string().describe('How this aesthetic grade affects willingness-to-pay via Hedonic Pricing theory'),
        reasoning: z.string().describe('Step-by-step explanation referencing search results or visual observations'),
        sources: z.array(z.string()).describe('URLs referenced'),
        clarificationQuestion: z.string().nullable().describe(isPreLaunch ? 'Since this is a PRE-LAUNCH business, if you need more info, ask an OPEN-ENDED question about their future vision. Do NOT ask about existing operations. Otherwise null.' : 'If missing critical info about brand positioning, ask ONE specific question. Otherwise null.'),
      }),
    };

    if (imageUrl) {
      requestBody.messages = [
        {
          role: 'user',
          content: [
            { type: 'text', text: basePrompt + "\n\nA photo of the business has been provided. Analyze the attached photo to assess the visual identity." },
            { type: 'image', image: new URL(imageUrl) }
          ]
        }
      ];
    } else {
      requestBody.prompt = basePrompt;
    }

    const { object } = await generateObject(requestBody);
    return object;
  } catch (err) {
    console.error('[Vision Error]', err);
    return { name: 'Brand & Aesthetics', score: 0.5, classification: 'Error Fallback', impact: 'Analysis failed', reasoning: 'LLM call failed', sources: [], clarificationQuestion: null };
  }
}
