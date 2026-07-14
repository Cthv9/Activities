import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { appUrl } from '../lib/appUrl';
import type { FamilyMember, Invite } from '../types/database';

export function useFamilyMembers() {
  const { family, member } = useAuth();
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!family) return;
    setLoading(true);
    const [membersRes, invitesRes] = await Promise.all([
      supabase.from('family_members').select('*').eq('family_id', family.id).order('created_at'),
      supabase
        .from('invites')
        .select('*')
        .eq('family_id', family.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false }),
    ]);
    if (membersRes.error) setError(membersRes.error.message);
    else setMembers(membersRes.data ?? []);
    if (!invitesRes.error) setInvites(invitesRes.data ?? []);
    setLoading(false);
  }, [family]);

  useEffect(() => {
    load();
  }, [load]);

  const isOwner = member?.role === 'owner';

  const createInvite = useCallback(
    async (email: string) => {
      if (!family || !member) throw new Error('Nessuna famiglia attiva');
      const { data, error: insertError } = await supabase
        .from('invites')
        .insert({ family_id: family.id, email: email.trim(), invited_by: member.id })
        .select()
        .single();
      if (insertError) throw insertError;

      const redirectTo = appUrl(`onboarding?invite=${encodeURIComponent(data.token)}`);
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { emailRedirectTo: redirectTo, shouldCreateUser: true },
      });
      if (otpError) throw otpError;

      await load();
    },
    [family, member, load],
  );

  const revokeInvite = useCallback(
    async (inviteId: string) => {
      const { error: deleteError } = await supabase.from('invites').delete().eq('id', inviteId);
      if (deleteError) throw deleteError;
      await load();
    },
    [load],
  );

  const removeMember = useCallback(
    async (memberId: string) => {
      const { error: deleteError } = await supabase.from('family_members').delete().eq('id', memberId);
      if (deleteError) throw deleteError;
      await load();
    },
    [load],
  );

  const renameSelf = useCallback(
    async (displayName: string) => {
      if (!member) return;
      const { error: updateError } = await supabase
        .from('family_members')
        .update({ display_name: displayName.trim() })
        .eq('id', member.id);
      if (updateError) throw updateError;
      await load();
    },
    [member, load],
  );

  return { members, invites, loading, error, isOwner, createInvite, revokeInvite, removeMember, renameSelf, reload: load };
}
