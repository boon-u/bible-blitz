import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(url && key);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url!, key!)
  : null;

export interface Profile {
  id: string;
  username: string;
  avatar: string | null;
  color: string | null;
  created_at: string;
}

export interface TrainerSession {
  id: string;
  profile_id: string;
  mode: 'all' | 'ot' | 'nt';
  total_score: number;
  rounds_played: number;
  created_at: string;
  updated_at: string;
}

export interface TrainerRound {
  id: string;
  profile_id: string;
  session_id: string | null;
  mode: 'all' | 'ot' | 'nt';
  start_book: string;
  target_book: string;
  score: number;
  moves: number;
  correct_moves: number;
  wrong_moves: number;
  elapsed_ms: number;
  failed: boolean;
  created_at: string;
}

export interface LeaderboardEntry {
  id: string;
  total_score: number;
  rounds_played: number;
  mode: 'all' | 'ot' | 'nt';
  created_at: string;
  profile: Pick<Profile, 'username' | 'avatar' | 'color'>;
}

export interface PersonalRound extends TrainerRound {}

export interface PersonalStats {
  roundsPlayed: number;
  bestSessionScore: number;
  bestRoundScore: number;
  totalScore: number;
  recentRounds: PersonalRound[];
}
