import { pendingAnswers } from '@/lib/pendingAnswers';

export async function POST(req) {
  try {
    const { sessionId, agent, answer } = await req.json();

    if (!sessionId || !agent || !answer) {
      return new Response(JSON.stringify({ success: false, error: 'Missing required fields' }), { status: 400 });
    }

    const sessionAnswers = pendingAnswers.get(sessionId);
    if (!sessionAnswers || !sessionAnswers[agent]) {
      return new Response(JSON.stringify({ success: false, error: 'No pending question for this agent' }), { status: 404 });
    }

    // Resolve the promise waiting in the simulate route
    sessionAnswers[agent](answer);

    // Clean up
    delete sessionAnswers[agent];

    return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500 });
  }
}
