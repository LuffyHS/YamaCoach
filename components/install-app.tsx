"use client";

import { useEffect, useState } from "react";
import { Download } from "lucide-react";

type InstallPrompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

export function InstallApp() {
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null);
  const [message, setMessage] = useState("");
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const onPrompt = (event: Event) => { event.preventDefault(); setPrompt(event as InstallPrompt); };
    const onInstalled = () => { setInstalled(true); setPrompt(null); setMessage("Yama Coach instalado com sucesso."); };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => { window.removeEventListener("beforeinstallprompt", onPrompt); window.removeEventListener("appinstalled", onInstalled); };
  }, []);

  async function install() {
    if (!prompt) {
      setMessage("A instalação pelo navegador ainda não está disponível. Use Chrome ou Edge no Windows e siga as instruções abaixo.");
      return;
    }
    await prompt.prompt();
    const choice = await prompt.userChoice;
    setMessage(choice.outcome === "accepted" ? "Instalação iniciada." : "Você pode instalar depois pelo menu do navegador.");
    setPrompt(null);
  }

  return <div className="install-card">
    <div className="install-card-head"><span className="install-app-icon"><Download size={20}/></span><span><b>Yama Coach para Windows</b><small>Aplicativo para PC · abre em janela própria</small></span></div>
    <button type="button" className="install-action" onClick={() => void install()} disabled={installed}>{installed ? "Instalado no PC" : <><Download size={16}/> {prompt ? "Instalar no Windows" : "Preparar instalação no PC"}</>}</button>
    <p className="install-message" aria-live="polite">{message || "Compatível com Windows 10 e 11 pelo Chrome ou Microsoft Edge."}</p>
  </div>;
}
