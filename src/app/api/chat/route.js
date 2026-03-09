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

The user is a non-technical business owner asking follow-up questions about the strategy. Answer their questions relying solely on the context of the Strategy Report provided below and your general economic strategy knowledge. Do not attempt to use any tools or make live web searches.

Always:
- Be professional yet approachable
- Cite specific data from the report when relevant
- Translate economic jargon into actionable business advice
- Format responses with clear structure (bold, bullets) when helpful

Context of the Strategy Report:
${artifactContext || 'No report context available. Speak generally about pricing strategy methodology.'}`;

    console.log('API Chat: Received messages length', messages?.length);

    // Convert UIMessages to model messages for streamText
    const modelMessages = await convertToModelMessages(messages);
    console.log('API Chat: successfully computed modelMessages', modelMessages?.length);

    console.log('API Chat: executing streamText...');
    const result = streamText({
      model: getAgentModel('gpt-4.1-nano'),
      system: systemPrompt,
      messages: modelMessages,
    });
    return result.toUIMessageStreamResponse({
      onError: (streamError) => {
        require('fs').writeFileSync('stream-error.txt', streamError.stack || streamError.toString());
        console.error('*** STREAM ERROR ***', streamError.stack || streamError);
      }
    });
  } catch (error) {
    console.error('[Chat API Error]', error.stack || error);
    return new Response(JSON.stringify({ 
      error: error.stack || error.message,
      msgType: typeof messages,
      isArray: Array.isArray(messages),
      msgDump: messages 
    }), { status: 500 });
  }
}
