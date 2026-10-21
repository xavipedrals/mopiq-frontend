import { supabase } from '../supabaseInit';
import { getCurrentUser } from '../auth/session';
import { getLocale } from '../i18n';
import { sharedGenerationRequest, SHARED_AI_BUCKET } from '../study/sharedGeneration';
export const sharedGenerationEnabled = import.meta.env.VITE_SHARED_AI_GENERATION_ENABLED === 'true';
export async function startSharedGeneration(input) {
  const userId = getCurrentUser()?.supabaseUid;
  if (!userId) throw new Error('Sign in to generate cards');
  const preferences = { ...input, preferredLanguage: getLocale() || 'en' };
  const file = input.file;
  const fileHash = file ? [...new Uint8Array(await crypto.subtle.digest('SHA-256', await file.arrayBuffer()))].map(x => x.toString(16).padStart(2, '0')).join('') : null;
  const digestInput = JSON.stringify({ ...preferences, file: file ? { name: file.name, hash: fileHash } : null });
  const digest = [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(digestInput)))].map(x => x.toString(16).padStart(2, '0')).join('');
  const key = `mopiq.pendingGeneration.${userId}.${digest}`;
  let requestId = localStorage.getItem(key);
  if (!requestId) { requestId = crypto.randomUUID(); localStorage.setItem(key, requestId); }
  let storagePath = null;
  if (file) {
    const filename = file.name.replace(/[^a-zA-Z0-9._-]+/g, '_').slice(-100);
    storagePath = `users/${userId}/imports/${requestId}/${filename}`;
    const { error } = await supabase.storage.from(SHARED_AI_BUCKET).upload(storagePath, file, { upsert: false, contentType: file.type || undefined });
    if (error && String(error.statusCode) !== '409') throw error;
  }
  const body = sharedGenerationRequest({ ...preferences, requestId, storagePath });
  const { data, error } = await supabase.functions.invoke('start_ai_generation_v1', { body });
  if (error) {
    const detail = await error.context?.json?.().catch(() => null);
    throw Object.assign(new Error(detail?.error || error.message), { code: detail?.code });
  }
  localStorage.removeItem(key);
  return { ...data, pipeline: 'shared' };
}
export async function listSharedGenerationJobs() {
  const { data, error } = await supabase.rpc('list_ai_generation_jobs_v1');
  if (error) throw error;
  return data || [];
}
export async function controlSharedGeneration(jobId, action) {
  const { data, error } = await supabase.rpc('control_ai_generation_job_v1', { p_job_id: jobId, p_action: action });
  if (error) throw error;
  return data;
}
