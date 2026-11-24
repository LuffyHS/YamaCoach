"use client";

import { useState } from "react";
import { Activity, Target, Video, TrendingUp } from "lucide-react";

const tabs = [
  { id: "diagnosis", label: "Diagnóstico IA", icon: Activity },
  { id: "vod", label: "VOD Review", icon: Video },
  { id: "rank", label: "Missão de Elo", icon: TrendingUp },
];

const diagnosisData = {
  matches: 10,
  winrate: 60,
  kd: 1.24,
  hs: 28,
  acs: 245,
  agents: ["Jett", "Reyna"],
  maps: [
    { map: "Ascent", winrate: 75, games: 4, kd: "1.45" },
    { map: "Haven", winrate: 50, games: 3, kd: "1.10" },
    { map: "Bind", winrate: 33, games: 3, kd: "0.95" },
  ],
};

const vodData = [
  { map: "Ascent", agent: "Jett", status: "Revisada", date: "12/11" },
  { map: "Haven", agent: "Reyna", status: "Pendente", date: "14/11" },
  { map: "Bind", agent: "Jett", status: "Revisada", date: "15/11" },
];

export function LandingDashboardPreview() {
  const [activeTab, setActiveTab] = useState("diagnosis");

  return (
    <div className="landing-preview">
      <div className="landing-preview-topline">
        <div className="landing-preview-brand">
          <span className="landing-preview-mark">YC</span>
          <span>YAMA <span className="landing-preview-slash">/</span> PLAYER</span>
        </div>
        <span className="landing-preview-dots"><i /><i /><i /></span>
      </div>
      <div className="landing-preview-tabs">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              className={`landing-preview-tab ${activeTab === tab.id ? "is-active" : ""}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <Icon size={13} />
              {tab.label}
            </button>
          );
        })}
      </div>
      <div className="landing-preview-body">
        {activeTab === "diagnosis" && (
          <div className="landing-preview-diagnosis">
            <div className="landing-preview-kpis">
              <div className="landing-preview-kpi"><small>Partidas</small><strong>{diagnosisData.matches}</strong></div>
              <div className="landing-preview-kpi"><small>Winrate</small><strong>{diagnosisData.winrate}%</strong></div>
              <div className="landing-preview-kpi"><small>K/D</small><strong>{diagnosisData.kd}</strong></div>
              <div className="landing-preview-kpi"><small>HS%</small><strong>{diagnosisData.hs}%</strong></div>
              <div className="landing-preview-kpi"><small>ACS</small><strong>{diagnosisData.acs}</strong></div>
              <div className="landing-preview-kpi"><small>Agentes</small><strong style={{ fontSize: 10 }}>{diagnosisData.agents.join(", ")}</strong></div>
            </div>
            <div className="landing-preview-maps">
              {diagnosisData.maps.map((map) => (
                <div key={map.map} className="landing-preview-map-row">
                  <span className="landing-preview-map-name">{map.map}</span>
                  <span className="landing-preview-map-games">{map.games}j</span>
                  <div className="landing-preview-map-bar"><i style={{ width: `${map.winrate}%` }} /></div>
                  <span className="landing-preview-map-wr">{map.winrate}%</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {activeTab === "vod" && (
          <div className="landing-preview-vods">
            {vodData.map((vod, i) => (
              <div key={i} className="landing-preview-vod-row">
                <div className="landing-preview-vod-thumb"><Video size={14} /></div>
                <div className="landing-preview-vod-info">
                  <strong>{vod.map} · {vod.agent}</strong>
                  <small>{vod.date}</small>
                </div>
                <span className={`landing-preview-vod-status ${vod.status === "Pendente" ? "is-pending" : ""}`}>{vod.status}</span>
              </div>
            ))}
            <div className="landing-preview-vod-empty">
              <Target size={14} /> Envie sua partida para análise
            </div>
          </div>
        )}
        {activeTab === "rank" && (
          <div className="landing-preview-rank">
            <div className="landing-preview-rank-stages">
              <div className="landing-preview-rank-stage"><small>INÍCIO</small><span className="landing-preview-rank-badge">Diamante 1</span></div>
              <span className="landing-preview-rank-arrow">→</span>
              <div className="landing-preview-rank-stage is-current"><small>ATUAL</small><span className="landing-preview-rank-badge is-current">Ascendente 1</span></div>
              <span className="landing-preview-rank-arrow">→</span>
              <div className="landing-preview-rank-stage"><small>META</small><span className="landing-preview-rank-badge">Imortal 2</span></div>
            </div>
            <div className="landing-preview-progress"><i style={{ width: "43%" }} /><span>43%</span></div>
            <div className="landing-preview-rank-note">Progresso calculado entre o elo inicial e a meta definida pelo coach.</div>
          </div>
        )}
      </div>
    </div>
  );
}
