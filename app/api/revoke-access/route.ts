import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  if (user.role !== "coach") return NextResponse.json({ error: "Apenas o coach pode revogar acesso." }, { status: 403 });

  const form = await request.formData().catch(() => null);
  let studentId = String(form?.get("student_id") || "");
  if (!studentId) {
    const body = await request.json().catch(() => null);
    studentId = String(body?.student_id || "");
  }
  if (!studentId || !/^[0-9a-f-]{36}$/i.test(studentId)) {
    return NextResponse.json({ error: "Aluno inválido." }, { status: 400 });
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      is_active: false,
      subscription_status: "canceled",
      subscription_expires_at: null,
    })
    .eq("id", studentId)
    .eq("role", "student");

  if (error) return NextResponse.json({ error: "Não foi possível revogar o acesso." }, { status: 500 });

  revalidatePath("/dashboard/alunos");
  revalidatePath("/dashboard");
  return NextResponse.redirect(new URL("/dashboard/alunos?revoked=1", request.url), 303);
}
