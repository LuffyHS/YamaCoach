const HENRIK_TO_PT: Record<string, string> = {
  "iron 1": "Ferro 1", "iron 2": "Ferro 2", "iron 3": "Ferro 3",
  "bronze 1": "Bronze 1", "bronze 2": "Bronze 2", "bronze 3": "Bronze 3",
  "silver 1": "Prata 1", "silver 2": "Prata 2", "silver 3": "Prata 3",
  "gold 1": "Ouro 1", "gold 2": "Ouro 2", "gold 3": "Ouro 3",
  "platinum 1": "Platina 1", "platinum 2": "Platina 2", "platinum 3": "Platina 3",
  "diamond 1": "Diamante 1", "diamond 2": "Diamante 2", "diamond 3": "Diamante 3",
  "ascendant 1": "Ascendente 1", "ascendant 2": "Ascendente 2", "ascendant 3": "Ascendente 3",
  "immortal 1": "Imortal 1", "immortal 2": "Imortal 2", "immortal 3": "Imortal 3",
  "radiant": "Radiante",
};

export function toPortugueseRank(henrikRank: string | null | undefined): string | null {
  if (!henrikRank) return null;
  const key = henrikRank.trim().toLowerCase();
  if (HENRIK_TO_PT[key]) return HENRIK_TO_PT[key];
  for (const [k, v] of Object.entries(HENRIK_TO_PT)) {
    if (key.includes(k)) return v;
  }
  return null;
}

export type HenrikRankResult = {
  current_tier: string | null;
  current_rank_pt: string | null;
  peak_tier: string | null;
  ranking_in_tier: number | null;
  elo: number | null;
};

export async function fetchHenrikRank(riotId: string, region: string = "br"): Promise<HenrikRankResult & { error?: string }> {
  const apiKey = process.env.HENRIKDEV_API_KEY;
  if (!apiKey) return { current_tier: null, current_rank_pt: null, peak_tier: null, ranking_in_tier: null, elo: null, error: "HENRIKDEV_API_KEY não configurada." };

  if (!riotId || !riotId.includes("#")) {
    return { current_tier: null, current_rank_pt: null, peak_tier: null, ranking_in_tier: null, elo: null, error: "Riot ID inválido (formato Nome#TAG)." };
  }

  const [name, tag] = riotId.split("#");
  const henrikUrl = `https://api.henrikdev.xyz/valorant/v2/mmr/${region}/${encodeURIComponent(name)}/${encodeURIComponent(tag)}`;

  try {
    const res = await fetch(henrikUrl, { headers: { Authorization: apiKey } });
    if (!res.ok) {
      const text = await res.text();
      return { current_tier: null, current_rank_pt: null, peak_tier: null, ranking_in_tier: null, elo: null, error: `HenrikDev API: ${res.status} ${text.slice(0, 200)}` };
    }
    const data = await res.json();
    const currentTier = data?.data?.current_data?.currenttierpatched || null;
    const peakTier = data?.data?.highest_rank?.patched_tier || null;
    const rankingInTier = data?.data?.current_data?.ranking_in_tier ?? null;
    const elo = data?.data?.current_data?.elo ?? null;
    return {
      current_tier: currentTier,
      current_rank_pt: toPortugueseRank(currentTier),
      peak_tier: peakTier,
      ranking_in_tier: rankingInTier,
      elo,
    };
  } catch {
    return { current_tier: null, current_rank_pt: null, peak_tier: null, ranking_in_tier: null, elo: null, error: "Falha ao conectar com HenrikDev API." };
  }
}
