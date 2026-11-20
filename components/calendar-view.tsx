"use client";

import { useState } from "react";
import type { CalendarEvent, Profile } from "@/lib/types";

type StudentOption = Pick<Profile, "id" | "full_name">;

export function CalendarView({ events, students, coach }: { events: CalendarEvent[]; students: StudentOption[]; coach: boolean }) {
  const [month, setMonth] = useState(new Date());
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const firstDay = new Date(year, monthIndex, 1).getDay();
  const days = new Date(year, monthIndex + 1, 0).getDate();
  const sortedEvents = [...events].sort((a, b) => a.starts_at.localeCompare(b.starts_at));

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

  return <div className="grid split">
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
          const hasEvent = events.some((entry) => new Date(entry.starts_at).toDateString() === date);
          return <button className={`calendar-day ${hasEvent ? "has-event" : ""}`} key={dayNumber} aria-label={`${dayNumber}${hasEvent ? ", compromisso agendado" : ""}`}>
            {dayNumber}{hasEvent && <small>•</small>}
          </button>;
        })}
      </div>
      <h3 className="card-title section-gap">Próximos compromissos</h3>
      {sortedEvents.length ? sortedEvents.map((entry) => <div className="vod-row" key={entry.id}>
        <span className="student-info"><strong>{entry.title}</strong><small>{new Date(entry.starts_at).toLocaleString("pt-BR")} · {entry.kind}</small></span>
      </div>) : <div className="empty">Nenhum compromisso agendado.</div>}
    </section>
    <form className="card" onSubmit={create}>
      <h3 className="card-title">Novo compromisso</h3>
      <label className="label">Título<input name="title" required maxLength={100} className="field" placeholder="Sessão de VOD" /></label>
      <label className="label">Tipo<select className="field" name="kind"><option value="live">Sessão ao vivo</option><option value="vod">Prazo de VOD</option><option value="training">Treino / Scrim</option></select></label>
      {coach && <label className="label">Aluno<select className="field" name="student_id" required>{students.map((student) => <option value={student.id} key={student.id}>{student.full_name}</option>)}</select></label>}
      <label className="label">Data e hora<input name="starts_at" required type="datetime-local" className="field" /></label>
      <label className="label">Notas<textarea name="notes" maxLength={1000} className="field" rows={3} /></label>
      <button className="button primary" disabled={busy}>{busy ? "Agendando…" : "Agendar"}</button>
      {message && <div className="recovery-error" role="alert">{message}</div>}
    </form>
  </div>;
}
