import type { SupabaseClient } from '@supabase/supabase-js';
import type { CanonMode } from '../game/canon';
import type { RoundState } from '../game/logic';
import { globalBook } from '../game/logic';
import type {
  LeaderboardEntry,
  PersonalStats,
  TrainerRound,
} from './supabase';

export async function createSession(
  supabase: SupabaseClient,
  profileId: string,
  mode: CanonMode,
): Promise<{ sessionId: string | null; error: string | null }> {
  const { data, error } = await supabase
    .from('trainer_sessions')
    .insert({ profile_id: profileId, mode, total_score: 0, rounds_played: 0 })
    .select('id')
    .single();

  if (error) {
    console.error('Failed to create session:', error.message);
    return { sessionId: null, error: error.message };
  }
  return { sessionId: data.id, error: null };
}

export async function saveRoundResult(
  supabase: SupabaseClient,
  {
    profileId,
    sessionId,
    round,
    finalScore,
    elapsedMs,
  }: {
    profileId: string;
    sessionId: string | null;
    round: RoundState;
    finalScore: number;
    elapsedMs: number;
  },
): Promise<{ ok: boolean; error: string | null }> {
  const startBook = globalBook(round.startIndex, round).name;
  const targetBook = globalBook(round.targetIndex, round).name;

  const { error: roundError } = await supabase.from('trainer_rounds').insert({
    profile_id: profileId,
    session_id: sessionId,
    mode: round.mode,
    start_book: startBook,
    target_book: targetBook,
    score: finalScore,
    moves: round.moves,
    correct_moves: round.correctMoves,
    wrong_moves: round.wrongMoves,
    elapsed_ms: elapsedMs,
    failed: round.failed,
  });

  if (roundError) {
    console.error('Failed to save round:', roundError.message);
    return { ok: false, error: roundError.message };
  }

  if (sessionId) {
    const { data: session } = await supabase
      .from('trainer_sessions')
      .select('total_score, rounds_played')
      .eq('id', sessionId)
      .single();

    if (session) {
      const { error: sessionError } = await supabase
        .from('trainer_sessions')
        .update({
          total_score: session.total_score + finalScore,
          rounds_played: session.rounds_played + 1,
          updated_at: new Date().toISOString(),
        })
        .eq('id', sessionId);

      if (sessionError) {
        console.error('Failed to update session:', sessionError.message);
        return { ok: false, error: sessionError.message };
      }
    }
  }

  return { ok: true, error: null };
}

export async function fetchLeaderboard(
  supabase: SupabaseClient,
  modeFilter: CanonMode | 'all-modes' = 'all-modes',
  limit = 20,
): Promise<LeaderboardEntry[]> {
  let query = supabase
    .from('trainer_sessions')
    .select(`
      id,
      total_score,
      rounds_played,
      mode,
      created_at,
      profile:profiles (username, avatar, color)
    `)
    .gt('rounds_played', 0)
    .order('total_score', { ascending: false })
    .limit(limit);

  if (modeFilter !== 'all-modes') {
    query = query.eq('mode', modeFilter);
  }

  const { data, error } = await query;
  if (error) {
    console.error('Failed to load leaderboard:', error.message);
    return [];
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    total_score: row.total_score,
    rounds_played: row.rounds_played,
    mode: row.mode,
    created_at: row.created_at,
    profile: Array.isArray(row.profile) ? row.profile[0] : row.profile,
  })) as LeaderboardEntry[];
}

export async function fetchPersonalStats(
  supabase: SupabaseClient,
  profileId: string,
): Promise<PersonalStats> {
  const [roundsRes, sessionsRes] = await Promise.all([
    supabase
      .from('trainer_rounds')
      .select('*')
      .eq('profile_id', profileId)
      .order('created_at', { ascending: false })
      .limit(50),
    supabase
      .from('trainer_sessions')
      .select('total_score')
      .eq('profile_id', profileId)
      .order('total_score', { ascending: false })
      .limit(1),
  ]);

  const rounds = (roundsRes.data ?? []) as TrainerRound[];
  const bestSession = sessionsRes.data?.[0]?.total_score ?? 0;

  return {
    roundsPlayed: rounds.length,
    bestSessionScore: bestSession,
    bestRoundScore: rounds.reduce((max, r) => Math.max(max, r.score), 0),
    totalScore: rounds.reduce((sum, r) => sum + r.score, 0),
    recentRounds: rounds.slice(0, 15),
  };
}
