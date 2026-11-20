import Link from "next/link";
import { ArrowLeft, Check, Crosshair, MonitorDown, PanelsTopLeft } from "lucide-react";
import { InstallApp } from "@/components/install-app";

export const metadata = { title: "Aplicativo para PC · Yama Coach", description: "Instale o Yama Coach no Windows." };

export default function DownloadPage() {
  return <main className="download-page">
    <header className="download-top"><Link href="/" className="brand"><Crosshair size={18}/> YAMA / COACH</Link><Link href="/"><ArrowLeft size={14}/> Voltar ao site</Link></header>
    <section className="download-hero download-hero-grid"><div className="download-copy"><div className="landing-eyebrow"><span className="live-dot"/> SOFTWARE DESKTOP · WINDOWS 10/11</div><h1>Yama Coach.<br/><em>No seu PC.</em></h1><p>Seu ambiente de treino e acompanhamento em uma janela dedicada, com a mesma conta e os mesmos dados do Yama Coach.</p><div className="download-platform"><span className="platform-window"><PanelsTopLeft size={15}/></span><span><b>Feito para Windows</b><small>Desktop · teclado e mouse · tela grande</small></span></div></div><InstallApp /></section>
    <section className="install-options"><article className="install-option"><h2><MonitorDown size={16}/> Microsoft Edge</h2><ol><li>Abra esta página no Edge no Windows.</li><li>Selecione o ícone de instalação na barra de endereço, ou abra o menu <strong>…</strong>.</li><li>Escolha <strong>Aplicativos → Instalar este site como um aplicativo</strong>.</li></ol></article><article className="install-option"><h2><PanelsTopLeft size={16}/> Google Chrome</h2><ol><li>Abra esta página no Chrome no Windows.</li><li>Selecione o ícone de instalação na barra de endereço, ou abra o menu <strong>⋮</strong>.</li><li>Escolha <strong>Transmitir, salvar e compartilhar → Instalar página como app</strong>.</li></ol></article></section>
    <div className="desktop-app-note"><Check size={16}/><p><strong>Versão desktop independente em preparação.</strong><br/>A instalação pelo Windows abre o Yama Coach em uma janela própria. O instalador .exe será publicado nesta página assim que a versão independente estiver pronta.</p></div>
    <p className="install-footnote">Para instalar pelo navegador, use uma versão atualizada do Chrome ou Microsoft Edge e acesse o domínio publicado em HTTPS.</p>
  </main>;
}
