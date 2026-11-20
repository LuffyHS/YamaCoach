"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { Crosshair, Shield, Sparkles, Swords, Target } from "lucide-react";

type AgentEntry = { displayName: string; displayIcon: string; role?: { displayName?: string } };
let agentCache: Map<string, AgentEntry> | null = null;
let agentRequest: Promise<Map<string, AgentEntry>> | null = null;

async function loadAgents() {
  if (agentCache) return agentCache;
  if (!agentRequest) agentRequest = fetch("https://valorant-api.com/v1/agents?isPlayableCharacter=true")
    .then(response => response.ok ? response.json() : Promise.reject(new Error("Agent catalog unavailable")))
    .then(payload => {
      agentCache = new Map<string, AgentEntry>((payload.data as AgentEntry[]).map(agent => [agent.displayName.toLocaleLowerCase("pt-BR"), agent]));
      return agentCache;
    }).catch(() => new Map<string, AgentEntry>());
  return agentRequest;
}

function TacticalFallback({ role }: { role?: string }) {
  const Icon = role?.toLowerCase().includes("sentinel") ? Shield : role?.toLowerCase().includes("controller") ? Sparkles : role?.toLowerCase().includes("duelist") ? Swords : role?.toLowerCase().includes("initiator") ? Target : Crosshair;
  return <span className="agent-avatar-fallback"><Icon size={14} aria-hidden="true" /></span>;
}

export function ValorantAgentAvatar({ name, role, size = 24 }: { name: string; role?: string; size?: number }) {
  const [icon, setIcon] = useState("");
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let active = true;
    void loadAgents().then(agents => {
      if (!active) return;
      const normalized = name.trim().toLocaleLowerCase("pt-BR");
      const agent = agents.get(normalized) || [...agents.values()].find(entry => entry.displayName.toLocaleLowerCase("pt-BR") === normalized);
      if (agent?.displayIcon) setIcon(agent.displayIcon);
    });
    return () => { active = false; };
  }, [name]);
  return <span className="valorant-agent-avatar" style={{ width: size, height: size }} title={name}>
    {icon && !failed ? <Image src={icon} alt="" fill sizes={`${size}px`} onError={() => setFailed(true)} /> : <TacticalFallback role={role} />}
  </span>;
}
