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
    .select("id, riot_id, full_name")
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

  // Fetch MMR data
  const mmrUrl = `https://api.henrikdev.xyz/valorant/v2/mmr/${region}/${encodeURIComponent(name)}/${encodeURIComponent(tag)}`;
  let mmrData: any = null;
  try {
    const res = await fetch(mmrUrl, { headers: { Authorization: apiKey } });
    if (res.ok) mmrData = await res.json();
  } catch { /* ignore */ }

  // Fetch recent matches
  const matchesUrl = `https://api.henrikdev.xyz/valorant/v3/matches/${region}/${encodeURIComponent(name)}/${encodeURIComponent(tag)}?mode=competitive&size=10`;
  let matchesData: any = null;
  try {
    const res = await fetch(matchesUrl, { headers: { Authorization: apiKey } });
    if (res.ok) matchesData = await res.json();
  } catch { /* ignore */ }

  if (!matchesData?.data?.length) {
    return NextResponse.json({ error: "Nenhuma partida competitiva encontrada." }, { status: 404 });
  }

  const matches = matchesData.data as any[];
  let wins = 0, totalKills = 0, totalDeaths = 0, totalHS = 0, totalACS = 0;
  const mapStats: Record<string, { wins: number; total: number }> = {};
  const agentStats: Record<string, number> = {};

  for (const match of matches) {
    const player = match.players?.all_players?.find((p: any) => p.name?.toLowerCase() === name.toLowerCase() && p.tag?.toLowerCase() === tag.toLowerCase());
    if (!player) continue;

    const won = match.teams?.[player.team?.toLowerCase()]?.has_won;
    if (won) wins++;

    totalKills += player.stats?.kills || 0;
    totalDeaths += player.stats?.deaths || 0;
    totalHS += player.stats?.headshots || 0;
    totalACS += player.stats?.score || 0;

    const mapName = match.metadata?.map || "Unknown";
    if (!mapStats[mapName]) mapStats[mapName] = { wins: 0, total: 0 };
    mapStats[mapName].total++;
    if (won) mapStats[mapName].wins++;

    const agentName = player.character || "Unknown";
    agentStats[agentName] = (agentStats[agentName] || 0) + 1;
  }

  const matchCount = matches.length;
  const winrate = matchCount > 0 ? Math.round((wins / matchCount) * 100) : 0;
  const kd = totalDeaths > 0 ? (totalKills / totalDeaths).toFixed(2) : String(totalKills);
  const hsPercent = totalKills > 0 ? Math.round((totalHS / totalKills) * 100) : 0;
  const acs = matchCount > 0 ? Math.round(totalACS / matchCount) : 0;

  const worstMaps = Object.entries(mapStats)
    .filter(([, v]) => v.total >= 2)
    .map(([k, v]) => ({ map: k, winrate: Math.round((v.wins / v.total) * 100), games: v.total }))
    .sort((a, b) => a.winrate - b.winrate)
    .slice(0, 3);

  const topAgents = Object.entries(agentStats)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([k, v]) => `${k} (${v})`);

  const metrics = {
    matches: matchCount,
    winrate,
    kd: parseFloat(kd),
    hs: hsPercent,
    acs,
    maps: worstMaps.map(m => `${m.map} (${m.winrate}% em ${m.games} jogos)`),
    agents: topAgents,
  };

  // Generate AI report via Gemini
  const geminiKey = process.env.GEMINI_API_KEY;
  let report = "";
  if (geminiKey) {
    const prompt = `Você é um coach de VALORANT. Analise as métricas do aluno abaixo e gere um diagnóstico técnico direto em português.

Aluno: ${profile.full_name}
Elo atual: ${mmrData?.data?.current_data?.currenttierpatched || "Desconhecido"}
Métricas (últimas ${matchCount} partidas competitivas):
- Winrate: ${winrate}%
- K/D: ${kd}
- Headshot%: ${hsPercent}%
- ACS médio: ${acs}
- Mapas com pior desempenho: ${worstMaps.map(m => `${m.map} (${m.winrate}%)`).join(", ") || "Nenhum"}
- Agentes mais jogados: ${topAgents.join(", ")}

Formato do diagnóstico:
**Pontos Fortes Detectados** (2-3 bullets)
**3 Principais Falhas a Corrigir Agora** (3 bullets específicos)
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

  return NextResponse.json({ metrics, report, riot_id: riotId, region });
}
