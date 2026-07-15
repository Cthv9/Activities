import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useFamilyMembers } from '../hooks/useFamilyMembers';
import { useActivities } from '../hooks/useActivities';
import { usePushSubscription } from '../hooks/usePushSubscription';
import { setFamilyPin } from '../lib/authFlows';
import { appUrl } from '../lib/appUrl';
import { Button } from '../components/ui/Button';
import { TextField } from '../components/ui/TextField';

export default function SettingsPage() {
  const { family, member, signOut } = useAuth();
  const {
    members,
    invites,
    isOwner,
    createInvite,
    revokeInvite,
    removeMember,
    renameSelf,
  } = useFamilyMembers();
  const { activities, archiveActivity, renameActivity } = useActivities(true);

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-8 px-4 py-6 sm:px-6">
      <Link to="/" className="text-sm text-text-secondary hover:text-text-primary">
        ← Torna alla home
      </Link>
      <h1 className="font-display text-2xl">Impostazioni</h1>

      <ProfileSection displayName={member?.display_name ?? ''} onRename={renameSelf} onSignOut={signOut} />

      <MembersSection
        members={members}
        currentMemberId={member?.id}
        isOwner={isOwner}
        onRemove={removeMember}
      />

      {isOwner && <InvitesSection invites={invites} onInvite={createInvite} onRevoke={revokeInvite} />}

      {isOwner && family && <PinSection familyId={family.id} />}

      <NotificationsSection />

      <ActivitiesSection activities={activities} onArchiveToggle={archiveActivity} onRename={renameActivity} />
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-border-subtle bg-surface-1 p-4">
      <h2 className="font-display text-lg">{title}</h2>
      {children}
    </section>
  );
}

function ProfileSection({
  displayName,
  onRename,
  onSignOut,
}: {
  displayName: string;
  onRename: (name: string) => Promise<void>;
  onSignOut: () => Promise<void>;
}) {
  const [name, setName] = useState(displayName);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await onRename(name);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Salvataggio non riuscito.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Section title="Il tuo profilo">
      <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-2">
        <TextField label="Nome visualizzato" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} />
        <Button type="submit" variant="secondary" loading={saving}>
          Salva
        </Button>
      </form>
      {error && <p className="text-sm text-danger">{error}</p>}
      <Button variant="ghost" onClick={onSignOut} className="self-start">
        Esci
      </Button>
    </Section>
  );
}

function MembersSection({
  members,
  currentMemberId,
  isOwner,
  onRemove,
}: {
  members: import('../types/database').FamilyMember[];
  currentMemberId?: string;
  isOwner: boolean;
  onRemove: (id: string) => Promise<void>;
}) {
  return (
    <Section title="Membri dello spazio">
      <ul className="flex flex-col gap-2">
        {members.map((m) => (
          <li key={m.id} className="flex items-center justify-between text-sm">
            <span>
              {m.display_name}
              {m.id === currentMemberId && ' (tu)'}
              <span className="ml-2 text-xs text-text-muted">
                {m.role === 'owner' ? 'proprietario' : 'membro'} ·{' '}
                {m.auth_type === 'pin' ? 'accesso PIN' : 'account personale'}
              </span>
            </span>
            {isOwner && m.id !== currentMemberId && (
              <button
                type="button"
                onClick={() => onRemove(m.id)}
                className="text-xs text-danger hover:underline"
              >
                Rimuovi
              </button>
            )}
          </li>
        ))}
      </ul>
    </Section>
  );
}

