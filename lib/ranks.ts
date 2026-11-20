export const RANK_TIERS = [
  "Ferro 1",
  "Ferro 2",
  "Ferro 3",
  "Bronze 1",
  "Bronze 2",
  "Bronze 3",
  "Prata 1",
  "Prata 2",
  "Prata 3",
  "Ouro 1",
  "Ouro 2",
  "Ouro 3",
  "Platina 1",
  "Platina 2",
  "Platina 3",
  "Diamante 1",
  "Diamante 2",
  "Diamante 3",
  "Ascendente 1",
  "Ascendente 2",
  "Ascendente 3",
  "Imortal 1",
  "Imortal 2",
  "Imortal 3",
  "Radiante",
] as const;

export const MAPS = [
  "Abyss",
  "Ascent",
  "Bind",
  "Breeze",
  "Fracture",
  "Haven",
  "Icebox",
  "Lotus",
  "Pearl",
  "Split",
  "Sunset",
] as const;

export const AGENTS = [
  "Jett",
  "Reyna",
  "Raze",
  "Phoenix",
  "Neon",
  "Yoru",
  "Iso",
  "Omen",
  "Brimstone",
  "Viper",
  "Astra",
  "Harbor",
  "Clove",
  "Sage",
  "Skye",
  "KAY/O",
  "Breach",
  "Sova",
  "Fade",
  "Gekko",
  "Deadlock",
  "Cypher",
  "Killjoy",
  "Chamber",
  "Vyse",
  "Tejo",
  "Waylay",
  "Veto",
  "Hush",
  "Miks",
] as const;

export const CATEGORY_LABEL = {
  tdm: "TDM",
  aim: "Mira",
  tactical: "Tático",
} as const;

export function rankIndex(rank: string | null) {
  if (!rank) return -1;
  return RANK_TIERS.indexOf(rank as (typeof RANK_TIERS)[number]);
}

export function rankPercent(rank: string | null) {
  const index = rankIndex(rank);
  if (index < 0) return 0;
  return Math.round((index / (RANK_TIERS.length - 1)) * 100);
}

export function rankGoalPercent(current: string | null, target: string | null, start: string | null = current) {
  const currentIndex = rankIndex(current);
  const targetIndex = rankIndex(target);
  const startIndex = rankIndex(start);
  if (currentIndex < 0 || targetIndex < 0 || startIndex < 0) return 0;
  if (targetIndex <= startIndex) return currentIndex >= targetIndex ? 100 : 0;
  if (currentIndex <= startIndex) return 0;
  if (currentIndex >= targetIndex) return 100;
  return Math.max(0, Math.min(100, Math.round(((currentIndex - startIndex) / (targetIndex - startIndex)) * 100)));
}

export function isRank(value: string) {
  return rankIndex(value) >= 0;
}
