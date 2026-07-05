import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { FamilyBalanceRow } from '../types/database';
import type { TimeWindow } from '../lib/timeWindow';

export function useBalance(timeWindow: TimeWindow) {
  const { family } = useAuth();
  const [rows, setRows] = useState<FamilyBalanceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!family) return;
    setLoading(true);
    const { data, error: rpcError } = await supabase.rpc('get_family_balance', {
      fam_id: family.id,
      from_ts: timeWindow.from.toISOString(),
      to_ts: timeWindow.to.toISOString(),
    });
    if (rpcError) setError(rpcError.message);
    else {
      setError(null);
      setRows((data ?? []) as FamilyBalanceRow[]);
    }
    setLoading(false);
  }, [family, timeWindow.from, timeWindow.to]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!family) return;
    const channel = supabase
      .channel(`activity-logs-${family.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'activity_logs', filter: `family_id=eq.${family.id}` },
        () => load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [family, load]);

  const mostNeglected = rows
    .filter((r) => r.status === 'neglected')
    .sort((a, b) => a.share_pct - b.share_pct)[0];

  return { rows, loading, error, mostNeglected, reload: load };
}
