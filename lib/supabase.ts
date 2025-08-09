import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/database';

console.log('🔍 DEBUG: Supabase configuration check:');
console.log('🔍 DEBUG: SUPABASE_URL:', process.env.EXPO_PUBLIC_SUPABASE_URL);
console.log('🔍 DEBUG: SUPABASE_ANON_KEY:', process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'placeholder_anon_key';

export const isSupabaseConfigured = supabaseUrl !== 'https://placeholder.supabase.co' && supabaseAnonKey !== 'placeholder_anon_key';

console.log('🔍 DEBUG: isSupabaseConfigured:', isSupabaseConfigured);
console.log('🔍 DEBUG: supabaseUrl:', supabaseUrl);
console.log('🔍 DEBUG: supabaseAnonKey length:', supabaseAnonKey.length);

if (!isSupabaseConfigured) {
  console.warn('⚠️ DEBUG: Supabase environment variables not configured. Please set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in your .env file.');
  console.warn('⚠️ DEBUG: Will use LOCAL SAVE mode for game records');
} else {
  console.log('✅ DEBUG: Supabase is properly configured');
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);