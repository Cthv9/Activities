-- Fix: "column reference status is ambiguous" in get_family_balance.
-- Le colonne di OUTPUT della funzione (activity_id, status, ...) hanno lo
-- stesso nome di colonne delle tabelle referenziate nel corpo (activities.status,
-- activity_logs.activity_id). La direttiva #variable_conflict use_column dice a
-- plpgsql di risolvere sempre a favore della colonna della tabella in caso di
-- ambiguità, eliminando l'errore. Le referenze ambigue sono state comunque
-- qualificate esplicitamente per chiarezza.
create or replace function get_family_balance(fam_id uuid, from_ts timestamptz, to_ts timestamptz)
  returns table (
    activity_id   uuid,
    activity_name text,
    log_count     bigint,
    share_pct     numeric,
    ideal_pct     numeric,
    status        text
  )
  language plpgsql stable security invoker set search_path = public as $$
#variable_conflict use_column
declare
  n_activities int;
  total_logs   bigint;
begin
  select count(*) into n_activities from activities
    where activities.family_id = fam_id and activities.status = 'active';

  select count(*) into total_logs from activity_logs l
    join activities a on a.id = l.activity_id
    where l.family_id = fam_id and a.status = 'active'
      and l.logged_at >= from_ts and l.logged_at < to_ts;

  return query
  select
    a.id,
    a.name,
    coalesce(c.cnt, 0) as log_count,
    case when total_logs > 0 then round(100.0 * coalesce(c.cnt, 0) / total_logs, 2) else 0 end as share_pct,
    case when n_activities > 0 then round(100.0 / n_activities, 2) else 0 end as ideal_pct,
    case
      when total_logs = 0 or n_activities = 0 then 'ok'
      when (100.0 * coalesce(c.cnt, 0) / total_logs) < (100.0 / n_activities) * (select neglected_ratio from families where id = fam_id) then 'neglected'
      when (100.0 * coalesce(c.cnt, 0) / total_logs) > (100.0 / n_activities) * (select excess_ratio from families where id = fam_id) then 'excess'
      else 'ok'
    end as status
  from activities a
  left join (
    select l.activity_id as act_id, count(*) as cnt
    from activity_logs l
    where l.family_id = fam_id and l.logged_at >= from_ts and l.logged_at < to_ts
    group by l.activity_id
  ) c on c.act_id = a.id
  where a.family_id = fam_id and a.status = 'active';
end;
$$;
