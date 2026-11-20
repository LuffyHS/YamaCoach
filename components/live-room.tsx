"use client";

import { useMemo, useState } from "react";
import { ArrowUpRight, CalendarClock, CirclePlus, Radio, Trash2, Users, X } from "lucide-react";
import type { LiveSession, Profile } from "@/lib/types";
import { StreamRoom } from "@/components/stream-room";

type SessionUser = Pick<Profile, "id" | "role" | "full_name">;
type StudentOption = Pick<Profile, "id" | "full_name">;

export function LiveRoom({ user, sessions, students = [] }: { user: SessionUser; sessions: LiveSession[]; students?: StudentOption[] }) {
  const activeSessions = useMemo(() => sessions.filter(s => s.status !== "ended"), [sessions]);
  const [selectedId, setSelectedId] = useState(activeSessions[0]?.id ?? sessions[0]?.id ?? "");
  const session = sessions.find(item => item.id === selectedId) ?? activeSessions[0] ?? sessions[0];
  const [notes, setNotes] = useState(session?.notes || "");
  const [title, setTitle] = useState(session?.title || "");
  const [url, setUrl] = useState(session?.stream_url || "");
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const sessionStudentIds = session?.student_ids?.length ? session.student_ids : session?.student_id ? [session.student_id] : [];
  const selectedNames = sessionStudentIds.map(id => students.find(s => s.id === id)?.full_name).filter(Boolean);
  const participantList = user.role === "coach"
    ? sessionStudentIds.map(id => ({ id, name: students.find(s => s.id === id)?.full_name || "Aluno" }))
    : session?.coach_id ? [{ id: session.coach_id, name: "Coach" }] : [];

  function selectSession(item: LiveSession) {
    setSelectedId(item.id); setNotes(item.notes || ""); setTitle(item.title || ""); setUrl(item.stream_url || ""); setMessage("");
  }

  async function save() {
    if (!session) return;
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/live", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: session.id, notes, ...(user.role === "coach" ? { title, url } : {}) }) });
      const result = await response.json(); if (!response.ok) throw new Error(result.error || "Não foi possível salvar.");
      setMessage("Alterações salvas.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Falha de conexão ao salvar."); }
    finally { setBusy(false); }
  }

  async function create(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!selectedStudents.length) { setMessage("Selecione pelo menos um aluno."); return; }
    setBusy(true); setMessage("");
    const data = new FormData(event.currentTarget);
    const body = { title: data.get("title"), scheduled_at: data.get("scheduled_at"), url: data.get("url"), notes: "", student_ids: selectedStudents };
    try {
      const response = await fetch("/api/live", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const result = await response.json(); if (!response.ok) throw new Error(result.error || "Não foi possível criar a sessão.");
      window.location.reload();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Falha de conexão ao criar a sala."); }
    finally { setBusy(false); }
  }

  async function endSession() {
    if (!session) return;
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/live", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: session.id, status: "ended" }) });
      const result = await response.json(); if (!response.ok) throw new Error(result.error || "Não foi possível encerrar a sala.");
      window.location.reload();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Falha ao encerrar a sala."); }
    finally { setBusy(false); }
  }

  async function deleteSession(item: LiveSession) {
    if (item.status !== "ended" || !window.confirm(`Excluir a sala “${item.title}”? Essa ação não pode ser desfeita.`)) return;
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/live", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: item.id }) });
      const result = await response.json(); if (!response.ok) throw new Error(result.error || "Não foi possível excluir a sala.");
      window.location.reload();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Falha ao excluir a sala."); }
    finally { setBusy(false); }
  }

  function toggleStudent(id: string) {
    if (selectedStudents.includes(id)) setSelectedStudents(selectedStudents.filter(value => value !== id));
    else if (selectedStudents.length >= 6) setMessage("Cada sala pode ter até seis alunos.");
    else { setMessage(""); setSelectedStudents([...selectedStudents, id]); }
  }

  return <div className="live-workspace">
    <section className="live-rooms-panel card">
      <div className="live-rooms-heading"><div><span className="live-page-kicker">SALAS DISPONÍVEIS</span><h2>Suas salas ao vivo</h2><p>{user.role === "coach" ? "Até cinco sessões ativas, individuais ou em grupo." : "Escolha uma sessão para entrar com seu coach."}</p></div><span className="live-room-limit">{activeSessions.length}/5</span></div>
      <div className="live-room-list">
        {sessions.length === 0 && <div className="live-room-empty"><Radio size={19} /><span>{user.role === "coach" ? "Nenhuma sala criada ainda." : "Seu coach ainda não agendou uma sessão."}</span></div>}
        {sessions.map(item => {
          const ids = item.student_ids?.length ? item.student_ids : [item.student_id];
          const names = ids.map(id => students.find(s => s.id === id)?.full_name).filter(Boolean);
          return <div key={item.id} className="live-room-row">
            <button type="button" className={`live-room-choice ${item.id === session?.id ? "is-selected" : ""}`} onClick={() => selectSession(item)}>
              <span className={`live-room-choice-icon ${item.status === "live" ? "is-live" : ""}`}><Radio size={16} /></span>
              <span className="live-room-choice-info"><b>{item.title}</b><small><Users size={12} />{names.length ? names.join(", ") : "Sala individual"}</small></span>
              <span className={`live-room-state ${item.status === "live" ? "is-live" : item.status === "ended" ? "is-ended" : ""}`}><i />{item.status === "live" ? "Ao vivo" : item.status === "ended" ? "Encerrada" : "Agendada"}</span>
            </button>
            {user.role === "coach" && item.status === "ended" && <button type="button" className="live-room-delete" title="Excluir sala encerrada" aria-label={`Excluir a sala ${item.title}`} disabled={busy} onClick={() => void deleteSession(item)}><Trash2 size={15}/><span>Excluir</span></button>}
          </div>;
        })}
      </div>
      {user.role === "coach" && activeSessions.length < 5 && <details className="live-create-details"><summary><CirclePlus size={16} /> Criar nova sala</summary>
        <form className="live-create-form" onSubmit={create}>
          <div className="live-student-picker"><div className="live-picker-label"><span>Participantes</span><small>{selectedStudents.length} selecionados</small></div>
            <div className="live-student-options">{students.map(student => <label key={student.id} className={`live-student-option ${selectedStudents.includes(student.id) ? "is-selected" : ""}`}><input type="checkbox" checked={selectedStudents.includes(student.id)} onChange={() => toggleStudent(student.id)} /><span>{student.full_name.slice(0, 1).toUpperCase()}</span>{student.full_name}</label>)}</div>
            {!students.length && <small>Nenhum aluno cadastrado ainda.</small>}
          </div>
          <div className="live-create-fields"><label className="label">Título<input name="title" required maxLength={120} className="field" placeholder="Revisão de VOD em grupo" /></label><label className="label">Data e hora<input name="scheduled_at" type="datetime-local" required className="field" /></label><label className="label">Link adicional (opcional)<input name="url" type="url" maxLength={500} className="field" placeholder="https://" /></label></div>
          <button className="button primary" disabled={busy || !students.length}>{busy ? "Criando sala…" : "Criar sala"}</button>
        </form>
      </details>}
      {user.role === "coach" && activeSessions.length >= 5 && <div className="live-limit-note"><span>Limite de 5 salas ativas atingido.</span> Encerre uma sala para abrir outra.</div>}
    </section>

    {session ? <>
      <StreamRoom key={session.id} sessionId={session.id} userId={user.id} coach={user.role === "coach"} participants={participantList} />
      <section className="live-session-details">
        <div className="live-details-heading"><div><div className="live-page-kicker">{session.status === "ended" ? "SESSÃO ENCERRADA" : "SESSÃO SELECIONADA"}</div><h2>{session.title}</h2></div><span className="live-session-id"><CalendarClock size={13} />{new Date(session.scheduled_at).toLocaleString("pt-BR", { dateStyle: "medium", timeStyle: "short" })}</span></div>
        <div className="grid split live-details-grid"><section className="card"><h3 className="card-title">Informações da sala</h3><p className="live-participant-names"><Users size={15} />{selectedNames.length ? selectedNames.join(", ") : "Participantes da sessão"}</p>
          {user.role === "coach" && <><label className="label">Título<input className="field" maxLength={120} value={title} onChange={e => setTitle(e.target.value)} /></label><label className="label">Link adicional<input className="field" type="url" maxLength={500} value={url} onChange={e => setUrl(e.target.value)} /></label><div className="live-session-actions"><button className="button secondary" onClick={() => void save()} disabled={busy}>Salvar alterações</button>{session.status !== "ended" && <button className="button live-end-button" onClick={() => void endSession()} disabled={busy}><X size={14} /> Encerrar sala</button>}</div></>}
          {session.stream_url && <a className="live-extra-link" href={session.stream_url} target="_blank" rel="noreferrer">Abrir link adicional <ArrowUpRight size={14} /></a>}
        </section><section className="card"><h3 className="card-title">Notas compartilhadas</h3><textarea className="field" rows={8} maxLength={5000} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Anote os principais pontos desta sessão…" /><button className="button primary" onClick={() => void save()} disabled={busy}>{busy ? "Salvando…" : "Salvar notas"}</button>{message && <div className="toast" role="status">{message}</div>}</section></div>
      </section>
    </> : <div className="live-empty-banner"><div className="live-empty-icon"><Radio size={20} /></div><div><b>Nenhuma sala selecionada</b><span>{user.role === "coach" ? "Crie uma sala e escolha um ou mais alunos para começar." : "Quando houver uma sessão agendada, ela aparecerá aqui."}</span></div></div>}
  </div>;
}
