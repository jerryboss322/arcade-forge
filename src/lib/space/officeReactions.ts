export interface OfficeReactionPreset {
  id: string;
  emoji: string;
  label: string;
  shortcut: string;
}

export interface ActivePeerReaction {
  peerId: string;
  emoji: string;
  label: string;
  expiresAt: number;
}

export const REACTION_DURATION_MS = 3800;

export const OFFICE_REACTIONS: OfficeReactionPreset[] = [
  { id: "wave", emoji: "👋", label: "Wave", shortcut: "1" },
  { id: "thumbs", emoji: "👍", label: "Agree", shortcut: "2" },
  { id: "coffee", emoji: "☕", label: "Coffee", shortcut: "3" },
  { id: "cheers", emoji: "🎉", label: "Ship it!", shortcut: "4" },
  { id: "idea", emoji: "💡", label: "Idea", shortcut: "5" },
];

export const OFFICE_STATUS_PRESETS: string[] = [
  "Focusing",
  "Available",
  "In a Meeting",
  "Deep Work",
  "Coffee Break",
];

/**
 * Remove expired overhead peer reactions without mutating the source map.
 */
export function pruneExpiredReactions(
  reactions: Record<string, ActivePeerReaction>,
  now = Date.now()
): Record<string, ActivePeerReaction> {
  let changed = false;
  const next: Record<string, ActivePeerReaction> = {};

  for (const [peerId, entry] of Object.entries(reactions)) {
    if (entry.expiresAt > now) {
      next[peerId] = entry;
    } else {
      changed = true;
    }
  }

  return changed ? next : reactions;
}
