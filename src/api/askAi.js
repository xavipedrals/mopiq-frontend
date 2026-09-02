import { supabaseAnonKey } from '../supabaseInit';
import { getAccessToken } from '../auth/session';
import { edgeFunctionUrl } from './functionsUrl';

export async function streamAskAi({
  messages,
  cardQuestion,
  cardAnswer,
  userId,
  preset,
  onToken,
  signal,
}) {
  const token = await getAccessToken();
  if (!token) throw new Error('Ask AI is unavailable right now.');
  const response = await fetch(edgeFunctionUrl('ask-ai-chat'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      apikey: supabaseAnonKey,
    },
    body: JSON.stringify({
      messages,
      card_question: cardQuestion,
      card_answer: cardAnswer,
      user_id: userId || '',
      ...(preset ? { preset } : {}),
    }),
    signal,
  });
  if (!response.ok) {
    throw new Error('Ask AI is unavailable right now.');
  }
  if (!response.body) {
    throw new Error('Ask AI did not return a reply.');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const payload = line.slice(6).trim();
      if (payload === '[DONE]') return;
      try {
        const json = JSON.parse(payload);
        const token = json.choices?.[0]?.delta?.content;
        if (token) onToken(token);
      } catch {
        // ignore incomplete SSE chunks
      }
    }
  }
}
