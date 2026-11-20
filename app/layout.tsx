import type { Metadata } from "next";
import "./globals.css";
import "./live-room.css";
import "./live-room-actions.css";
import "./dashboard-shell.css";
import "./theme.css";
import "./landing.css";
import "./download.css";
import "./experience.css";
import "./coach-dashboard.css";
import "./valorant-polish.css";
import { DesktopTitlebar } from "@/components/desktop-titlebar";
import { ServiceWorkerCleanup } from "@/components/pwa-register";

export const metadata: Metadata = {
  title: "Yama Coach · Evolução no VALORANT",
  description: "Coaching competitivo, rotina de treino e análise de VOD para VALORANT.",
  applicationName: "Yama Coach",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className="h-full antialiased">
      <body className="min-h-full flex flex-col"><ServiceWorkerCleanup /><DesktopTitlebar />{children}</body>
    </html>
  );
}
