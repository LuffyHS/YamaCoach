"use client";

import { useState } from "react";
import { Check, Copy, Cpu, ExternalLink, Gpu, Headphones, Keyboard, MemoryStick, Monitor, Mouse, Save, Crosshair } from "lucide-react";
import type { PlayerSetup } from "@/lib/types";
import { RANK_TIERS } from "@/lib/ranks";
import { ValorantRankBadge } from "@/components/valorant-rank-badge";
import { ValorantAgentAvatar } from "@/components/valorant-agent-avatar";

export const defaultSetup: PlayerSetup = {
  processor: "", gpu: "", ram: "", monitor_hz: "", mouse: "", keyboard: "", headset: "", mousepad: "",
  dpi: null, sensitivity: null, resolution: "", crosshair_code: "", equipment_history: "", main_role: "", agents: [],
};
function isTrackerUrl(value: string) {
  try { const url = new URL(value); return url.protocol === "https:" && ["tracker.gg", "www.tracker.gg"].includes(url.hostname) && url.pathname.startsWith("/valorant/profile/"); }
  catch { return false; }
}
function parseCrosshair(code: string) {
  const tokens = code.split(";").map(value => value.trim());
  const valueFor = (key: string, fallback: number) => {
    const index = tokens.indexOf(key);
    const parsed = index >= 0 ? Number(tokens[index + 1]) : fallback;
    return Number.isFinite(parsed) ? parsed : fallback;
  };
  const palette = ["#ffffff", "#00ff00", "#00ffff", "#ffff00", "#ff0000", "#ff66cc", "#7f3fff", "#ff9900"];
  const codeColor = valueFor("c", 0);
  return { color: palette[Math.max(0, Math.min(palette.length - 1, codeColor))], length: Math.max(4, Math.min(26, valueFor("0l", 8) * 2.5)), gap: Math.max(4, Math.min(18, valueFor("0o", 2) * 2.5)), thickness: Math.max(1, Math.min(5, valueFor("0t", 1))), dot: valueFor("0b", 0) === 1 };
}

