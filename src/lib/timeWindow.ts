export type TimeWindowPreset = '7d' | '30d' | '90d' | 'custom';

export interface TimeWindow {
  preset: TimeWindowPreset;
  from: Date;
  to: Date;
}

export function presetToWindow(preset: Exclude<TimeWindowPreset, 'custom'>, now = new Date()): TimeWindow {
  const days = preset === '7d' ? 7 : preset === '30d' ? 30 : 90;
  const to = new Date(now);
  const from = new Date(now);
  from.setDate(from.getDate() - days);
  return { preset, from, to };
}

export function customWindow(from: Date, to: Date): TimeWindow {
  return { preset: 'custom', from, to };
}

export const PRESET_LABELS: Record<TimeWindowPreset, string> = {
  '7d': '7 giorni',
  '30d': '30 giorni',
  '90d': '90 giorni',
  custom: 'Personalizzato',
};
