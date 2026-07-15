import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { NewSpaceDialog } from './NewSpaceDialog';

/** Selettore dello spazio attivo: mostra il nome dello spazio corrente e, al
 * tap, un menu per cambiare spazio o crearne uno nuovo. */
export function SpaceSwitcher() {
  const { memberships, activeFamily, activeMember, setActiveSpace } = useAuth();
  const [open, setOpen] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const hasMultiple = memberships.length > 1;

  return (
    <div className="relative min-w-0" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex min-w-0 items-center gap-1.5 text-left"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className="min-w-0">
          <span className="flex items-center gap-1.5">
            <span className="truncate font-display text-2xl text-text-primary">{activeFamily?.name}</span>
            <span aria-hidden className="text-text-muted">▾</span>
          </span>
          <span className="block truncate text-sm text-text-secondary">
            {activeMember?.display_name} · {activeMember?.auth_type === 'pin' ? 'accesso condiviso' : 'account personale'}
          </span>
        </span>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute left-0 z-40 mt-2 w-64 overflow-hidden rounded-xl border border-border-strong bg-surface-2 shadow-xl"
        >
          {hasMultiple && (
            <ul className="max-h-64 overflow-y-auto py-1">
              {memberships.map(({ family }) => (
                <li key={family.id}>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setActiveSpace(family.id);
                      setOpen(false);
                    }}
                    className={`flex w-full items-center justify-between px-4 py-2.5 text-left text-sm hover:bg-surface-3 ${
                      family.id === activeFamily?.id ? 'text-text-primary' : 'text-text-secondary'
                    }`}
                  >
                    <span className="truncate">{family.name}</span>
                    {family.id === activeFamily?.id && <span aria-hidden className="text-brand">✓</span>}
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className={hasMultiple ? 'border-t border-border-subtle' : ''}>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setShowNew(true);
                setOpen(false);
              }}
              className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-text-primary hover:bg-surface-3"
            >
              <span aria-hidden>＋</span> Nuovo spazio
            </button>
          </div>
        </div>
      )}

      {showNew && <NewSpaceDialog onClose={() => setShowNew(false)} />}
    </div>
  );
}