export function SetupForm({ initial, editable, coach, studentId, rank, trackerUrl = "", riotId = "" }: {
  initial: Partial<PlayerSetup> | null; editable: boolean; coach: boolean; studentId: string;
  rank: { initial: string; current: string; target: string; errors: string }; trackerUrl?: string; riotId?: string;
}) {
  const [v, setV] = useState<PlayerSetup>({ ...defaultSetup, ...(initial || {}), agents: Array.isArray(initial?.agents) ? initial.agents : [] });
  const [tracker, setTracker] = useState(trackerUrl);
  const [riot, setRiot] = useState(riotId);
  const [currentRank, setCurrentRank] = useState(rank.current);
  const [initialRank, setInitialRank] = useState(rank.initial);
  const [targetRank, setTargetRank] = useState(rank.target);
  const [msg, setMsg] = useState("");
  const [copied, setCopied] = useState(false);
  const edpi = (Number(v.dpi) || 0) * (Number(v.sensitivity) || 0);
  const crosshair = parseCrosshair(v.crosshair_code);

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMsg("");
    const f = new FormData(e.currentTarget);
    const body = coach
      ? { student_id: studentId, setup: v, tracker_url: tracker, riot_id: riot, initial_rank: initialRank, current_rank: currentRank, target_rank: targetRank, recurring_errors: f.get("recurring_errors") }
      : { setup: v, tracker_url: tracker, riot_id: riot, current_rank: currentRank };
    try {
      const response = await fetch("/api/setup", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const result = await response.json();
      setMsg(response.ok ? "Ficha salva com sucesso." : result.error || "Não foi possível salvar.");
    } catch { setMsg("Falha de conexão ao salvar."); }
  }

  function field(key: keyof PlayerSetup, title: string, icon: React.ReactNode, type = "text") {
    return <label className="label" key={key}><span className="setup-field-label">{icon}{title}</span><input disabled={!editable} className="field" value={String(v[key] ?? "")} type={type} onChange={e => setV({ ...v, [key]: type === "number" ? (e.target.value ? Number(e.target.value) : null) : e.target.value })} /></label>;
  }

  async function copyCrosshair() {
    if (!v.crosshair_code) return;
    await navigator.clipboard.writeText(v.crosshair_code);
    setCopied(true); window.setTimeout(() => setCopied(false), 1500);
  }

  function sectionHeading(index: string, title: string, note: string, icon: React.ReactNode) {
    return <div className="setup-section-heading"><div><span className="setup-index">{index}</span><h2 className="setup-heading-title">{icon}{title}</h2></div>{note && <span className="setup-section-note">{note}</span>}</div>;
  }

  return <form className="setup-form" onSubmit={save}>
    <section className="card setup-section">{sectionHeading("01 / HARDWARE", "PC & monitor", "Computador e taxa de atualização", <Cpu size={16} />)}
      <div className="grid checkout-grid">{field("processor", "Processador", <Cpu size={12} />)}{field("gpu", "Placa de vídeo", <Gpu size={12} />)}{field("ram", "Memória RAM", <MemoryStick size={12} />)}{field("monitor_hz", "Monitor (Hz)", <Monitor size={12} />)}</div>
    </section>
    <section className="card setup-section">{sectionHeading("02 / PERIFÉRICOS", "Equipamentos", "", <Mouse size={16} />)}
      <div className="grid checkout-grid">{field("mouse", "Mouse", <Mouse size={12} />)}{field("keyboard", "Teclado", <Keyboard size={12} />)}{field("headset", "Headset", <Headphones size={12} />)}{field("mousepad", "Mousepad", <Crosshair size={12} />)}</div>
    </section>
    <section className="card setup-section"><div className="setup-section-heading"><div><span className="setup-index">03 / CONFIGURAÇÃO</span><h2 className="setup-heading-title"><Crosshair size={16} />In-game</h2></div><div className="setup-edpi"><small>eDPI</small><strong>{edpi.toFixed(1)}</strong></div></div>
      <div className="grid checkout-grid">{field("dpi", "DPI", <Crosshair size={12} />, "number")}{field("sensitivity", "Sensibilidade", <Crosshair size={12} />, "number")}{field("resolution", "Resolução", <Monitor size={12} />)}{field("main_role", "Função principal", <Crosshair size={12} />)}</div>
      <label className="label">Riot ID<div className="setup-copy-row"><input disabled={!editable} className="field" value={riot} maxLength={80} onChange={e => setRiot(e.target.value)} placeholder="Nome de jogo#TAG" /><span className="riot-id-hint">Seu identificador no VALORANT</span></div></label>
      <div className="crosshair-editor"><label className="label">Código da mira<div className="setup-copy-row"><input disabled={!editable} className="field setup-mono" value={v.crosshair_code} onChange={e => setV({ ...v, crosshair_code: e.target.value })} placeholder="Insira o código da mira" /><button type="button" className="button secondary" onClick={() => void copyCrosshair()} disabled={!v.crosshair_code}>{copied ? <Check size={15} /> : <Copy size={15} />}{copied ? "Copiado" : "Copiar código"}</button></div></label><div className="crosshair-preview" aria-label="Prévia da mira"><span>PRÉVIA DA MIRA</span><svg viewBox="0 0 100 100" role="img" aria-label="Mira de VALORANT"><g stroke={crosshair.color} strokeWidth={crosshair.thickness} strokeLinecap="square"><path d={`M50 ${50-crosshair.gap-crosshair.length} V${50-crosshair.gap}`} /><path d={`M50 ${50+crosshair.gap} V${50+crosshair.gap+crosshair.length}`} /><path d={`M${50-crosshair.gap-crosshair.length} 50 H${50-crosshair.gap}`} /><path d={`M${50+crosshair.gap} 50 H${50+crosshair.gap+crosshair.length}`} /></g><circle cx="50" cy="50" r="1.2" fill={crosshair.dot ? crosshair.color : "transparent"} /></svg></div></div>
      <label className="label">Agentes principais · até 3<input disabled={!editable} className="field" value={(Array.isArray(v.agents) ? v.agents : []).join(", ")} onChange={e => setV({ ...v, agents: e.target.value.split(",").map(x => x.trim()).filter(Boolean).slice(0, 3) })} placeholder="Jett, Sova, Omen" />{Array.isArray(v.agents) && v.agents.length > 0 && <span className="setup-form-agent-list">{v.agents.map(agent => <span className="setup-agent-chip" key={agent}><ValorantAgentAvatar name={agent} size={24} />{agent}</span>)}</span>}</label>
      <label className="label">Perfil do Tracker.gg<div className="setup-copy-row"><input disabled={!editable} className="field" type="url" value={tracker} onChange={e => setTracker(e.target.value)} placeholder="https://tracker.gg/valorant/profile/riot/..." />{isTrackerUrl(tracker) && <a className="button secondary" href={tracker} target="_blank" rel="noreferrer" aria-label="Abrir perfil Tracker"><ExternalLink size={15} /></a>}</div></label>
      <label className="label">Descrição do setup e histórico<textarea disabled={!editable} className="field" rows={4} value={v.equipment_history} onChange={e => setV({ ...v, equipment_history: e.target.value })} placeholder="Descreva seu setup e registre mudanças importantes…" /></label>
    </section>
    <section className="card setup-section"><div className="setup-section-heading"><div><span className="setup-index">04 / RANKED</span><h2>Elo e objetivo</h2></div><span className="setup-section-note">{coach ? "Defina o ponto de partida, elo atual e objetivo." : "Atualize quando sua patente mudar no jogo."}</span></div>
      <div className="grid checkout-grid rank-edit-grid"><label className="label">Elo inicial com o coach{coach ? <><select className="field" value={initialRank} onChange={e => setInitialRank(e.target.value)}><option value="">Definir ponto inicial</option>{RANK_TIERS.map(tier => <option key={tier} value={tier}>{tier}</option>)}</select><ValorantRankBadge rank={initialRank} size="sm" /></> : <div className="setup-rank-readonly"><ValorantRankBadge rank={rank.initial} size="md" /></div>}</label><label className="label">Elo atual{coach ? <><select className="field" value={currentRank} onChange={e => setCurrentRank(e.target.value)}><option value="">Aguardando atualização do aluno</option>{RANK_TIERS.map(tier => <option key={tier} value={tier}>{tier}</option>)}</select><ValorantRankBadge rank={currentRank} size="sm" /></> : <><select className="field" value={currentRank} onChange={e => setCurrentRank(e.target.value)}><option value="">Selecione seu elo atual</option>{RANK_TIERS.map(tier => <option key={tier} value={tier}>{tier}</option>)}</select><ValorantRankBadge rank={currentRank} size="sm" /></>}</label><label className="label">Meta de patente{coach ? <><select name="target_rank" className="field" value={targetRank} onChange={e => setTargetRank(e.target.value)}><option value="">Definir objetivo</option>{RANK_TIERS.map(tier => <option key={tier} value={tier}>{tier}</option>)}</select><ValorantRankBadge rank={targetRank} size="sm" /></> : <div className="setup-rank-readonly"><ValorantRankBadge rank={rank.target} size="md" /></div>}</label></div>
      {coach && <>
      <label className="label">Erros recorrentes / pontos de atenção<textarea name="recurring_errors" defaultValue={rank.errors} className="field" rows={3} placeholder="Pontos para revisar nas próximas sessões…" /></label>
      </>}
    </section>
    {editable && <div className="setup-save-row"><span className="setup-save-message" role="status">{msg}</span><button className="button primary" type="submit"><Save size={16} />Salvar ficha técnica</button></div>}
    {!editable && msg && <span className="toast" role="status">{msg}</span>}
    {copied && <span className="toast" role="status">Código da mira copiado.</span>}
  </form>;
}
