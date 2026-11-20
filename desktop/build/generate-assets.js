/* eslint-disable */
/* Gera os recursos visuais do instalador/launcher do Yama Coach sem dependencias.
   Uso: node desktop/build/generate-assets.js */
"use strict";

const fs = require("node:fs");
const path = require("node:path");

const OUT_DIR = path.join(__dirname, "..", "assets");
const BUILD_DIR = __dirname;

const C = {
  bg: [7, 9, 11],
  panel: [13, 17, 21],
  emerald: [16, 185, 129],
  emeraldLight: [52, 211, 153],
  amber: [245, 158, 11],
  amberLight: [255, 200, 80],
  text: [231, 237, 240],
  muted: [123, 138, 131],
  line: [34, 48, 41],
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
function poly(c, pts, color, alpha, scale) {
  const sp = pts.map(([x, y]) => [Math.round(x * scale), Math.round(y * scale)]);
  let minY = Infinity, maxY = -Infinity;
  for (const [, y] of sp) { minY = Math.min(minY, y); maxY = Math.max(maxY, y); }
  for (let y = minY; y <= maxY; y++) {
    const xs = [];
    for (let i = 0; i < sp.length; i++) {
      const [x1, y1] = sp[i];
      const [x2, y2] = sp[(i + 1) % sp.length];
      if ((y1 <= y && y2 > y) || (y2 <= y && y1 > y)) {
        const t = (y - y1) / (y2 - y1);
        xs.push(Math.round(x1 + (x2 - x1) * t));
      }
    }
    xs.sort((a, b) => a - b);
    for (let i = 0; i < xs.length; i += 2) {
      if (xs[i + 1] !== undefined) {
        for (let x = xs[i]; x <= xs[i + 1]; x++) blend(c, x, y, color, alpha / 255);
      }
    }
  }
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
function drawText(c, str, x, y, scale, color, alpha) {
  const FONT = {
    A: [0b01110, 0b10001, 0b10001, 0b11111, 0b10001, 0b10001, 0b10001],
    C: [0b01110, 0b10001, 0b10000, 0b10000, 0b10000, 0b10001, 0b01110],
    G: [0b01110, 0b10001, 0b10000, 0b10111, 0b10001, 0b10001, 0b01110],
    H: [0b10001, 0b10001, 0b10001, 0b11111, 0b10001, 0b10001, 0b10001],
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
  const w = str.length * 6 * scale - scale;
  drawText(c, str, Math.round(centerX - w / 2), y, scale, color, alpha);
}

// ---- Ícone YC + Radiante (multi-res) ----
function drawMark(c, size) {
  const s = size;
  const pad = Math.round(s * 0.08);
  const r = Math.round(s * 0.20);
  fillRoundRect(c, pad, pad, s - 1 - pad, s - 1 - pad, r, C.bg, 255);
  radialGlow(c, s / 2, s / 2, s * 0.42, C.emerald, 0.10);
  // borda sutil
  ring(c, s / 2, s / 2, (s - 2 * pad) / 2 - 1, Math.max(1, s * 0.012), C.line, 160);
  const scale = s / 64;
  function sc(v) { return Math.round(v * scale); }
  // Y - esmeralda
  poly(c, [[4,6],[14,6],[26,28],[18,28]], C.emerald, 255, scale);
  poly(c, [[40,6],[50,6],[32,28],[24,28]], C.emerald, 255, scale);
  poly(c, [[22,26],[32,26],[32,52],[22,52]], C.emerald, 255, scale);
  // C - branco/grafite
  poly(c, [[44,8],[56,8],[60,12],[60,52],[56,56],[44,56],[44,48],[52,48],[54,46],[54,18],[52,16],[44,16]], [248,250,252], 255, scale);
  // Radiant star
  poly(c, [[32,0],[34.5,4.5],[39,7],[34.5,9.5],[32,14],[29.5,9.5],[25,7],[29.5,4.5]], C.amber, 255, scale);
  fillCircle(c, sc(32), sc(7), Math.max(1, sc(1.6)), [248,250,252], 255);
}

function makeIcon(size) {
  const c = makeCanvas(size, size);
  drawMark(c, size);
  return c;
}

// ---- Header do instalador (150x57) ----
function makeHeader() {
  const w = 150;
  const h = 57;
  const c = makeCanvas(w, h);
  fillRect(c, 0, 0, w - 1, h - 1, C.bg, 255);
  // gradiente horizontal sutil
  for (let x = 0; x < w; x++) {
    const t = x / (w - 1);
    const color = mix(C.bg, C.panel, t * 0.6);
    for (let y = 0; y < h; y++) blend(c, x, y, color, 255);
  }
  // borda inferior em esmeralda
  fillRect(c, 0, h - 2, w - 1, h - 1, C.emerald, 140);
  // crosshair logo à esquerda
  drawCrosshair(c, 26, h / 2, 14, 3.5, C.emerald, 255, 2);
  // texto da marca
  drawText(c, "YAMA", 50, 16, 2, C.text, 255);
  fillRect(c, 122, 8, 123, h - 8, C.line, 255);
  drawText(c, "COACH", 126, 16, 2, C.emeraldLight, 255);
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
    for (let y = 0; y < h; y++) blend(c, x, y, C.line, 35);
  }
  for (let y = 32; y < h; y += 32) {
    for (let x = 0; x < w; x++) blend(c, x, y, C.line, 35);
  }
  // destaque superior em âmbar
  fillRect(c, 0, 0, w - 1, 3, C.amber, 255);
  // halo esmeralda central
  radialGlow(c, w / 2, 108, 130, C.emerald, 0.12);
  // crosshair grande no centro superior
  drawCrosshair(c, w / 2, 100, 38, 7, C.emerald, 255, 5);
  // ponto âmbar
  fillCircle(c, 130, 54, 6, C.amber, 240);
  ring(c, 130, 54, 11, 2, C.amberLight, 130);
  // linha separadora
  fillRect(c, 24, 178, w - 25, 179, C.line, 255);
  // texto da marca
  drawText(c, "YAMA", 22, 196, 2, C.text, 255);
  drawText(c, "COACH", 86, 196, 2, C.emeraldLight, 255);
  drawText(c, "VALORANT COACHING", 31, 232, 1, C.muted, 255);
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

function writeIcon(file, sizes) {
  // sizes: array of { size, canvas }
  const entries = sizes.map(({ size, canvas }) => {
    const w = size, h = size;
    const rowSize = w * 4;
    const andRowSize = Math.ceil(w / 32) * 4;
    const imageSize = rowSize * h + andRowSize * h;
    const bmpSize = 54 + imageSize;
    return { size, canvas, w, h, rowSize, andRowSize, imageSize, bmpSize };
  });
  const totalSize = 6 + entries.length * 16 + entries.reduce((a, e) => a + e.bmpSize, 0);
  const buf = Buffer.alloc(totalSize);
  buf.writeUInt16LE(0, 0);
  buf.writeUInt16LE(1, 2);
  buf.writeUInt16LE(entries.length, 4);
  let offset = 6 + entries.length * 16;
  for (let i = 0; i < entries.length; i++) {
    const e = entries[i];
    const dirOffset = 6 + i * 16;
    buf.writeUInt8(e.size === 256 ? 0 : e.size, dirOffset);
    buf.writeUInt8(e.size === 256 ? 0 : e.size, dirOffset + 1);
    buf.writeUInt8(0, dirOffset + 2);
    buf.writeUInt8(0, dirOffset + 3);
    buf.writeUInt16LE(1, dirOffset + 4);
    buf.writeUInt16LE(32, dirOffset + 6);
    buf.writeUInt32LE(e.bmpSize, dirOffset + 8);
    buf.writeUInt32LE(offset, dirOffset + 12);
    // BMP header
    buf.write("BM", offset, "ascii");
    buf.writeUInt32LE(e.bmpSize, offset + 2);
    buf.writeUInt32LE(0, offset + 6);
    buf.writeUInt32LE(54, offset + 10);
    buf.writeUInt32LE(40, offset + 14);
    buf.writeInt32LE(e.w, offset + 18);
    buf.writeInt32LE(e.h * 2, offset + 22);
    buf.writeUInt16LE(1, offset + 26);
    buf.writeUInt16LE(32, offset + 28);
    buf.writeUInt32LE(0, offset + 30);
    buf.writeUInt32LE(e.imageSize, offset + 34);
    buf.writeInt32LE(2835, offset + 38);
    buf.writeInt32LE(2835, offset + 42);
    buf.writeUInt32LE(0, offset + 46);
    buf.writeUInt32LE(0, offset + 50);
    // pixels BGRA bottom-up
    const { data } = e.canvas;
    const w = e.w, h = e.h;
    let po = offset + 54;
    for (let y = 0; y < h; y++) {
      const srcY = h - 1 - y;
      for (let x = 0; x < w; x++) {
        const i = (srcY * w + x) * 4;
        buf[po++] = data[i + 2];
        buf[po++] = data[i + 1];
        buf[po++] = data[i];
        buf[po++] = data[i + 3];
      }
    }
    // AND mask (zeros)
    offset += e.bmpSize;
  }
  fs.writeFileSync(file, buf);
}

// Gera assets
fs.mkdirSync(OUT_DIR, { recursive: true });

// Ícone multi-resolução
const iconSizes = [16, 32, 48, 64, 128, 256].map((size) => ({ size, canvas: makeIcon(size) }));
writeIcon(path.join(OUT_DIR, "icon.ico"), iconSizes);
// PNG 512x512 e 256x256
function writePNG(file, c) {
  // PNG simples via zlib
  const zlib = require("node:zlib");
  const { w, h, data } = c;
  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  // IDAT: raw image data with filter byte 0 per scanline
  const raw = Buffer.alloc(h * (1 + w * 4));
  for (let y = 0; y < h; y++) {
    raw[y * (1 + w * 4)] = 0;
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const o = y * (1 + w * 4) + 1 + x * 4;
      raw[o] = data[i];
      raw[o + 1] = data[i + 1];
      raw[o + 2] = data[i + 2];
      raw[o + 3] = data[i + 3];
    }
  }
  const idat = zlib.deflateSync(raw);
  // CRC32
  function crc32(buf) {
    let crc = 0xffffffff;
    const table = [];
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[n] = c;
    }
    for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
    return (crc ^ 0xffffffff) >>> 0;
  }
  function chunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, "ascii");
    const crcBuf = Buffer.alloc(4);
    crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
    return Buffer.concat([len, typeBuf, data, crcBuf]);
  }
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdrChunk = chunk("IHDR", ihdr);
  const idatChunk = chunk("IDAT", idat);
  const iendChunk = chunk("IEND", Buffer.alloc(0));
  fs.writeFileSync(file, Buffer.concat([sig, ihdrChunk, idatChunk, iendChunk]));
}
writePNG(path.join(OUT_DIR, "icon-512.png"), makeIcon(512));
writePNG(path.join(OUT_DIR, "icon-256.png"), makeIcon(256));

// Bitmas do instalador (continuam em desktop/build)
writeBMP24(path.join(BUILD_DIR, "installerHeader.bmp"), makeHeader());
writeBMP24(path.join(BUILD_DIR, "installerSidebar.bmp"), makeSidebar());

console.log("Assets gerados em", OUT_DIR, "e", BUILD_DIR);
