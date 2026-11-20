"use client";

import { useState } from "react";
import type { CalendarEvent, Profile } from "@/lib/types";

type StudentOption = Pick<Profile, "id" | "full_name">;

export function CalendarView({ events, students, coach, now }: { events: CalendarEvent[]; students: StudentOption[]; coach: boolean; now: number }) {
  const [month, setMonth] = useState(() => new Date(now));
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const today = new Date(now).toDateString();
  const firstDay = new Date(year, monthIndex, 1).getDay();
  const days = new Date(year, monthIndex + 1, 0).getDate();
  const sortedEvents = [...events].sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  const upcomingEvents = sortedEvents.filter(event => new Date(event.starts_at).getTime() >= now);

  async function create(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const body = Object.fromEntries(new FormData(event.currentTarget));
    try {
      const response = await fetch("/api/calendar", {
        method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Não foi possível criar o compromisso.");
      window.location.reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha de conexão ao criar o compromisso.");
    } finally {
      setBusy(false);
    }
  }

  return <div className={`grid split calendar-layout ${coach ? "" : "student-calendar-layout"}`}>
    <section className="card">
      <h3 className="card-title">
        <button className="nav-link" aria-label="Mês anterior" onClick={() => setMonth(new Date(year, monthIndex - 1, 1))}>←</button>
        {month.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
        <button className="nav-link" aria-label="Próximo mês" onClick={() => setMonth(new Date(year, monthIndex + 1, 1))}>→</button>
      </h3>
      <div className="calendar-grid">
        {["D", "S", "T", "Q", "Q", "S", "S"].map((label, index) => <b key={`${label}-${index}`}>{label}</b>)}
        {Array.from({ length: firstDay }, (_, index) => <i key={`blank-${index}`} />)}
        {Array.from({ length: days }, (_, index) => {
          const dayNumber = index + 1;
          const date = new Date(year, monthIndex, dayNumber).toDateString();
          const dayEvents = events.filter((entry) => new Date(entry.starts_at).toDateString() === date);
          const isToday = new Date(year, monthIndex, dayNumber).toDateString() === today;
          return <button className={`calendar-day ${dayEvents.length ? "has-event" : ""} ${isToday ? "is-today" : ""}`} key={dayNumber} aria-label={`${dayNumber}${isToday ? ", hoje" : ""}${dayEvents.length ? `, ${dayEvents.length} compromisso(s)` : ""}`}>
            {dayNumber}{dayEvents.length > 0 && <small className="calendar-event-dots">{dayEvents.slice(0, 4).map((entry, eventIndex) => <i key={`${entry.id}-${eventIndex}`} className={`event-dot event-${entry.kind}`} />)}</small>}
          </button>;
        })}
      </div>
      <div className="calendar-legend" aria-label="Legenda dos compromissos"><span><i className="event-dot event-live" />Ao vivo</span><span><i className="event-dot event-vod" />VOD</span><span><i className="event-dot event-training" />Treino</span></div>
      <h3 className="card-title section-gap">Próximos compromissos</h3>
      {upcomingEvents.length ? upcomingEvents.map((entry) => <div className="vod-row calendar-upcoming-row" key={entry.id}>
        <span className={`calendar-event-kind event-kind-${entry.kind}`} />
        <span className="student-info"><strong>{entry.title}</strong><small>{new Date(entry.starts_at).toLocaleString("pt-BR", { dateStyle: "full", timeStyle: "short" })}</small>{entry.notes && <small>{entry.notes}</small>}</span>
        <span className={`calendar-kind-label kind-${entry.kind}`}>{entry.kind === "live" ? "Ao vivo" : entry.kind === "vod" ? "VOD" : "Treino"}</span>
      </div>) : <div className="empty">Nenhum compromisso agendado.</div>}
    </section>
    {coach && <form className="card" onSubmit={create}>
      <h3 className="card-title">Novo compromisso</h3>
      <label className="label">Título<input name="title" required maxLength={100} className="field" placeholder="Sessão de VOD" /></label>
      <label className="label">Tipo<select className="field" name="kind"><option value="live">Sessão ao vivo</option><option value="vod">Prazo de VOD</option><option value="training">Treino / Scrim</option></select></label>
      {coach && <label className="label">Aluno<select className="field" name="student_id" required>{students.map((student) => <option value={student.id} key={student.id}>{student.full_name}</option>)}</select></label>}
      <label className="label">Data e hora<input name="starts_at" required type="datetime-local" className="field" /></label>
      <label className="label">Notas<textarea name="notes" maxLength={1000} className="field" rows={3} /></label>
      <button className="button primary" disabled={busy}>{busy ? "Agendando…" : "Agendar"}</button>
      {message && <div className="recovery-error" role="alert">{message}</div>}
    </form>}
  </div>;
}
