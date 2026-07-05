const ITEMS: Array<{ label: string; colorVar: string; description: string }> = [
  { label: 'In equilibrio', colorVar: 'var(--color-state-ok)', description: 'vicino alla quota ideale' },
  { label: 'Trascurata', colorVar: 'var(--color-state-neglected)', description: 'sotto il 60% dell\'ideale' },
  { label: 'Eccessiva', colorVar: 'var(--color-state-excess)', description: 'oltre il 160% dell\'ideale' },
];

export function StatusLegend() {
  return (
    <ul className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-text-secondary">
      {ITEMS.map((item) => (
        <li key={item.label} className="flex items-center gap-2">
          <span aria-hidden className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: item.colorVar }} />
          <span>
            <strong className="text-text-primary">{item.label}</strong> · {item.description}
          </span>
        </li>
      ))}
    </ul>
  );
}
