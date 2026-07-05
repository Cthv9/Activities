export type MemberRole = 'owner' | 'member';
export type MemberAuthType = 'personal' | 'pin';
export type ActivityType = 'checkin' | 'quantity';
export type ActivityStatus = 'active' | 'archived';
export type InviteStatus = 'pending' | 'accepted' | 'expired' | 'revoked';
export type BalanceStatus = 'ok' | 'neglected' | 'excess';

export interface Family {
  id: string;
  name: string;
  timezone: string;
  pin_hash: string | null;
  pin_updated_at: string | null;
  neglected_ratio: number;
  excess_ratio: number;
  created_at: string;
}

export interface FamilyMember {
  id: string;
  family_id: string;
  user_id: string;
  display_name: string;
  role: MemberRole;
  auth_type: MemberAuthType;
  created_at: string;
}

export interface Activity {
  id: string;
  family_id: string;
  name: string;
  type: ActivityType;
  unit: string | null;
  color: string;
  icon: string | null;
  status: ActivityStatus;
  created_by: string;
  sort_order: number;
  created_at: string;
}

export interface ActivityLog {
  id: string;
  activity_id: string;
  family_id: string;
  author_member_id: string;
  is_shared_pin: boolean;
  value: number;
  logged_at: string;
  created_at: string;
}

export interface Invite {
  id: string;
  family_id: string;
  email: string;
  token: string;
  status: InviteStatus;
  invited_by: string;
  expires_at: string;
  created_at: string;
}

export interface PushSubscriptionRow {
  id: string;
  family_id: string;
  family_member_id: string;
  endpoint: string;
  p256dh: string;
  auth_key: string;
  enabled: boolean;
  created_at: string;
}

export interface FamilyBalanceRow {
  activity_id: string;
  activity_name: string;
  log_count: number;
  share_pct: number;
  ideal_pct: number;
  status: BalanceStatus;
}

// Palette semantica: nomi di token, non valori hex, cosi il tema resta
// centralizzato in index.css (vedi variabili --color-*).
export type ActivityColorToken =
  | 'sage'
  | 'apricot'
  | 'rust'
  | 'moss'
  | 'clay'
  | 'sky'
  | 'gold'
  | 'plum';

export const ACTIVITY_COLOR_TOKENS: ActivityColorToken[] = [
  'sage',
  'apricot',
  'rust',
  'moss',
  'clay',
  'sky',
  'gold',
  'plum',
];
