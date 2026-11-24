"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSyncExternalStore, useState } from "react";
import { Brain, CalendarDays, Dumbbell, LayoutDashboard, LogOut, Menu, Radio, Settings, User, Users, Video, X } from "lucide-react";
import type { Role } from "@/lib/types";
import { ValorantRankBadge } from "@/components/valorant-rank-badge";
import { YamaLogo } from "@/components/yama-logo";
import { isDesktopClient } from "@/lib/is-desktop";

const workLinks = [
  { href: "/dashboard/vods", label: "VOD Review", icon: Video },
  { href: "/dashboard/live", label: "Sala ao vivo", icon: Radio },
  { href: "/dashboard/calendar", label: "Calendário", icon: CalendarDays },
  { href: "/dashboard/setup", label: "Ficha técnica", icon: Settings },
  { href: "/dashboard/diagnostico", label: "Diagnóstico IA", icon: Brain },
];

export function DashboardNav({ role, name, rank, avatarUrl, pendingVods = 0, pendingPayments = 0 }: { role: Role; name: string; rank?: string | null; avatarUrl?: string | null; pendingVods?: number; pendingPayments?: number }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const desktop = useSyncExternalStore(
    () => () => {},
    () => isDesktopClient(),
    () => false
  );
  const close = () => setOpen(false);
  const isActive = (href: string) => pathname === href || (href !== "/dashboard" && pathname.startsWith(`${href}/`));

  return <>
    <button className="mobile-menu" aria-label="Abrir menu" aria-expanded={open} onClick={() => setOpen(!open)}>{open ? <X /> : <Menu />}</button>
    {open && <button className="nav-backdrop" aria-label="Fechar menu" onClick={close} />}
    <aside className={`sidebar ${open ? "sidebar-open" : ""}`}>
      <Link href={desktop ? "/dashboard" : "/"} className="brand side-brand" onClick={close}>
        <YamaLogo showWordmark={false} size="sm" />YAMA<span className="brand-muted">/{role === "coach" ? "COACH" : "PLAYER"}</span>
      </Link>

      <Link href="/dashboard/perfil" className="side-profile" onClick={close}>
        {avatarUrl ? <Image src={avatarUrl} alt="" width={36} height={36} className="avatar avatar-img" /> : <span className="avatar">{(name || "?").slice(0, 1).toUpperCase()}</span>}
        <span className="side-profile-copy"><b>{name}</b><small>{role === "coach" ? "Coach workspace" : "Player workspace"}{role === "student" && <ValorantRankBadge rank={rank} size="sm" />}</small></span>
        <i className="online-dot" />
      </Link>

      <div className="workspace">SEU ESPAÇO</div>
      <nav className="dashboard-navigation" aria-label="Navegação do painel">
        <Link href="/dashboard" onClick={close} className={`side-link ${isActive("/dashboard") ? "active" : ""}`}>
          <LayoutDashboard size={17} />Visão geral
        </Link>
        <div className="workspace navigation-section-label">ACOMPANHAMENTO</div>
        {workLinks.map(({ href, label, icon: Icon }) => <Link key={href} href={href} onClick={close} className={`side-link ${isActive(href) ? "active" : ""}`}>
          <Icon size={17} />{label}{href === "/dashboard/vods" && pendingVods > 0 && <span className="side-count side-count-amber">{pendingVods}</span>}
        </Link>)}
        {role === "coach" && <>
          <div className="workspace navigation-section-label">GESTÃO</div>
          <Link href="/dashboard/treinos" onClick={close} className={`side-link ${isActive("/dashboard/treinos") ? "active" : ""}`}>
            <Dumbbell size={17} />Treinos dos alunos
          </Link>
          <Link href="/dashboard/alunos" onClick={close} className={`side-link ${isActive("/dashboard/alunos") ? "active" : ""}`}>
            <Users size={17} />Alunos e pagamentos{pendingPayments > 0 && <span className="side-count">{pendingPayments}</span>}
          </Link>
        </>}
        <div className="workspace navigation-section-label">CONTA</div>
        <Link href="/dashboard/perfil" onClick={close} className={`side-link ${isActive("/dashboard/perfil") ? "active" : ""}`}>
          <User size={17} />Meu Perfil
        </Link>
      </nav>

      <div className="side-bottom">
        <form action="/api/logout" method="post"><button className="side-link"><LogOut size={16} />Sair da conta</button></form>
        <small className="version-label">YAMA COACH · PRIVATE TRAINING</small>
      </div>
    </aside>
  </>;
}
