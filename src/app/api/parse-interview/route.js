import { generateObject } from 'ai';
import { getAgentModel } from '@/lib/ai-provider';
import { z } from 'zod';

/**
 * Parse a completed interview transcript into structured inputs for the 8 research agents.
 */
export async function POST(req) {
  try {
    const { transcript, uploadedImageUrls, uploadedFileNames } = await req.json();

    const { object } = await generateObject({
      model: getAgentModel('gpt-4.1-nano'),
      schema: z.object({
        businessName: z.string(),
        businessType: z.string().describe('Industry/type of business (e.g., "specialty coffee shop", "boutique clothing store", "auto repair")'),
        zipcode: z.string(),
        address: z.string(),
        aesthetic: z.string().describe('Brand aesthetic, positioning, and target customer description'),
        productType: z.string().describe('Primary product or service'),
        isExistingBusiness: z.boolean().describe('TRUE if the user already owns/operates this business. FALSE only if they explicitly say they are planning, launching, or starting a new business that does not yet exist.'),
        businessAgeMonths: z.number().describe('Age of the business in months. IMPORTANT: If the user says they OWN, RUN, or OPERATE this business, it ALREADY EXISTS — estimate age as at least 12 months (or higher based on context). Only use 0 if the user explicitly says they are PLANNING or STARTING a new business that does not exist yet.'),
        recentReviews: z.string().describe('Any customer feedback, reviews, or social media mentions from the conversation'),
        coreQuestion: z.string().describe('The specific question or decision the owner needs help with'),
        knownCompetitors: z.string().describe('Any competitors mentioned by name during the interview'),
        additionalContext: z.string().describe('Any other relevant details from the interview (uploaded files, unique challenges, etc.)'),
        settingTheScene: z.string().describe('A 3-4 paragraph narrative summary of the business, its context, challenges, and what the owner is trying to solve. Written in third person professional prose for the report introduction.'),
      }),
      prompt: `You are parsing a completed business intake interview. Extract all structured fields from this conversation transcript. Be thorough — capture every detail mentioned.

CRITICAL CLASSIFICATION RULE:
- If the user says "I own", "I run", "I have", "my business", "my shop", "we sell", or similar language indicating they CURRENTLY operate a business → isExistingBusiness = TRUE, businessAgeMonths >= 12
- ONLY set isExistingBusiness = FALSE if the user explicitly says "I want to start", "I'm planning to open", "I'm thinking about launching", etc.
- When in doubt, assume EXISTING. Most users asking for help already have a business.

INTERVIEW TRANSCRIPT:
${transcript}

${uploadedImageUrls?.length > 0 ? `UPLOADED PHOTOS: ${uploadedImageUrls.join(', ')}` : ''}
${uploadedFileNames?.length > 0 ? `UPLOADED FILES: ${uploadedFileNames.join(', ')}` : ''}

For the "settingTheScene" field, write a compelling 3-4 paragraph narrative that would serve as the opening section of a professional strategy report. Describe the business, its neighborhood, its ambitions, and the specific challenge the owner faces. Write as if introducing a case study to a consulting firm's partner team. If the business already exists, write about it as an ESTABLISHED business, not a planned one.`,
    });

    return Response.json({ success: true, data: object });
  } catch (error) {
    console.error('[Parse Interview Error]', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}
