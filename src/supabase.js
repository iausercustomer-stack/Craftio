import { createClient } from '@supabase/supabase-js';

const url = (import.meta.env.VITE_SUPABASE_URL || '').trim();
const key = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();
const missing = !url || !key || url.includes('YOUR_PROJECT') || key.includes('YOUR_SUPABASE');
export let supabase = null;
export let setupError = '';

if (!missing) {
  try {
    const parsedUrl = new URL(url);
    if (parsedUrl.protocol !== 'https:' && parsedUrl.hostname !== 'localhost' && parsedUrl.hostname !== '127.0.0.1') {
      throw new Error('The Supabase URL must use HTTPS.');
    }
    // A browser must use an anon or publishable key, never a privileged server key.
    if (key.startsWith('sb_secret_')) throw new Error('Use a Supabase anon or publishable key, not a secret key.');
    if (key.split('.').length === 3) {
      const payload = JSON.parse(atob(key.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
      if (payload.role === 'service_role') throw new Error('Use the Supabase anon key, not a service-role key.');
    }
    supabase = createClient(url, key);
  } catch (error) {
    setupError = `Supabase configuration needs attention: ${error.message}`;
  }
}
