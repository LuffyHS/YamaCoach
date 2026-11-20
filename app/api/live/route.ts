import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

const urlField = z.string().trim().max(500).refine((value) => {
  if (!value) return true;
  try { return ["http:", "https:"].includes(new URL(value).protocol); } catch { return false; }
});
const updateSchema = z.object({ id: z.string().uuid(), notes: z.string().max(5000), url: urlField.optional(), title: z.string().trim().max(120).optional() });
const createSchema = z.object({
  student_ids: z.array(z.string().uuid()).min(1).max(6).optional(),
  student_id: z.string().uuid().optional(),
  is_public: z.boolean().optional().default(false),
  title: z.string().trim().min(1).max(120),
  scheduled_at: z.string().min(1).max(40),
  url: urlField.optional().default(""),
  notes: z.string().max(5000).optional().default(""),
});

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  const input = updateSchema.safeParse(await request.json().catch(() => null));
  if (!input.success) return NextResponse.json({ error: "Dados da sessão inválidos." }, { status: 400 });
  if (user.role === "coach" && !input.data.title) {
    return NextResponse.json({ error: "Informe o título da sessão." }, { status: 400 });
  }
  const supabase = await createClient();
  const patch = user.role === "coach"
    ? { notes: input.data.notes, stream_url: input.data.url, title: input.data.title }
    : { notes: input.data.notes };
  let query = supabase.from("live_sessions")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", input.data.id);
  if (user.role === "coach") query = query.eq("coach_id", user.id) as typeof query;
  else query = query.or(`student_id.eq.${user.id},student_ids.cs.{${user.id}}`) as typeof query;
  const { data, error } = await query.select("id").maybeSingle();
  if (error) return NextResponse.json({ error: "Não foi possível salvar a sessão." }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Sessão não encontrada." }, { status: 404 });
  return NextResponse.json({ ok: true });
}

export async function PUT(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  if (user.role !== "coach") return NextResponse.json({ error: "Apenas o coach pode criar sessões." }, { status: 403 });
  const input = createSchema.safeParse(await request.json().catch(() => null));
  if (!input.success || !Number.isFinite(Date.parse(input.data?.scheduled_at || ""))) {
    return NextResponse.json({ error: "Revise os dados da sessão." }, { status: 400 });
  }
  const studentIds = input.data.is_public
    ? [user.id]
    : [...new Set(input.data.student_ids?.length ? input.data.student_ids : input.data.student_id ? [input.data.student_id] : [])];
  if (!studentIds.length) return NextResponse.json({ error: "Selecione ao menos um aluno ou crie uma sala pública." }, { status: 400 });
  const supabase = await createClient();
  if (!input.data.is_public) {
    const { data: students, error: studentError } = await supabase.from("profiles")
      .select("id").in("id", studentIds).eq("role", "student");
    if (studentError) return NextResponse.json({ error: "Não foi possível validar os alunos." }, { status: 500 });
    if ((students ?? []).length !== studentIds.length) return NextResponse.json({ error: "Um ou mais alunos não foram encontrados." }, { status: 404 });
  }
  const { count, error: countError } = await supabase.from("live_sessions").select("id", { count: "exact", head: true }).eq("coach_id", user.id).in("status", ["scheduled", "live"]);
  if (countError) return NextResponse.json({ error: "Não foi possível validar o limite de salas." }, { status: 500 });
  if ((count ?? 0) >= 5) return NextResponse.json({ error: "Você já atingiu o limite de cinco salas ativas. Encerre uma sala para criar outra." }, { status: 409 });
  const { error } = await supabase.from("live_sessions").insert({
    student_id: studentIds[0],
    student_ids: studentIds,
    is_public: input.data.is_public,
    coach_id: user.id,
    title: input.data.title,
    stream_url: input.data.url,
    notes: input.data.notes,
    scheduled_at: new Date(input.data.scheduled_at).toISOString(),
    status: "scheduled",
  });
  if (error) return NextResponse.json({ error: "Não foi possível criar a sessão." }, { status: 500 });
  return NextResponse.json({ ok: true }, { status: 201 });
}

export async function PATCH(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  if (user.role !== "coach") return NextResponse.json({ error: "Apenas o coach pode atualizar o status da sala." }, { status: 403 });
  const input = z.object({ id: z.string().uuid(), status: z.enum(["live", "ended"]) }).safeParse(await request.json().catch(() => null));
  if (!input.success) return NextResponse.json({ error: "Sala inválida." }, { status: 400 });
  const supabase = await createClient();
  const { data, error } = await supabase.from("live_sessions").update({ status: input.data.status, updated_at: new Date().toISOString() }).eq("id", input.data.id).eq("coach_id", user.id).select("id").maybeSingle();
  if (error) return NextResponse.json({ error: "Não foi possível encerrar a sala." }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Sala não encontrada." }, { status: 404 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  if (user.role !== "coach") return NextResponse.json({ error: "Apenas o coach pode excluir salas." }, { status: 403 });
  const input = z.object({ id: z.string().uuid() }).safeParse(await request.json().catch(() => null));
  if (!input.success) return NextResponse.json({ error: "Sala inválida." }, { status: 400 });

  const supabase = await createClient();
  const { data, error } = await supabase.from("live_sessions")
    .delete()
    .eq("id", input.data.id)
    .eq("coach_id", user.id)
    .eq("status", "ended")
    .select("id")
    .maybeSingle();
  if (error) return NextResponse.json({ error: "Não foi possível excluir a sala." }, { status: 500 });
  if (!data) return NextResponse.json({ error: "A sala não foi encontrada ou ainda está ativa." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
