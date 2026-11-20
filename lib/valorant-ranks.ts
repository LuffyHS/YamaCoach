import { RANK_TIERS } from "@/lib/ranks";

const rankValues = new Map<string, number>(RANK_TIERS.map((rank, index) => [rank.toLocaleLowerCase("pt-BR"), index + 1]));

export function valorantRankValue(rank: string | null | undefined) {
  if (!rank) return null;
  return rankValues.get(rank.trim().toLocaleLowerCase("pt-BR")) ?? null;
}

export function valorantRankProgress(initial: string | null | undefined, current: string | null | undefined, target: string | null | undefined) {
  const startValue = valorantRankValue(initial);
  const currentValue = valorantRankValue(current);
  const targetValue = valorantRankValue(target);
  if (startValue === null || currentValue === null || targetValue === null) return 0;
  if (targetValue <= startValue) return currentValue >= targetValue ? 100 : 0;
  const percent = Math.round(((currentValue - startValue) / (targetValue - startValue)) * 100);
  return Math.max(0, Math.min(100, percent));
}
