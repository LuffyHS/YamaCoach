import { getSessionUser } from "@/lib/auth/session";
import { LiveRoom } from "@/components/live-room";
import { createClient } from "@/lib/supabase/server";
import { Radio } from "lucide-react";
import type { LiveSession, Profile } from "@/lib/types";

export default async function LivePage() {
  const user = await getSessionUser();
  if (!user) return <main className="content"><div className="recovery-error">Sua sessão expirou. Entre novamente para abrir a sala.</div></main>;

  const supabase = await createClient();
  const sessionQuery = supabase.from("live_sessions").select("*").order("scheduled_at");
  const studentsQuery = user.role === "coach"
    ? supabase.from("profiles").select("id,full_name,current_rank,target_rank").eq("role", "student")
    : Promise.resolve({ data: [], error: null });
  const [{ data: sessionsData, error: sessionsError }, { data: studentsData, error: studentsError }] = await Promise.all([
    user.role === "coach" ? sessionQuery.eq("coach_id", user.id) : sessionQuery.or(`student_id.eq.${user.id},student_ids.cs.{${user.id}},and(is_public.eq.true,status.neq.ended)`),
    studentsQuery,
  ]);

  if (sessionsError || studentsError) return <main className="content">
    <div className="page-heading"><div><h1>Sala ao vivo</h1><p>Uma chamada privada para revisar partidas junto com seu coach.</p></div></div>
    <div className="recovery-error" role="alert">Não foi possível carregar suas sessões. Verifique a conexão com o Supabase.</div>
  </main>;

  const sessions = (sessionsData ?? []) as LiveSession[];
  const students = (studentsData ?? []) as Pick<Profile, "id" | "full_name" | "current_rank" | "target_rank">[];
  const session = sessions.find(item => item.status !== "ended") ?? sessions[0];

  return <main className="content live-page">
    <div className="page-heading live-page-heading">
      <div>
        <div className="live-page-kicker"><span className="live-dot" /> COACHING AO VIVO · {user.role === "coach" ? "ÁREA DO COACH" : "SUA SESSÃO"}</div>
        <h1>Sala ao vivo</h1>
        <p>{user.role === "coach" ? "Abra uma aula para sua turma ou agende uma sessão individual." : "Entre na sala da turma ou na sessão agendada pelo seu coach."}</p>
      </div>
      {session && <div className="live-session-summary"><span className="live-session-icon"><Radio size={17} /></span><span><b>{sessions.length} {sessions.length === 1 ? "sala" : "salas"}</b><small>{session.title}</small></span></div>}
    </div>

    <LiveRoom user={user} sessions={sessions} students={students} />
  </main>;
}
