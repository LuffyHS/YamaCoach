import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { CoachTrainingManager } from "@/components/coach-training-manager";
import type { Profile, TrainingRoutine } from "@/lib/types";

export default async function CoachTrainingPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.role !== "coach") redirect("/dashboard");
  const supabase = await createClient();
  const [{ data: students, error: studentsError }, { data: routines, error: routinesError }] = await Promise.all([
    supabase.from("profiles").select("id,full_name,current_rank,target_rank").eq("role", "student").order("full_name"),
    supabase.from("training_routines").select("*").eq("coach_id", user.id).order("scheduled_for", { ascending: false }),
  ]);
  if (studentsError || routinesError) return <main className="content"><div className="page-heading"><div><h1>Treinos dos alunos</h1><p>Monte rotinas e envie vídeos de referência.</p></div></div><div className="recovery-error" role="alert">Não foi possível carregar os treinos. Verifique se a coluna de links do YouTube foi criada no Supabase.</div></main>;
  return <main className="content coach-training-page"><div className="page-heading"><div><div className="training-kicker">COACH WORKSPACE · TREINAMENTO</div><h1>Treinos dos alunos</h1><p>Crie rotinas personalizadas com instruções, data e vídeos para assistir.</p></div></div><CoachTrainingManager students={(students ?? []) as Pick<Profile, "id" | "full_name" | "current_rank" | "target_rank">[]} routines={(routines ?? []) as TrainingRoutine[]} /></main>;
}
