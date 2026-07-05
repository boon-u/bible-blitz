import { useCallback, useEffect, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { PROFILE_EMOJIS, formatProfileError } from './profileDisplay';
import type { Profile } from './supabase';

const PROFILE_KEY = 'bible-blitz:profile-id';
const LOCAL_PROFILES_KEY = 'bible-blitz:profiles';

const PROFILE_COLORS = [
  '#6c5ce7',
  '#00b894',
  '#e17055',
  '#a29bfe',
  '#f4a261',
  '#0984e3',
  '#fdcb6e',
  '#e84393',
];

function readStoredProfileId(): string | null {
  try {
    return localStorage.getItem(PROFILE_KEY);
  } catch {
    return null;
  }
}

function storeProfileId(id: string | null) {
  try {
    if (id) localStorage.setItem(PROFILE_KEY, id);
    else localStorage.removeItem(PROFILE_KEY);
  } catch {
    // session-only selection
  }
}

function readLocalProfiles(): Profile[] {
  try {
    const raw = localStorage.getItem(LOCAL_PROFILES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Profile[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocalProfiles(profiles: Profile[]) {
  try {
    localStorage.setItem(LOCAL_PROFILES_KEY, JSON.stringify(profiles));
  } catch {
    // ignore quota errors
  }
}

export function useProfiles(supabase: SupabaseClient | null) {
  const [profiles, setProfiles] = useState<Profile[]>(() =>
    supabase ? [] : readLocalProfiles(),
  );
  const [selectedId, setSelectedId] = useState<string | null>(readStoredProfileId);
  const [loading, setLoading] = useState(Boolean(supabase));

  useEffect(() => {
    if (!supabase) {
      setProfiles(readLocalProfiles());
      setLoading(false);
      return;
    }
    let alive = true;
    setLoading(true);
    supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: true })
      .then(({ data, error }) => {
        if (!alive) return;
        if (error) console.error('Failed to load profiles:', error.message);
        else setProfiles((data as Profile[]) ?? []);
        setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [supabase]);

  const selectProfile = useCallback((id: string) => {
    setSelectedId(id);
    storeProfileId(id);
  }, []);

  const clearProfile = useCallback(() => {
    setSelectedId(null);
    storeProfileId(null);
  }, []);

  const createProfile = useCallback(
    async ({ username, avatar }: { username: string; avatar: string }) => {
      const trimmed = username.trim();
      if (!trimmed) throw new Error('Enter a name');
      if (trimmed.length > 32) throw new Error('Name must be 32 characters or less');

      const pickedAvatar = PROFILE_EMOJIS.includes(avatar) ? avatar : PROFILE_EMOJIS[0];
      const color = PROFILE_COLORS[Math.floor(Math.random() * PROFILE_COLORS.length)];

      if (!supabase) {
        const lower = trimmed.toLowerCase();
        if (profiles.some((p) => p.username.toLowerCase() === lower)) {
          throw new Error('That name is already taken');
        }
        const profile: Profile = {
          id: crypto.randomUUID(),
          username: trimmed,
          avatar: pickedAvatar,
          color,
          created_at: new Date().toISOString(),
        };
        setProfiles((prev) => {
          const next = [...prev, profile];
          writeLocalProfiles(next);
          return next;
        });
        selectProfile(profile.id);
        return profile;
      }

      const { data, error } = await supabase
        .from('profiles')
        .insert({ username: trimmed, avatar: pickedAvatar, color })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') throw new Error('That name is already taken');
        throw new Error(formatProfileError(error.message));
      }

      setProfiles((prev) => [...prev, data as Profile]);
      selectProfile(data.id);
      return data as Profile;
    },
    [supabase, selectProfile, profiles],
  );

  const selected = profiles.find((p) => p.id === selectedId) ?? null;

  useEffect(() => {
    if (!loading && selectedId && profiles.length > 0 && !selected) {
      clearProfile();
    }
  }, [loading, selectedId, selected, profiles.length, clearProfile]);

  return {
    profiles,
    selected,
    loading,
    selectProfile,
    clearProfile,
    createProfile,
  };
}
