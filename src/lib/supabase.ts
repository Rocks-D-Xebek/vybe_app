// Supabase connection. The URL and the "anon / publishable" key are safe to ship in the app:
// the database security rules (supabase/migrations) decide what each user can see and do.
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const extra = (Constants.expoConfig?.extra ?? {}) as { supabaseUrl?: string; supabaseAnonKey?: string };
const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? extra.supabaseUrl ?? '';
const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? extra.supabaseAnonKey ?? '';

/** null until the Supabase project is configured in app.json → expo.extra */
export const supabase: SupabaseClient | null = url.startsWith('https://') && key.length > 20
  ? createClient(url, key, {
      auth: { storage: AsyncStorage, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false, flowType: 'pkce' },
    })
  : null;

export const cloudReady = supabase !== null;

/** Calls a database function and turns errors into readable messages. */
export async function rpc<T = any>(fn: string, args: Record<string, unknown> = {}): Promise<T> {
  if (!supabase) throw new Error('Accounts are not set up yet.');
  const { data, error } = await supabase.rpc(fn, args);
  if (error) throw new Error(error.message.replace(/^.*?ERROR:\s*/, ''));
  return data as T;
}

export interface CloudProfile {
  id: string; username: string | null; display_name: string; avatar: string | null; city: string | null;
  country: string; is_premium: boolean; premium_until: string | null; xp: number; open_to_match: boolean;
  login_streak: number; invite_code: string;
}

export interface Quota {
  premium: boolean; national_used: number; national_limit: number;
  international_used: number; international_limit: number; login_streak: number;
}

export const INVITE_BASE = 'https://vibenews.in/backend/vybe-invite?c=';
