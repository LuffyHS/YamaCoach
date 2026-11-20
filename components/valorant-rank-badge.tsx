"use client";

import Image from "next/image";
import { useState } from "react";
import { RANK_TIERS } from "@/lib/ranks";

const tierByRank = new Map<string, number>(RANK_TIERS.map((rank, index) => [rank.toLocaleLowerCase("pt-BR"), index + 3]));
const palette: Record<string, { color: string; tint: string }> = {
  ferro: { color: "#a7a9ad", tint: "rgba(167,169,173,.11)" },
  bronze: { color: "#d08c5a", tint: "rgba(208,140,90,.12)" },
  prata: { color: "#c4d1d8", tint: "rgba(196,209,216,.1)" },
  ouro: { color: "#f3c969", tint: "rgba(243,201,105,.12)" },
  platina: { color: "#57d6c2", tint: "rgba(87,214,194,.11)" },
  diamante: { color: "#69c8ff", tint: "rgba(105,200,255,.12)" },
  ascendente: { color: "#34d399", tint: "rgba(52,211,153,.12)" },
  imortal: { color: "#fb7185", tint: "rgba(251,113,133,.12)" },
  radiante: { color: "#f7d774", tint: "rgba(247,215,116,.13)" },
};

function GeometricRank() {
  return <svg viewBox="0 0 24 24" aria-hidden="true" fill="none">
    <path d="M12 2.6 21 7v5.2c0 4.5-3.7 7.7-9 9.2-5.3-1.5-9-4.7-9-9.2V7z" fill="currentColor" opacity=".12" />
    <path d="M12 2.6 21 7v5.2c0 4.5-3.7 7.7-9 9.2-5.3-1.5-9-4.7-9-9.2V7z" stroke="currentColor" strokeWidth="1.15" strokeLinejoin="round" />
    <path d="m12 6.7 4.7 5.3-4.7 5.3-4.7-5.3z" stroke="currentColor" strokeWidth="1.15" strokeLinejoin="round" />
    <path d="M12 9.6v4.8M9.6 12h4.8" stroke="currentColor" strokeWidth="1.15" strokeLinecap="round" />
  </svg>;
}

export function ValorantRankBadge({ rank, size = "md", className = "" }: { rank?: string | null; size?: "sm" | "md" | "lg"; className?: string }) {
  const [failed, setFailed] = useState(false);
  const cleanRank = rank?.trim() || "";
  const tier = tierByRank.get(cleanRank.toLocaleLowerCase("pt-BR"));
  const division = cleanRank.split(/\s+/)[0]?.toLocaleLowerCase("pt-BR") || "";
  const colors = palette[division] || { color: "#89949d", tint: "rgba(137,148,157,.1)" };
  const src = tier ? `https://media.valorant-api.com/competitivetiers/03621f52-342b-cf4e-4f86-9350a49c6d04/${tier}/smallicon.png` : "";

  return <span className={`valorant-rank-badge rank-size-${size} ${className}`} style={{ "--rank-color": colors.color, "--rank-tint": colors.tint } as React.CSSProperties} title={cleanRank || "Elo não informado"}>
    <span className="rank-badge-icon">{src && !failed ? <Image src={src} alt="" width={size === "lg" ? 30 : size === "md" ? 22 : 16} height={size === "lg" ? 30 : size === "md" ? 22 : 16} loading="lazy" onError={() => setFailed(true)} /> : <GeometricRank />}</span>
    <span>{cleanRank || "Não informado"}</span>
  </span>;
}
