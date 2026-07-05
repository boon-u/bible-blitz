export const PROFILE_EMOJIS = [
  '📖', '✝️', '🕊️', '⛪', '🙏', '🕯️', '✨', '🌟', '💫', '🍞', '🍷', '👼', '📜', '🛐',
  '😀', '😊', '😎', '🤗', '🥰', '😇', '🤓', '🙂', '😌', '🤠', '🥳', '😺', '🐶', '🐱',
  '🌅', '🌄', '🌈', '🌊', '🌿', '🌸', '🌺', '🌻', '🍃', '🌲', '🌴', '🌙', '☀️', '⭐',
  '🦁', '🐑', '🦋', '🐝', '🦅', '🐢', '🐠', '🦄', '🐘', '🦊', '🐻', '🐼', '🐨',
  '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '💗', '💖', '💝', '🔥', '⚡', '💎',
  '🎵', '🎸', '🎨', '📚', '✏️', '🏠', '☕', '🍎', '🌾', '🎯', '🏆', '🎁', '🧭', '🔔',
  '♾️', '☮️', '⚓', '🗝️', '🔆', '💡', '🪴', '🧸', '🎈', '🪶', '🏔️', '🌋', '🗻', '🏝️',
];

export function profileDisplay(profile: { username?: string; avatar?: string | null }): string {
  if (profile?.avatar) return profile.avatar;
  const name = profile?.username?.trim();
  return name ? name.charAt(0).toUpperCase() : '?';
}

export function profileHasEmoji(profile: { avatar?: string | null }): boolean {
  return Boolean(profile?.avatar);
}

export function formatProfileError(message: string): string {
  if (/avatar.*schema cache|Could not find the 'avatar' column/i.test(message)) {
    return (
      'Database is missing the avatar column. Run the schema in supabase/schema.sql.'
    );
  }
  return message;
}
