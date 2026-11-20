"use client";

import { useEffect, useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";

const subscribe = (callback: () => void) => {
  window.addEventListener("storage", callback);
  window.addEventListener("yama-theme-change", callback);
  return () => { window.removeEventListener("storage", callback); window.removeEventListener("yama-theme-change", callback); };
};
const getSnapshot = () => window.localStorage.getItem("yama-theme") === "light";
const getServerSnapshot = () => false;

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const light = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  useEffect(() => {
    const saved = window.localStorage.getItem("yama-theme");
    const prefersLight = window.matchMedia("(prefers-color-scheme: light)").matches;
    const next = saved ? saved === "light" : prefersLight;
    document.documentElement.dataset.theme = next ? "light" : "dark";
    if (!saved) {
      window.localStorage.setItem("yama-theme", next ? "light" : "dark");
      window.dispatchEvent(new Event("yama-theme-change"));
    }
  }, []);
  function toggle() {
    const next = !light;
    document.documentElement.dataset.theme = next ? "light" : "dark";
    window.localStorage.setItem("yama-theme", next ? "light" : "dark");
    window.dispatchEvent(new Event("yama-theme-change"));
  }
  return <button className={`theme-toggle ${compact ? "is-compact" : ""}`} onClick={toggle} type="button" aria-label={`Mudar para tema ${light ? "escuro" : "claro"}`} title={`Tema ${light ? "claro" : "escuro"}`}>
    {light ? <Moon size={16} /> : <Sun size={16} />}<span>{compact ? "" : light ? "Tema claro" : "Tema escuro"}</span>
  </button>;
}
