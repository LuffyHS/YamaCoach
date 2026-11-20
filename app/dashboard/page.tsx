import Link from "next/link";
import { getSessionUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { rankGoalPercent } from "@/lib/ranks";
import { RoutineList } from "@/components/routine-list";
import type { Profile, TrainingRoutine, VodReview } from "@/lib/types";

export default async function DashboardPage() {
  const user = await getSessionUser();
  if (!user) return <main className="content"><div className="recovery-error">Sessão expirada. Entre novamente.</div></main>;
  const supabase = await createClient();
  const coach = user.role === "coach";
  let students: Profile[] = [];
  let routines: TrainingRoutine[] = [];
  let vods: VodReview[] = [];
  let currentRank = user.current_rank;
  let loadFailed = false;

  if (coach) {
    const { data, error } = await supabase.from("profiles").select("*").eq("role", "student");
    if (error) loadFailed = true;
    students = (data ?? []) as Profile[];
    const [{ data: routineData, error: routineError }, { data: vodData, error: vodError }] = await Promise.all([
      supabase.from("training_routines").select("*").eq("coach_id", user.id),
      supabase.from("vod_reviews").select("*").eq("coach_id", user.id),
    ]);
    if (routineError || vodError) loadFailed = true;
    routines = (routineData ?? []) as TrainingRoutine[];
    vods = (vodData ?? []) as VodReview[];
  } else {
    const [{ data: routineData, error: routineError }, { data: vodData, error: vodError }, { data: rankData, error: rankError }] = await Promise.all([
      supabase.from("training_routines").select("*").eq("student_id", user.id),
      supabase.from("vod_reviews").select("*").eq("student_id", user.id),
      supabase.from("rank_history").select("rank").eq("student_id", user.id).order("recorded_at", { ascending: false }).limit(1).maybeSingle(),
    ]);
    if (routineError || vodError || rankError) loadFailed = true;
    currentRank ||= rankData?.rank ?? null;
    routines = (routineData ?? []) as TrainingRoutine[];
    vods = (vodData ?? []) as VodReview[];
  }

  if (loadFailed) return <main className="content">
    <div className="page-heading"><h1>Painel</h1></div>
    <div className="recovery-error" role="alert">Não foi possível carregar os dados do painel. Confira a conexão e as permissões do Supabase.</div>
  </main>;

  const completed = routines.filter((routine) => routine.is_completed).length;
  return <main className="content">
    <div className="page-heading">
      <div><h1>{coach ? "Painel do coach" : `Olá, ${user.full_name.split(" ")[0]}`}</h1><p>{coach ? "Acompanhe a evolução dos seus alunos." : "Seu progresso começa com consistência."}</p></div>
      <div className="dashboard-heading-actions">{coach && <Link className="button primary" href="/dashboard/treinos">Atribuir treino</Link>}<Link className="button secondary" href="/dashboard/vods">VOD reviews</Link></div>
    </div>
    <div className="grid stats">
      <div className="card"><div className="stat-label">{coach ? "Alunos" : "Patente atual"}</div><div className="stat-value">{coach ? students.length : currentRank || "—"}</div><div className="stat-note">{coach ? "cadastrados" : `Meta: ${user.target_rank || "não definida"}`}</div></div>
      <div className="card"><div className="stat-label">Treinos concluídos</div><div className="stat-value">{completed}/{routines.length}</div></div>
      <div className="card"><div className="stat-label">VODs pendentes</div><div className="stat-value">{vods.filter((vod) => vod.status === "pending").length}</div></div>
      <div className="card"><div className="stat-label">Acesso</div><div className="stat-value" style={{ fontSize: 18 }}>{user.subscription_status || (user.is_active ? "Ativo" : "Inativo")}</div></div>
    </div>
    {!coach && <>
      <div className="card rank-goal-card section-gap"><div className="rank-goal-heading"><div><span className="stat-label">MISSÃO DE ELO</span><h3>{currentRank || "Elo atual pendente"} <span>→</span> {user.target_rank || "Meta não definida"}</h3></div><strong>{rankGoalPercent(currentRank, user.target_rank, user.rank_goal_start ?? currentRank)}%</strong></div><div className="progress"><i style={{ width: `${rankGoalPercent(currentRank, user.target_rank, user.rank_goal_start ?? currentRank)}%` }} /></div><small className="rank-goal-caption">{user.target_rank ? "O progresso acompanha as atualizações de elo no seu perfil." : "Peça ao coach para definir seu objetivo de elo."}</small></div>
      {user.recurring_errors && <div className="notice"><b>Pontos de atenção</b><br />{user.recurring_errors}</div>}
    </>}
    <div className="grid split">
      <section className="card">
        <h3 className="card-title">{coach ? "Alunos" : "Rotina de treino"}</h3>
        {coach ? students.length ? students.map((student) => <div className="student-row" key={student.id}><span className="student-info"><strong>{student.full_name}</strong><small>{student.current_rank || "Elo não definido"} → {student.target_rank || "Meta não definida"}</small></span></div>) : <div className="empty">Nenhum aluno cadastrado ainda.</div>
          : routines.length ? <RoutineList items={routines} /> : <div className="empty">Nenhum treino atribuído ainda.</div>}
      </section>
      <section className="card"><h3 className="card-title">VODs recentes</h3>
        {vods.length ? vods.slice(0, 4).map((vod) => <div className="vod-row" key={vod.id}>{vod.map} · {vod.agent} <span className="status">{vod.status}</span></div>) : <div className="empty">Nenhuma VOD enviada ainda.</div>}
      </section>
    </div>
  </main>;
}
