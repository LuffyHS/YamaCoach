import { getSessionUser } from "@/lib/auth/session";
import { CalendarView } from "@/components/calendar-view";
import { createClient } from "@/lib/supabase/server";
import type { CalendarEvent, Profile } from "@/lib/types";

export default async function CalendarPage() {
  const user = await getSessionUser();
  if (!user) return <main className="content"><div className="recovery-error">Sessão expirada. Entre novamente.</div></main>;
  const supabase = await createClient();
  const studentsQuery = user.role === "coach"
    ? supabase.from("profiles").select("id,full_name").eq("role", "student")
    : supabase.from("profiles").select("id,full_name").eq("id", user.id);
  const eventsQuery = supabase.from("calendar_events").select("*").order("starts_at")
    .eq(user.role === "coach" ? "coach_id" : "student_id", user.id);
  const [{ data: studentData, error: studentError }, { data: eventData, error: eventError }] = await Promise.all([studentsQuery, eventsQuery]);

  if (studentError || eventError) return <main className="content">
    <div className="page-heading"><div><h1>Calendário</h1><p>Compromissos compartilhados entre coach e aluno.</p></div></div>
    <div className="recovery-error" role="alert">Não foi possível carregar o calendário. Verifique a conexão e as tabelas do Supabase.</div>
  </main>;

  return <main className="content">
    <div className="page-heading"><div><h1>Calendário</h1><p>Compromissos compartilhados entre coach e aluno.</p></div></div>
    <CalendarView events={(eventData ?? []) as CalendarEvent[]} students={(studentData ?? []) as Pick<Profile, "id" | "full_name">[]} coach={user.role === "coach"} />
  </main>;
}
