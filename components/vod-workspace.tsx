"use client";

import { useState } from "react";
import { embedUrl } from "@/lib/youtube";
import type { Profile, Role, VodReview } from "@/lib/types";

type StudentOption = Pick<Profile, "id" | "full_name">;

export function VodWorkspace({ role, items, students }: { role: Role; items: VodReview[]; students: StudentOption[] }) {
  const [selected, setSelected] = useState(items[0]?.id || "");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const item = items.find((entry) => entry.id === selected);

  async function send(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const body = Object.fromEntries(new FormData(event.currentTarget));
    try {
      const response = await fetch("/api/vods", {
        method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Não foi possível salvar a VOD.");
      window.location.reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha de conexão ao salvar a VOD.");
    } finally {
      setBusy(false);
    }
  }

  return <>
    <div className="grid vod-layout">
      <div className="card">
        <h3 className="card-title">{role === "coach" ? "Fila de revisão" : "Suas partidas"}</h3>
        {items.length ? items.map((entry) => <button key={entry.id} className="vod-row" style={{ width: "100%", background: "none", borderLeft: 0, borderRight: 0, borderBottom: 0, color: "inherit", textAlign: "left", cursor: "pointer" }} onClick={() => setSelected(entry.id)}>
          <span className="student-info"><strong>{entry.map} · {entry.agent}</strong><small>{students.find((student) => student.id === entry.student_id)?.full_name}</small></span>
          <span className={`status ${entry.status === "pending" ? "pending" : ""}`}>{entry.status === "pending" ? "Pendente" : "Revisada"}</span>
        </button>) : <div className="empty">{role === "coach" ? "Nenhuma VOD aguardando revisão." : "Nenhuma VOD enviada ainda."}</div>}
        {role === "student" && <form onSubmit={send}>
          <h3 className="card-title">Enviar partida</h3>
          <label className="label">Link não listado do YouTube<input name="url" type="url" maxLength={500} className="field" required placeholder="https://youtu.be/..." /></label>
          <label className="label">Mapa<input name="map" maxLength={60} className="field" required placeholder="Mapa" /></label>
          <label className="label">Agente<input name="agent" maxLength={60} className="field" required placeholder="Agente" /></label>
          <button className="button primary" disabled={busy}>{busy ? "Enviando…" : "Enviar VOD"}</button>
        </form>}
      </div>
      <div className="card">
        {item ? <>
          <h3 className="card-title">{item.map} · {item.agent}</h3>
          <div className="video-box">
            {embedUrl(item.coach_review_youtube_url || item.student_youtube_url)
              ? <iframe title={`VOD ${item.map} - ${item.agent}`} src={embedUrl(item.coach_review_youtube_url || item.student_youtube_url)!} allowFullScreen />
              : "Link de vídeo inválido"}
          </div>
          {role === "coach" && <form onSubmit={send}>
            <input type="hidden" name="id" value={item.id} />
            <label className="label">Link da análise gravada<input name="review" type="url" maxLength={500} className="field" placeholder="https://youtu.be/..." /></label>
            <label className="label">Notas para o aluno<textarea name="notes" maxLength={4000} className="field" rows={3} /></label>
            <label className="label">Erros recorrentes<input name="errors" maxLength={2000} className="field" /></label>
            <button className="button primary" disabled={busy}>{busy ? "Salvando…" : "Salvar revisão"}</button>
          </form>}
          {item.coach_notes && <div className="notice">{item.coach_notes}{item.recurring_errors && <><br /><b>Foco:</b> {item.recurring_errors}</>}</div>}
        </> : <div className="empty">Selecione uma VOD ou envie sua primeira partida.</div>}
        {message && <div className="recovery-error" role="alert">{message}</div>}
      </div>
    </div>
  </>;
}
