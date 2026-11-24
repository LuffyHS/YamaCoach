import Link from "next/link";
import { Activity, ArrowRight, Check, Monitor, ShieldCheck, Target, Video, Zap, BarChart3, Calendar } from "lucide-react";
import { YamaLogo } from "@/components/yama-logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { LandingDashboardPreview } from "@/components/landing-dashboard-preview";

const features = [
  { icon: Activity, title: "Diagnóstico IA", text: "Análise round a round com métricas reais da HenrikDev API e parecer técnico do Gemini." },
  { icon: Video, title: "VOD Review", text: "Envie partidas, receba análise com marcações de tempo e pontos de atenção." },
  { icon: Video, title: "Sala ao Vivo", text: "Sessões 1-para-1 ou em grupo com WebRTC e prancheta tática de mapas." },
  { icon: ShieldCheck, title: "Ficha Técnica", text: "Hardware, periféricos e sensibilidade sincronizados com o coach." },
  { icon: Calendar, title: "Calendário", text: "Compromissos compartilhados com destaque em dias com eventos." },
  { icon: Target, title: "Missão de Elo", text: "Acompanhe sua evolução do elo inicial até a meta com progresso real." },
];

export default function Home() {
  return (
    <main className="landing-page">
      {/* Sticky Header */}
      <nav className="landing-header">
        <div className="landing-header-inner">
          <Link href="/" className="landing-brand">
            <YamaLogo showWordmark={false} size="sm" />
            <span>YAMA <span className="landing-brand-slash">/</span> COACH</span>
          </Link>
          <div className="landing-nav-center">
            <a href="#metodo">Método</a>
            <a href="#diagnostico">Diagnóstico IA</a>
            <Link href="/download">Desktop</Link>
            <a href="#planos">Planos</a>
          </div>
          <div className="landing-nav-right">
            <ThemeToggle compact />
            <Link href="/login" className="landing-nav-login">Entrar</Link>
            <Link href="/login?mode=signup" className="button primary landing-nav-cta">Começar agora</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="landing-hero">
        <div className="landing-hero-grid">
          <div className="landing-hero-left">
            <div className="landing-badge">
              <span className="landing-badge-dot" />
              COACHING INDIVIDUAL · VALORANT
            </div>
            <h1>Jogue melhor.<br /><em>Com direção.</em></h1>
            <p>Um plano de evolução construído para o seu jogo: análise de VOD, treinos objetivos e acompanhamento direto do coach com telemetria real.</p>
            <div className="landing-hero-actions">
              <Link href="/login?mode=signup" className="button primary landing-hero-cta">Começar agora <ArrowRight size={16} /></Link>
              <Link href="/download" className="landing-hero-secondary"><Monitor size={16} /> Baixar app Desktop</Link>
            </div>
            <div className="landing-hero-metrics">
              <div className="landing-hero-metric"><Zap size={14} /><span>Sincronização HenrikDev API</span></div>
              <div className="landing-hero-metric"><BarChart3 size={14} /><span>Análise round a round com IA</span></div>
              <div className="landing-hero-metric"><Video size={14} /><span>VOD Review estruturado</span></div>
            </div>
          </div>
          <div className="landing-hero-right">
            <LandingDashboardPreview />
          </div>
        </div>
      </section>

      {/* Bento Grid */}
      <section className="landing-bento" id="metodo">
        <div className="landing-section-head">
          <div className="landing-eyebrow">TUDO O QUE VOCÊ PRECISA</div>
          <h2>Tudo o que você precisa para subir de elo.</h2>
          <p>Menos treino sem direção. Mais clareza no que ajustar e como trabalhar cada ponto.</p>
        </div>
        <div className="landing-bento-grid">
          {features.map((f, i) => {
            const Icon = f.icon;
            return (
              <div key={i} className={`landing-bento-card ${i === 0 ? "landing-bento-wide" : ""}`}>
                <div className="landing-bento-icon"><Icon size={20} /></div>
                <h3>{f.title}</h3>
                <p>{f.text}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Desktop App */}
      <section className="landing-desktop">
        <div className="landing-desktop-inner">
          <div className="landing-desktop-copy">
            <div className="landing-eyebrow">YAMA COACH PARA PC</div>
            <h2>Seu workspace, direto na área de trabalho.</h2>
            <p>Instale o Yama Coach no Windows como aplicativo. Janela frameless, atualizações silenciosas e acesso rápido durante as sessões.</p>
            <div className="landing-desktop-features">
              <div><Check size={14} /> Atualizações automáticas</div>
              <div><Check size={14} /> Acesso rápido</div>
              <div><Check size={14} /> Sem navegador</div>
            </div>
            <Link href="/download" className="button primary">Instalar no PC <ArrowRight size={15} /></Link>
          </div>
          <div className="landing-desktop-mockup">
            <div className="landing-desktop-window">
              <div className="landing-desktop-titlebar">
                <span className="landing-desktop-titlebar-dots"><i /><i /><i /></span>
                <span className="landing-desktop-titlebar-title">Yama Coach</span>
              </div>
              <div className="landing-desktop-window-body">
                <div className="landing-desktop-sidebar">
                  <span className="landing-desktop-sidebar-item is-active">Visão geral</span>
                  <span className="landing-desktop-sidebar-item">VOD Review</span>
                  <span className="landing-desktop-sidebar-item">Calendário</span>
                  <span className="landing-desktop-sidebar-item">Ficha técnica</span>
                </div>
                <div className="landing-desktop-main">
                  <div className="landing-desktop-card">
                    <small>MISSÃO DE ELO</small>
                    <strong>Diamante 1 → Imortal 2</strong>
                    <div className="landing-desktop-progress"><i style={{ width: "43%" }} /></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="landing-pricing" id="planos">
        <div className="landing-section-head">
          <div className="landing-eyebrow">PLANOS E ACESSO</div>
          <h2>Planos transparentes. Acesso rápido.</h2>
          <p>Acompanhamento profissional de VALORANT com preço justo.</p>
        </div>
        <div className="landing-pricing-card">
          <div className="landing-pricing-header">
            <span className="landing-pricing-badge">PLANO MENSAL</span>
            <div className="landing-pricing-price">
              <strong>R$ 197</strong>
              <small>/mês</small>
            </div>
          </div>
          <ul className="landing-pricing-features">
            <li><Check size={14} /> Análise de VOD ilimitada</li>
            <li><Check size={14} /> Rotina de treino personalizada</li>
            <li><Check size={14} /> Diagnóstico IA com HenrikDev</li>
            <li><Check size={14} /> Sala ao vivo 1-para-1</li>
            <li><Check size={14} /> Ficha técnica e sensibilidade</li>
            <li><Check size={14} /> Calendário compartilhado</li>
          </ul>
          <Link href="/login?mode=signup" className="button primary landing-pricing-cta">Começar agora <ArrowRight size={15} /></Link>
          <p className="landing-pricing-note">Pagamento via Pix. Acesso imediato após aprovação.</p>
        </div>
      </section>

      {/* Final CTA */}
      <section className="landing-final-cta">
        <div className="landing-final-cta-inner">
          <h2>Entre na próxima partida<br /><em>com um plano.</em></h2>
          <p>Crie sua conta e conheça o acompanhamento Yama.</p>
          <Link href="/login?mode=signup" className="button primary">Criar minha conta <ArrowRight size={16} /></Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer-new">
        <div className="landing-footer-inner">
          <div className="landing-footer-brand">
            <YamaLogo showWordmark={false} size="sm" />
            <span>YAMA <span className="landing-brand-slash">/</span> COACH</span>
          </div>
          <div className="landing-footer-links">
            <Link href="/download">Aplicativo</Link>
            <Link href="/login">Entrar</Link>
            <a href="#metodo">Método</a>
            <a href="#planos">Planos</a>
          </div>
          <span className="landing-footer-copy">© 2026 Yama Coach · Coaching competitivo para VALORANT</span>
        </div>
      </footer>
    </main>
  );
}
