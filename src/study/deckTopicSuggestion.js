// Swift counterpart: DeckTopicSuggestionModel.swift. Results belong to the
// current deck name and account; a later name or explicit choice cancels them.
export const AUTOMATIC_TOPIC = '__automatic__';
export const TOPIC_SUGGESTION_DELAY = 700;
export function createTopicSuggestionModel({ classify, onChange = () => {}, getIdentity = () => '', schedule = setTimeout, unschedule = clearTimeout }) {
  let owner = getIdentity(), name = '', revision = 0, timer = null, controller = null, pending = null;
  let state = { phase:'idle' };
  const answers = new Map();
  const normalized = value => String(value || '').trim();
  const publish = value => { state = value; onChange(value); };
  function cancel() {
    revision += 1;
    if (timer != null) unschedule(timer);
    timer = null; controller?.abort(); controller = null; pending = null;
    name = ''; publish({phase:'idle'});
  }
  function assertIdentity() {
    if (getIdentity() !== owner) { cancel(); owner = getIdentity(); answers.clear(); name = ''; publish({phase:'idle'}); }
  }
  function start() {
    if (pending) return pending;
    if (timer != null) unschedule(timer);
    timer = null;
    const token = revision, requestedName = name, requestedOwner = owner;
    const abort = new AbortController(); controller = abort;
    const isCurrent = () => token === revision && name === requestedName && requestedOwner === getIdentity() && !abort.signal.aborted;
    publish({phase:'reading',name:requestedName});
    const work = (async () => {
      try {
        const topicKey = await Promise.resolve().then(() => classify(requestedName,{signal:abort.signal}));
        if (!isCurrent()) throw new DOMException('Suggestion cancelled','AbortError');
        if (answers.size >= 30) answers.delete(answers.keys().next().value);
        answers.set(requestedName,topicKey);
        publish({phase:'suggested',name:requestedName,topicKey});
        return topicKey;
      } catch(error) {
        if (isCurrent()) publish({phase:'idle'});
        throw error;
      } finally { if (pending === work) pending = null; }
    })();
    pending = work;
    return work;
  }
  function nameChanged(value) {
    assertIdentity();
    const next = normalized(value);
    if (next === name) return;
    cancel(); name = next;
    if (answers.has(name)) { publish({phase:'suggested',name,topicKey:answers.get(name)}); return; }
    publish({phase:'idle'});
    if (Array.from(name).length < 4 || Array.from(name).length > 200) return;
    timer = schedule(() => { timer = null; void start().catch(() => {}); }, TOPIC_SUGGESTION_DELAY);
  }
  async function resolve(value) {
    assertIdentity();
    const next = normalized(value);
    if (!next || Array.from(next).length > 200) throw new Error('Invalid deck name');
    if (name !== next) nameChanged(next);
    if (answers.has(next)) return answers.get(next);
    return start();
  }
  function stateFor(value) {
    assertIdentity();
    const next = normalized(value);
    if (answers.has(next)) return {phase:'suggested',name:next,topicKey:answers.get(next)};
    return state.name === next ? state : {phase:'idle'};
  }
  return { nameChanged, resolve, stateFor, cancel };
}
