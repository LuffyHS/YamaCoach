import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

const eventSchema = z.object({
  title: z.string().trim().min(1).max(100),
  kind: z.enum(["live", "vod", "training"]),
  starts_at: z.string().min(1).max(40),
  notes: z.string().max(1000).optional().default(""),
  student_id: z.string().uuid().optional(),
});

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  const supabase = await createClient();
  const query = supabase.from("calendar_events").select("*").order("starts_at");
  const { data, error } = user.role === "coach"
    ? await query.eq("coach_id", user.id)
    : await query.eq("student_id", user.id);
  if (error) return NextResponse.json({ error: "Não foi possível carregar o calendário." }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  const parsed = eventSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || !Number.isFinite(Date.parse(parsed.data?.starts_at || ""))) {
    return NextResponse.json({ error: "Revise os dados do compromisso." }, { status: 400 });
  }
  const input = parsed.data;
  const supabase = await createClient();
  let studentId: string;
  let coachId: string;

  if (user.role === "coach") {
    if (!input.student_id) return NextResponse.json({ error: "Selecione um aluno." }, { status: 400 });
    const { data: student, error } = await supabase.from("profiles")
      .select("id").eq("id", input.student_id).eq("role", "student").maybeSingle();
    if (error) return NextResponse.json({ error: "Não foi possível validar o aluno." }, { status: 500 });
    if (!student) return NextResponse.json({ error: "Aluno não encontrado." }, { status: 404 });
    studentId = student.id;
    coachId = user.id;
  } else {
    if (!user.coach_id) return NextResponse.json({ error: "Seu coach ainda não foi vinculado à conta." }, { status: 409 });
    studentId = user.id;
    coachId = user.coach_id;
  }

  const { error } = await supabase.from("calendar_events").insert({
    student_id: studentId,
    coach_id: coachId,
    title: input.title,
    kind: input.kind,
    starts_at: new Date(input.starts_at).toISOString(),
    notes: input.notes,
  });
  if (error) return NextResponse.json({ error: "Não foi possível criar o compromisso." }, { status: 500 });
  return NextResponse.json({ ok: true }, { status: 201 });
}
