import { getDeckTopicByPostgresId, getDisplayDeckTopic } from '../utils.js';

export function isLegacyTopicKey(key) {
  return getDeckTopicByPostgresId(key).imageName === key;
}

export function legacyTopicKey(key) {
  return getDeckTopicByPostgresId(key).imageName;
}

// iOS library organization uses local/Firebase IDs, not deck_versions UUIDs.
export function personalTopicDeckId(deck) {
  return String(deck?.firebaseId || deck?.id || '');
}

export function applyPersonalTopicSnapshot(deck, snapshot, lookup = new Map((snapshot?.topics || []).map(row => [row.deckId, row]))) {
  const id = personalTopicDeckId(deck);
  const record = lookup.get(id);
  const key = typeof record?.topicKey === 'string' ? record.topicKey : null;
  const legacy = deck.legacyTopic || getDeckTopicByPostgresId(deck.topic?.imageName);
  return {
    ...deck,
    legacyTopic: legacy,
    personalTopicKey: key,
    topic: key == null ? legacy : getDisplayDeckTopic(key),
  };
}

// Injected transport keeps the account boundary and existing RPC contract
// independently testable. No organization fields unrelated to topics are sent.
export function createPersonalTopicClient({ rpc, getUserId, randomUUID = () => crypto.randomUUID(), now = () => Date.now(), storage = null, withLock = async (_name, work) => work() }) {
  let owner = null;
  let snapshot = null;
  let pending = null;
  let flushing = null;
  let queued = new Map();
  const queuePrefix = userId => `mopiq.personalTopics.pending.${userId}.`;
  function readQueue(userId) {
    if (!userId || !storage) return new Map();
    const records = [];
    let keys;
    try { keys = storage.keys(); } catch { return new Map(); }
    for (const key of keys) {
      if (!key.startsWith(queuePrefix(userId))) continue;
      try {
        const row = JSON.parse(storage.getItem(key));
        if (row?.kind === 'setDeckTopic' && typeof row.id === 'string' && row.id
          && key === queuePrefix(userId) + row.id
          && typeof row.deckId === 'string' && row.deckId.length > 0 && row.deckId.length <= 200
          && Number.isFinite(row.createdAt)
          && (row.topicKey === null || (typeof row.topicKey === 'string' && /^[a-z0-9_-]{1,100}$/.test(row.topicKey)))) records.push(row);
      } catch { /* Ignore malformed entries without rewriting another tab's data. */ }
    }
    return new Map(records.map(row => [row.id, row]));
  }
  function mergeQueue(userId) {
    for (const [id, mutation] of readQueue(userId)) queued.set(id, mutation);
  }
  function currentOwner() {
    const userId = getUserId();
    if (owner !== userId) { owner = userId; snapshot = null; pending = null; flushing = null; queued = readQueue(userId); }
    return userId;
  }
  function assertOwner(userId) {
    if (!userId || currentOwner() !== userId) throw new Error('Account changed');
  }
  function mergeSnapshot(incoming) {
    const topics = new Map((snapshot?.topics || []).map(row => [row.deckId, row]));
    for (const row of incoming.topics) {
      if (Number(row.version || 0) >= Number(topics.get(row.deckId)?.version || 0)) topics.set(row.deckId, row);
    }
    snapshot = { ...incoming, topics: [...topics.values()] };
    return snapshot;
  }
  async function load({ refresh = false } = {}) {
    const userId = currentOwner();
    if (!userId) return null;
    if (pending) return pending;
    if (snapshot && !refresh) return snapshot;
    const work = (async () => {
      const { data, error } = await rpc('get_library_organization', { p_expected_user_id: userId });
      assertOwner(userId);
      if (error) throw error;
      if (!data || !Array.isArray(data.topics)) throw new Error('Personal topics unavailable');
      return mergeSnapshot(data);
    })();
    pending = work;
    try { return await work; } finally { if (pending === work) pending = null; }
  }
  async function supports() {
    const value = await load();
    return Number(value?.topicSchemaVersion) >= 1;
  }
  async function flush() {
    const userId = currentOwner();
    if (!userId || !(Number(snapshot?.topicSchemaVersion) >= 1)) return;
    if (flushing) { await flushing; if (queued.size) await flush(); return; }
    const work = withLock(`mopiq.personalTopics.${userId}`, async () => {
      assertOwner(userId);
      mergeQueue(userId);
      while (queued.size) {
        assertOwner(userId);
        const batch = [...queued.values()].sort((a, b) => a.createdAt - b.createdAt).slice(0, 50);
        const { data, error } = await rpc('apply_library_organization_mutations', {
          p_expected_user_id: userId, p_mutations: batch,
        });
        assertOwner(userId);
        if (error) throw error;
        const acknowledgements = new Set((data?.results || []).filter(result => result.status === 'applied').map(result => result.id));
        if (!(Number(data?.snapshot?.topicSchemaVersion) >= 1) || !Array.isArray(data?.snapshot?.topics)
          || batch.some(mutation => !acknowledgements.has(mutation.id))) throw new Error('Could not save deck topic');
        mergeSnapshot(data.snapshot);
        for (const mutation of batch) {
          // An acknowledgement removes only its own independently stored entry.
          // Another tab can enqueue safely while this request is in flight.
          storage?.removeItem(queuePrefix(userId) + mutation.id);
          queued.delete(mutation.id);
        }
        mergeQueue(userId);
      }
    });
    flushing = work;
    try { await work; } finally { if (flushing === work) flushing = null; }
  }
  function displaySnapshot(decks) {
    // Build once for the whole library, including still-pending local choices.
    const lookup = new Map((snapshot?.topics || []).map(row => [row.deckId, row]));
    for (const mutation of [...queued.values()].sort((a, b) => a.createdAt - b.createdAt)) lookup.set(mutation.deckId, mutation);
    return decks.map(deck => applyPersonalTopicSnapshot(deck, snapshot, lookup));
  }
  async function hydrate(decks) {
    const userId = currentOwner();
    try { await load({ refresh: true }); } catch {
      // Both the cached snapshot and durable pending choices survive a failed
      // refresh for this account. Other accounts never see these values.
      if (currentOwner() !== userId) throw new Error('Account changed');
    }
    // Paint pending choices immediately; draining a large recovered queue must
    // not hold the library screen behind repeated organization snapshots.
    if (userId) void flush().catch(() => {});
    return displaySnapshot(decks);
  }
  async function save(deck, key) {
    const userId = currentOwner();
    assertOwner(userId);
    if (!await supports()) throw new Error('Personal topics unavailable');
    assertOwner(userId);
    const deckId = personalTopicDeckId(deck);
    if (!deckId || deckId.length > 200 || typeof key !== 'string' || !/^[a-z0-9_-]{1,100}$/.test(key)) throw new Error('Invalid deck topic');
    const topicKey = isLegacyTopicKey(key) ? null : key;
    mergeQueue(userId);
    const existing = [...queued.values()].filter(mutation => mutation.deckId === deckId).sort((a, b) => b.createdAt - a.createdAt)[0];
    if (!existing || existing.topicKey !== topicKey) {
      const mutation = { id: randomUUID(), kind: 'setDeckTopic', deckId, topicKey, createdAt: now() / 1000, assignments: [] };
      // Persist each operation separately. Never replace an account-wide queue.
      storage?.setItem(queuePrefix(userId) + mutation.id, JSON.stringify(mutation));
      queued.set(mutation.id, mutation);
    }
    await flush();
    return displaySnapshot([deck])[0];
  }

  return { load, supports, hydrate, save, retry: flush };
}
