"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ValorantRankBadge } from "@/components/valorant-rank-badge";

type Student = { id: string; full_name: string; email: string; riot_id: string | null; current_rank: string | null; target_rank: string | null; subscription_status: string | null; subscription_expires_at: string | null };

export function StudentsAdminList({ students, pendingUserIds, now }: { students: Student[]; pendingUserIds: string[]; now: number }) {
  const [filter, setFilter] = useState<"all" | "active" | "pending">("all");
  const pendingUsers = useMemo(() => new Set(pendingUserIds), [pendingUserIds]);
  const filtered = useMemo(() => students.filter(student => {
    const days = student.subscription_expires_at ? Math.ceil((new Date(student.subscription_expires_at).getTime() - now) / 86400000) : 0;
    const active = student.subscription_status === "active" && days > 0;
    const pending = !active && (pendingUsers.has(student.id) || student.subscription_status === "pending");
    return filter === "all" || (filter === "active" ? active : pending);
  }), [students, filter, now, pendingUsers]);
  const counts = useMemo(() => students.reduce((result, student) => {
    const days = student.subscription_expires_at ? Math.ceil((new Date(student.subscription_expires_at).getTime() - now) / 86400000) : 0;
    if (student.subscription_status === "active" && days > 0) result.active++;
    if (!(student.subscription_status === "active" && days > 0) && (pendingUsers.has(student.id) || student.subscription_status === "pending")) result.pending++;
    return result;
  }, { active: 0, pending: 0 }), [students, now, pendingUsers]);

  return <>
    <div className="student-filter-row" role="group" aria-label="Filtrar alunos">
      {[{ id: "all", label: "Todos", count: students.length }, { id: "active", label: "Ativos", count: counts.active }, { id: "pending", label: "Pendentes", count: counts.pending }].map(item => <button key={item.id} type="button" className={`student-filter ${filter === item.id ? "is-active" : ""}`} onClick={() => setFilter(item.id as typeof filter)}>{item.label}<span>{item.count}</span></button>)}
    </div>
    {filtered.length ? <div className="students-admin-list">{filtered.map(profile => {
      const remainingDays = profile.subscription_expires_at ? Math.ceil((new Date(profile.subscription_expires_at).getTime() - now) / 86400000) : 0;
      const status = profile.subscription_status === "active" && remainingDays > 0 ? "Ativo" : pendingUsers.has(profile.id) || profile.subscription_status === "pending" ? "Em análise" : "Inativo";
      return <Link className="student-row students-admin-row" href={`/dashboard/setup?student=${profile.id}`} key={profile.id}>
        <span className="avatar">{profile.full_name?.[0] || "?"}</span>
        <span className="student-info"><strong>{profile.full_name}</strong><small>{profile.email} · {profile.riot_id || "Riot ID não informado"}</small></span>
        <span className="student-rank-pair"><ValorantRankBadge rank={profile.current_rank} size="sm" /><span>→</span><ValorantRankBadge rank={profile.target_rank} size="sm" /></span>
        <span className={`status ${status === "Ativo" ? "" : "pending"}`}>{status}</span>
        <small className="student-days">{remainingDays > 0 ? `${remainingDays} dias restantes` : "Sem assinatura ativa"}</small>
        {status === "Ativo" && <button type="button" className="button secondary revoke-button" onClick={async (e) => { e.preventDefault(); e.stopPropagation(); if (!confirm("Revogar acesso deste aluno?")) return; await fetch("/api/revoke-access", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: `student_id=${profile.id}` }); window.location.reload(); }}>Revogar acesso</button>}
      </Link>;
    })}</div> : <div className="empty">{students.length ? "Nenhum aluno nesta categoria." : "Nenhum aluno cadastrado."}</div>}
  </>;
}
