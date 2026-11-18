// Accounts: Google, email code and WhatsApp code sign-in, profile, quota and cloud backup.
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import type { Session } from '@supabase/supabase-js';
import { supabase, rpc, CloudProfile, Quota } from '../lib/supabase';
import { useApp } from './AppStore';
import { dayKey } from '../lib/dates';
import { setupPurchases, logOutPurchases } from '../lib/purchases';

WebBrowser.maybeCompleteAuthSession();

interface AuthState {
  ready: boolean; session: Session | null; profile: CloudProfile | null; quota: Quota | null;
  isPremium: boolean;                     // server Premium OR the local testing switch
  signInGoogle: () => Promise<void>;
  sendEmailCode: (email: string) => Promise<void>;
  verifyEmailCode: (email: string, code: string) => Promise<void>;
  sendWhatsAppCode: (phone: string) => Promise<void>;
  verifyWhatsAppCode: (phone: string, code: string) => Promise<void>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
  saveProfile: (p: Partial<Pick<CloudProfile, 'username' | 'display_name' | 'avatar' | 'city' | 'country' | 'open_to_match'>>) => Promise<void>;
  syncNow: () => Promise<void>;
  lastSync: number | null;
}

const Ctx = createContext<AuthState>(null as any);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const app = useApp();
  const [ready, setReady] = useState(!supabase);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<CloudProfile | null>(null);
  const [quota, setQuota] = useState<Quota | null>(null);
  const [lastSync, setLastSync] = useState<number | null>(null);
  const syncing = useRef(false);
  const restored = useRef<string | null>(null);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setReady(true); });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  const refresh = useCallback(async () => {
    if (!supabase || !session) { setProfile(null); setQuota(null); return; }
    const { data } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
    setProfile(data as CloudProfile);
    try { setQuota(await rpc<Quota>('my_challenge_quota')); } catch {}
  }, [session]);

  /** Merge phone data with the cloud copy (nothing is lost), then upload. */
  const syncNow = useCallback(async () => {
    if (!supabase || !session || syncing.current || !app.ready) return;
    syncing.current = true;
    try {
      if (restored.current !== session.user.id) {
        const { data } = await supabase.from('user_backups').select('data').eq('user_id', session.user.id).maybeSingle();
        if (data?.data) app.mergeFromCloud(data.data);
        restored.current = session.user.id;
      }
      await supabase.from('user_backups').upsert({ user_id: session.user.id, data: app.exportData(), updated_at: new Date().toISOString() });
      await rpc('sync_xp', { p_xp: app.xp() }).catch(() => {});
      setLastSync(Date.now());
    } catch {}
    syncing.current = false;
  }, [session, app]);

  // On sign-in: streak, close finished challenges, profile, restore + back up
  useEffect(() => {
    setupPurchases(session?.user.id);
    if (!session) { setProfile(null); setQuota(null); return; }
    (async () => {
      try { setQuota(await rpc<Quota>('touch_login', { p_today: dayKey() })); } catch {}
      await rpc('finish_due_challenges').catch(() => {});
      await refresh();
    })();
  }, [session?.user.id]);

  useEffect(() => { if (session && app.ready) syncNow(); }, [session?.user.id, app.ready]);

  // Back up 20 s after the last change
  useEffect(() => {
    if (!session || restored.current !== session.user.id) return;
    const t = setTimeout(syncNow, 20000);
    return () => clearTimeout(t);
  }, [app.meals, app.workouts, app.waterByDay, app.weights, app.dayLogs, app.profile, app.plan, app.challenges, app.favourites]);

  const value: AuthState = {
    ready, session, profile, quota, lastSync,
    isPremium: Boolean(profile?.is_premium && (!profile.premium_until || new Date(profile.premium_until) > new Date())) || app.premium,
    refresh, syncNow,
    signInGoogle: async () => {
      if (!supabase) throw new Error('Accounts are not set up yet.');
      const redirectTo = Linking.createURL('auth-callback');
      const { data, error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo, skipBrowserRedirect: true } });
      if (error || !data.url) throw new Error(error?.message ?? 'Google sign-in failed');
      const res = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
      if (res.type !== 'success') return;
      const code = new URL(res.url).searchParams.get('code');
      if (!code) throw new Error('Google sign-in was cancelled');
      const { error: e2 } = await supabase.auth.exchangeCodeForSession(code);
      if (e2) throw new Error(e2.message);
    },
    sendEmailCode: async email => {
      if (!supabase) throw new Error('Accounts are not set up yet.');
      // The email contains a sign-in link (and a 6-digit code once custom SMTP templates are set up)
      const { error } = await supabase.auth.signInWithOtp({ email: email.trim().toLowerCase(),
        options: { shouldCreateUser: true, emailRedirectTo: Linking.createURL('auth-callback') } });
      if (error) throw new Error(error.message);
    },
    verifyEmailCode: async (email, code) => {
      const { error } = await supabase!.auth.verifyOtp({ email: email.trim().toLowerCase(), token: code.trim(), type: 'email' });
      if (error) throw new Error(error.message);
    },
    sendWhatsAppCode: async phone => {
      if (!supabase) throw new Error('Accounts are not set up yet.');
      const { error } = await supabase.auth.signInWithOtp({ phone, options: { channel: 'whatsapp' } });
      if (error) throw new Error(error.message.includes('provider') ? 'WhatsApp login is not switched on yet. Use Google or email for now.' : error.message);
    },
    verifyWhatsAppCode: async (phone, code) => {
      const { error } = await supabase!.auth.verifyOtp({ phone, token: code.trim(), type: 'sms' });
      if (error) throw new Error(error.message);
    },
    signOut: async () => {
      await syncNow();
      await logOutPurchases();
      await supabase?.auth.signOut();
      restored.current = null;
    },
    saveProfile: async p => {
      if (!supabase || !session) return;
      const { error } = await supabase.from('profiles').update(p).eq('id', session.user.id);
      if (error) throw new Error(error.code === '23505' ? 'That username is taken. Try another one.' : error.message);
      await refresh();
    },
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
