import { supabase } from '../supabaseInit';
import { getCurrentUser } from '../auth/session';
import { cardFlagRecord, personalFlagRecord, visiblePersonalFlags } from '../study/personalFlags';

async function readRecords(userId, filters) {
  const records = [];
  for (let offset = 0; ; offset += 500) {
    let query = supabase.from('personal_study_records').select('record')
      .eq('user_id', userId).order('entity_key').range(offset, offset + 499);
    for (const [key, value] of Object.entries(filters)) {
      query = Array.isArray(value) ? query.in(`record->>${key}`, value) : query.eq(`record->>${key}`, String(value));
    }
    const { data, error } = await query;
    if (error) throw error;
    records.push(...data.map((row) => row.record));
    if (data.length < 500) return records;
  }
}

export async function fetchPersonalFlags() {
  const userId = getCurrentUser()?.supabaseUid;
  if (!userId) throw new Error('Not authenticated');
  return visiblePersonalFlags(await readRecords(userId, { kind: 'flag' }));
}

export async function fetchCardFlags(deckId, cardId) {
  const userId = getCurrentUser()?.supabaseUid;
  if (!userId) throw new Error('Not authenticated');
  const [flags, assignments] = await Promise.all([
    readRecords(userId, { kind: 'flag' }),
    readRecords(userId, { kind: 'assignment', deck_id: deckId, card_id: cardId }),
  ]);
  return {
    flags: visiblePersonalFlags(flags),
    flagIDs: assignments.filter((record) => !record.deleted).map((record) => record.flag_id),
  };
}

export async function fetchCardsFlags(deckId, cardIDs) {
  const userId = getCurrentUser()?.supabaseUid;
  if (!userId) throw new Error('Not authenticated');
  const ids = [...new Set(cardIDs.map(String))];
  if (!ids.length) return {};
  const flags = visiblePersonalFlags(await readRecords(userId, { kind: 'flag' }));
  const assignments = [];
  for (let offset = 0; offset < ids.length; offset += 60) {
    assignments.push(...await readRecords(userId, { kind: 'assignment', deck_id: deckId, card_id: ids.slice(offset, offset + 60) }));
  }
  return Object.fromEntries(ids.map(id => [id, flags.filter(flag => assignments.some(record => !record.deleted && String(record.card_id) === id && record.flag_id === flag.flag_id))]));
}

export async function saveCardFlag(deckId, cardId, flag, enabled) {
  const userId = getCurrentUser()?.supabaseUid;
  if (!userId) throw new Error('Not authenticated');
  const assignment = cardFlagRecord(deckId, cardId, flag.flag_id, enabled);
  // Only missing starter definitions are seeded; existing definitions and
  // tombstones must never be overwritten by an assignment change.
  const records = flag.labelKey ? [personalFlagRecord(flag), assignment] : [assignment];
  const { error } = await supabase.rpc('upsert_personal_study_v1', {
    p_records: records,
    p_expected_user_id: userId,
  });
  if (error) throw error;
}
