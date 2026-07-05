import type { ActivityColorToken, BalanceStatus } from '../types/database';
import { ACTIVITY_COLOR_TOKENS } from '../types/database';

/** Assegna un token colore alla prossima attività, ruotando sulla palette
 * disponibile in base a quanti ne sono già usati nella famiglia. */
export function nextColorToken(usedCount: number): ActivityColorToken {
  return ACTIVITY_COLOR_TOKENS[usedCount % ACTIVITY_COLOR_TOKENS.length];
}

export function tokenToVar(token: string): string {
  return `var(--color-token-${token})`;
}

export const STATUS_LABEL: Record<BalanceStatus, string> = {
  ok: 'In equilibrio',
  neglected: 'Trascurata',
  excess: 'Eccessiva',
};

export function statusColorVar(status: BalanceStatus): string {
  switch (status) {
    case 'neglected':
      return 'var(--color-state-neglected)';
    case 'excess':
      return 'var(--color-state-excess)';
    default:
      return 'var(--color-state-ok)';
  }
}
