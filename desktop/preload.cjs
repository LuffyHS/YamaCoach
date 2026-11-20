/* eslint-disable */
"use strict";
const { contextBridge, ipcRenderer } = require("electron");

// Expoe o modo desktop para a aplicacao web (detecao client-side).
try {
  Object.defineProperty(window, "__YAMA_DESKTOP__", { value: true, writable: false, configurable: false });
} catch (error) {
  window.__YAMA_DESKTOP__ = true;
}

// Expoe controles da janela para a titlebar customizada.
contextBridge.exposeInMainWorld("yamaDesktop", {
  minimize: () => ipcRenderer.send("window:minimize"),
  maximize: () => ipcRenderer.send("window:maximize"),
  close: () => ipcRenderer.send("window:close"),
  isMaximized: () => ipcRenderer.invoke("window:isMaximized"),
});

// Intentionally no other Node APIs exposed to the website.