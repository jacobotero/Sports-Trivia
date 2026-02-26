export type RankTier = "Bronze" | "Silver" | "Gold" | "Platinum" | "Diamond";

export interface RankInfo {
  tier: RankTier;
  division: number;
  xpTotal: number;
  xpInTier: number;
  xpToNextDivision: number;
  displayName: string;
}

const TIER_RANGES: { tier: RankTier; min: number; max: number }[] = [
  { tier: "Bronze", min: 0, max: 999 },
  { tier: "Silver", min: 1000, max: 2499 },
  { tier: "Gold", min: 2500, max: 4999 },
  { tier: "Platinum", min: 5000, max: 9999 },
  { tier: "Diamond", min: 10000, max: Infinity },
];

const TIER_COLORS: Record<RankTier, string> = {
  Bronze: "text-amber-600",
  Silver: "text-slate-400",
  Gold: "text-yellow-400",
  Platinum: "text-cyan-400",
  Diamond: "text-violet-400",
};

export function computeRank(xpTotal: number): RankInfo {
  const tierData =
    TIER_RANGES.find((t) => xpTotal >= t.min && xpTotal <= t.max) ??
    TIER_RANGES[TIER_RANGES.length - 1];

  const xpInTier = xpTotal - tierData.min;

  if (tierData.max === Infinity) {
    return {
      tier: tierData.tier,
      division: 1,
      xpTotal,
      xpInTier,
      xpToNextDivision: 0,
      displayName: tierData.tier,
    };
  }

  const tierRange = tierData.max - tierData.min + 1;
  const divisionSize = Math.floor(tierRange / 3);

  // div 3 = lowest (0 to divisionSize), div 1 = highest
  const divisionIndex = Math.min(Math.floor(xpInTier / divisionSize), 2);
  const division = 3 - divisionIndex;

  const nextDivisionThreshold = tierData.min + (divisionIndex + 1) * divisionSize;
  const xpToNextDivision =
    division > 1 ? nextDivisionThreshold - xpTotal : tierData.max + 1 - xpTotal;

  return {
    tier: tierData.tier,
    division,
    xpTotal,
    xpInTier,
    xpToNextDivision: Math.max(0, xpToNextDivision),
    displayName: `${tierData.tier} ${division}`,
  };
}

export function getRankColor(tier: RankTier): string {
  return TIER_COLORS[tier];
}

export function computeXpEarned(totalScore: number): number {
  return Math.round(totalScore / 10);
}

export function computeQuestionScore(
  isCorrect: boolean,
  remainingSeconds: number
): number {
  if (!isCorrect) return 0;
  const BASE_POINTS = 100;
  const timeBonus = Math.floor(remainingSeconds * 10);
  return BASE_POINTS + timeBonus;
}
