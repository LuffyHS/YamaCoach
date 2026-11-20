import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { embedUrl } from "@/lib/youtube";

const uuid = z.string().uuid();
const routineInput = z.object({
  student_id: uuid,
  title: z.string().trim().min(1).max(120),
  category: z.enum(["warmup", "tdm", "aim", "tactical"]),
  description: z.string().trim().max(1000).optional().default(""),
  youtube_url: z.string().trim().max(500).optional().default(""),
  scheduled_for: z.string().date().optional().or(z.literal("")),
});

async function json(request: Request) {
  return request.json().catch(() => null);
}

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  const supabase = await createClient();
  const query = supabase.from("training_routines").select("*").order("scheduled_for");
  const { data, error } = user.role === "coach"
    ? await query.eq("coach_id", user.id)
    : await query.eq("student_id", user.id);
  if (error) return NextResponse.json({ error: "Não foi possível carregar os treinos." }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  if (user.role !== "student") return NextResponse.json({ error: "Apenas alunos podem concluir seus treinos." }, { status: 403 });
  const body = z.object({ id: uuid, done: z.boolean() }).safeParse(await json(request));
  if (!body.success) return NextResponse.json({ error: "Dados do treino inválidos." }, { status: 400 });

  const supabase = await createClient();
  const { data, error } = await supabase.from("training_routines")
    .update({ is_completed: body.data.done, completed_at: body.data.done ? new Date().toISOString() : null })
    .eq("id", body.data.id).eq("student_id", user.id).select("id").maybeSingle();
  if (error) return NextResponse.json({ error: "Não foi possível atualizar o treino." }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Treino não encontrado." }, { status: 404 });
  return NextResponse.json({ ok: true });
}

export async function PUT(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  if (user.role !== "coach") return NextResponse.json({ error: "Apenas o coach pode criar treinos." }, { status: 403 });
  const body = routineInput.safeParse(await json(request));
  if (!body.success || (body.data.youtube_url && !embedUrl(body.data.youtube_url))) return NextResponse.json({ error: "Revise os dados do treino e informe um link válido do YouTube." }, { status: 400 });

  const supabase = await createClient();
  const { data: student, error: studentError } = await supabase.from("profiles")
    .select("id").eq("id", body.data.student_id).eq("role", "student").maybeSingle();
  if (studentError) return NextResponse.json({ error: "Não foi possível validar o aluno." }, { status: 500 });
  if (!student) return NextResponse.json({ error: "Aluno não encontrado." }, { status: 404 });
  const { data: created, error } = await supabase.from("training_routines").insert({
    ...body.data,
    coach_id: user.id,
    description: body.data.description || null,
    youtube_url: body.data.youtube_url || null,
    scheduled_for: body.data.scheduled_for || new Date().toISOString().slice(0, 10),
  }).select("id").single();
  if (error) return NextResponse.json({ error: "Não foi possível criar o treino." }, { status: 500 });
  return NextResponse.json({ ok: true, id: created.id }, { status: 201 });
}

export async function DELETE(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  if (user.role !== "coach") return NextResponse.json({ error: "Apenas o coach pode remover treinos." }, { status: 403 });
  const id = new URL(request.url).searchParams.get("id");
  if (!uuid.safeParse(id).success) return NextResponse.json({ error: "Treino inválido." }, { status: 400 });
  const supabase = await createClient();
  const { data, error } = await supabase.from("training_routines").delete()
    .eq("id", id).eq("coach_id", user.id).select("id").maybeSingle();
  if (error) return NextResponse.json({ error: "Não foi possível remover o treino." }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Treino não encontrado." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
