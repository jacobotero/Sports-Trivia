/** Total XP required to reach `level` (level 1 = 0 XP, level 2 = 100, level 3 = 250 …). */
export function xpForLevel(level: number): number {
  if (level <= 1) return 0;
  return 25 * (level - 1) * (level + 2);
}

/** Current level derived from total accumulated XP. */
export function xpToLevel(xp: number): number {
  if (xp <= 0) return 1;
  // Inverse of xpForLevel: solve 25*(n-1)*(n+2) <= xp
  // => n <= (-1 + sqrt(9 + 4*xp/25)) / 2
  return Math.max(1, Math.floor((-1 + Math.sqrt(9 + (4 * xp) / 25)) / 2));
}

export interface LevelProgress {
  level: number;
  xpIntoLevel: number; // XP earned within this level
  xpNeeded: number;    // XP from this level's start to the next
  progress: number;    // 0–1 fraction for a progress bar
}

/** Progress bar data for the current level. */
export function xpProgress(xp: number): LevelProgress {
  const level = xpToLevel(xp);
  const currentThreshold = xpForLevel(level);
  const nextThreshold = xpForLevel(level + 1);
  const xpIntoLevel = xp - currentThreshold;
  const xpNeeded = nextThreshold - currentThreshold;
  return {
    level,
    xpIntoLevel,
    xpNeeded,
    progress: Math.min(xpIntoLevel / xpNeeded, 1),
  };
}
