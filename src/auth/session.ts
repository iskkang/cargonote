import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

export interface AuthDeps {
  getSession(): Promise<Session | null>;
  signIn(email: string, password: string): Promise<void>;
  signOut(): Promise<void>;
  onAuthChange(cb: (signedIn: boolean) => void): () => void;
}

export const defaultAuthDeps: AuthDeps = {
  async getSession() {
    const { data } = await supabase.auth.getSession();
    return data.session;
  },
  async signIn(email, password) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
  },
  async signOut() {
    await supabase.auth.signOut();
  },
  onAuthChange(cb) {
    const { data } = supabase.auth.onAuthStateChange((_e, session) => cb(!!session));
    return () => data.subscription.unsubscribe();
  },
};
