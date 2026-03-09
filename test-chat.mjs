import fs from 'fs';

async function testChat() {
  try {
    const res = await fetch('http://localhost:3000/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'hello', parts: [{ type: 'text', text: 'hello' }] }],
        artifactContext: 'Testing context'
      })
    });
    console.log('Status:', res.status);
    const text = await res.text();
    fs.writeFileSync('log.txt', text);
    console.log('Wrote error to log.txt');
  } catch (err) {
    console.error(err);
  }
}
testChat();
