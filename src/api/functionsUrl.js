import { supabaseUrl } from '../supabaseInit';

export function edgeFunctionUrl(name) {
  return `${supabaseUrl}/functions/v1/${name}`;
}
