"use client";

import { useState } from "react";
import { Loader2, RefreshCw, Brain } from "lucide-react";

type DiagnosisResult = {
  metrics?: {
    winrate: number;
    kd: number;
    hs: number;
    acs: number;
    matches: number;
    maps: string[];
    agents: string[];
  };
  report?: string;
  error?: string;
};

export function AiDiagnosisPanel({ studentId, coach = false, students = [] }: { studentId?: string; coach?: boolean; students?: { id: string; full_name: string }[] }) {
  const [selectedStudent, setSelectedStudent] = useState(studentId || (students[0]?.id ?? ""));
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DiagnosisResult | null>(null);
  const [region, setRegion] = useState("br");

  async function run() {
    const targetId = coach ? selectedStudent : studentId;
    if (!targetId) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/ai/player-diagnosis", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ student_id: targetId, region }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Falha ao gerar diagnóstico.");
      setResult(data);
    } catch (e) {
      setResult({ error: e instanceof Error ? e.message : "Erro ao gerar diagnóstico." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="ai-diagnosis-panel">
      <div className="ai-diagnosis-header">
        <div>
          <h2 className="card-title">Diagnóstico IA</h2>
          <p style={{ fontSize: 11, color: "var(--muted)", margin: 0 }}>
            Análise das últimas 10 partidas competitivas via HenrikDev + Gemini
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          {coach && students.length > 0 && (
            <select className="field" value={selectedStudent} onChange={e => setSelectedStudent(e.target.value)} style={{ width: 160, margin: 0 }}>
              {students.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
            </select>
          )}
          <select className="field" value={region} onChange={e => setRegion(e.target.value)} style={{ width: 80, margin: 0 }}>
            <option value="br">BR</option>
            <option value="na">NA</option>
            <option value="eu">EU</option>
            <option value="latam">LATAM</option>
          </select>
          <button className="button primary" onClick={() => void run()} disabled={loading}>
            {loading ? <><Loader2 size={14} className="spin" /> Analisando…</> : <><RefreshCw size={14} /> Atualizar Análise com IA</>}
          </button>
        </div>
      </div>

      {result?.error && <div className="recovery-error" role="alert">{result.error}</div>}

      {result?.metrics && (
        <div className="ai-metrics-grid">
          <div className="ai-metric"><small>Partidas</small><strong>{result.metrics.matches}</strong></div>
          <div className="ai-metric"><small>Winrate</small><strong>{result.metrics.winrate}%</strong></div>
          <div className="ai-metric"><small>K/D</small><strong>{result.metrics.kd}</strong></div>
          <div className="ai-metric"><small>HS%</small><strong>{result.metrics.hs}%</strong></div>
          <div className="ai-metric"><small>ACS médio</small><strong>{result.metrics.acs}</strong></div>
          <div className="ai-metric"><small>Agentes</small><strong style={{ fontSize: 10 }}>{result.metrics.agents.join(", ")}</strong></div>
        </div>
      )}

      {result?.report && (
        <div className="notice" style={{ marginTop: 12, whiteSpace: "pre-wrap" }}>
          <Brain size={14} style={{ marginRight: 6, verticalAlign: "middle" }} />
          {result.report}
        </div>
      )}

      {!result && !loading && (
        <div className="empty" style={{ minHeight: 120 }}>
          Clique em &quot;Atualizar Análise com IA&quot; para gerar o diagnóstico.
        </div>
      )}
    </div>
  );
}
