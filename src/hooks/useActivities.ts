import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { nextColorToken } from '../lib/colors';
import type { Activity, ActivityType } from '../types/database';

export function useActivities(includeArchived = false) {
  const { family, member } = useAuth();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!family) return;
    setLoading(true);
    let query = supabase
      .from('activities')
      .select('*')
      .eq('family_id', family.id)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });
    if (!includeArchived) query = query.eq('status', 'active');

    const { data, error: fetchError } = await query;
    if (fetchError) setError(fetchError.message);
    else setActivities(data ?? []);
    setLoading(false);
  }, [family, includeArchived]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!family) return;
    const channel = supabase
      .channel(`activities-${family.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'activities', filter: `family_id=eq.${family.id}` },
        () => load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [family, load]);

  const createActivity = useCallback(
    async (input: { name: string; type: ActivityType; unit?: string | null; icon?: string | null }) => {
      if (!family || !member) throw new Error('Nessuna famiglia attiva');

      const { error: insertError } = await supabase.from('activities').insert({
        family_id: family.id,
        name: input.name.trim(),
        type: input.type,
        unit: input.type === 'quantity' ? (input.unit?.trim() || null) : null,
        icon: input.icon ?? null,
        color: nextColorToken(activities.length),
        created_by: member.id,
        sort_order: activities.length,
      });
      if (insertError) throw insertError;
      await load();
    },
    [family, member, activities.length, load],
  );

  const archiveActivity = useCallback(
    async (activityId: string, status: 'active' | 'archived') => {
      const { error: updateError } = await supabase.from('activities').update({ status }).eq('id', activityId);
      if (updateError) throw updateError;
      await load();
    },
    [load],
  );

  const renameActivity = useCallback(
    async (activityId: string, name: string) => {
      const { error: updateError } = await supabase
        .from('activities')
        .update({ name: name.trim() })
        .eq('id', activityId);
      if (updateError) throw updateError;
      await load();
    },
    [load],
  );

  return { activities, loading, error, createActivity, archiveActivity, renameActivity, reload: load };
}
