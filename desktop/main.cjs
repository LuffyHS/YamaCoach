/* eslint-disable @typescript-eslint/no-require-imports */
const { app, BrowserWindow, shell } = require("electron");
const path = require("node:path");
const fs = require("node:fs");

const APP_ID = "gg.yamacoach.desktop";
const SPLASH_PATH = path.join(__dirname, "splash.html");
const BRAND_COLOR = "#07090b";
let configuredAppUrl = "";
let mainWindow = null;
let splashWindow = null;

const packagedEnv = path.join(process.resourcesPath || "", "app.env");
if (app.isPackaged && fs.existsSync(packagedEnv)) {
  for (const line of fs.readFileSync(packagedEnv, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*YAMA_APP_URL\s*=\s*(.*?)\s*$/);
    if (match && !process.env.YAMA_APP_URL) process.env.YAMA_APP_URL = match[1].replace(/^['"]|['"]$/g, "");
  }
}

function createSplash() {
  const window = new BrowserWindow({
    width: 460,
    height: 300,
    frame: false,
    resizable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    center: true,
    show: true,
    skipTaskbar: true,
    backgroundColor: BRAND_COLOR,
    title: "Yama Coach",
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true },
  });
  void window.loadFile(SPLASH_PATH);
  return window;
}

function closeSplash() {
  if (splashWindow && !splashWindow.isDestroyed()) {
    splashWindow.close();
  }
  splashWindow = null;
}

function createWindow(appUrl) {
  const window = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 960,
    minHeight: 680,
    show: false,
    backgroundColor: BRAND_COLOR,
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
  mainWindow = window;

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

  window.once("ready-to-show", () => {
    closeSplash();
    if (!window.isDestroyed()) {
      window.show();
      window.focus();
    }
  });

  void window.loadURL(appUrl);
  return window;
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.setAppUserModelId(APP_ID);
  app.on("second-instance", () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    const appUrl = process.env.YAMA_APP_URL || (app.isPackaged ? "" : "http://localhost:3000");
    let validUrl = false;
    try { const parsed = new URL(appUrl); validUrl = parsed.protocol === "https:" || (!app.isPackaged && parsed.hostname === "localhost"); }
    catch { validUrl = false; }
    if (!validUrl) {
      require("electron").dialog.showErrorBox(
        "Yama Coach não configurado",
        "Não foi possível localizar o endereço seguro do serviço. Reinstale o Yama Coach usando o instalador mais recente."
      );
      app.quit();
      return;
    }
    configuredAppUrl = appUrl;

    splashWindow = createSplash();
    createWindow(configuredAppUrl);

    // Rede de segurança: nunca deixe a splash presa na tela.
    setTimeout(closeSplash, 9000);

    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow(configuredAppUrl);
    });
  });

  app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });
}
