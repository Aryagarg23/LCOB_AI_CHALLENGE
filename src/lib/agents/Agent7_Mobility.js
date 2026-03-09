import { generateObject } from 'ai';
import { getAgentModel } from '@/lib/ai-provider';
import { webSearchTool } from '@/lib/tools';
import { z } from 'zod';

export async function agent7_UrbanMobility(address, zipcode, userAnswer = null) {
  console.log(`[Mobility] Assessing location accessibility around ${address || zipcode}...`);

  try {
    const { object } = await generateObject({
      model: getAgentModel('gpt-4.1-nano'),
      tools: { webSearch: webSearchTool },
      maxSteps: 3,
      schema: z.object({
        name: z.string(),
        footTrafficMultiplier: z.number().describe('Foot traffic/accessibility index: 1.5 = high-density transit hub, 0.6 = remote/car-dependent'),
        transitStatus: z.string().describe('e.g., "High Density Transit Hub", "Walk Score 85", "Industrial Zone", "Car-Dependent"'),
        footTrafficAssessment: z.string().describe('Daily addressable customer volume assessment'),
        nearbyAnchors: z.string().describe('Nearby draws: universities, offices, factories, malls, transit stops'),
        impact: z.string().describe('How location accessibility affects customer volume'),
        reasoning: z.string().describe('Analysis of walkability, transit, nearby anchors'),
        sources: z.array(z.string()).describe('URLs from Walk Score, Google Maps, transit sites'),
        clarificationQuestion: z.null().describe('Always null — uses public location data'),
      }),
      prompt: `You are an urban mobility and location analyst. Assess accessibility and daily customer traffic potential for a business at this location.

Search for "walk score ${zipcode}", "${address || zipcode} walkability", or "transit near ${zipcode}". Identify nearby anchors (universities, offices, factories, shopping centers, transit stations) that drive traffic. Cite sources.

Address: "${address}", ZIP: "${zipcode}"
${userAnswer ? `\nUSER ANSWER TO YOUR PREVIOUS CLARIFICATION QUESTION:\n"${userAnswer}"\nHIGHEST PRIORITY: use this new information to finalize your analysis.` : ''}`,
    });
    return object;
  } catch (err) {
    console.error('[Mobility Error]', err);
    return { name: 'Location & Mobility', footTrafficMultiplier: 1.0, transitStatus: 'Error', footTrafficAssessment: 'Unknown', nearbyAnchors: 'Unknown', impact: 'Failed', reasoning: 'LLM call failed', sources: [], clarificationQuestion: null };
  }
}
