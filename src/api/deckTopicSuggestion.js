import { edgeFunctionUrl } from './functionsUrl';
import { supabaseAnonKey } from '../supabaseInit';
import { supportsPersonalDeckTopics } from './personalDeckTopics';
import { getAllDeckTopics, PERSONAL_DECK_TOPICS, isPersonalDeckTopic } from '../utils';

const knownTopics = new Set([...getAllDeckTopics(),...PERSONAL_DECK_TOPICS].map(topic => topic.imageName));

// Same { name } -> { topic } contract as iOS categorizeDeckTopic(name:).
export async function classifyDeckTopic(name, {signal} = {}) {
  const trimmed = String(name || '').trim();
  if (!trimmed || Array.from(trimmed).length > 200) throw new Error('Invalid deck name');
  signal?.throwIfAborted();
  const controller = new AbortController();
  const abort = () => controller.abort(signal?.reason);
  signal?.addEventListener('abort',abort,{once:true});
  const timeout = setTimeout(() => controller.abort(),12000);
  let rejectAborted;
  const aborted = new Promise((_, reject) => { rejectAborted = () => reject(new DOMException('Suggestion cancelled', 'AbortError')); });
  controller.signal.addEventListener('abort', rejectAborted, { once: true });
  try {
    const [response,personalAvailable] = await Promise.race([aborted, Promise.all([
      fetch(edgeFunctionUrl('categorize_deck_topic'), {
        method:'POST',signal:controller.signal,
        headers:{'Content-Type':'application/json',apikey:supabaseAnonKey},
        body:JSON.stringify({name:trimmed}),
      }),
      supportsPersonalDeckTopics().catch(() => false),
    ])]);
    if (!response.ok) throw new Error('Topic suggestion unavailable');
    const data = await response.json();
    const topic = typeof data.topic === 'string' ? data.topic.trim().toLowerCase() : '';
    if (!knownTopics.has(topic)) throw new Error('Invalid topic response');
    return isPersonalDeckTopic(topic) && !personalAvailable ? 'other' : topic;
  } catch (error) {
    if (signal?.aborted) throw new DOMException('Suggestion cancelled', 'AbortError');
    throw new Error('Topic suggestion unavailable', { cause: error });
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener('abort',abort);
    controller.signal.removeEventListener('abort',rejectAborted);
  }
}
