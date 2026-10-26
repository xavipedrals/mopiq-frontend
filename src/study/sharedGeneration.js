export const SHARED_AI_RECIPE = 'app-2026-10-19.1';
export const SHARED_AI_BUCKET = 'ai-generation-sources';
export function trimGenerationInstructions(value) {
  return [...new Intl.Segmenter().segment(String(value || '').trim())].slice(0, 1000).map(x => x.segment).join('');
}
export function sharedGenerationRequest({ requestId, source, deckId = '', name = '', topic = 'other', text = '', pages = null, generationInstructions = '', preferredLanguage = 'en', storagePath = null, targetSubdeckId = null } = {}) {
  return { requestId, sourceKind: source, deckVersionId: deckId || undefined, name, topic,
    text, pages, storagePath, preferredLanguage, targetSubdeckId,
    generationInstructions: trimGenerationInstructions(generationInstructions),
    mode: source === 'aiPrompt' ? 'prompt' : source === 'pdf' ? 'extract' : 'notes',
    ...(source === 'youtube' ? { url: text, text: '' } : {}),
  };
}
export function isSharedJob(row) { return !!row?.recipe_version; }

export function toggleGenerationIdea(instructions, example) {
  const current = String(instructions || '');
  if (current.includes(example)) return current.replace(example, '').replace(/\n{3,}/g, '\n\n').trim();
  const next = current.trim() ? `${current.trim()}\n${example}` : example;
  // Adding an example never silently truncates the user's existing guidance.
  return trimGenerationInstructions(next) === next ? next : current;
}
