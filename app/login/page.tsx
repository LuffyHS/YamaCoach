import Link from "next/link";
import { LoginForm } from "@/components/login-form";
import { ThemeToggle } from "@/components/theme-toggle";
import { isDesktopServerSide } from "@/lib/is-desktop";
import { cookies, headers } from "next/headers";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ mode?: string }> }) {
  const params = await searchParams;
  const cookieStore = await cookies();
  const headerList = await headers();
  const desktop = isDesktopServerSide(
    headerList,
    cookieStore,
    new URLSearchParams(params?.mode ? `mode=${params.mode}` : "")
  );

  if (desktop) {
    return (
      <main className="desktop-login-shell">
        <div className="desktop-login-card">
          <div className="desktop-login-brand">
            <span className="desktop-login-mark"><svg width="28" height="28" viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="30" fill="none" stroke="#10b981" stroke-width="6" /><path d="M50 8 V30 M50 70 V92 M8 50 H30 M70 50 H92" stroke="#10b981" stroke-width="6" stroke-linecap="round" /><circle cx="50" cy="50" r="5" fill="#f59e0b" /></svg></span>
            <span className="desktop-login-name">YAMA <span>/COACH</span></span>
          </div>
          <LoginForm initialSignup={params?.mode === "signup"} />
        </div>
      </main>
    );
  }

  return <main className="site login-page"><nav className="topnav"><Link href="/" className="brand login-brand">◉ YAMA<span className="brand-muted">coach</span></Link><div className="login-top-actions"><ThemeToggle compact/><Link href="/" className="nav-link">← Voltar</Link></div></nav><LoginForm initialSignup={params?.mode === "signup"} /></main>;
}
