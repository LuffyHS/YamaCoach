import { getSessionUser } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { DashboardNav } from "@/components/dashboard-nav";
import { ThemeToggle } from "@/components/theme-toggle";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.role === "student" && (!user.is_active || !user.subscription_expires_at || new Date(user.subscription_expires_at) <= new Date())) {
    redirect("/checkout");
  }

  return <div className="app-shell">
    <DashboardNav role={user.role} name={user.full_name} />
    <div className="main-area">
      <header className="header dashboard-topbar">
        <div className="breadcrumbs"><span>YAMA</span><b>/</b><span>WORKSPACE</span><b>/</b><span>{user.role === "coach" ? "COACH" : "PLAYER"}</span></div>
        <ThemeToggle compact />
        <div className="user-chip">
          <span className="online-dot" />
          <span className="topbar-user-avatar">{user.full_name.slice(0, 1).toUpperCase()}</span>
          <span className="topbar-user-copy"><b>{user.full_name}</b><small>{user.role === "coach" ? "Coach" : "Player"}</small></span>
        </div>
      </header>
      {children}
    </div>
  </div>;
}
