"use client";

import { useState } from "react";
import { Check, Copy, ExternalLink, Save } from "lucide-react";
import type { PlayerSetup } from "@/lib/types";
import { RANK_TIERS } from "@/lib/ranks";

export const defaultSetup: PlayerSetup = {
  processor: "", gpu: "", ram: "", monitor_hz: "", mouse: "", keyboard: "", headset: "", mousepad: "",
  dpi: null, sensitivity: null, resolution: "", crosshair_code: "", equipment_history: "", main_role: "", agents: [],
};
function isTrackerUrl(value: string) {
  try { const url = new URL(value); return url.protocol === "https:" && ["tracker.gg", "www.tracker.gg"].includes(url.hostname) && url.pathname.startsWith("/valorant/profile/"); }
  catch { return false; }
}

export function SetupForm({ initial, editable, coach, studentId, rank, trackerUrl = "", riotId = "" }: {
  initial: Partial<PlayerSetup> | null; editable: boolean; coach: boolean; studentId: string;
  rank: { current: string; target: string; errors: string }; trackerUrl?: string; riotId?: string;
}) {
  const [v, setV] = useState<PlayerSetup>({ ...defaultSetup, ...(initial || {}), agents: Array.isArray(initial?.agents) ? initial.agents : [] });
  const [tracker, setTracker] = useState(trackerUrl);
  const [riot, setRiot] = useState(riotId);
  const [currentRank, setCurrentRank] = useState(rank.current);
  const [msg, setMsg] = useState("");
  const [copied, setCopied] = useState(false);
  const edpi = (Number(v.dpi) || 0) * (Number(v.sensitivity) || 0);

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMsg("");
    const f = new FormData(e.currentTarget);
    const body = coach
      ? { student_id: studentId, setup: v, tracker_url: tracker, riot_id: riot, target_rank: f.get("target_rank"), recurring_errors: f.get("recurring_errors") }
      : { setup: v, tracker_url: tracker, riot_id: riot, current_rank: currentRank };
    try {
      const response = await fetch("/api/setup", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const result = await response.json();
      setMsg(response.ok ? "Ficha salva com sucesso." : result.error || "Não foi possível salvar.");
    } catch { setMsg("Falha de conexão ao salvar."); }
  }

  function field(key: keyof PlayerSetup, title: string, type = "text") {
    return <label className="label" key={key}>{title}<input disabled={!editable} className="field" value={String(v[key] ?? "")} type={type} onChange={e => setV({ ...v, [key]: type === "number" ? (e.target.value ? Number(e.target.value) : null) : e.target.value })} /></label>;
  }

  async function copyCrosshair() {
    if (!v.crosshair_code) return;
    await navigator.clipboard.writeText(v.crosshair_code);
    setCopied(true); window.setTimeout(() => setCopied(false), 1500);
  }

  return <form className="setup-form" onSubmit={save}>
    <section className="card setup-section"><div className="setup-section-heading"><div><span className="setup-index">01 / HARDWARE</span><h2>PC & monitor</h2></div><span className="setup-section-note">Computador e taxa de atualização</span></div>
      <div className="grid checkout-grid">{field("processor", "Processador")}{field("gpu", "Placa de vídeo")}{field("ram", "Memória RAM")}{field("monitor_hz", "Monitor (Hz)")}</div>
    </section>
    <section className="card setup-section"><div className="setup-section-heading"><div><span className="setup-index">02 / PERIFÉRICOS</span><h2>Equipamentos</h2></div></div>
      <div className="grid checkout-grid">{field("mouse", "Mouse")}{field("keyboard", "Teclado")}{field("headset", "Headset")}{field("mousepad", "Mousepad")}</div>
    </section>
    <section className="card setup-section"><div className="setup-section-heading"><div><span className="setup-index">03 / CONFIGURAÇÃO</span><h2>In-game</h2></div><div className="setup-edpi"><small>eDPI</small><strong>{edpi.toFixed(1)}</strong></div></div>
      <div className="grid checkout-grid">{field("dpi", "DPI", "number")}{field("sensitivity", "Sensibilidade", "number")}{field("resolution", "Resolução")}{field("main_role", "Função principal")}</div>
      <label className="label">Riot ID<div className="setup-copy-row"><input disabled={!editable} className="field" value={riot} maxLength={80} onChange={e => setRiot(e.target.value)} placeholder="Nome de jogo#TAG" /><span className="riot-id-hint">Seu identificador no VALORANT</span></div></label>
      <label className="label">Código da mira<div className="setup-copy-row"><input disabled={!editable} className="field setup-mono" value={v.crosshair_code} onChange={e => setV({ ...v, crosshair_code: e.target.value })} placeholder="Insira o código da mira" /><button type="button" className="button secondary" onClick={() => void copyCrosshair()} disabled={!v.crosshair_code}>{copied ? <Check size={15} /> : <Copy size={15} />}{copied ? "Copiado" : "Copiar"}</button></div></label>
      <label className="label">Agentes principais · até 3<input disabled={!editable} className="field" value={(Array.isArray(v.agents) ? v.agents : []).join(", ")} onChange={e => setV({ ...v, agents: e.target.value.split(",").map(x => x.trim()).filter(Boolean).slice(0, 3) })} placeholder="Jett, Sova, Omen" /></label>
      <label className="label">Perfil do Tracker.gg<div className="setup-copy-row"><input disabled={!editable} className="field" type="url" value={tracker} onChange={e => setTracker(e.target.value)} placeholder="https://tracker.gg/valorant/profile/riot/..." />{isTrackerUrl(tracker) && <a className="button secondary" href={tracker} target="_blank" rel="noreferrer" aria-label="Abrir perfil Tracker"><ExternalLink size={15} /></a>}</div></label>
      <label className="label">Descrição do setup e histórico<textarea disabled={!editable} className="field" rows={4} value={v.equipment_history} onChange={e => setV({ ...v, equipment_history: e.target.value })} placeholder="Descreva seu setup e registre mudanças importantes…" /></label>
    </section>
    <section className="card setup-section"><div className="setup-section-heading"><div><span className="setup-index">04 / RANKED</span><h2>Elo e objetivo</h2></div><span className="setup-section-note">{coach ? "O aluno mantém o elo atual; você define a meta." : "Atualize quando sua patente mudar no jogo."}</span></div>
      <div className="grid checkout-grid"><label className="label">Elo atual{coach ? <div className="setup-rank-readonly">{currentRank || "Aguardando atualização do aluno"}</div> : <select className="field" value={currentRank} onChange={e => setCurrentRank(e.target.value)}><option value="" disabled={Boolean(currentRank)}>Selecione seu elo atual</option>{RANK_TIERS.map(tier => <option key={tier} value={tier}>{tier}</option>)}</select>}</label><label className="label">Meta de patente{coach ? <select name="target_rank" className="field" defaultValue={rank.target}><option value="">Definir objetivo</option>{RANK_TIERS.map(tier => <option key={tier} value={tier}>{tier}</option>)}</select> : <div className="setup-rank-readonly">{rank.target || "O coach ainda não definiu sua meta"}</div>}</label></div>
      {coach && <>
      <label className="label">Erros recorrentes / pontos de atenção<textarea name="recurring_errors" defaultValue={rank.errors} className="field" rows={3} placeholder="Pontos para revisar nas próximas sessões…" /></label>
      </>}
    </section>
    {editable && <div className="setup-save-row"><span className="setup-save-message" role="status">{msg}</span><button className="button primary" type="submit"><Save size={16} />Salvar ficha técnica</button></div>}
    {!editable && msg && <span className="toast" role="status">{msg}</span>}
  </form>;
}
