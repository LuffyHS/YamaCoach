/* eslint-disable @typescript-eslint/no-require-imports */
const { app, BrowserWindow, shell, ipcMain } = require("electron");
const path = require("node:path");
const fs = require("node:fs");

const APP_ID = "gg.yamacoach.desktop";
const SPLASH_PATH = path.join(__dirname, "splash.html");
const BRAND_COLOR = "#07090b";
let autoUpdater = null;
try { autoUpdater = require("electron-updater").autoUpdater; } catch { autoUpdater = null; }

// Auto-updater events
function setupAutoUpdater() {
  if (!autoUpdater || !app.isPackaged) return;
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.on("update-available", (info) => {
    if (splashWindow && !splashWindow.isDestroyed()) {
      splashWindow.webContents.send("updater:available", { version: info.version });
    }
  });
  autoUpdater.on("download-progress", (progress) => {
    if (splashWindow && !splashWindow.isDestroyed()) {
      splashWindow.webContents.send("updater:progress", { percent: progress.percent });
    }
  });
  autoUpdater.on("update-downloaded", (info) => {
    if (splashWindow && !splashWindow.isDestroyed()) {
      splashWindow.webContents.send("updater:downloaded", { version: info.version });
    }
    // Auto-install after a short delay
    setTimeout(() => {
      autoUpdater.quitAndInstall(true, true);
    }, 2000);
  });
  autoUpdater.on("error", (err) => {
    if (splashWindow && !splashWindow.isDestroyed()) {
      splashWindow.webContents.send("updater:error", { message: err?.message || "Erro" });
    }
  });
}

// IPC handlers for splash screen updater
ipcMain.handle("updater:check", async () => {
  if (!autoUpdater || !app.isPackaged) return { available: false };
  try {
    const result = await autoUpdater.checkForUpdates();
    if (result && result.updateInfo && result.updateInfo.version) {
      // Compare versions
      const currentVersion = app.getVersion();
      if (result.updateInfo.version !== currentVersion) {
        return { available: true, version: result.updateInfo.version };
      }
    }
    return { available: false };
  } catch (e) {
    return { available: false, error: e?.message || "Erro" };
  }
});

ipcMain.on("updater:start", () => {
  if (!autoUpdater || !app.isPackaged) return;
  autoUpdater.downloadUpdate().catch((e) => {
    if (splashWindow && !splashWindow.isDestroyed()) {
      splashWindow.webContents.send("updater:error", { message: e?.message || "Erro" });
    }
  });
});

ipcMain.on("updater:proceed", () => {
  closeSplash();
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.show();
    mainWindow.focus();
  }
});

const packagedEnv = path.join(process.resourcesPath || "", "app.env");
let configuredAppUrl = "";
let mainWindow = null;
let splashWindow = null;

// IPC handlers for custom titlebar
ipcMain.on("window:minimize", () => { if (mainWindow && !mainWindow.isDestroyed()) mainWindow.minimize(); });
ipcMain.on("window:maximize", () => { if (mainWindow && !mainWindow.isDestroyed()) { if (mainWindow.isMaximized()) mainWindow.unmaximize(); else mainWindow.maximize(); } });
ipcMain.on("window:close", () => { if (mainWindow && !mainWindow.isDestroyed()) mainWindow.close(); });
ipcMain.handle("window:isMaximized", () => mainWindow && !mainWindow.isDestroyed() ? mainWindow.isMaximized() : false);
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
    icon: path.join(__dirname, "assets", "icon.ico"),
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
  // Persiste o modo desktop em todas as rotas via cookie e query.
  let desktopUrl = appUrl;
  try {
    const parsed = new URL(appUrl);
    if (parsed.searchParams.get("desktop") !== "1") {
      parsed.searchParams.set("desktop", "1");
      desktopUrl = parsed.toString();
    }
  } catch {
    desktopUrl = appUrl;
  }

  const window = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 960,
    minHeight: 680,
    show: false,
    frame: false,
    transparent: false,
    backgroundColor: BRAND_COLOR,
    title: "Yama Coach",
    roundedCorners: true,
    icon: path.join(__dirname, "assets", "icon.ico"),
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

  // User-Agent customizado para deteccao no servidor.
  window.webContents.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 YamaCoachDesktop/1.0 Electron");

  let trustedOrigin;
  try { trustedOrigin = new URL(desktopUrl).origin; } catch { trustedOrigin = "https://yamacoach.onrender.com"; }

  // Persiste cookie yama_desktop=1 para todas as rotas.
  try {
    const session = window.webContents.session;
    void session.cookies.set({
      url: trustedOrigin,
      name: "yama_desktop",
      value: "1",
      path: "/",
      sameSite: "lax",
      secure: trustedOrigin.startsWith("https:"),
    });
  } catch {}

  window.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: "deny" };
  });
  window.webContents.on("will-navigate", (event, url) => {
    try {
      const parsed = new URL(url);
      if (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1") {
        event.preventDefault();
        void shell.openExternal("https://yamacoach.onrender.com/login");
        return;
      }
      if (parsed.origin !== trustedOrigin) {
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

  window.webContents.on("did-fail-load", () => {
    if (!window.isDestroyed()) {
      void window.loadURL("https://yamacoach.onrender.com/login?desktop=1");
    }
  });
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

    // Auto-updater
    setupAutoUpdater();

    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow(configuredAppUrl);
    });
  });

  app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });
}
