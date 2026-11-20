/* eslint-disable */
/* Gera os recursos visuais do instalador/launcher do Yama Coach sem dependencias.
   Uso: node desktop/build/generate-assets.js */
"use strict";

const fs = require("node:fs");
const path = require("node:path");

const OUT_DIR = __dirname;

// Paleta da marca
const C = {
  bg: [7, 9, 11],
  panel: [13, 17, 21],
  emerald: [16, 185, 129],
  emeraldLight: [52, 211, 153],
  emeraldDim: [12, 110, 80],
  amber: [245, 158, 11],
  amberLight: [255, 200, 80],
  text: [231, 237, 240],
  muted: [123, 138, 131],
  line: [34, 48, 41],
  glow: [16, 185, 129],
};

function mix(a, b, t) {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}
function clamp255(v) {
  return Math.max(0, Math.min(255, Math.round(v)));
}
function makeCanvas(w, h) {
  return { w, h, data: new Uint8Array(w * h * 4) };
}
function blend(c, x, y, color, alpha) {
  x = Math.round(x);
  y = Math.round(y);
  if (x < 0 || y < 0 || x >= c.w || y >= c.h || alpha <= 0) return;
  const a = Math.min(1, Math.max(0, alpha));
  const i = (y * c.w + x) * 4;
  const da = c.data[i + 3] / 255;
  const oa = a + da * (1 - a);
  if (oa <= 0) {
    c.data[i] = c.data[i + 1] = c.data[i + 2] = c.data[i + 3] = 0;
    return;
  }
  c.data[i] = clamp255((color[0] * a + c.data[i] * da * (1 - a)) / oa);
  c.data[i + 1] = clamp255((color[1] * a + c.data[i + 1] * da * (1 - a)) / oa);
  c.data[i + 2] = clamp255((color[2] * a + c.data[i + 2] * da * (1 - a)) / oa);
  c.data[i + 3] = clamp255(oa * 255);
}
function fillCircle(c, cx, cy, r, color, alpha) {
  const minX = Math.floor(cx - r - 1);
  const maxX = Math.ceil(cx + r + 1);
  const minY = Math.floor(cy - r - 1);
  const maxY = Math.ceil(cy + r + 1);
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const d = Math.hypot(x - cx, y - cy);
      if (d <= r) blend(c, x, y, color, alpha);
    }
  }
}
function ring(c, cx, cy, r, thickness, color, alpha) {
  const half = thickness / 2;
  const minX = Math.floor(cx - r - half - 1);
  const maxX = Math.ceil(cx + r + half + 1);
  const minY = Math.floor(cy - r - half - 1);
  const maxY = Math.ceil(cy + r + half + 1);
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const d = Math.hypot(x - cx, y - cy);
      if (d >= r - half && d <= r + half) blend(c, x, y, color, alpha);
    }
  }
}
function line(c, x0, y0, x1, y1, thickness, color, alpha) {
  const steps = Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 2) + 1;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    fillCircle(c, x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, thickness / 2, color, alpha);
  }
}
function fillRect(c, x0, y0, x1, y1, color, alpha) {
  for (let y = Math.round(y0); y <= Math.round(y1); y++) {
    for (let x = Math.round(x0); x <= Math.round(x1); x++) blend(c, x, y, color, alpha);
  }
}
function fillRoundRect(c, x0, y0, x1, y1, radius, color, alpha) {
  for (let y = Math.round(y0); y <= Math.round(y1); y++) {
    for (let x = Math.round(x0); x <= Math.round(x1); x++) {
      const nx = Math.max(x0 + radius, Math.min(x, x1 - radius));
      const ny = Math.max(y0 + radius, Math.min(y, y1 - radius));
      if (Math.hypot(x - nx, y - ny) <= radius) blend(c, x, y, color, alpha);
    }
  }
}
function radialGlow(c, cx, cy, radius, color, alpha) {
  const minX = Math.max(0, Math.floor(cx - radius));
  const maxX = Math.min(c.w - 1, Math.ceil(cx + radius));
  const minY = Math.max(0, Math.floor(cy - radius));
  const maxY = Math.min(c.h - 1, Math.ceil(cy + radius));
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const d = Math.hypot(x - cx, y - cy) / radius;
      if (d < 1) blend(c, x, y, color, alpha * (1 - d) * (1 - d));
    }
  }
}
function linearGradient(c, x0, y0, x1, y1, stops, alpha) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const len = Math.hypot(dx, dy);
  if (len === 0) return;
  const ux = dx / len;
  const uy = dy / len;
  for (let y = 0; y < c.h; y++) {
    for (let x = 0; x < c.w; x++) {
      const t = ((x - x0) * ux + (y - y0) * uy) / len;
      if (t < 0 || t > 1) continue;
      // interpolar cor
      let color = stops[0].color;
      for (let s = 0; s < stops.length - 1; s++) {
        if (t >= stops[s].t && t <= stops[s + 1].t) {
          const tt = (t - stops[s].t) / (stops[s + 1].t - stops[s].t);
          color = mix(stops[s].color, stops[s + 1].color, tt);
          break;
        }
      }
      blend(c, x, y, color, alpha);
    }
  }
}

