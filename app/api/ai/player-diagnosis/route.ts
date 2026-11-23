/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const body = await request.json().catch(() => null);
  const studentId = body?.student_id;
  const region = body?.region || "br";

  const supabase = await createClient();

  let targetId = studentId;
  if (user.role === "student") targetId = user.id;
  if (!targetId) return NextResponse.json({ error: "student_id obrigatório." }, { status: 400 });

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, riot_id, full_name, current_rank, target_rank")
    .eq("id", targetId)
    .maybeSingle();

  if (profileError || !profile) return NextResponse.json({ error: "Aluno não encontrado." }, { status: 404 });

  const riotId = profile.riot_id;
  if (!riotId || !riotId.includes("#")) {
    return NextResponse.json({ error: "Riot ID não configurado (formato Nome#TAG)." }, { status: 400 });
  }

  const apiKey = process.env.HENRIKDEV_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "HENRIKDEV_API_KEY não configurada." }, { status: 503 });

  const [name, tag] = riotId.split("#");

  const mmrUrl = `https://api.henrikdev.xyz/valorant/v2/mmr/${region}/pc/${encodeURIComponent(name)}/${encodeURIComponent(tag)}`;
  let mmrData: any = null;
  try {
    const res = await fetch(mmrUrl, { headers: { Authorization: apiKey } });
    if (res.ok) mmrData = await res.json();
  } catch { /* ignore */ }

  // Fallback to v2 if v3 fails
  let matchesData: any = null;
  const matchesUrl = `https://api.henrikdev.xyz/valorant/v4/matches/${region}/pc/${encodeURIComponent(name)}/${encodeURIComponent(tag)}?mode=competitive&size=10`;
  try {
    const res = await fetch(matchesUrl, { headers: { Authorization: apiKey } });
    if (res.ok) matchesData = await res.json();
  } catch { /* ignore */ }

  if (!matchesData?.data?.length) {
    return NextResponse.json({ error: "Nenhuma partida competitiva encontrada." }, { status: 404 });
  }

  // Fetch map splash URLs from Valorant API
  const mapImages: Record<string, string> = {};
  try {
    const mapsRes = await fetch("https://valorant-api.com/v1/maps?language=pt-BR");
    if (mapsRes.ok) {
      const mapsData = await mapsRes.json();
      for (const m of (mapsData.data || [])) {
        if (m.displayName && (m.splash || m.listViewIcon)) {
          mapImages[m.displayName] = m.splash || m.listViewIcon;
        }
      }
    }
  } catch { /* ignore */ }

  const matches = matchesData.data as any[];
  let wins = 0, totalKills = 0, totalDeaths = 0, totalHS = 0, totalACS = 0, totalRounds = 0;
  const mapStats: Record<string, { wins: number; total: number; kills: number; deaths: number }> = {};
  const agentStats: Record<string, number> = {};
  const matchDetails: any[] = [];

  for (const match of matches) {
    const player = match.players?.find((p: any) => p.name?.toLowerCase() === name.toLowerCase() && p.tag?.toLowerCase() === tag.toLowerCase());
    if (!player) continue;

    const teamId = player.team_id;
    const team = match.teams?.find((t: any) => t.team_id === teamId);
    const enemyTeam = match.teams?.find((t: any) => t.team_id !== teamId);
    const won = team?.won ?? false;
    if (won) wins++;

    const kills = player.stats?.kills || 0;
    const deaths = player.stats?.deaths || 0;
    const assists = player.stats?.assists || 0;
    const hs = player.stats?.headshots || 0;
    const score = player.stats?.score || 0;
    const rounds = match.metadata?.rounds_played || 1;

    totalKills += kills;
    totalDeaths += deaths;
    totalHS += hs;
    totalACS += score;
    totalRounds += rounds;

    const mapName = match.metadata?.map?.name || "Unknown";
    if (!mapStats[mapName]) mapStats[mapName] = { wins: 0, total: 0, kills: 0, deaths: 0 };
    mapStats[mapName].total++;
    if (won) mapStats[mapName].wins++;
    mapStats[mapName].kills += kills;
    mapStats[mapName].deaths += deaths;

    const agentName = player.agent?.name || "Unknown";
    agentStats[agentName] = (agentStats[agentName] || 0) + 1;

    const teamScore = team?.rounds?.won ?? 0;
    const enemyScore = enemyTeam?.rounds?.won ?? 0;
    const kd = deaths > 0 ? (kills / deaths).toFixed(2) : String(kills);
    const hsPercent = kills > 0 ? Math.round((hs / kills) * 100) : 0;
    const matchAcs = Math.round(score / Math.max(1, rounds));

    // Round-by-round analysis
    const roundDetails: any[] = [];
    let firstBloods = 0;
    let clutches = 0;
    for (const round of (match.rounds || [])) {
      const roundPlayer = round.stats?.find((s: any) => s.player?.puuid === player.puuid);
      const isWin = round.winning_team === teamId;
      const fb = round.first_blood?.player?.puuid === player.puuid;
      if (fb) firstBloods++;
      // Simplified clutch detection
      if (isWin && kills > 0 && round.stats?.filter((s: any) => s.player?.team_id === teamId).length <= 2) {
        clutches++;
      }
      roundDetails.push({
        round: round.id + 1,
        result: isWin ? "V" : "D",
        firstBlood: fb,
        kills: roundPlayer?.stats?.kills || 0,
        deaths: roundPlayer?.stats?.deaths || 0,
        assists: roundPlayer?.stats?.assists || 0,
        score: roundPlayer?.stats?.score || 0,
      });
    }

    let diagnosis = "";
    if (won) {
      if (parseFloat(kd) >= 1.2) diagnosis = "Boa performance, impactou positivamente a vitória.";
      else diagnosis = "Vitória em equipe, contribuição moderada.";
    } else {
      if (parseFloat(kd) < 0.8) diagnosis = "Dificuldade de impacto, muitas mortes.";
      else if (hsPercent < 20) diagnosis = "HS baixo, revisar crosshair placement.";
      else diagnosis = "Performance individual ok, mas equipe perdeu.";
    }

    const rawDate = match.metadata?.started_at || "";
    let formattedDate = rawDate;
    if (rawDate) {
      try {
        const d = new Date(rawDate);
        if (!isNaN(d.getTime())) {
          formattedDate = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });
        }
      } catch { /* keep raw */ }
    }

    matchDetails.push({
      map: mapName,
      agent: agentName,
      score: `${teamScore}-${enemyScore}`,
      won: !!won,
      kills,
      deaths,
      assists,
      kd: parseFloat(kd),
      hs: hsPercent,
      acs: matchAcs,
      rounds,
      firstBloods,
      clutches,
      diagnosis,
      date: formattedDate,
      roundDetails,
      mapImage: mapImages[mapName] || null,
    });
  }

  const matchCount = matchDetails.length || 1;
  const winrate = matchCount > 0 ? Math.round((wins / matchCount) * 100) : 0;
  const kd = totalDeaths > 0 ? (totalKills / totalDeaths).toFixed(2) : String(totalKills);
  const hsPercent = totalKills > 0 ? Math.round((totalHS / totalKills) * 100) : 0;
  const acs = totalRounds > 0 ? Math.round(totalACS / totalRounds) : 0;

  const worstMaps = Object.entries(mapStats)
    .filter(([, v]) => v.total >= 1)
    .map(([k, v]) => ({ map: k, winrate: Math.round((v.wins / v.total) * 100), games: v.total, kd: v.deaths > 0 ? (v.kills / v.deaths).toFixed(2) : String(v.kills) }))
    .sort((a, b) => a.winrate - b.winrate)
    .slice(0, 5);

  const topAgents = Object.entries(agentStats)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([k, v]) => `${k} (${v})`);

  const benchmarks = {
    rank: "Ascendente",
    kd: 1.15,
    hs: 25,
    acs: 230,
    winrate: 50,
  };

  const currentTier = mmrData?.data?.current_data?.currenttierpatched || null;

  const tierMap: Record<string, string> = {
    "Iron": "Ferro", "Bronze": "Bronze", "Silver": "Prata", "Gold": "Ouro",
    "Platinum": "Platina", "Diamond": "Diamante", "Ascendant": "Ascendente",
    "Immortal": "Imortal", "Radiant": "Radiante",
  };
  let translatedTier = currentTier;
  if (currentTier) {
    for (const [en, pt] of Object.entries(tierMap)) {
      if (currentTier.startsWith(en)) {
        translatedTier = currentTier.replace(en, pt);
        break;
      }
    }
  }

  const metrics = {
    matches: matchCount,
    winrate,
    kd: parseFloat(kd),
    hs: hsPercent,
    acs,
    maps: worstMaps.map(m => `${m.map} (${m.winrate}% em ${m.games} jogos, K/D ${m.kd})`),
    agents: topAgents,
    worstMaps,
    benchmarks,
    currentTier: translatedTier,
    matchDetails,
  };

  // Gemini report with round-by-round analysis
  const geminiKey = process.env.GEMINI_API_KEY;
  let report = "";
  if (geminiKey) {
    const matchSummary = matchDetails.map((md, i) =>
      `Partida ${i + 1}: ${md.map} (${md.agent}) ${md.score} ${md.won ? "V" : "D"} - K/D/A ${md.kills}/${md.deaths}/${md.assists}, HS ${md.hs}%, ACS ${md.acs}, FB ${md.firstBloods}, rounds ${md.rounds}`
    ).join("\n");

    const prompt = `Você é um coach de VALORANT. Analise as métricas e partidas recentes do aluno abaixo e gere um diagnóstico técnico direto em português.

Aluno: ${profile.full_name}
Elo atual: ${translatedTier || "Desconhecido"}
Métricas (últimas ${matchCount} partidas competitivas):
- Winrate: ${winrate}%
- K/D: ${kd}
- Headshot%: ${hsPercent}%
- ACS médio: ${acs}
- Mapas com pior desempenho: ${worstMaps.map(m => `${m.map} (${m.winrate}%)`).join(", ") || "Nenhum"}
- Agentes mais jogados: ${topAgents.join(", ")}

Partidas recentes:
${matchSummary}

Formato do diagnóstico:
**Pontos Fortes Detectados** (2-3 bullets)
**3 Principais Falhas a Corrigir Agora** (3 bullets específicos com dados)
**Plano de Ação Prático para a Semana** (2-3 exercícios focados nos números reais)`;

    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.7, maxOutputTokens: 600 },
          }),
        }
      );
      if (res.ok) {
        const data = await res.json();
        report = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
      }
    } catch { /* ignore */ }
  }

  return NextResponse.json({ metrics, report, riot_id: riotId, region, currentTier: translatedTier });
}
