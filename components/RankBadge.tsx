import { computeRank, getRankColor, RankTier } from "@/lib/rank";
import { Badge } from "@/components/ui/badge";

interface RankBadgeProps {
  xpTotal: number;
  showXp?: boolean;
}

const TIER_ICONS: Record<RankTier, string> = {
  Bronze: "🥉",
  Silver: "🥈",
  Gold: "🥇",
  Platinum: "💎",
  Diamond: "🔮",
};

export function RankBadge({ xpTotal, showXp = false }: RankBadgeProps) {
  const rank = computeRank(xpTotal);
  const colorClass = getRankColor(rank.tier);

  return (
    <div className="flex items-center gap-2">
      <Badge variant="outline" className={`font-semibold ${colorClass} border-current`}>
        {TIER_ICONS[rank.tier]} {rank.displayName}
      </Badge>
      {showXp && (
        <span className="text-xs text-muted-foreground">{xpTotal.toLocaleString()} XP</span>
      )}
    </div>
  );
}
