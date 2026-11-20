import Link from "next/link";
import { ArrowLeft, ArrowUpRight, Crosshair, Monitor, Settings2, Shield, UserRound } from "lucide-react";
import { getSessionUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { SetupForm, defaultSetup } from "@/components/setup-form";
import type { PlayerSetup, Profile } from "@/lib/types";
import { ValorantRankBadge } from "@/components/valorant-rank-badge";
import { ValorantAgentAvatar } from "@/components/valorant-agent-avatar";

function isTrackerUrl(value: string | null | undefined) {
  if (!value) return false;
  try { const url = new URL(value); return url.protocol === "https:" && ["tracker.gg", "www.tracker.gg"].includes(url.hostname) && url.pathname.startsWith("/valorant/profile/"); }
  catch { return false; }
}

export default async function SetupPage({ searchParams }: { searchParams: Promise<{ student?: string }> }) {
  const user = await getSessionUser();
  if (!user) return <main className="content"><div className="recovery-error">Sessão expirada. Entre novamente.</div></main>;
  const params = await searchParams;
  const supabase = await createClient();

  if (user.role === "coach" && !params.student) {
    const [{ data, error }, { data: rankHistory, error: rankError }] = await Promise.all([
      supabase.from("profiles").select("id,full_name,email,riot_id,initial_rank,current_rank,target_rank,setup,tracker_url,subscription_status").eq("role", "student").order("full_name"),
      supabase.from("rank_history").select("student_id,rank,recorded_at").order("recorded_at", { ascending: false }),
    ]);
    if (error || rankError) return <main className="content"><div className="recovery-error" role="alert">Não foi possível carregar a lista de alunos.</div></main>;
    const latestRanks = new Map<string, string>();
    for (const entry of rankHistory ?? []) if (!latestRanks.has(entry.student_id)) latestRanks.set(entry.student_id, entry.rank);
    const students = (data ?? []) as Pick<Profile, "id" | "full_name" | "email" | "riot_id" | "initial_rank" | "current_rank" | "target_rank" | "setup" | "tracker_url" | "subscription_status">[];
    return <main className="content setup-page">
      <div className="page-heading"><div><div className="setup-page-kicker"><Settings2 size={14} /> GESTÃO DE ALUNOS</div><h1>Fichas técnicas</h1><p>Consulte o setup, as configurações e o perfil competitivo de cada aluno.</p></div><span className="setup-count">{students.length} {students.length === 1 ? "aluno" : "alunos"}</span></div>
      {students.length === 0 ? <div className="card setup-empty"><UserRound size={25} /><h2>Nenhum aluno cadastrado</h2><p>Quando um jogador entrar na plataforma, sua ficha aparecerá aqui.</p><Link className="button secondary" href="/dashboard/alunos">Ir para gestão de alunos</Link></div> :
        <div className="setup-student-grid">{students.map(student => {
          const setup: Partial<PlayerSetup> = student.setup && typeof student.setup === "object" ? student.setup : {};
          const agents = Array.isArray(setup.agents) ? setup.agents.filter(Boolean).slice(0, 3) : [];
          const edpi = (Number(setup.dpi) || 0) * (Number(setup.sensitivity) || 0);
          const populated = [setup.processor, setup.gpu, setup.mouse, setup.dpi].filter(Boolean).length;
          return <article className="card setup-student-card" key={student.id}>
            <div className="setup-student-top"><span className="setup-student-avatar">{student.full_name?.slice(0, 1).toUpperCase() || "A"}</span><span className="setup-student-heading"><strong>{student.full_name || "Aluno"}</strong><small>{student.email}</small></span><span className={`setup-status ${student.subscription_status === "active" ? "is-active" : ""}`}><i />{student.subscription_status === "active" ? "Ativo" : "Inativo"}</span></div>
            <div className="setup-rank-line setup-rank-triple"><span><small>INÍCIO</small><ValorantRankBadge rank={student.initial_rank || student.current_rank || latestRanks.get(student.id)} size="sm" /></span><span className="setup-rank-arrow">→</span><span><small>ATUAL</small><ValorantRankBadge rank={student.current_rank || latestRanks.get(student.id)} size="md" /></span><span className="setup-rank-arrow">→</span><span><small>META</small><ValorantRankBadge rank={student.target_rank} size="sm" /></span></div>
            <div className="setup-quick-stats"><span><Monitor size={14} /><b>{setup.monitor_hz ? `${setup.monitor_hz} Hz` : "Monitor —"}</b></span><span><Crosshair size={14} /><b>{edpi ? `${edpi} eDPI` : "eDPI —"}</b></span><span><Shield size={14} /><b>{student.riot_id || "Riot ID não informado"}</b></span></div>
            <div className="setup-card-agents"><small>AGENTES</small><div>{agents.length ? agents.map(agent => <span className="setup-agent-chip" key={agent}><ValorantAgentAvatar name={agent} size={23} />{agent}</span>) : <em>Sem agentes cadastrados</em>}</div></div>
            <div className="setup-card-footer"><span>{populated ? `${populated} dados de hardware` : "Ficha ainda não preenchida"}</span><div>{isTrackerUrl(student.tracker_url) && <a className="tracker-shortcut" href={student.tracker_url!} target="_blank" rel="noreferrer">Tracker <ArrowUpRight size={13} /></a>}<Link className="button primary setup-open-button" href={`/dashboard/setup?student=${student.id}`}>Abrir ficha <ArrowUpRight size={14} /></Link></div></div>
          </article>;
        })}</div>}
    </main>;
  }

  let profile: Profile | null = user;
  if (user.role === "coach") {
    const { data, error } = await supabase.from("profiles").select("*").eq("id", params.student!).eq("role", "student").maybeSingle();
    if (error) return <main className="content"><div className="recovery-error" role="alert">Não foi possível carregar a ficha deste aluno.</div></main>;
    if (!data) return <main className="content"><div className="empty">Aluno não encontrado.</div></main>;
    profile = data as Profile;
  } else {
    const { data, error } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
    if (error) return <main className="content"><div className="recovery-error" role="alert">Não foi possível carregar sua ficha técnica.</div></main>;
    if (data) profile = data as Profile;
  }

  if (profile && !profile.current_rank) {
    const { data: latestRank } = await supabase.from("rank_history").select("rank").eq("student_id", profile.id).order("recorded_at", { ascending: false }).limit(1).maybeSingle();
    if (latestRank?.rank) profile = { ...profile, current_rank: latestRank.rank };
  }

  const setup: Partial<PlayerSetup> = profile.setup && typeof profile.setup === "object" ? profile.setup : {};
  const safeSetup: PlayerSetup = { ...defaultSetup, ...setup, agents: Array.isArray(setup.agents) ? setup.agents : [] };
  return <main className="content setup-page">
    {user.role === "coach" && <Link className="setup-back-link" href="/dashboard/setup"><ArrowLeft size={15} /> Todos os alunos</Link>}
    <div className="page-heading"><div><div className="setup-page-kicker"><Settings2 size={14} /> {user.role === "coach" ? "FICHA DO ALUNO" : "SEU PERFIL COMPETITIVO"}</div><h1>{profile.full_name}</h1><p>{user.role === "coach" ? "Ficha técnica, configurações e metas individuais." : "Seu equipamento e suas configurações, organizados em um só lugar."}</p></div><div className="setup-header-summary"><span className="setup-count">{profile.riot_id || "Riot ID não informado"}</span><div className="setup-header-ranks"><ValorantRankBadge rank={profile.current_rank} size="sm" /><span>→</span><ValorantRankBadge rank={profile.target_rank} size="sm" /></div></div></div>
    <SetupForm initial={safeSetup} editable={true} coach={user.role === "coach"} studentId={profile.id} trackerUrl={profile.tracker_url || ""} riotId={profile.riot_id || ""}
      rank={{ initial: profile.initial_rank || profile.rank_goal_start || profile.current_rank || "", current: profile.current_rank || "", target: profile.target_rank || "", errors: profile.recurring_errors || "" }} />
  </main>;
}
