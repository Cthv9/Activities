-- ============================================================
-- Hardening: impedisce l'escalation di privilegi via UPDATE su family_members.
--
-- La policy RLS di UPDATE consente a un membro di modificare la PROPRIA riga
-- (user_id = auth.uid()). Senza vincoli sui valori, però, un membro potrebbe
-- impostarsi role='owner' o cambiare family_id per infilarsi in un'altra
-- famiglia. Le policy RLS (WITH CHECK) non possono confrontare OLD/NEW, quindi
-- l'enforcement corretto è un trigger BEFORE UPDATE che confronta i valori.
-- ============================================================
create or replace function guard_family_member_update() returns trigger
  language plpgsql security definer set search_path = public as $$
begin
  -- Un owner della famiglia può modificare i membri (es. cambiare ruolo), ma
  -- non spostare un membro in un'altra famiglia.
  if is_family_owner(old.family_id) then
    if new.family_id <> old.family_id then
      raise exception 'non si può spostare un membro in un''altra famiglia';
    end if;
    return new;
  end if;

  -- Un non-owner può toccare solo la propria riga e solo il display_name:
  -- ruolo, famiglia, utente e tipo di auth restano immutati.
  if old.user_id <> auth.uid() then
    raise exception 'permesso negato';
  end if;
  if new.role <> old.role
     or new.family_id <> old.family_id
     or new.user_id <> old.user_id
     or new.auth_type <> old.auth_type then
    raise exception 'puoi modificare solo il tuo nome visualizzato';
  end if;
  return new;
end;
$$;

create trigger trg_guard_family_member_update
  before update on family_members
  for each row execute function guard_family_member_update();

-- Uniformità: WITH CHECK esplicito sulle UPDATE di activities e activity_logs
-- (finora si affidavano al comportamento di default USING-come-CHECK).
alter policy activities_update on activities
  using (is_family_member(family_id))
  with check (is_family_member(family_id));

alter policy activity_logs_update on activity_logs
  using (author_member_id = my_member_id(family_id))
  with check (author_member_id = my_member_id(family_id));
