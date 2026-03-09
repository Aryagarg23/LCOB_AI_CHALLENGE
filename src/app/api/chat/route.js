import { streamText, convertToModelMessages } from 'ai';
import { getAgentModel } from '@/lib/ai-provider';
import { webSearchTool } from '@/lib/tools';

export async function POST(req) {
  try {
    const { messages, artifactContext } = await req.json();

    // Guard against empty messages from hook initialization
    if (!messages || messages.length === 0) {
      return new Response('No messages', { status: 400 });
    }

    const systemPrompt = `You are a senior business strategy consultant at Praxis Economics. You just generated a comprehensive pricing and strategy report for the user's business.

The user is a non-technical business owner asking follow-up questions about the strategy. You have access to a web_search tool — if the user asks a question requiring fresh data, current prices, new competitor information, or any factual lookup, use the tool to search the web and provide sourced answers.

Always:
- Be professional yet approachable
- Cite specific data from the report when relevant
- If you search the web, include the source URL in your response
- Translate economic jargon into actionable business advice
- Format responses with clear structure (bold, bullets) when helpful

Context of the Strategy Report:
${artifactContext || 'No report context available. Speak generally about pricing strategy methodology.'}`;

    // Convert UIMessages to model messages for streamText
    const modelMessages = await convertToModelMessages(messages);

    const result = streamText({
      model: getAgentModel('gpt-4.1-nano'),
      tools: { webSearch: webSearchTool },
      maxSteps: 3,
      system: systemPrompt,
      messages: modelMessages,
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error('[Chat API Error]', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