const FONT = {
  A: [0b01110, 0b10001, 0b10001, 0b11111, 0b10001, 0b10001, 0b10001],
  C: [0b01110, 0b10001, 0b10000, 0b10000, 0b10000, 0b10001, 0b01110],
  G: [0b01110, 0b10001, 0b10000, 0b10111, 0b10001, 0b10001, 0b01110],
  H: [0b10001, 0b10001, 0b10001, 0b11111, 0b10001, 0b10001, 0b10001],
  I: [0b11111, 0b00100, 0b00100, 0b00100, 0b00100, 0b00100, 0b11111],
  L: [0b10000, 0b10000, 0b10000, 0b10000, 0b10000, 0b10000, 0b11111],
  M: [0b10001, 0b11011, 0b10101, 0b10101, 0b10001, 0b10001, 0b10001],
  N: [0b10001, 0b11001, 0b10101, 0b10011, 0b10001, 0b10001, 0b10001],
  O: [0b01110, 0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b01110],
  R: [0b11110, 0b10001, 0b10001, 0b11110, 0b10100, 0b10010, 0b10001],
  T: [0b11111, 0b00100, 0b00100, 0b00100, 0b00100, 0b00100, 0b00100],
  U: [0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b01110],
  V: [0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b01010, 0b00100],
  Y: [0b10001, 0b10001, 0b01010, 0b00100, 0b00100, 0b00100, 0b00100],
  " ": [0, 0, 0, 0, 0, 0, 0],
};
function textWidth(str, scale) {
  return str.length * 6 * scale - scale;
}
function drawText(c, str, x, y, scale, color, alpha) {
  let cx = x;
  for (const char of str.toUpperCase()) {
    const glyph = FONT[char] || FONT[" "];
    for (let row = 0; row < 7; row++) {
      for (let col = 0; col < 5; col++) {
        if (glyph[row] & (1 << (4 - col))) {
          fillRect(c, cx + col * scale, y + row * scale, cx + col * scale + scale - 1, y + row * scale + scale - 1, color, alpha);
        }
      }
    }
    cx += 6 * scale;
  }
}
function drawTextCentered(c, str, centerX, y, scale, color, alpha) {
  drawText(c, str, Math.round(centerX - textWidth(str, scale) / 2), y, scale, color, alpha);
}

