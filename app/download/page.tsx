import Link from "next/link";
import { ArrowLeft, Check, Download, ExternalLink, MonitorDown, ShieldCheck } from "lucide-react";

export const metadata = { title: "Yama Coach para Windows", description: "Instale o aplicativo desktop do Yama Coach no seu PC Windows." };

const installerUrl = "https://github.com/LuffyHS/YamaCoach/releases/latest/download/YamaCoach-Setup.exe";
const releasesUrl = "https://github.com/LuffyHS/YamaCoach/releases";

export default function DownloadPage() {
  return <main className="download-page">
    <header className="download-top"><Link href="/" className="brand"><span className="brand-mark"><MonitorDown size={18} /></span> YAMA / COACH</Link><Link href="/"><ArrowLeft size={14} /> Voltar ao site</Link></header>
    <section className="download-hero download-hero-grid">
      <div className="download-copy"><div className="landing-eyebrow"><span className="live-dot" /> APLICATIVO DESKTOP · WINDOWS 10/11</div><h1>Yama Coach.<br /><em>No seu PC.</em></h1><p>Instale pelo Windows e abra o Yama Coach em uma janela própria, com atalhos no Desktop e no menu Iniciar.</p><div className="download-platform"><span className="platform-window"><ShieldCheck size={16} /></span><span><b>Instalador para Windows x64</b><small>Programa instalado · atualizações pelo serviço Yama Coach</small></span></div></div>
      <div className="install-card"><div className="install-card-head"><span className="install-app-icon"><Download size={20} /></span><span><b>Yama Coach para Windows</b><small>Instalador oficial · versão mais recente</small></span></div><a className="install-action" href={installerUrl}><Download size={16} /> Baixar instalador .exe</a><p className="install-message">Após baixar, abra o arquivo e siga as etapas de instalação.</p><a className="download-release-link" href={releasesUrl} target="_blank" rel="noreferrer">Ver versões e notas de atualização <ExternalLink size={13} /></a></div>
    </section>
    <section className="desktop-install-steps"><div><span>01</span><b>Baixe</b><small>Salve o instalador no seu computador Windows.</small></div><div><span>02</span><b>Instale</b><small>Execute o arquivo e escolha onde criar o atalho.</small></div><div><span>03</span><b>Entre</b><small>Abra o Yama Coach e acesse com sua conta.</small></div></section>
    <div className="desktop-app-note"><Check size={16} /><p><strong>Aplicativo para PC</strong><br />Não depende de instalação pelo Chrome ou Edge. O programa usa a conexão segura com o Yama Coach para sincronizar seu perfil e seus treinos.</p></div>
    <p className="install-footnote">Compatível com Windows 10 e 11 de 64 bits. É necessária conexão com a internet para entrar na sua conta.</p>
  </main>;
}
