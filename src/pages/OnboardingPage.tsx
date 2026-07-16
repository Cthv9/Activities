import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { sendMagicLink, createFamily, acceptInvite, joinWithPin } from '../lib/authFlows';
import { appUrl } from '../lib/appUrl';
import { Button } from '../components/ui/Button';
import { TextField } from '../components/ui/TextField';

type Mode = 'hub' | 'email-form' | 'awaiting-link' | 'create-family' | 'accept-invite' | 'join-pin';

export default function OnboardingPage() {
  const { session, member, loading, refreshMembership } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const inviteToken = searchParams.get('invite');
  const joinFamilyId = searchParams.get('join');
  const wantsCreate = searchParams.get('create') === '1';

  const [mode, setMode] = useState<Mode>('hub');
  // Intento del magic link: 'create' apre la creazione di un nuovo spazio al
  // ritorno; 'login' riporta semplicemente alla home (dove, se hai già uno
  // spazio, entri direttamente).
  const [emailIntent, setEmailIntent] = useState<'create' | 'login'>('create');
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [familyName, setFamilyName] = useState('');
  const [pinFamilyId, setPinFamilyId] = useState(joinFamilyId ?? '');
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const redirectBase = useMemo(() => appUrl('onboarding'), []);

  useEffect(() => {
    if (loading || member) return;

    if (session && inviteToken) {
      setMode('accept-invite');
    } else if (session && wantsCreate) {
      setMode('create-family');
    } else if (inviteToken) {
      setMode('email-form');
    } else if (joinFamilyId) {
      setMode('join-pin');
    } else {
      setMode('hub');
    }
  }, [loading, member, session, inviteToken, wantsCreate, joinFamilyId]);

  useEffect(() => {
    if (member) navigate('/', { replace: true });
  }, [member, navigate]);

  if (loading) {
    return <div className="p-6 text-text-secondary">Caricamento…</div>;
  }

  async function handleSendMagicLink(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const redirectTo = inviteToken
        ? `${redirectBase}?invite=${encodeURIComponent(inviteToken)}`
        : emailIntent === 'login'
          ? appUrl('') // torna alla home: se hai già uno spazio, entri diretto
          : `${redirectBase}?create=1`;
      await sendMagicLink(email, redirectTo);
      setMode('awaiting-link');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invio del link non riuscito.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCreateFamily(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await createFamily(familyName.trim(), displayName.trim());
      await refreshMembership();
      navigate('/', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Creazione dello spazio non riuscita.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAcceptInvite(e: FormEvent) {
    e.preventDefault();
    if (!inviteToken) return;
    setError(null);
    setSubmitting(true);
    try {
      await acceptInvite(inviteToken, displayName.trim());
      await refreshMembership();
      navigate('/', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invito non valido o scaduto.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleJoinWithPin(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await joinWithPin(pinFamilyId.trim(), pin.trim(), displayName.trim());
      await refreshMembership();
      navigate('/', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'PIN non valido.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-svh max-w-md flex-col justify-center gap-8 px-6 py-12">
      <header className="text-center">
        <h1 className="font-display text-4xl">Equilibrio</h1>
        <p className="mt-2 text-text-secondary">La dashboard familiare delle vostre attività.</p>
      </header>

      {error && (
        <p role="alert" className="rounded-lg border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
          {error}
        </p>
      )}

      {mode === 'hub' && (
        <section className="flex flex-col gap-4">
          <button
            type="button"
            onClick={() => {
              setEmailIntent('login');
              setMode('email-form');
            }}
            className="glass rounded-xl p-5 text-left transition-colors hover:bg-surface-2"
          >
            <h2 className="font-display text-xl">Accedi</h2>
            <p className="mt-1 text-sm text-text-secondary">
              Hai già un account? Entra con un link via email.
            </p>
          </button>

          <button
            type="button"
            onClick={() => {
              setEmailIntent('create');
              setMode('email-form');
            }}
            className="glass rounded-xl p-5 text-left transition-colors hover:bg-surface-2"
          >
            <h2 className="font-display text-xl">Crea un nuovo spazio</h2>
            <p className="mt-1 text-sm text-text-secondary">
              Nuovo qui? Ricevi un link via email e inizia da zero.
            </p>
          </button>

          <button
            type="button"
            onClick={() => setMode('join-pin')}
            className="glass rounded-xl p-5 text-left transition-colors hover:bg-surface-2"
          >
            <h2 className="font-display text-xl">Ho un PIN condiviso</h2>
            <p className="mt-1 text-sm text-text-secondary">
              Qualcuno ti ha dato un codice spazio e un PIN.
            </p>
          </button>

          <p className="text-center text-sm text-text-muted">
            Hai ricevuto un invito via email? Apri il link ricevuto nella mail.
          </p>
        </section>
      )}

      {mode === 'email-form' && (
        <form onSubmit={handleSendMagicLink} className="flex flex-col gap-4">
          <h2 className="font-display text-xl">{emailIntent === 'login' ? 'Accedi' : 'Crea un nuovo spazio'}</h2>
          <p className="-mt-2 text-sm text-text-secondary">
            {emailIntent === 'login'
              ? 'Inserisci l’email del tuo account: ti mandiamo un link per rientrare.'
              : 'Ti mandiamo un link via email per iniziare.'}
          </p>
          <TextField
            label="Indirizzo email"
            type="email"
            required
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tuo@esempio.it"
          />
          <Button type="submit" loading={submitting}>
            Invia il link di accesso
          </Button>
          <Button type="button" variant="ghost" onClick={() => setMode('hub')}>
            Indietro
          </Button>
        </form>
      )}

      {mode === 'awaiting-link' && (
        <p className="text-center text-text-secondary">
          Ti abbiamo inviato un link a <strong className="text-text-primary">{email}</strong>. Aprilo su questo
          dispositivo per continuare.
        </p>
      )}

      {mode === 'create-family' && (
        <form onSubmit={handleCreateFamily} className="flex flex-col gap-4">
          <h2 className="font-display text-xl">Crea il tuo spazio</h2>
          <TextField
            label="Nome dello spazio"
            required
            autoFocus
            maxLength={60}
            value={familyName}
            onChange={(e) => setFamilyName(e.target.value)}
            placeholder="Es. Casa"
          />
          <TextField
            label="Il tuo nome"
            required
            maxLength={40}
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Come vuoi essere chiamato/a"
          />
          <Button type="submit" loading={submitting}>
            Crea spazio
          </Button>
        </form>
      )}

      {mode === 'accept-invite' && (
        <form onSubmit={handleAcceptInvite} className="flex flex-col gap-4">
          <h2 className="font-display text-xl">Unisciti allo spazio</h2>
          <TextField
            label="Il tuo nome"
            required
            autoFocus
            maxLength={40}
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Come vuoi essere chiamato/a"
          />
          <Button type="submit" loading={submitting}>
            Accetta invito
          </Button>
        </form>
      )}

      {mode === 'join-pin' && (
        <form onSubmit={handleJoinWithPin} className="flex flex-col gap-4">
          <h2 className="font-display text-xl">Accedi con PIN condiviso</h2>
          {!joinFamilyId && (
            <TextField
              label="Codice spazio"
              required
              autoFocus
              value={pinFamilyId}
              onChange={(e) => setPinFamilyId(e.target.value)}
              placeholder="Incolla qui il codice ricevuto"
            />
          )}
          <TextField
            label="PIN"
            required
            inputMode="numeric"
            pattern="[0-9]{4,8}"
            maxLength={8}
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="••••"
          />
          <TextField
            label="Il tuo nome"
            required
            maxLength={40}
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            hint="I log fatti con il PIN condiviso sono attribuiti allo spazio, non a una persona."
          />
          <Button type="submit" loading={submitting}>
            Entra
          </Button>
          <Button type="button" variant="ghost" onClick={() => setMode('hub')}>
            Indietro
          </Button>
        </form>
      )}
    </main>
  );
}
