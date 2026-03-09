import { streamText, generateText, convertToModelMessages } from 'ai';
import { getAgentModel } from '@/lib/ai-provider';

export async function POST(req) {
  try {
    const body = await req.json();
    const { messages, artifactContext, stream = true } = body;

    console.log('[Chat API] Received request:', {
      messageCount: messages?.length,
      hasArtifactContext: !!artifactContext,
      artifactContextLength: artifactContext?.length || 0,
      firstMsgRole: messages?.[0]?.role,
      firstMsgParts: messages?.[0]?.parts?.length,
      bodyKeys: Object.keys(body),
    });

    // Guard against empty messages from hook initialization
    if (!messages || messages.length === 0) {
      return new Response('No messages', { status: 400 });
    }

    const systemPrompt = `You are a senior business strategy consultant at Praxis Economics. You just generated a comprehensive pricing and strategy report for the user's business.

The user is a non-technical business owner asking follow-up questions about the strategy.

Always:
- Be professional yet approachable
- Cite specific data from the report when relevant
- Translate economic jargon into actionable business advice
- Format responses with clear structure (bold, bullets) when helpful

Context of the Strategy Report:
${artifactContext || 'No report context available. Speak generally about pricing strategy methodology.'}`;

    // Convert UIMessages to model messages for streamText / generateText
    const modelMessages = await convertToModelMessages(messages);

    if (stream) {
      const result = streamText({
        model: getAgentModel('gpt-4o-mini'),
        system: systemPrompt,
        messages: modelMessages,
      });

      return result.toUIMessageStreamResponse();
    } else {
      const { text } = await generateText({
        model: getAgentModel('gpt-4o-mini'),
        system: systemPrompt,
        messages: modelMessages,
      });

      return new Response(JSON.stringify({ text }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }
  } catch (error) {
    console.error('[Chat API Error]', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}