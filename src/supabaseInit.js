import { createClient } from '@supabase/supabase-js';

export const supabaseUrl = 'https://gytvwrpkwjegeatpvyqu.supabase.co';
export const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd5dHZ3cnBrd2plZ2VhdHB2eXF1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDAxNTA1NDcsImV4cCI6MjA1NTcyNjU0N30.O9H8tuMUle4toVpcNKgpBJGpTw0sAMg26UHWmhNijbs';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
    storageKey: 'mopiq-supabase-auth',
  },
});
