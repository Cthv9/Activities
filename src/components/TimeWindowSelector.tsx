import type { TimeWindowPreset } from '../lib/timeWindow';
import { PRESET_LABELS } from '../lib/timeWindow';

interface TimeWindowSelectorProps {
  preset: TimeWindowPreset;
  onChangePreset: (preset: '7d' | '30d' | '90d') => void;
  onOpenCustom: () => void;
}

const PRESETS: Array<'7d' | '30d' | '90d'> = ['7d', '30d', '90d'];

export function TimeWindowSelector({ preset, onChangePreset, onOpenCustom }: TimeWindowSelectorProps) {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Finestra temporale">
      {PRESETS.map((p) => (
        <button
          key={p}
          type="button"
          aria-pressed={preset === p}
          onClick={() => onChangePreset(p)}
          className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
            preset === p
              ? 'bg-brand text-surface-0'
              : 'bg-surface-2 text-text-secondary hover:bg-surface-3 hover:text-text-primary'
          }`}
        >
          {PRESET_LABELS[p]}
        </button>
      ))}
      <button
        type="button"
        aria-pressed={preset === 'custom'}
        onClick={onOpenCustom}
        className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
          preset === 'custom'
            ? 'bg-brand text-surface-0'
            : 'bg-surface-2 text-text-secondary hover:bg-surface-3 hover:text-text-primary'
        }`}
      >
        Personalizzato
      </button>
    </div>
  );
}
