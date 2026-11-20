import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { isRank } from "@/lib/ranks";

const text = z.string().max(500).default("");
const setupSchema = z.object({
  processor: text, gpu: text, ram: text, monitor_hz: text,
  mouse: text, keyboard: text, headset: text, mousepad: text,
  dpi: z.number().min(1).max(100_000).nullable(),
  sensitivity: z.number().min(0).max(100).nullable(),
  resolution: text, crosshair_code: z.string().max(200).default(""),
  equipment_history: z.string().max(4000).default(""),
  main_role: z.string().max(60).default(""),
  agents: z.array(z.string().trim().min(1).max(40)).max(3).default([]),
});
const coachSchema = z.object({
  student_id: z.string().uuid(),
  setup: setupSchema.optional(),
  tracker_url: z.string().max(500).optional().default(""),
  riot_id: z.string().trim().max(80).optional().default(""),
  initial_rank: z.string().max(60).optional().default(""),
  current_rank: z.string().max(60).optional().default(""),
  target_rank: z.string().max(60).optional().default(""),
  recurring_errors: z.string().max(4000).optional().default(""),
});

const studentSchema = z.object({ setup: setupSchema, tracker_url: z.string().max(500).optional().default(""), riot_id: z.string().trim().max(80).optional().default(""), current_rank: z.string().max(60).optional().default("") });
const trackerUrlIsValid = (value: string) => {
  if (!value) return true;
  try { const url = new URL(value); return url.protocol === "https:" && ["tracker.gg", "www.tracker.gg"].includes(url.hostname) && url.pathname.startsWith("/valorant/profile/"); }
  catch { return false; }
};

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  const raw = await request.json().catch(() => null);
  const supabase = await createClient();

  if (user.role === "student") {
    const parsed = studentSchema.safeParse(raw);
    if (!parsed.success || !trackerUrlIsValid(parsed.data?.tracker_url || "") || (parsed.data?.current_rank && !isRank(parsed.data.current_rank))) return NextResponse.json({ error: "Confira os campos da ficha, o Riot ID e seu elo atual." }, { status: 400 });
    const { data: oldProfile, error: oldProfileError } = await supabase.from("profiles").select("current_rank").eq("id", user.id).maybeSingle();
    if (oldProfileError) return NextResponse.json({ error: "Não foi possível carregar seu perfil." }, { status: 500 });
    const { error } = await supabase.from("profiles").update({ setup: parsed.data.setup, tracker_url: parsed.data.tracker_url || null, riot_id: parsed.data.riot_id || null, current_rank: parsed.data.current_rank || null }).eq("id", user.id);
    if (error) return NextResponse.json({ error: "Não foi possível salvar a ficha técnica." }, { status: 500 });
    if (parsed.data.current_rank && parsed.data.current_rank !== oldProfile?.current_rank) {
      const { error: historyError } = await supabase.from("rank_history").insert({ student_id: user.id, rank: parsed.data.current_rank });
      if (historyError) return NextResponse.json({ error: "Elo salvo, mas não foi possível registrar o histórico." }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  }

  const parsed = coachSchema.safeParse(raw);
  if (!parsed.success || !trackerUrlIsValid(parsed.data?.tracker_url || "") || [parsed.data?.initial_rank, parsed.data?.current_rank, parsed.data?.target_rank].some(rank => Boolean(rank && !isRank(rank)))) return NextResponse.json({ error: "Confira os elos selecionados e o link do Tracker.gg." }, { status: 400 });
  const { data: student, error: studentError } = await supabase.from("profiles")
    .select("id,initial_rank,current_rank,target_rank,rank_goal_start").eq("id", parsed.data.student_id).eq("role", "student").maybeSingle();
  if (studentError) return NextResponse.json({ error: "Não foi possível localizar o aluno." }, { status: 500 });
  if (!student) return NextResponse.json({ error: "Aluno não encontrado." }, { status: 404 });
  let baselineRank = parsed.data.initial_rank || student.initial_rank || student.current_rank;
  if (!baselineRank && parsed.data.target_rank) {
    const { data: previousRank } = await supabase.from("rank_history").select("rank").eq("student_id", student.id).order("recorded_at", { ascending: false }).limit(1).maybeSingle();
    baselineRank = previousRank?.rank ?? null;
  }
  const nextTarget = parsed.data.target_rank || null;
  const update = {
    ...(parsed.data.setup ? { setup: parsed.data.setup } : {}),
    tracker_url: parsed.data.tracker_url || null,
    riot_id: parsed.data.riot_id || null,
    initial_rank: parsed.data.initial_rank || null,
    current_rank: parsed.data.current_rank || student.current_rank,
    target_rank: nextTarget,
    rank_goal_start: nextTarget !== student.target_rank || parsed.data.initial_rank !== student.initial_rank ? (nextTarget ? baselineRank : null) : student.rank_goal_start,
    recurring_errors: parsed.data.recurring_errors,
  };
  const { error } = await supabase.from("profiles").update(update).eq("id", student.id).eq("role", "student");
  if (error) return NextResponse.json({ error: "Não foi possível salvar as metas do aluno." }, { status: 500 });
  const nextCurrent = parsed.data.current_rank || student.current_rank;
  if (nextCurrent && nextCurrent !== student.current_rank) {
    const { error: historyError } = await supabase.from("rank_history").insert({ student_id: student.id, rank: nextCurrent });
    if (historyError) return NextResponse.json({ error: "Ficha salva, mas não foi possível registrar o histórico de elo." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
