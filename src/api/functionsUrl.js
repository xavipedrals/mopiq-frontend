import { supabaseUrl } from '../supabaseInit';

export function edgeFunctionUrl(name) {
  const path = `/functions/v1/${name}`;
  if (import.meta.env.DEV) return path;
  return `${supabaseUrl}${path}`;
}
