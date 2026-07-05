import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { Family, FamilyMember } from '../types/database';

interface AuthContextValue {
  session: Session | null;
  member: FamilyMember | null;
  family: Family | null;
  loading: boolean;
  refreshMembership: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [member, setMember] = useState<FamilyMember | null>(null);
  const [family, setFamily] = useState<Family | null>(null);
  const [loading, setLoading] = useState(true);

  const loadMembership = useCallback(async (userId: string | undefined) => {
    if (!userId) {
      setMember(null);
      setFamily(null);
      return;
    }
    const { data: memberRow } = await supabase
      .from('family_members')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (!memberRow) {
      setMember(null);
      setFamily(null);
      return;
    }
    setMember(memberRow);

    const { data: familyRow } = await supabase
      .from('families')
      .select('*')
      .eq('id', memberRow.family_id)
      .maybeSingle();
    setFamily(familyRow ?? null);
  }, []);

  const refreshMembership = useCallback(async () => {
    await loadMembership(session?.user.id);
  }, [loadMembership, session]);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      await loadMembership(data.session?.user.id);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession);
      setLoading(true);
      await loadMembership(newSession?.user.id);
      setLoading(false);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [loadMembership]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setMember(null);
    setFamily(null);
  }, []);

  return (
    <AuthContext.Provider value={{ session, member, family, loading, refreshMembership, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve essere usato dentro <AuthProvider>');
  return ctx;
}
