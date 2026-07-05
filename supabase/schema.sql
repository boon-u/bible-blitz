-- Bible blitz — Supabase schema (Netflix-style profiles, no login)
--
-- Run once in Supabase → SQL Editor → New query → paste → Run.
-- Compatible with the Bible Viz profiles table — same pick-a-name model.
--
-- Model: no passwords. Anyone opens the app, picks or creates a profile,
-- and plays. Leaderboard is open to all via anon key + permissive RLS.

-- ── Profiles (skip if you already have this from Bible Viz) ─────────────
create table if not exists public.profiles (
  id         uuid primary key default gen_random_uuid(),
  username   text not null unique,
  avatar     text,
  color      text,
  created_at timestamptz not null default now()
);

-- ── Training sessions (one play-through: multiple rounds) ───────────────
create table if not exists public.trainer_sessions (
  id             uuid primary key default gen_random_uuid(),
  profile_id     uuid not null references public.profiles (id) on delete cascade,
  mode           text not null check (mode in ('all', 'ot', 'nt')),
  total_score    integer not null default 0,
  rounds_played  integer not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- ── Individual round results ────────────────────────────────────────────
create table if not exists public.trainer_rounds (
  id             uuid primary key default gen_random_uuid(),
  profile_id     uuid not null references public.profiles (id) on delete cascade,
  session_id     uuid references public.trainer_sessions (id) on delete set null,
  mode           text not null check (mode in ('all', 'ot', 'nt')),
  start_book     text not null,
  target_book    text not null,
  score          integer not null,
  moves          integer not null,
  correct_moves  integer not null,
  wrong_moves    integer not null,
  elapsed_ms     integer not null,
  failed         boolean not null default false,
  created_at     timestamptz not null default now()
);

create index if not exists trainer_sessions_profile_id_idx
  on public.trainer_sessions (profile_id);

create index if not exists trainer_sessions_total_score_idx
  on public.trainer_sessions (total_score desc);

create index if not exists trainer_rounds_profile_id_idx
  on public.trainer_rounds (profile_id);

create index if not exists trainer_rounds_score_idx
  on public.trainer_rounds (score desc);

create index if not exists trainer_rounds_created_at_idx
  on public.trainer_rounds (created_at desc);

-- ── Open access (small trusted group / private URL) ─────────────────────
grant all on public.profiles to anon, authenticated;
grant all on public.trainer_sessions to anon, authenticated;
grant all on public.trainer_rounds to anon, authenticated;

alter table public.profiles enable row level security;
alter table public.trainer_sessions enable row level security;
alter table public.trainer_rounds enable row level security;

-- Profiles policies (idempotent)
do $$ begin
  create policy "profiles are public" on public.profiles for select using (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "anyone can create a profile" on public.profiles for insert with check (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "anyone can update a profile" on public.profiles for update using (true) with check (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "anyone can delete a profile" on public.profiles for delete using (true);
exception when duplicate_object then null; end $$;

-- Session policies
do $$ begin
  create policy "sessions are public" on public.trainer_sessions for select using (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "anyone can create a session" on public.trainer_sessions for insert with check (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "anyone can update a session" on public.trainer_sessions for update using (true) with check (true);
exception when duplicate_object then null; end $$;

-- Round policies
do $$ begin
  create policy "rounds are public" on public.trainer_rounds for select using (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "anyone can add a round" on public.trainer_rounds for insert with check (true);
exception when duplicate_object then null; end $$;
