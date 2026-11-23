"use client";

import { useState } from "react";
import { Loader2, RefreshCw, Brain } from "lucide-react";

type MatchDetail = {
  map: string;
  agent: string;
  score: string;
  won: boolean;
  kills: number;
  deaths: number;
  assists: number;
  kd: number;
  hs: number;
  acs: number;
  rounds: number;
  diagnosis: string;
  date: string;
};

type DiagnosisResult = {
  metrics?: {
    matches: number;
    winrate: number;
    kd: number;
    hs: number;
    acs: number;
    maps: string[];
    agents: string[];
    worstMaps: { map: string; winrate: number; games: number; kd: string }[];
    benchmarks: { rank: string; kd: number; hs: number; acs: number; winrate: number };
    currentTier: string | null;
    matchDetails: MatchDetail[];
  };
  report?: string;
  error?: string;
  riot_id?: string;
};

function BenchmarkBadge({ value, benchmark, higherBetter = true }: { value: number; benchmark: number; higherBetter?: boolean }) {
  const diff = value - benchmark;
  const threshold = 0.05 * benchmark;
  if (Math.abs(diff) < threshold) return <span className="bench-badge bench-avg">Na média</span>;
  const good = higherBetter ? diff >= 0 : diff <= 0;
  if (good) return <span className="bench-badge bench-above">Acima</span>;
  return <span className="bench-badge bench-below">Abaixo</span>;
}

