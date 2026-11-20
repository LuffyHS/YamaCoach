import { getSessionUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { AiDiagnosisPanel } from "@/components/ai-diagnosis-panel";

export default async function DiagnosisPage() {
  const user = await getSessionUser();
  if (!user) return <main className="content"><div className="recovery-error">Sessão expirada. Entre novamente.</div></main>;

  if (user.role === "coach") {
    const supabase = await createClient();
    const { data: students } = await supabase.from("profiles").select("id, full_name").eq("role", "student").order("full_name");
    return <main className="content">
      <div className="page-heading"><div><h1>Diagnóstico IA</h1><p>Análise das últimas partidas competitivas de um aluno via HenrikDev + Gemini.</p></div></div>
      <AiDiagnosisPanel coach students={students ?? []} />
    </main>;
  }

  return <main className="content">
    <div className="page-heading"><div><h1>Diagnóstico IA</h1><p>Análise das suas últimas partidas competitivas via HenrikDev + Gemini.</p></div></div>
    <AiDiagnosisPanel studentId={user.id} />
  </main>;
}
