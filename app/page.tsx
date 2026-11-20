import Link from "next/link";
import { Activity, ArrowRight, Check, Download, ShieldCheck, Target, Video } from "lucide-react";
import { YamaLogo } from "@/components/yama-logo";
import { ThemeToggle } from "@/components/theme-toggle";

const pillars = [
  { icon: Video, number: "01", title: "Revisão com contexto", text: "Transforme rounds importantes em decisões claras para aplicar na próxima partida." },
  { icon: Target, number: "02", title: "Treino com intenção", text: "Receba uma rotina individual de mira, TDM e fundamentos, organizada para sua semana." },
  { icon: Activity, number: "03", title: "Evolução acompanhada", text: "Metas, consistência e pontos de atenção reunidos em um só lugar com seu coach." },
];

export default function Home() {
  return <main className="site landing-v3">
    <nav className="landing-nav">
      <Link href="/" className="brand"><span className="landing-brand-mark"><YamaLogo showWordmark={false} size="sm" /></span><span>YAMA<span className="brand-muted"> / COACH</span></span></Link>
      <div className="landing-nav-links"><a href="#metodo">Método</a><Link href="/download"><Download size={14}/> Aplicativo</Link><ThemeToggle compact/><Link href="/login" className="landing-login">Entrar</Link><Link href="/login?mode=signup" className="button primary">Começar agora <ArrowRight size={15}/></Link></div>
    </nav>

    <section className="landing-hero">
      <div className="landing-hero-copy">
        <div className="landing-eyebrow"><span className="live-dot"/> COACHING INDIVIDUAL · VALORANT</div>
        <h1>Jogue melhor.<br/><em>Com direção.</em></h1>
        <p>Um plano de evolução construído para o seu jogo: análise de VOD, treinos objetivos e acompanhamento direto do coach.</p>
        <div className="landing-actions"><Link href="/login?mode=signup" className="button primary">Quero evoluir <ArrowRight size={16}/></Link><Link href="/download" className="landing-secondary"><Download size={16}/> Conheça o app</Link></div>
        <div className="landing-trust"><span><Check size={14}/> Feedback individual</span><span><Check size={14}/> Rotina personalizada</span></div>
      </div>
      <div className="landing-product" aria-label="Prévia da plataforma Yama Coach">
        <div className="product-topline"><div className="product-brand"><span className="landing-brand-mark"><YamaLogo showWordmark={false} size="sm" /></span> YAMA <span>/ PLAYER</span></div><span className="product-window-dots"><i/><i/><i/></span></div>
        <div className="product-layout"><aside className="product-sidebar"><b>SEU WORKSPACE</b><span className="selected"><Activity size={13}/> Visão geral</span><span><Target size={13}/> Plano de treino</span><span><Video size={13}/> Revisão de VOD</span><span><ShieldCheck size={13}/> Ficha técnica</span></aside>
          <div className="product-main"><div className="product-welcome"><small>SEU PAINEL DE EVOLUÇÃO</small><h2>Treino com propósito.</h2><p>Seu plano, suas partidas e seu progresso em um só lugar.</p></div><div className="product-cards"><div><small>META DE ELO</small><strong>Atual <span>→</span> Objetivo</strong><i className="product-progress"><i/></i><em>Progresso acompanhado com seu coach</em></div><div><small>PRÓXIMO PASSO</small><strong>Rotina personalizada</strong><em>Warmup · TDM · Mira</em></div></div><div className="product-session"><span className="product-session-icon"><Video size={15}/></span><span><b>Revisão de partida</b><small>Feedback e pontos de atenção</small></span><span className="product-open">Ver plano <ArrowRight size={13}/></span></div><div className="product-note"><span className="live-dot"/> Foco e consistência, sem ruído.</div></div></div>
      </div>
      <div className="landing-orb" aria-hidden="true"/>
    </section>

    <section className="landing-method" id="metodo"><div className="landing-section-head"><div><div className="landing-eyebrow">O MÉTODO YAMA</div><h2>Uma evolução que você<br/>consegue colocar em prática.</h2></div><p>Menos treino sem direção. Mais clareza no que ajustar e como trabalhar cada ponto.</p></div><div className="landing-pillars">{pillars.map(({icon: Icon, number, title, text})=><article key={number}><span className="pillar-number">{number}</span><span className="pillar-icon"><Icon size={18}/></span><h3>{title}</h3><p>{text}</p></article>)}</div></section>

    <section className="landing-app-banner"><div className="app-banner-icon"><YamaLogo showWordmark={false} size="md" /></div><div><span className="landing-eyebrow">YAMA COACH PARA PC</span><h2>Seu workspace, direto na área de trabalho.</h2><p>Instale o Yama Coach no Windows como aplicativo e acesse seu painel em uma janela própria.</p></div><Link href="/download" className="button secondary">Instalar no PC <ArrowRight size={15}/></Link></section>

    <section className="landing-cta"><div><div className="landing-eyebrow">COMECE SUA EVOLUÇÃO</div><h2>Entre na próxima partida<br/><em>com um plano.</em></h2><p>Crie sua conta e conheça o acompanhamento Yama.</p></div><Link href="/login?mode=signup" className="button primary">Criar minha conta <ArrowRight size={16}/></Link></section>
    <footer className="landing-footer"><Link href="/" className="brand"><YamaLogo showWordmark={false} size="sm" /> YAMA<span className="brand-muted"> / COACH</span></Link><span>Coaching competitivo para VALORANT.</span><div><Link href="/download">Aplicativo</Link><Link href="/login">Entrar</Link><span>© 2026 Yama Coach</span></div></footer>
  </main>;
}
