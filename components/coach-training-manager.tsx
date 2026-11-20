"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, CirclePlus, ExternalLink, Trash2, Video } from "lucide-react";
import type { Profile, TrainingRoutine } from "@/lib/types";

type Student = Pick<Profile, "id" | "full_name" | "current_rank">;
const categoryLabels = { warmup: "Aquecimento", tdm: "TDM", aim: "Treino de mira", tactical: "Tático" };

export function CoachTrainingManager({ students, routines: initialRoutines }: { students: Student[]; routines: TrainingRoutine[] }) {
  const router = useRouter();
  const [studentId, setStudentId] = useState(students[0]?.id || "");
  const [routines, setRoutines] = useState(initialRoutines);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const visibleRoutines = useMemo(() => routines.filter(item => item.student_id === studentId), [routines, studentId]);

  async function createRoutine(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage("");
    const form = event.currentTarget;
    const data = new FormData(form);
    const body = Object.fromEntries(data.entries());
    try {
      const response = await fetch("/api/routines", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Não foi possível atribuir este treino.");
      const student = students.find(item => item.id === studentId);
      setRoutines(current => [{ id: result.id, student_id: studentId, coach_id: "", title: String(body.title), category: body.category as TrainingRoutine["category"], is_completed: false, description: String(body.description || "") || null, youtube_url: String(body.youtube_url || "") || null, scheduled_for: String(body.scheduled_for), completed_at: null, created_at: new Date().toISOString() }, ...current]);
      setMessage(`Treino enviado para ${student?.full_name || "o aluno"}.`); form.reset(); router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Falha de conexão ao criar treino."); }
    finally { setBusy(false); }
  }

  async function removeRoutine(id: string) {
    setBusy(true); setMessage("");
    try {
      const response = await fetch(`/api/routines?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Não foi possível remover o treino.");
      setRoutines(current => current.filter(item => item.id !== id)); setMessage("Treino removido."); router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Falha ao remover o treino."); }
    finally { setBusy(false); }
  }

  return <div className="coach-training-page">
    <section className="card training-assignment-card"><div className="training-page-heading"><div><span className="training-kicker"><CirclePlus size={14} /> PLANO DE TREINO</span><h2>Atribuir rotina</h2><p>Organize exercícios e vídeos em tarefas que o aluno pode acompanhar no painel.</p></div><label className="label training-student-select">Aluno<select className="field" value={studentId} onChange={event => setStudentId(event.target.value)} disabled={!students.length}>{students.map(student => <option key={student.id} value={student.id}>{student.full_name}{student.current_rank ? ` · ${student.current_rank}` : ""}</option>)}</select></label></div>
      {students.length ? <form className="training-assignment-form" onSubmit={createRoutine}><div className="training-form-grid"><label className="label">Nome do treino<input className="field" name="title" required maxLength={120} placeholder="Ex.: TDM focando primeiro disparo" /></label><label className="label">Categoria<select className="field" name="category" defaultValue="warmup"><option value="warmup">Aquecimento</option><option value="tdm">Lista de TDM</option><option value="aim">Treino de mira</option><option value="tactical">Exercício tático</option></select></label><label className="label">Data<input className="field" name="scheduled_for" type="date" /></label><label className="label training-video-field">Vídeo de referência no YouTube<input className="field" name="youtube_url" type="url" maxLength={500} placeholder="https://youtu.be/..." /></label><label className="label training-description-field">Orientações<textarea className="field" name="description" maxLength={1000} rows={3} placeholder="Explique o foco, duração ou como concluir a atividade…" /></label></div><button className="button primary" disabled={busy}>{busy ? "Enviando…" : "Atribuir ao aluno"}</button></form> : <div className="empty">Cadastre um aluno antes de montar uma rotina.</div>}
      {message && <div className="training-message" role="status">{message}</div>}
    </section>
    <section className="card training-assigned-card"><div className="training-list-heading"><div><span className="training-kicker">ROTINAS ATRIBUÍDAS</span><h2>{students.find(item => item.id === studentId)?.full_name || "Aluno"}</h2></div><span className="setup-count">{visibleRoutines.length} itens</span></div>
      {visibleRoutines.length ? <div className="training-assigned-list">{visibleRoutines.map(routine => <article className="training-assigned-row" key={routine.id}><span className={`training-category-mark category-${routine.category}`}><Check size={15} /></span><div className="training-assigned-copy"><strong>{routine.title}</strong><small>{categoryLabels[routine.category]} · {routine.scheduled_for ? new Date(`${routine.scheduled_for}T12:00:00`).toLocaleDateString("pt-BR") : "Sem data"}{routine.is_completed ? " · Concluído" : " · Pendente"}</small>{routine.description && <p>{routine.description}</p>}</div>{routine.youtube_url && <a className="training-video-link" href={routine.youtube_url} target="_blank" rel="noreferrer"><ExternalLink size={14} /> Vídeo</a>}<button className="training-remove" type="button" title="Remover treino" disabled={busy} onClick={() => void removeRoutine(routine.id)}><Trash2 size={15} /></button></article>)}</div> : <div className="empty training-empty"><Video size={20} /><span>Nenhum treino atribuído para este aluno.</span></div>}
    </section>
  </div>;
}