function InvitesSection({
  invites,
  onInvite,
  onRevoke,
}: {
  invites: import('../types/database').Invite[];
  onInvite: (email: string) => Promise<void>;
  onRevoke: (id: string) => Promise<void>;
}) {
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSending(true);
    try {
      await onInvite(email);
      setEmail('');
      setSent(true);
      setTimeout(() => setSent(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invio non riuscito.');
    } finally {
      setSending(false);
    }
  }

  return (
    <Section title="Invita via email">
      <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-2">
        <TextField
          label="Email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="familiare@esempio.it"
        />
        <Button type="submit" variant="secondary" loading={sending}>
          Invita
        </Button>
      </form>
      {error && <p className="text-sm text-danger">{error}</p>}
      {sent && <p className="text-sm text-state-ok">Invito inviato.</p>}

      {invites.length > 0 && (
        <ul className="flex flex-col gap-2 border-t border-border-subtle pt-3">
          {invites.map((invite) => (
            <li key={invite.id} className="flex items-center justify-between text-sm">
              <span>{invite.email} <span className="text-xs text-text-muted">in attesa</span></span>
              <button type="button" onClick={() => onRevoke(invite.id)} className="text-xs text-danger hover:underline">
                Revoca
              </button>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

function PinSection({ familyId }: { familyId: string }) {
  const [pin, setPin] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);

  const joinUrl = appUrl(`onboarding?join=${familyId}`);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await setFamilyPin(familyId, pin);
      setPin('');
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impostazione del PIN non riuscita.');
    } finally {
      setSaving(false);
    }
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(joinUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Section title="PIN condiviso">
      <p className="text-sm text-text-secondary">
        Condividi questo link e il PIN con chi vuoi che acceda senza creare un account personale. I log fatti con
        il PIN sono attribuiti allo spazio, non a una persona.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <code className="selectable rounded-lg bg-surface-2 px-2 py-1 text-xs text-text-secondary break-all">{joinUrl}</code>
        <Button type="button" variant="ghost" onClick={handleCopy}>
          {copied ? 'Copiato ✓' : 'Copia link'}
        </Button>
      </div>
      <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-2">
        <TextField
          label="Nuovo PIN (4-8 cifre)"
          inputMode="numeric"
          pattern="[0-9]{4,8}"
          required
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          placeholder="••••"
        />
        <Button type="submit" variant="secondary" loading={saving}>
          Salva PIN
        </Button>
      </form>
      {error && <p className="text-sm text-danger">{error}</p>}
      {saved && <p className="text-sm text-state-ok">PIN aggiornato.</p>}
    </Section>
  );
}

function NotificationsSection() {
  const { supported, subscribed, loading, error, subscribe, unsubscribe, sendTestNotification } =
    usePushSubscription();
  const [testSent, setTestSent] = useState(false);

  async function handleTest() {
    await sendTestNotification();
    setTestSent(true);
    setTimeout(() => setTestSent(false), 3000);
  }

  return (
    <Section title="Notifiche push">
      {!supported ? (
        <p className="text-sm text-text-secondary">
          Le notifiche push non sono supportate su questo browser/dispositivo. Su iOS, installa l'app sulla schermata
          Home ("Aggiungi a Home") da Safari: senza installazione le notifiche push non funzionano.
        </p>
      ) : loading ? (
        <p className="text-sm text-text-secondary">Verifica dello stato…</p>
      ) : (
        <>
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={subscribed ? unsubscribe : subscribe}>
              {subscribed ? 'Disattiva su questo dispositivo' : 'Attiva su questo dispositivo'}
            </Button>
            {subscribed && (
              <Button variant="ghost" onClick={handleTest}>
                Invia notifica di prova
              </Button>
            )}
          </div>
          {testSent && <p className="text-sm text-state-ok">Notifica di prova inviata.</p>}
        </>
      )}
      {error && <p className="text-sm text-danger">{error}</p>}
    </Section>
  );
}

function ActivitiesSection({
  activities,
  onArchiveToggle,
  onRename,
}: {
  activities: import('../types/database').Activity[];
  onArchiveToggle: (id: string, status: 'active' | 'archived') => Promise<void>;
  onRename: (id: string, name: string) => Promise<void>;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState('');

  function startEdit(id: string, currentName: string) {
    setEditingId(id);
    setDraftName(currentName);
  }

  async function commitEdit() {
    if (editingId) await onRename(editingId, draftName);
    setEditingId(null);
  }

  return (
    <Section title="Attività">
      <ul className="flex flex-col gap-2">
        {activities.map((activity) => (
          <li key={activity.id} className="flex items-center justify-between gap-2 text-sm">
            {editingId === activity.id ? (
              <input
                autoFocus
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                onBlur={commitEdit}
                onKeyDown={(e) => e.key === 'Enter' && commitEdit()}
                className="rounded-lg border border-border-strong bg-surface-2 px-2 py-1 text-text-primary"
              />
            ) : (
              <button type="button" onClick={() => startEdit(activity.id, activity.name)} className="text-left hover:underline">
                {activity.name}
                {activity.status === 'archived' && <span className="ml-2 text-xs text-text-muted">archiviata</span>}
              </button>
            )}
            <button
              type="button"
              onClick={() => onArchiveToggle(activity.id, activity.status === 'active' ? 'archived' : 'active')}
              className="text-xs text-text-secondary hover:text-text-primary"
            >
              {activity.status === 'active' ? 'Archivia' : 'Riattiva'}
            </button>
          </li>
        ))}
        {activities.length === 0 && <p className="text-sm text-text-secondary">Nessuna attività ancora creata.</p>}
      </ul>
    </Section>
  );
}
