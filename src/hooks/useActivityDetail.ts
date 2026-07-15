import { useCallback, useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { Activity, ActivityLog, FamilyMember } from '../types/database';
import type { TimeWindow } from '../lib/timeWindow';

export interface DailyPoint {
  date: string;
  count: number;
  quantity: number;
}

export interface MemberBreakdownRow {
  key: string;
  label: string;
  count: number;
  quantity: number;
}

const SHARED_PIN_LABEL = 'Spazio (PIN condiviso)';

export function useActivityDetail(activityId: string, timeWindow: TimeWindow) {
  const { family } = useAuth();
  const [activity, setActivity] = useState<Activity | null>(null);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!family) return;
    setLoading(true);
    setError(null);
    const [activityRes, logsRes, membersRes] = await Promise.all([
      supabase.from('activities').select('*').eq('id', activityId).maybeSingle(),
      supabase
        .from('activity_logs')
        .select('*')
        .eq('activity_id', activityId)
        .gte('logged_at', timeWindow.from.toISOString())
        .lt('logged_at', timeWindow.to.toISOString())
        .order('logged_at', { ascending: true }),
      supabase.from('family_members').select('*').eq('family_id', family.id),
    ]);

    if (activityRes.error) setError(activityRes.error.message);
    else setActivity(activityRes.data);

    if (logsRes.error) setError(logsRes.error.message);
    else setLogs(logsRes.data ?? []);

    if (!membersRes.error) setMembers(membersRes.data ?? []);

    setLoading(false);
  }, [family, activityId, timeWindow.from, timeWindow.to]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!family) return;
    const channel = supabase
      .channel(`activity-detail-${activityId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'activity_logs', filter: `activity_id=eq.${activityId}` },
        () => load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [family, activityId, load]);

  // Aggregazione giornaliera nel fuso orario del dispositivo: semplificazione
  // ragionevole per un uso familiare, dove i membri condividono lo stesso fuso.
  const dailySeries: DailyPoint[] = useMemo(() => {
    const byDay = new Map<string, DailyPoint>();
    for (const log of logs) {
      const day = format(new Date(log.logged_at), 'yyyy-MM-dd');
      const point = byDay.get(day) ?? { date: day, count: 0, quantity: 0 };
      point.count += 1;
      point.quantity += log.value;
      byDay.set(day, point);
    }
    return Array.from(byDay.values()).sort((a, b) => a.date.localeCompare(b.date));
  }, [logs]);

  const stats = useMemo(
    () => ({
      count: logs.length,
      totalQuantity: logs.reduce((sum, l) => sum + l.value, 0),
    }),
    [logs],
  );

  const memberBreakdown: MemberBreakdownRow[] = useMemo(() => {
    const byKey = new Map<string, MemberBreakdownRow>();
    for (const log of logs) {
      const key = log.is_shared_pin ? 'shared-pin' : log.author_member_id;
      const label = log.is_shared_pin
        ? SHARED_PIN_LABEL
        : (members.find((m) => m.id === log.author_member_id)?.display_name ?? 'Membro sconosciuto');
      const row = byKey.get(key) ?? { key, label, count: 0, quantity: 0 };
      row.count += 1;
      row.quantity += log.value;
      byKey.set(key, row);
    }
    return Array.from(byKey.values()).sort((a, b) => b.count - a.count);
  }, [logs, members]);

  return { activity, dailySeries, stats, memberBreakdown, loading, error, reload: load };
}
