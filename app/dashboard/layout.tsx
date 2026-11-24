import Link from "next/link";
import Image from "next/image";
import { getSessionUser } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { DashboardNav } from "@/components/dashboard-nav";
import { ThemeToggle } from "@/components/theme-toggle";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.role === "student" && (!user.is_active || !user.subscription_expires_at || new Date(user.subscription_expires_at) <= new Date())) {
    redirect("/checkout");
  }
  let pendingVods = 0;
  let pendingPayments = 0;
  const supabase = await createClient();
  const vodCountQuery = supabase.from("vod_reviews").select("id", { count: "exact", head: true }).eq("status", "pending");
  const { count: vodCount } = user.role === "coach"
    ? await vodCountQuery.eq("coach_id", user.id)
    : await vodCountQuery.eq("student_id", user.id);
  pendingVods = vodCount ?? 0;
  if (user.role === "coach") {
    const { count: proofCount } = await supabase.from("subscriptions_pix").select("id", { count: "exact", head: true }).eq("status", "pending");
    pendingPayments = proofCount ?? 0;
  }

  return <div className="app-shell">
    <DashboardNav role={user.role} name={user.full_name} rank={user.current_rank} avatarUrl={user.avatar_url} pendingVods={pendingVods} pendingPayments={pendingPayments} />
    <div className="main-area">
      <header className="header dashboard-topbar">
        <div className="breadcrumbs"><span>YAMA</span><b>/</b><span>WORKSPACE</span><b>/</b><span>{user.role === "coach" ? "COACH" : "PLAYER"}</span></div>
        <div className="topbar-actions"><Link href="/dashboard/perfil" className="user-chip">
          <span className="online-dot" />
          {user.avatar_url ? <Image src={user.avatar_url} alt="" width={36} height={36} className="topbar-user-avatar topbar-avatar-img" /> : <span className="topbar-user-avatar">{(user.full_name || "?").slice(0, 1).toUpperCase()}</span>}
          <span className="topbar-user-copy"><b>{user.full_name}</b><small>{user.role === "coach" ? "Coach" : "Player"}</small></span>
        </Link><ThemeToggle compact /></div>
      </header>
      {children}
    </div>
  </div>;
}
