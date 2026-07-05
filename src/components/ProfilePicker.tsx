import { useState } from 'react';
import { PROFILE_EMOJIS } from '../lib/profileDisplay';
import type { Profile } from '../lib/supabase';
import { ProfileAvatar } from './ProfileAvatar';

interface ProfilePickerProps {
  profiles: Profile[];
  onSelect: (id: string) => void;
  onCreate: (input: { username: string; avatar: string }) => Promise<Profile>;
}

function ProfileTile({
  profile,
  onSelect,
}: {
  profile: Profile;
  onSelect: (id: string) => void;
}) {
  return (
    <button type="button" className="profile-tile" onClick={() => onSelect(profile.id)}>
      <ProfileAvatar profile={profile} />
      <span className="profile-tile-name">{profile.username}</span>
    </button>
  );
}

export function ProfilePicker({ profiles, onSelect, onCreate }: ProfilePickerProps) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState(PROFILE_EMOJIS[0]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const resetForm = () => {
    setAdding(false);
    setName('');
    setAvatar(PROFILE_EMOJIS[0]);
    setError('');
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await onCreate({ username: name, avatar });
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="profile-screen">
      <div className="profile-screen-inner">
        <h1 className="profile-screen-title">
          <span className="brand-mark">📚</span> Bible blitz
        </h1>
        <p className="profile-screen-tagline">
          Who&apos;s playing? Pick a profile or tap <strong>Add profile</strong> to create one —
          just a name and emoji, no sign-up.
        </p>

        <div className="profile-grid">
          {profiles.map((p) => (
            <ProfileTile key={p.id} profile={p} onSelect={onSelect} />
          ))}

          {!adding && (
            <button
              type="button"
              className="profile-tile profile-tile-add"
              onClick={() => setAdding(true)}
            >
              <span className="profile-tile-avatar profile-tile-avatar-add">+</span>
              <span className="profile-tile-name">Add profile</span>
            </button>
          )}
        </div>

        {adding && (
          <form className="profile-add-panel" onSubmit={submit}>
            <div className="profile-add-preview">
              <span className="profile-add-preview-emoji" aria-hidden="true">
                {avatar}
              </span>
              <span className="profile-add-preview-label">Your avatar</span>
            </div>

            <p className="profile-add-label">Pick one ({PROFILE_EMOJIS.length} options)</p>
            <div className="emoji-picker" role="listbox" aria-label="Profile avatar">
              {PROFILE_EMOJIS.map((emoji, i) => (
                <button
                  key={`${i}-${emoji}`}
                  type="button"
                  role="option"
                  aria-selected={avatar === emoji}
                  aria-label={`Avatar ${emoji}`}
                  className={avatar === emoji ? 'emoji-option selected' : 'emoji-option'}
                  onClick={() => setAvatar(emoji)}
                  disabled={busy}
                >
                  {emoji}
                </button>
              ))}
            </div>

            <input
              className="profile-add-input"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={32}
              autoFocus
              disabled={busy}
            />
            <div className="profile-add-actions">
              <button type="submit" className="primary-btn small-btn" disabled={busy || !name.trim()}>
                {busy ? 'Creating…' : 'Create profile'}
              </button>
              <button type="button" className="ghost-btn" disabled={busy} onClick={resetForm}>
                Cancel
              </button>
            </div>
            {error && <p className="profile-add-error">{error}</p>}
          </form>
        )}
      </div>
    </div>
  );
}
