import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Faça login para continuar." }, { status: 401 });
  if (user.role !== "coach") return NextResponse.json({ error: "Apenas o coach pode revisar pagamentos." }, { status: 403 });

  const form = await request.formData().catch(() => null);
  const id = String(form?.get("id") || "");
  const decision = String(form?.get("decision") || "");
  if (!/^[0-9a-f-]{36}$/i.test(id) || !["approved", "rejected"].includes(decision)) {
    return NextResponse.json({ error: "Solicitação de revisão inválida." }, { status: 400 });
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("review_pix_payment", {
    p_payment_id: id,
    p_decision: decision,
  });
  if (error) {
    const status = /not found|não encontrado/i.test(error.message) ? 404 : 409;
    return NextResponse.json({ error: "Não foi possível concluir a revisão. Atualize a fila e tente novamente." }, { status });
  }

  revalidatePath("/dashboard/alunos");
  revalidatePath("/dashboard");
  return NextResponse.redirect(new URL("/dashboard/alunos?payment=updated", request.url), 303);
}
