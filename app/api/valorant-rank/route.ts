import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { isRank } from "@/lib/ranks";
import { fetchHenrikRank } from "@/lib/henrikdev";

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const url = new URL(request.url);
  const studentId = url.searchParams.get("student_id");
  const region = url.searchParams.get("region") || "br";

  const supabase = await createClient();

  let targetId = studentId;
  if (user.role === "student") targetId = user.id;
  if (!targetId) return NextResponse.json({ error: "student_id obrigatório." }, { status: 400 });

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, riot_id, current_rank")
    .eq("id", targetId)
    .maybeSingle();

  if (profileError || !profile) return NextResponse.json({ error: "Aluno não encontrado." }, { status: 404 });

  const result = await fetchHenrikRank(profile.riot_id || "", region);
  if (result.error) return NextResponse.json({ error: result.error }, { status: 503 });

  const portugueseRank = result.current_rank_pt;

  if (portugueseRank && isRank(portugueseRank) && portugueseRank !== profile.current_rank) {
    await supabase.from("profiles").update({ current_rank: portugueseRank }).eq("id", targetId);
    await supabase.from("rank_history").insert({ student_id: targetId, rank: portugueseRank });
  }

  return NextResponse.json({
    riot_id: profile.riot_id,
    region,
    current_tier: result.current_tier,
    current_rank_pt: portugueseRank,
    peak_tier: result.peak_tier,
    ranking_in_tier: result.ranking_in_tier,
    elo: result.elo,
    updated: portugueseRank !== null && portugueseRank !== profile.current_rank,
  });
}
