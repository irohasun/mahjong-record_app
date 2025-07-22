import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/database';

console.log('SUPABASE_URL:', process.env.EXPO_PUBLIC_SUPABASE_URL);
console.log('SUPABASE_ANON_KEY:', process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'placeholder_anon_key';

export const isSupabaseConfigured = supabaseUrl !== 'https://placeholder.supabase.co' && supabaseAnonKey !== 'placeholder_anon_key';

if (!isSupabaseConfigured) {
  console.warn('Supabase environment variables not configured. Please set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in your .env file.');
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);