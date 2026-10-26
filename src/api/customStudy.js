import { supabase } from '../supabaseInit';
import { getCurrentUser } from '../auth/session';
import { mapStudyBundleRow } from './webReads';
import { customStudyParams } from '../study/customStudy';

export async function fetchCustomStudySelection(deckId, configuration, includeIDs = false) {
  const owner = getCurrentUser()?.supabaseUid;
  const { data, error } = await supabase.rpc('custom_study_selection_v1', customStudyParams(deckId, configuration, includeIDs));
  if (owner !== getCurrentUser()?.supabaseUid) throw new Error('Account changed');
  if (error) throw error;
  return { count: Number(data?.matching_count) || 0, cardIDs: data?.card_ids || [] };
}
export async function fetchCustomStudyCards(deckId, ids) {
  const owner = getCurrentUser()?.supabaseUid;
  const cards = [];
  for (let offset = 0; offset < ids.length; offset += 500) {
    const { data, error } = await supabase.rpc('custom_study_cards_v1', { p_deck_id: deckId, p_card_ids: ids.slice(offset, offset + 500) });
    if (owner !== getCurrentUser()?.supabaseUid) throw new Error('Account changed');
    if (error) throw error;
    cards.push(...(data || []).map(mapStudyBundleRow));
  }
  return cards;
}