// ---- Ícone 256x256 (crosshair + escudo + ponto âmbar) ----
function makeIcon() {
  const size = 256;
  const c = makeCanvas(size, size);
  // fundo escuro com gradiente sutil
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const t = y / (size - 1);
      blend(c, x, y, mix(C.panel, C.bg, t), 255);
    }
  }
  // borda externa sutil
  ring(c, size / 2, size / 2, size / 2 - 2, 2, C.line, 160);
  // escudo estilizado no centro
  const sx = size / 2;
  const sy = size / 2 + 4;
  // contorno do escudo
  const shieldPath = [];
  for (let angle = -135; angle <= 135; angle += 2) {
    const rad = (angle * Math.PI) / 180;
    const r = 62 + Math.sin(Math.abs(angle) * 0.015) * 6;
    shieldPath.push({ x: sx + Math.cos(rad) * r, y: sy + Math.sin(rad) * r });
  }
  for (let i = 0; i < shieldPath.length - 1; i++) {
    line(c, shieldPath[i].x, shieldPath[i].y, shieldPath[i + 1].x, shieldPath[i + 1].y, 5, C.emerald, 200);
  }
  // preenchimento interno do escudo com gradiente escuro
  fillCircle(c, sx, sy, 56, C.bg, 230);
  radialGlow(c, sx, sy, 58, C.emerald, 0.14);
  // crosshair dentro do escudo
  const cr = 30;
  const ct = 4;
  line(c, sx, sy - cr, sx, sy - cr * 0.5, ct, C.emeraldLight, 255);
  line(c, sx, sy + cr * 0.5, sx, sy + cr, ct, C.emeraldLight, 255);
  line(c, sx - cr, sy, sx - cr * 0.5, sy, ct, C.emeraldLight, 255);
  line(c, sx + cr * 0.5, sy, sx + cr, sy, ct, C.emeraldLight, 255);
  fillCircle(c, sx, sy, 5, C.amberLight, 255);
  // pontoâmbar no canto superior direito (status "ao vivo")
  fillCircle(c, 198, 58, 9, C.amber, 250);
  ring(c, 198, 58, 14, 2, C.amberLight, 140);
  radialGlow(c, 198, 58, 22, C.amber, 0.15);
  return c;
}

// ---- Header do instalador (150x57) ----
function makeHeader() {
  const w = 150;
  const h = 57;
  const c = makeCanvas(w, h);
  fillRect(c, 0, 0, w - 1, h - 1, C.bg, 255);
  linearGradient(c, 0, 0, w, h, [
    { t: 0, color: C.bg },
    { t: 0.5, color: mix(C.bg, C.panel, 0.3) },
    { t: 1, color: C.panel },
  ], 255);
  // borda inferior em esmeralda
  fillRect(c, 0, h - 2, w - 1, h - 1, C.emerald, 120);
  // crosshair logo à esquerda
  drawCrosshair(c, 26, h / 2, 14, 3.5, C.emerald, 255, 2);
  // texto da marca
  drawText(c, "YAMA", 50, 16, 2, C.text, 255);
  fillRect(c, 122, 8, 123, h - 8, C.line, 255);
  drawTextCentered(c, "COACH", 137, 16, 2, C.emeraldLight, 255);
  return c;
}

function drawCrosshair(c, cx, cy, radius, thickness, color, alpha, dotRadius) {
  ring(c, cx, cy, radius, thickness, color, alpha);
  const inner = radius * 0.45;
  const outer = radius * 0.88;
  line(c, cx, cy - outer, cx, cy - inner, thickness, color, alpha);
  line(c, cx, cy + inner, cx, cy + outer, thickness, color, alpha);
  line(c, cx - outer, cy, cx - inner, cy, thickness, color, alpha);
  line(c, cx + inner, cy, cx + outer, cy, thickness, color, alpha);
  if (dotRadius) fillCircle(c, cx, cy, dotRadius, color, alpha);
}

// ---- Sidebar do instalador (164x314) ----
function makeSidebar() {
  const w = 164;
  const h = 314;
  const c = makeCanvas(w, h);
  fillRect(c, 0, 0, w - 1, h - 1, C.bg, 255);
  // grade sutil
  for (let x = 32; x < w; x += 32) {
    for (let y = 0; y < h; y++) blend(c, x, y, C.line, 40);
  }
  for (let y = 32; y < h; y += 32) {
    for (let x = 0; x < w; x++) blend(c, x, y, C.line, 40);
  }
  // destaque superior em âmbar
  fillRect(c, 0, 0, w - 1, 3, C.amber, 255);
  // halo esmeralda central
  radialGlow(c, w / 2, 120, 140, C.emerald, 0.10);
  // crosshair grande no centro superior
  drawCrosshair(c, w / 2, 108, 40, 7, C.emerald, 255, 5);
  // ponto âmbar
  fillCircle(c, 130, 62, 6, C.amber, 240);
  ring(c, 130, 62, 11, 2, C.amberLight, 130);
  // linha separadora
  fillRect(c, 24, 186, w - 25, 187, C.line, 255);
  // texto da marca
  drawTextCentered(c, "YAMA COACH", w / 2, 208, 2, C.text, 255);
  drawTextCentered(c, "VALORANT COACHING", w / 2, 244, 1, C.muted, 255);
  // faixa inferior âmbar
  fillRect(c, 0, h - 3, w - 1, h - 1, C.amber, 130);
  return c;
}

