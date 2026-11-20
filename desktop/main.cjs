/* eslint-disable @typescript-eslint/no-require-imports */
const { app, BrowserWindow, shell } = require("electron");
const path = require("node:path");
const fs = require("node:fs");
let configuredAppUrl = "";

const packagedEnv = path.join(process.resourcesPath || "", "app.env");
if (app.isPackaged && fs.existsSync(packagedEnv)) {
  for (const line of fs.readFileSync(packagedEnv, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*YAMA_APP_URL\s*=\s*(.*?)\s*$/);
    if (match && !process.env.YAMA_APP_URL) process.env.YAMA_APP_URL = match[1].replace(/^['"]|['"]$/g, "");
  }
}

function createWindow(appUrl) {
  const window = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 960,
    minHeight: 680,
    backgroundColor: "#07090b",
    title: "Yama Coach",
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
    },
  });

  let trustedOrigin;
  try { trustedOrigin = new URL(appUrl).origin; } catch { trustedOrigin = "http://localhost:3000"; }
  window.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: "deny" };
  });
  window.webContents.on("will-navigate", (event, url) => {
    try {
      if (new URL(url).origin !== trustedOrigin) {
        event.preventDefault();
        void shell.openExternal(url);
      }
    } catch { event.preventDefault(); }
  });
  void window.loadURL(appUrl);
}

app.whenReady().then(() => {
  const appUrl = process.env.YAMA_APP_URL || (app.isPackaged ? "" : "http://localhost:3000");
  let validUrl = false;
  try { const parsed = new URL(appUrl); validUrl = parsed.protocol === "https:" || (!app.isPackaged && parsed.hostname === "localhost"); }
  catch { validUrl = false; }
  if (!validUrl) { require("electron").dialog.showErrorBox("Yama Coach não configurado", "Não foi possível localizar o endereço seguro do serviço. Reinstale o Yama Coach usando o instalador mais recente."); app.quit(); return; }
  configuredAppUrl = appUrl;
  createWindow(configuredAppUrl);
  app.on("activate", () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(configuredAppUrl); });
});
app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });
