"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { Eraser, Map as MapIcon, MessageSquareText, Undo2 } from "lucide-react";
import { MAPS } from "@/lib/ranks";
import { createClient } from "@/lib/supabase/client";

type Point = { x: number; y: number };
type Stroke = { color: string; points: Point[] };
type BoardState = { map: string; strokes: Stroke[]; updatedAt: number };
type MapEntry = { displayName: string; displayIcon?: string | null; listViewIcon?: string | null };
const emptyBoard: BoardState = { map: "Ascent", strokes: [], updatedAt: 0 };

function validBoard(value: unknown): value is BoardState {
  if (!value || typeof value !== "object") return false;
  const board = value as BoardState;
  return MAPS.includes(board.map as typeof MAPS[number]) && Array.isArray(board.strokes) && board.strokes.length <= 120 && Number.isFinite(board.updatedAt);
}

export function LiveTacticalPanel({ sessionId, userId, notes, canEditNotes, busy, onNotesChange, onSaveNotes }: {
  sessionId: string; userId: string; notes: string; canEditNotes: boolean; busy: boolean;
  onNotesChange: (value: string) => void; onSaveNotes: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const boardRef = useRef<BoardState>(emptyBoard);
  const draftRef = useRef<Stroke | null>(null);
  const notesRef = useRef(notes);
  const [tab, setTab] = useState<"notes" | "map">("notes");
  const [board, setBoard] = useState<BoardState>(emptyBoard);
  const [brush, setBrush] = useState("#10b981");
  const [maps, setMaps] = useState<MapEntry[]>([]);
  const [channelStatus, setChannelStatus] = useState("Conectando notas e prancheta");

  const updateBoard = useCallback((next: BoardState, broadcast = true) => {
    boardRef.current = next;
    setBoard(next);
    if (broadcast && channelRef.current) {
      void channelRef.current.send({ type: "broadcast", event: "board-state", payload: next });
      void channelRef.current.track({ user_id: userId, board: next, notes: notesRef.current, updated_at: next.updatedAt });
    }
  }, [userId]);

  useEffect(() => {
    let active = true;
    const supabase = createClient();
    const channel = supabase.channel(`live-session-${sessionId}-board`, { config: { private: true, broadcast: { self: false, ack: true }, presence: { key: userId } } });
    channelRef.current = channel;
    channel.on("broadcast", { event: "board-state" }, ({ payload }) => {
      if (validBoard(payload) && payload.updatedAt > boardRef.current.updatedAt) {
        boardRef.current = payload; setBoard(payload);
      }
    });
    channel.on("broadcast", { event: "shared-notes" }, ({ payload }) => {
      if (typeof payload?.notes === "string") { notesRef.current = payload.notes; onNotesChange(payload.notes); }
    });
    channel.on("presence", { event: "sync" }, () => {
      const peers = Object.values(channel.presenceState<{ board?: BoardState; notes?: string; updated_at?: number }>()).flat();
      const latest = peers.map(peer => peer.board).filter((candidate): candidate is BoardState => validBoard(candidate)).sort((a, b) => b.updatedAt - a.updatedAt)[0];
      if (latest && latest.updatedAt >= boardRef.current.updatedAt) { boardRef.current = latest; setBoard(latest); }
      const sharedNotes = peers.find(peer => typeof peer.notes === "string")?.notes;
      if (typeof sharedNotes === "string") { notesRef.current = sharedNotes; onNotesChange(sharedNotes); }
    });
    channel.subscribe(async status => {
      if (!active) return;
      if (status === "SUBSCRIBED") {
        setChannelStatus("Prancheta conectada");
        await channel.track({ user_id: userId, board: boardRef.current, notes: notesRef.current, updated_at: Date.now() });
      } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") setChannelStatus("Sem sincronização em tempo real");
    });
    void fetch("https://valorant-api.com/v1/maps?language=en-US").then(response => response.ok ? response.json() : null).then(payload => {
      if (active && Array.isArray(payload?.data)) setMaps(payload.data.filter((map: MapEntry) => MAPS.includes(map.displayName as typeof MAPS[number])));
    }).catch(() => undefined);
    return () => { active = false; void channel.unsubscribe(); channelRef.current = null; };
  }, [sessionId, userId, onNotesChange]);

  useEffect(() => { notesRef.current = notes; }, [notes]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const bounds = canvas.getBoundingClientRect();
    const scale = window.devicePixelRatio || 1;
    const width = Math.max(1, Math.floor(bounds.width * scale));
    const height = Math.max(1, Math.floor(bounds.height * scale));
    if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }
    const context = canvas.getContext("2d");
    if (!context) return;
    context.setTransform(scale, 0, 0, scale, 0, 0);
    const w = bounds.width, h = bounds.height;
    context.clearRect(0, 0, w, h);
    context.fillStyle = "#0b1110"; context.fillRect(0, 0, w, h);
    context.strokeStyle = "rgba(164,190,175,.08)"; context.lineWidth = 1;
    for (let x = 0; x < w; x += 24) { context.beginPath(); context.moveTo(x, 0); context.lineTo(x, h); context.stroke(); }
    for (let y = 0; y < h; y += 24) { context.beginPath(); context.moveTo(0, y); context.lineTo(w, y); context.stroke(); }
    context.fillStyle = "rgba(120,150,134,.24)";
    context.font = "10px ui-monospace, monospace"; context.textAlign = "center";
    context.fillText(`${board.map.toUpperCase()} · TACTICAL BOARD`, w / 2, 20);
    const strokes = [...board.strokes, ...(draftRef.current ? [draftRef.current] : [])];
    for (const stroke of strokes) {
      if (stroke.points.length < 2) continue;
      context.beginPath(); context.moveTo(stroke.points[0].x * w, stroke.points[0].y * h);
      for (let index = 1; index < stroke.points.length; index++) context.lineTo(stroke.points[index].x * w, stroke.points[index].y * h);
      context.strokeStyle = stroke.color; context.lineWidth = 3; context.lineCap = "round"; context.lineJoin = "round"; context.stroke();
    }
  }, [board, tab]);

  function point(event: React.PointerEvent<HTMLCanvasElement>): Point {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: (event.clientX - rect.left) / rect.width, y: (event.clientY - rect.top) / rect.height };
  }
  function beginDraw(event: React.PointerEvent<HTMLCanvasElement>) { event.currentTarget.setPointerCapture(event.pointerId); draftRef.current = { color: brush, points: [point(event)] }; }
  function moveDraw(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!draftRef.current) return;
    const nextPoint = point(event); const last = draftRef.current.points.at(-1);
    if (!last || Math.hypot(nextPoint.x - last.x, nextPoint.y - last.y) > .003) draftRef.current.points.push(nextPoint);
    setBoard({ ...boardRef.current });
  }
  function finishDraw() {
    if (!draftRef.current) return;
    const next = { ...boardRef.current, strokes: [...boardRef.current.strokes, draftRef.current].slice(-120), updatedAt: Date.now() };
    draftRef.current = null; updateBoard(next);
  }
  function setMap(map: string) { updateBoard({ map, strokes: [], updatedAt: Date.now() }); }
  function shareNotes(value: string) {
    notesRef.current = value; onNotesChange(value);
    void channelRef.current?.send({ type: "broadcast", event: "shared-notes", payload: { notes: value } });
  }
  const selectedMap = maps.find(map => map.displayName === board.map);
  const background = selectedMap?.displayIcon || selectedMap?.listViewIcon;

  return <aside className="live-tactical-panel card">
    <header className="tactical-panel-heading"><div><span className="live-page-kicker">YAMA · CLASSROOM</span><h3>Painel tático</h3><small>{channelStatus}</small></div><div className="tactical-tabs" role="tablist" aria-label="Ferramentas da sala"><button className={tab === "notes" ? "is-active" : ""} onClick={() => setTab("notes")} role="tab" aria-selected={tab === "notes"}><MessageSquareText size={14} /> Anotações</button><button className={tab === "map" ? "is-active" : ""} onClick={() => setTab("map")} role="tab" aria-selected={tab === "map"}><MapIcon size={14} /> Prancheta</button></div></header>
    {tab === "notes" ? <div className="tactical-notes"><textarea value={notes} maxLength={5000} disabled={!canEditNotes} onChange={event => shareNotes(event.target.value)} className="field" placeholder="Registre calls, padrões e pontos para revisar…" /><div className="tactical-notes-footer"><span>Notas compartilhadas ao vivo</span><button className="button primary" disabled={busy || !canEditNotes} onClick={onSaveNotes}>{busy ? "Salvando…" : "Salvar notas"}</button></div></div> : <div className="tactical-board-panel"><div className="tactical-board-tools"><label className="label">Mapa<select className="field" value={board.map} onChange={event => setMap(event.target.value)}>{MAPS.map(map => <option key={map} value={map}>{map}</option>)}</select></label><label className="label tactical-color-picker">Pincel<span><button type="button" className={brush === "#10b981" ? "is-selected" : ""} aria-label="Pincel verde" onClick={() => setBrush("#10b981")} /><button type="button" className={brush === "#f59e0b" ? "is-selected" : ""} aria-label="Pincel âmbar" onClick={() => setBrush("#f59e0b")} /></span></label><div className="tactical-board-actions"><button className="button secondary" type="button" title="Desfazer último traço" disabled={!board.strokes.length} onClick={() => updateBoard({ ...board, strokes: board.strokes.slice(0, -1), updatedAt: Date.now() })}><Undo2 size={14} /></button><button className="button secondary" type="button" title="Limpar prancheta" disabled={!board.strokes.length} onClick={() => updateBoard({ ...board, strokes: [], updatedAt: Date.now() })}><Eraser size={14} /></button></div></div><div className="tactical-canvas-wrap" style={background ? { backgroundImage: `linear-gradient(rgba(7,12,10,.88),rgba(7,12,10,.88)),url("${background}")` } : undefined}><canvas ref={canvasRef} onPointerDown={beginDraw} onPointerMove={moveDraw} onPointerUp={finishDraw} onPointerCancel={finishDraw} aria-label={`Prancheta de estratégia para ${board.map}`} /></div><div className="tactical-board-caption"><span><i /> Sincronizado com a sala</span><small>Desenhe rotas e marcações para o grupo</small></div></div>}
  </aside>;
}