function writeBMP24(file, c) {
  const { w, h, data } = c;
  const rowSize = Math.ceil((w * 3) / 4) * 4;
  const imageSize = rowSize * h;
  const buf = Buffer.alloc(54 + imageSize);
  buf.write("BM", 0, "ascii");
  buf.writeUInt32LE(54 + imageSize, 2);
  buf.writeUInt32LE(0, 6);
  buf.writeUInt32LE(54, 10);
  buf.writeUInt32LE(40, 14);
  buf.writeInt32LE(w, 18);
  buf.writeInt32LE(h, 22);
  buf.writeUInt16LE(1, 26);
  buf.writeUInt16LE(24, 28);
  buf.writeUInt32LE(0, 30);
  buf.writeUInt32LE(imageSize, 34);
  buf.writeInt32LE(2835, 38);
  buf.writeInt32LE(2835, 42);
  buf.writeUInt32LE(0, 46);
  buf.writeUInt32LE(0, 50);
  for (let y = 0; y < h; y++) {
    const srcY = h - 1 - y;
    let offset = 54 + y * rowSize;
    for (let x = 0; x < w; x++) {
      const i = (srcY * w + x) * 4;
      buf[offset++] = data[i + 2];
      buf[offset++] = data[i + 1];
      buf[offset++] = data[i];
    }
  }
  fs.writeFileSync(file, buf);
}

function writeIcon(file, c) {
  const { w, h, data } = c;
  const rowSize = w * 4;
  const andRowSize = Math.ceil(w / 32) * 4;
  const imageSize = rowSize * h + andRowSize * h;
  const bmpSize = 54 + imageSize;
  const buf = Buffer.alloc(6 + 16 + bmpSize);
  buf.writeUInt16LE(0, 0);
  buf.writeUInt16LE(1, 2);
  buf.writeUInt16LE(1, 4);
  buf.writeUInt8(0, 6);
  buf.writeUInt8(0, 7);
  buf.writeUInt8(0, 8);
  buf.writeUInt8(0, 9);
  buf.writeUInt16LE(1, 10);
  buf.writeUInt16LE(32, 12);
  buf.writeUInt32LE(bmpSize, 14);
  buf.writeUInt32LE(22, 18);
  buf.write("BM", 22, "ascii");
  buf.writeUInt32LE(bmpSize, 24);
  buf.writeUInt32LE(0, 30);
  buf.writeUInt32LE(54, 34);
  buf.writeUInt32LE(40, 38);
  buf.writeInt32LE(w, 42);
  buf.writeInt32LE(h * 2, 46);
  buf.writeUInt16LE(1, 50);
  buf.writeUInt16LE(32, 52);
  buf.writeUInt32LE(0, 54);
  buf.writeUInt32LE(imageSize, 58);
  buf.writeInt32LE(2835, 62);
  buf.writeInt32LE(2835, 66);
  buf.writeUInt32LE(0, 70);
  buf.writeUInt32LE(0, 74);
  let offset = 22 + 54;
  for (let y = 0; y < h; y++) {
    const srcY = h - 1 - y;
    for (let x = 0; x < w; x++) {
      const i = (srcY * w + x) * 4;
      buf[offset++] = data[i + 2];
      buf[offset++] = data[i + 1];
      buf[offset++] = data[i];
      buf[offset++] = data[i + 3];
    }
  }
  // Mascara AND toda opaca (alpha ja vai no canal do BMP)
  fs.writeFileSync(file, buf);
}

const icon = makeIcon();
writeIcon(path.join(OUT_DIR, "icon.ico"), icon);
writeBMP24(path.join(OUT_DIR, "installerHeader.bmp"), makeHeader());
writeBMP24(path.join(OUT_DIR, "installerSidebar.bmp"), makeSidebar());

console.log("Assets gerados em", OUT_DIR);
