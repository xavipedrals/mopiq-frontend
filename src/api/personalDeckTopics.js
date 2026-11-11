import { supabase } from '../supabaseInit';
import { getAccessToken, getCurrentUser } from '../auth/session';
import { createPersonalTopicClient } from '../study/personalDeckTopics.js';

const client = createPersonalTopicClient({
  withLock: (name, work) => navigator.locks?.request ? navigator.locks.request(name, work) : work(),
  storage: {
    keys: () => Object.keys(window.localStorage),
    getItem: key => window.localStorage.getItem(key),
    setItem: (key, value) => window.localStorage.setItem(key, value),
    removeItem: key => window.localStorage.removeItem(key),
  },
  getUserId: () => getCurrentUser()?.supabaseUid || null,
  rpc: async (name, parameters) => {
    const expectedUser = getCurrentUser()?.supabaseUid;
    await getAccessToken();
    if (getCurrentUser()?.supabaseUid !== expectedUser) throw new Error('Account changed');
    return supabase.rpc(name, parameters);
  },
});

export const supportsPersonalDeckTopics = () => client.supports();
export const hydratePersonalDeckTopics = decks => client.hydrate(decks);
export const savePersonalDeckTopic = (deck, key) => client.save(deck, key);
