import { supabase } from '../supabaseInit';
import { getCurrentUser } from '../auth/session';
import { keyboardHintMetadataPatch, readKeyboardHintMetadata } from '../study/keyboardHints';

async function hintUser(userId) {
  if (getCurrentUser()?.supabaseUid !== userId) throw new Error('Study account changed');
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  if (data.user?.id !== userId || getCurrentUser()?.supabaseUid !== userId) {
    throw new Error('Study account changed');
  }
  return data.user;
}

export async function fetchKeyboardHintHistory(userId) {
  const user = await hintUser(userId);
  return readKeyboardHintMetadata(user.user_metadata);
}

export async function saveKeyboardHintHistory(userId, flags) {
  await hintUser(userId);
  const data = keyboardHintMetadataPatch(flags);
  if (!Object.keys(data).length) return;
  // Supabase merges these top-level metadata keys with the user's existing data.
  const { error } = await supabase.auth.updateUser({ data });
  if (error) throw error;
}
