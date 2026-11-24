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

  return (
    <main className="auth-split">
      <section className="auth-split-left">
        <div className="auth-split-left-inner">
          <Link href="/" className="auth-brand">
            <YamaLogo showWordmark={false} size="md" />
            <span>YAMA <span className="auth-brand-slash">/</span> COACH</span>
          </Link>
          <div className="auth-split-copy">
            <span className="auth-eyebrow">COACHING COMPETITIVO · VALORANT</span>
            <h1>Jogue melhor.<br /><em>Com direção.</em></h1>
            <p>Um plano de evolução construído para o seu jogo: análise de VOD, treinos objetivos e acompanhamento direto do coach.</p>
            <div className="auth-split-trust">
              <span>✓ Feedback individual</span>
              <span>✓ Rotina personalizada</span>
              <span>✓ Evolução acompanhada</span>
            </div>
          </div>
          <div className="auth-split-footer">
            <span>© 2026 Yama Coach</span>
            <Link href="/download" className="auth-split-link">Aplicativo para PC</Link>
          </div>
        </div>
      </section>
      <section className="auth-split-right">
        <div className="auth-split-right-inner">
          <div className="auth-split-topbar">
            <ThemeToggle compact />
          </div>
          <LoginForm initialSignup={params?.mode === "signup"} />
        </div>
      </section>
    </main>
  );
}
