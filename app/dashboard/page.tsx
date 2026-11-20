import Link from "next/link";
import { getSessionUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { valorantRankProgress } from "@/lib/valorant-ranks";
import { RoutineList } from "@/components/routine-list";
import { CheckCircle2, ChevronRight, ShieldCheck, Users, Video } from "lucide-react";
import type { Profile, TrainingRoutine, VodReview } from "@/lib/types";
import { ValorantRankBadge } from "@/components/valorant-rank-badge";

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
  const rankProgress = valorantRankProgress(user.initial_rank || user.rank_goal_start || currentRank, currentRank, user.target_rank);
  if (coach) {
    const activeStudents = students.filter((student) => student.is_active && student.subscription_status === "active" && Boolean(student.subscription_expires_at));
    const pendingVods = vods.filter((vod) => vod.status === "pending");
    const recentVods = [...vods].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 5);
    return <main className="content coach-dashboard">
      <div className="coach-dashboard-heading">
        <div><span className="coach-dashboard-eyebrow">YAMA / COACH WORKSPACE</span><h1>Painel do coach</h1><p>Visão geral da sua operação e da evolução dos alunos.</p></div>
        <div className="dashboard-heading-actions"><Link className="button primary" href="/dashboard/treinos"><CheckCircle2 size={15} /> Atribuir treino</Link><Link className="button secondary" href="/dashboard/vods"><Video size={15} /> VOD reviews</Link></div>
      </div>
      <section className="coach-metrics" aria-label="Resumo do painel">
        <article className="coach-metric-card"><div className="coach-metric-top"><span>ALUNOS ATIVOS</span><i><Users size={16} /></i></div><strong>{activeStudents.length}</strong><small>{students.length} cadastrados no workspace</small></article>
        <article className="coach-metric-card"><div className="coach-metric-top"><span>TREINOS CONCLUÍDOS</span><i><CheckCircle2 size={16} /></i></div><strong>{completed}<small> / {routines.length}</small></strong><small>{routines.length ? `${Math.round(completed / routines.length * 100)}% de conclusão` : "Meta semanal: ainda sem treinos"}</small></article>
        <article className="coach-metric-card"><div className="coach-metric-top"><span>VODS PENDENTES</span><i><Video size={16} /></i></div><strong>{pendingVods.length}</strong><small>{pendingVods.length ? "Fila aguardando análise" : "Fila de revisão em dia"}</small></article>
        <article className="coach-metric-card"><div className="coach-metric-top"><span>SEU ACESSO</span><i><ShieldCheck size={16} /></i></div><strong className="coach-plan-value">Coach</strong><small>Workspace de acompanhamento</small></article>
      </section>
      <section className="coach-dashboard-bottom">
        <article className="coach-panel coach-students-panel">
          <header className="coach-panel-heading"><div><div className="coach-panel-title">Alunos ativos <span>{activeStudents.length}</span></div><p>Alunos com acesso vigente ao acompanhamento.</p></div><Link href="/dashboard/alunos">Ver todos <ChevronRight size={14} /></Link></header>
          <div className="coach-student-list">
            {activeStudents.length ? activeStudents.slice(0, 8).map((student) => <div className="coach-student-item" key={student.id}>
              <span className="coach-student-avatar">{student.full_name.split(/\s+/).map((part) => part[0]).slice(0, 2).join("").toUpperCase()}</span>
              <span className="coach-student-name"><b>{student.full_name}</b><small>{student.riot_id || student.email}</small></span>
              <span className="coach-rank-pair"><ValorantRankBadge rank={student.current_rank} size="sm" /><span>→</span><ValorantRankBadge rank={student.target_rank} size="sm" /></span>
              <span className="coach-student-status"><i /> Ativo</span>
              <Link className="coach-manage-link" href={`/dashboard/setup?student=${student.id}`}>Gerenciar <ChevronRight size={14} /></Link>
            </div>) : <div className="coach-empty-inline"><Users size={19} /><b>Nenhum aluno ativo no momento</b><span>Os alunos com acesso vigente aparecerão aqui.</span><Link href="/dashboard/alunos">Abrir gestão de alunos <ChevronRight size={14} /></Link></div>}
          </div>
        </article>
        <article className="coach-panel coach-vods-panel">
          <header className="coach-panel-heading"><div><div className="coach-panel-title">VODs recentes <span>{pendingVods.length} pendentes</span></div><p>Partidas enviadas para sua análise.</p></div><Link href="/dashboard/vods">Fila completa <ChevronRight size={14} /></Link></header>
          {recentVods.length ? <div className="coach-vod-list">{recentVods.map((vod) => <Link className="coach-vod-item" href="/dashboard/vods" key={vod.id}><span className="coach-vod-icon"><Video size={16} /></span><span><b>{vod.map || "Mapa não informado"} · {vod.agent || "Agente não informado"}</b><small>{vod.status === "pending" ? "Aguardando revisão" : "Revisada"}</small></span><i className={vod.status === "pending" ? "is-pending" : ""} /><ChevronRight size={14} /></Link>)}</div> : <div className="coach-empty-inline coach-vod-empty"><span className="coach-empty-icon"><Video size={18} /></span><b>Nenhuma VOD na fila</b><span>As partidas enviadas pelos alunos aparecerão aqui para revisão.</span><Link href="/dashboard/vods">Abrir fila de VODs <ChevronRight size={14} /></Link></div>}
        </article>
      </section>
    </main>;
  }
  return <main className="content">
    <div className="page-heading">
      <div><h1>{coach ? "Painel do coach" : `Olá, ${user.full_name.split(" ")[0]}`}</h1><p>{coach ? "Acompanhe a evolução dos seus alunos." : "Seu progresso começa com consistência."}</p></div>
      <div className="dashboard-heading-actions">{coach && <Link className="button primary" href="/dashboard/treinos">Atribuir treino</Link>}<Link className="button secondary" href="/dashboard/vods">VOD reviews</Link></div>
    </div>
    <div className="grid stats">
      <div className="card"><div className="stat-label">{coach ? "Alunos" : "Patente atual"}</div><div className="stat-value">{coach ? students.length : <ValorantRankBadge rank={currentRank} size="lg" />}</div><div className="stat-note">{coach ? "cadastrados" : <>Meta: <ValorantRankBadge rank={user.target_rank} size="sm" /></>}</div></div>
      <div className="card"><div className="stat-label">Treinos concluídos</div><div className="stat-value">{completed}/{routines.length}</div></div>
      <div className="card"><div className="stat-label">VODs pendentes</div><div className="stat-value">{vods.filter((vod) => vod.status === "pending").length}</div></div>
      <div className="card"><div className="stat-label">Acesso</div><div className="stat-value" style={{ fontSize: 18 }}>{user.subscription_status || (user.is_active ? "Ativo" : "Inativo")}</div></div>
    </div>
    {!coach && <>
      <div className="card rank-goal-card section-gap"><div className="rank-goal-heading"><div><span className="stat-label">MISSÃO DE ELO</span><div className="rank-mission-stages"><div><small>INÍCIO</small><ValorantRankBadge rank={user.initial_rank || user.rank_goal_start || currentRank} size="sm" /></div><span className="rank-mission-arrow">→</span><div className="rank-stage-current"><small>ATUAL</small><ValorantRankBadge rank={currentRank} size="lg" /></div><span className="rank-mission-arrow">→</span><div><small>META</small><ValorantRankBadge rank={user.target_rank} size="sm" /></div></div></div><strong>{rankProgress}%</strong></div><div className="progress rank-mission-progress"><i style={{ width: `${rankProgress}%` }} /></div><small className="rank-goal-caption">{user.target_rank ? "Progresso calculado entre o elo inicial e a meta definida pelo coach." : "Peça ao coach para definir seu objetivo de elo."}</small></div>
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
