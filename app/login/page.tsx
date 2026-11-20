import Link from "next/link";
import { LoginForm } from "@/components/login-form";
import { ThemeToggle } from "@/components/theme-toggle";
import { YamaLogo } from "@/components/yama-logo";
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
            <YamaLogo showWordmark={false} size="md" />
            <span className="desktop-login-name">YAMA <span>/COACH</span></span>
          </div>
          <LoginForm initialSignup={params?.mode === "signup"} />
        </div>
      </main>
    );
  }

  return <main className="site login-page"><nav className="topnav"><Link href="/" className="brand login-brand">◉ YAMA<span className="brand-muted">coach</span></Link><div className="login-top-actions"><ThemeToggle compact/><Link href="/" className="nav-link">← Voltar</Link></div></nav><LoginForm initialSignup={params?.mode === "signup"} /></main>;
}
