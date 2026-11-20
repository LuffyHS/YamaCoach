import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth/session";
import { embedUrl } from "@/lib/youtube";
import { createClient } from "@/lib/supabase/server";

const submissionSchema = z.object({
  url: z.string().url().max(500),
  map: z.string().trim().min(1).max(60),
  agent: z.string().trim().min(1).max(60),
});
const reviewSchema = z.object({
  id: z.string().uuid(),
  review: z.string().trim().max(500).optional().default(""),
  notes: z.string().max(4000).optional().default(""),
  errors: z.string().max(2000).optional().default(""),
});

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  const supabase = await createClient();
  const query = supabase.from("vod_reviews").select("*").order("created_at", { ascending: false });
  const { data, error } = user.role === "coach"
    ? await query.eq("coach_id", user.id)
    : await query.eq("student_id", user.id);
  if (error) return NextResponse.json({ error: "Não foi possível carregar as VODs." }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  const raw = await request.json().catch(() => null);
  const supabase = await createClient();

  if (user.role === "student") {
    const input = submissionSchema.safeParse(raw);
    if (!input.success || !embedUrl(input.data?.url)) {
      return NextResponse.json({ error: "Informe um link válido do YouTube, mapa e agente." }, { status: 400 });
    }
    const { error } = await supabase.from("vod_reviews").insert({
      student_id: user.id,
      coach_id: user.coach_id,
      student_youtube_url: input.data.url,
      map: input.data.map,
      agent: input.data.agent,
      status: "pending",
    });
    if (error) return NextResponse.json({ error: "Não foi possível enviar a VOD." }, { status: 500 });
    return NextResponse.json({ ok: true }, { status: 201 });
  }

  const input = reviewSchema.safeParse(raw);
  if (!input.success || (input.data.review && !embedUrl(input.data.review))) {
    return NextResponse.json({ error: "Revise o link da análise e os campos de feedback." }, { status: 400 });
  }
  const { data, error } = await supabase.from("vod_reviews").update({
    coach_review_youtube_url: input.data.review || null,
    coach_notes: input.data.notes,
    recurring_errors: input.data.errors,
    status: "reviewed",
  }).eq("id", input.data.id).eq("coach_id", user.id).select("id").maybeSingle();
  if (error) return NextResponse.json({ error: "Não foi possível salvar a análise." }, { status: 500 });
  if (!data) return NextResponse.json({ error: "VOD não encontrada para este coach." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
