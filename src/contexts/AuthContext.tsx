import { createContext, useContext, useEffect, useState, useCallback, useMemo, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { Family, FamilyMember } from '../types/database';

/** Una membership dell'utente: la coppia (riga membro, spazio). Un utente può
 * appartenere a più spazi contemporaneamente (Casa, Lavoro, …). */
export interface Membership {
  member: FamilyMember;
  family: Family;
}

interface AuthContextValue {
  session: Session | null;
  memberships: Membership[];
  /** Spazio attivo (quello mostrato dalla dashboard). */
  activeFamily: Family | null;
  activeMember: FamilyMember | null;
  loading: boolean;
  setActiveSpace: (familyId: string) => void;
  refreshMemberships: () => Promise<void>;
  signOut: () => Promise<void>;

  // Alias di comodo verso lo spazio attivo, usati in tutta l'app.
  family: Family | null;
  member: FamilyMember | null;
  refreshMembership: () => Promise<void>;
}

const ACTIVE_SPACE_KEY = 'equilibrio-active-space';

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [activeFamilyId, setActiveFamilyId] = useState<string | null>(
    () => localStorage.getItem(ACTIVE_SPACE_KEY),
  );
  const [loading, setLoading] = useState(true);

  const loadMemberships = useCallback(async (userId: string | undefined) => {
    if (!userId) {
      setMemberships([]);
      return;
    }
    // Un solo round-trip: la famiglia viene incorporata nella riga membro
    // tramite il resource embedding di PostgREST (FK family_members.family_id).
    // Prima erano due query sequenziali (membri, poi famiglie) e questo pesava
    // sulla fase di avvio bloccante.
    const { data: memberRows } = await supabase
      .from('family_members')
      .select('*, families(*)')
      .eq('user_id', userId);

    if (!memberRows || memberRows.length === 0) {
      setMemberships([]);
      return;
    }

    const list: Membership[] = memberRows
      .map((row) => {
        const { families, ...member } = row as FamilyMember & { families: Family | null };
        return families ? { member: member as FamilyMember, family: families } : null;
      })
      .filter((x): x is Membership => x !== null)
      .sort((a, b) => a.family.created_at.localeCompare(b.family.created_at));

    setMemberships(list);
  }, []);

  const refreshMemberships = useCallback(async () => {
    await loadMemberships(session?.user.id);
  }, [loadMemberships, session]);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      await loadMemberships(data.session?.user.id);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession);
      setLoading(true);
      await loadMemberships(newSession?.user.id);
      setLoading(false);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [loadMemberships]);

  // Determina lo spazio attivo: quello salvato se ancora valido, altrimenti il
  // primo disponibile. Persiste la scelta per i reload successivi.
  const active = useMemo<Membership | null>(() => {
    if (memberships.length === 0) return null;
    return memberships.find((m) => m.family.id === activeFamilyId) ?? memberships[0];
  }, [memberships, activeFamilyId]);

  useEffect(() => {
    if (active && active.family.id !== activeFamilyId) {
      setActiveFamilyId(active.family.id);
      localStorage.setItem(ACTIVE_SPACE_KEY, active.family.id);
    }
  }, [active, activeFamilyId]);

  const setActiveSpace = useCallback((familyId: string) => {
    setActiveFamilyId(familyId);
    localStorage.setItem(ACTIVE_SPACE_KEY, familyId);
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setMemberships([]);
    setActiveFamilyId(null);
    localStorage.removeItem(ACTIVE_SPACE_KEY);
  }, []);

  const value: AuthContextValue = {
    session,
    memberships,
    activeFamily: active?.family ?? null,
    activeMember: active?.member ?? null,
    loading,
    setActiveSpace,
    refreshMemberships,
    signOut,
    // alias
    family: active?.family ?? null,
    member: active?.member ?? null,
    refreshMembership: refreshMemberships,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve essere usato dentro <AuthProvider>');
  return ctx;
}
