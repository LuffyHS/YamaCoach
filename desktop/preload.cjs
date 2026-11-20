"use strict";
// Expoe o modo desktop para a aplicacao web (detecao client-side).
try {
  Object.defineProperty(window, "__YAMA_DESKTOP__", { value: true, writable: false, configurable: false });
} catch {
  window.__YAMA_DESKTOP__ = true;
}
// Intentionally no Node APIs exposed to the website.