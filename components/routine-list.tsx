"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import type { TrainingRoutine } from "@/lib/types";
import { embedUrl } from "@/lib/youtube";

const categories = [
  ["warmup", "Aquecimento"], ["tdm", "Listas de TDM"], ["aim", "Treino de Mira"], ["tactical", "Tático"],
] as const;

export function RoutineList({ items }: { items: TrainingRoutine[] }) {
  const [list, setList] = useState(items);
  const [message, setMessage] = useState("");

  async function toggle(id: string) {
    const routine = list.find((item) => item.id === id);
    if (!routine) return;
    const done = !routine.is_completed;
    setList((current) => current.map((item) => item.id === id ? { ...item, is_completed: done } : item));
    setMessage("");
    try {
      const response = await fetch("/api/routines", {
        method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id, done }),
      });
      if (!response.ok) throw new Error("Não foi possível atualizar o treino.");
    } catch (error) {
      setList((current) => current.map((item) => item.id === id ? { ...item, is_completed: !done } : item));
      setMessage(error instanceof Error ? error.message : "Falha de conexão ao atualizar o treino.");
    }
  }

  const completedCount = list.filter((item) => item.is_completed).length;
  return <>
    {categories.map(([category, label]) => {
      const rows = list.filter((item) => item.category === category || (category === "warmup" && item.title.toLowerCase().includes("aquecimento")));
      if (!rows.length) return null;
      return <div key={category}>
        <div className="workspace">{label}</div>
        {rows.map((routine) => <div className="routine-task" key={routine.id}>
          <button onClick={() => void toggle(routine.id)} className={`routine-row ${routine.is_completed ? "done" : ""}`} style={{ width: "100%", background: "none", border: 0, textAlign: "left", cursor: "pointer" }}>
            <span className="check">{routine.is_completed && <Check size={13} />}</span>
            <span className="routine-name">{routine.title}</span>
          </button>
          {routine.description && <p className="routine-description">{routine.description}</p>}
          {routine.youtube_url && embedUrl(routine.youtube_url) && <details className="routine-video"><summary>Assistir vídeo de referência</summary><div className="routine-video-frame"><iframe src={embedUrl(routine.youtube_url)!} title={`Vídeo de treino: ${routine.title}`} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen loading="lazy" /></div></details>}
        </div>)}
      </div>;
    })}
    <div className="progress"><i style={{ width: `${list.length ? completedCount / list.length * 100 : 0}%` }} /></div>
    <small className="muted">Consistência diária · {completedCount}/{list.length} concluídos</small>
    {message && <div className="recovery-error" role="alert">{message}</div>}
  </>;
}