export function AiDiagnosisPanel({ studentId, coach = false, students = [] }: { studentId?: string; coach?: boolean; students?: { id: string; full_name: string }[] }) {
  const [selectedStudent, setSelectedStudent] = useState(studentId || (students[0]?.id ?? ""));
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DiagnosisResult | null>(null);
  const [region, setRegion] = useState("br");
  const [checkedGoals, setCheckedGoals] = useState<boolean[]>([false, false, false, false, false]);

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

  const m = result?.metrics;
  const bench = m?.benchmarks;

  return (
    <div className="ai-diagnosis-panel">
      <div className="ai-diagnosis-header">
        <div>
          <p style={{ fontSize: 11, color: "var(--muted)", margin: 0 }}>
            Análise das últimas partidas competitivas via HenrikDev + Gemini
            {m?.currentTier && <span style={{ marginLeft: 8, color: "var(--emerald)", fontWeight: 600 }}>· {m.currentTier}</span>}
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

      {m && (
        <>
          {/* KPI cards */}
          <div className="ai-metrics-grid">
            <div className="ai-metric">
              <small>Partidas</small>
              <strong>{m.matches}</strong>
            </div>
            <div className="ai-metric">
              <small>Winrate</small>
              <strong>{m.winrate}%</strong>
              {bench && <BenchmarkBadge value={m.winrate} benchmark={bench.winrate} />}
            </div>
            <div className="ai-metric">
              <small>K/D</small>
              <strong>{m.kd}</strong>
              {bench && <BenchmarkBadge value={m.kd} benchmark={bench.kd} />}
            </div>
            <div className="ai-metric">
              <small>HS%</small>
              <strong>{m.hs}%</strong>
              {bench && <BenchmarkBadge value={m.hs} benchmark={bench.hs} />}
            </div>
            <div className="ai-metric">
              <small>ACS médio</small>
              <strong>{m.acs}</strong>
              {bench && <BenchmarkBadge value={m.acs} benchmark={bench.acs} />}
            </div>
            <div className="ai-metric">
              <small>Agentes</small>
              <strong style={{ fontSize: 10 }}>{m.agents.slice(0, 2).join(", ")}</strong>
            </div>
          </div>

          {/* Benchmark comparison */}
          {bench && (
            <div className="ai-benchmark-card">
              <h3 className="card-title">Comparativo vs. média {bench.rank}</h3>
              <div className="ai-benchmark-grid">
                <div className="ai-bench-row">
                  <span>K/D</span>
                  <span>{m.kd}</span>
                  <span className="ai-bench-target">meta: {bench.kd}</span>
                  <BenchmarkBadge value={m.kd} benchmark={bench.kd} />
                </div>
                <div className="ai-bench-row">
                  <span>HS%</span>
                  <span>{m.hs}%</span>
                  <span className="ai-bench-target">meta: {bench.hs}%</span>
                  <BenchmarkBadge value={m.hs} benchmark={bench.hs} />
                </div>
                <div className="ai-bench-row">
                  <span>ACS</span>
                  <span>{m.acs}</span>
                  <span className="ai-bench-target">meta: {bench.acs}</span>
                  <BenchmarkBadge value={m.acs} benchmark={bench.acs} />
                </div>
                <div className="ai-bench-row">
                  <span>Winrate</span>
                  <span>{m.winrate}%</span>
                  <span className="ai-bench-target">meta: {bench.winrate}%</span>
                  <BenchmarkBadge value={m.winrate} benchmark={bench.winrate} />
                </div>
              </div>
            </div>
          )}

          {/* Per-match breakdown */}
          {m.matchDetails && m.matchDetails.length > 0 && (
            <div className="ai-matches-card">
              <h3 className="card-title">Partidas recentes</h3>
              <div className="ai-matches-list">
                {m.matchDetails.map((match, i) => (
                  <div key={i} className={`ai-match-row ${match.won ? "is-win" : "is-loss"}`}>
                    <div className="ai-match-top">
                      <span className={`ai-match-result ${match.won ? "win" : "loss"}`}>{match.won ? "V" : "D"}</span>
                      <span className="ai-match-map">{match.map}</span>
                      <span className="ai-match-agent">{match.agent}</span>
                      <span className="ai-match-score">{match.score}</span>
                      <span className="ai-match-date">{match.date}</span>
                    </div>
                    <div className="ai-match-stats">
                      <span>{match.kills}/{match.deaths}/{match.assists}</span>
                      <span>K/D {match.kd}</span>
                      <span>HS {match.hs}%</span>
                      <span>ACS {match.acs}</span>
                    </div>
                    <div className="ai-match-diagnosis">{match.diagnosis}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Maps breakdown */}
          {m.worstMaps && m.worstMaps.length > 0 && (
            <div className="ai-maps-card">
              <h3 className="card-title">Desempenho por mapa</h3>
              <div className="ai-maps-list">
                {m.worstMaps.map((map, i) => (
                  <div key={i} className="ai-map-row">
                    <span className="ai-map-name">{map.map}</span>
                    <span className="ai-map-games">{map.games} jogos</span>
                    <span className="ai-map-kd">K/D {map.kd}</span>
                    <div className="ai-map-bar"><i style={{ width: `${map.winrate}%` }} /></div>
                    <span className="ai-map-wr">{map.winrate}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Weekly goals checklist */}
          <div className="ai-goals-card">
            <h3 className="card-title">Checklist de metas semanais</h3>
            <ul className="ai-goals-list">
              {[
                `Manter K/D acima de ${bench?.kd ?? 1.15} em pelo menos 60% das partidas`,
                `Alcançar HS% acima de ${bench?.hs ?? 25}% nas próximas 5 partidas`,
                `Jogar pelo menos 2 partidas em ${m.worstMaps?.[0]?.map || "mapas fracos"} para melhorar winrate`,
                "Praticar crosshair placement em TDM (15 min/dia)",
                "Revisar VOD de uma derrota focando em first deaths",
              ].map((goal, i) => (
                <li key={i} className={checkedGoals[i] ? "is-checked" : ""}>
                  <label className="ai-goal-label">
                    <input
                      type="checkbox"
                      checked={checkedGoals[i]}
                      onChange={() => {
                        const next = [...checkedGoals];
                        next[i] = !next[i];
                        setCheckedGoals(next);
                      }}
                    />
                    <span>{goal}</span>
                  </label>
                </li>
              ))}
            </ul>
          </div>

          {/* Gemini report */}
          {result?.report && (
            <div className="notice" style={{ marginTop: 12, whiteSpace: "pre-wrap" }}>
              <Brain size={14} style={{ marginRight: 6, verticalAlign: "middle" }} />
              {result.report}
            </div>
          )}
        </>
      )}

      {!result && !loading && (
        <div className="empty" style={{ minHeight: 120 }}>
          Clique em &quot;Atualizar Análise com IA&quot; para gerar o diagnóstico.
        </div>
      )}
    </div>
  );
}
