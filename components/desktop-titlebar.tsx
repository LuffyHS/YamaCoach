"use client";

import { useEffect, useSyncExternalStore, useState } from "react";
import { isDesktopClient } from "@/lib/is-desktop";
import { YamaLogo } from "@/components/yama-logo";
import { Minus, Square, X, Copy } from "lucide-react";

declare global {
  interface Window {
    yamaDesktop?: {
      minimize: () => void;
      maximize: () => void;
      close: () => void;
      isMaximized: () => Promise<boolean>;
    };
  }
}

export function DesktopTitlebar() {
  const [maximized, setMaximized] = useState(false);
  const desktop = useSyncExternalStore(
    () => () => {},
    () => isDesktopClient(),
    () => false
  );

  useEffect(() => {
    if (!desktop || !window.yamaDesktop) return;
    const check = async () => {
      const m = await window.yamaDesktop!.isMaximized();
      setMaximized(m);
    };
    check();
    const interval = setInterval(check, 500);
    return () => clearInterval(interval);
  }, [desktop]);

  if (!desktop) return null;

  return (
    <div className="desktop-titlebar" style={{ WebkitAppRegion: "drag" } as React.CSSProperties}>
      <div className="desktop-titlebar-left">
        <YamaLogo showWordmark={false} size="sm" />
        <span className="desktop-titlebar-title">Yama Coach</span>
      </div>
      <div className="desktop-titlebar-controls" style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}>
        <button type="button" className="desktop-titlebar-btn" onClick={() => window.yamaDesktop?.minimize()} aria-label="Minimizar">
          <Minus size={14} />
        </button>
        <button type="button" className="desktop-titlebar-btn" onClick={() => { window.yamaDesktop?.maximize(); setMaximized(!maximized); }} aria-label={maximized ? "Restaurar" : "Maximizar"}>
          {maximized ? <Copy size={12} /> : <Square size={12} />}
        </button>
        <button type="button" className="desktop-titlebar-btn desktop-titlebar-close" onClick={() => window.yamaDesktop?.close()} aria-label="Fechar">
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
