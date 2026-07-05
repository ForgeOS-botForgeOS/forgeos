// Generates every ForgeOS icon (no external deps) — a forge-orange tile with a
// stylised anvil + sparks. Outputs:
//   • PWA icons into /public (maskable-safe full-bleed)
//   • Android launcher icons into android/.../res/mipmap-* (legacy, round,
//     adaptive foreground) — the adaptive background colour lives in
//     res/values/ic_launcher_background.xml
//   • Android splash screens into android/.../res/drawable* (dark, centred mark)
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = c & 1 ? (c >>> 1) ^ 0xedb88320 : c >>> 1;
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

function makePng(w, h, draw) {
  const px = Buffer.alloc(w * h * 4); // starts fully transparent
  const set = (x, y, r, g, b, a = 255) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return;
    const o = (y * w + x) * 4;
    px[o] = r; px[o + 1] = g; px[o + 2] = b; px[o + 3] = a;
  };
  draw(set, w, h);

  // raw scanlines with filter byte 0
  const raw = Buffer.alloc(h * (w * 4 + 1));
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0;
    px.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // colour type RGBA
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const EMBER = [255, 92, 53]; // brand orange tile
const DARK = [11, 14, 20]; // forge-dark (#0b0e14), matches the app theme

// Original ForgeOS mark: a stylised anvil with forge sparks, drawn from
// scratch as filled blocks into a square of side `s` at offset (ox, oy).
function drawMark(set, ox, oy, s) {
  const rect = (x0, y0, x1, y1, c) => {
    for (let y = Math.round(oy + y0 * s); y < Math.round(oy + y1 * s); y++)
      for (let x = Math.round(ox + x0 * s); x < Math.round(ox + x1 * s); x++)
        set(x, y, c[0], c[1], c[2]);
  };
  const W = [245, 245, 247]; // anvil white
  const G = [255, 211, 74]; // spark gold
  const S = [9, 11, 16]; // subtle shadow (forge-dark)

  // --- Anvil silhouette ---
  // soft drop shadow under the base
  rect(0.26, 0.715, 0.76, 0.745, S);

  // horn (left taper) — two stepped blocks for a pointed feel
  rect(0.10, 0.375, 0.20, 0.43, W);
  rect(0.06, 0.39, 0.13, 0.42, W);
  // heel (small right step)
  rect(0.80, 0.385, 0.88, 0.45, W);
  // top working face (the wide beam)
  rect(0.18, 0.36, 0.82, 0.46, W);
  // under-bevel step (right-biased, classic anvil underside)
  rect(0.34, 0.46, 0.74, 0.52, W);
  // neck / waist (narrow column)
  rect(0.42, 0.52, 0.58, 0.62, W);
  // base / foot (wide, with a slight lip)
  rect(0.28, 0.62, 0.72, 0.71, W);
  rect(0.24, 0.685, 0.76, 0.71, W);

  // --- Forge sparks (gold) above the horn ---
  // big spark: a plus + a centre block
  rect(0.275, 0.20, 0.305, 0.30, G); // vertical
  rect(0.24, 0.235, 0.34, 0.265, G); // horizontal
  // medium spark upper-right of the first
  rect(0.40, 0.255, 0.418, 0.305, G);
  rect(0.382, 0.272, 0.436, 0.288, G);
  // tiny spark dot
  rect(0.165, 0.30, 0.195, 0.33, G);
}

const fillRect = (set, w, h, c) => {
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) set(x, y, c[0], c[1], c[2]);
};
const fillCircle = (set, n, c) => {
  const r = n / 2;
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      const dx = x + 0.5 - r, dy = y + 0.5 - r;
      if (dx * dx + dy * dy <= r * r) set(x, y, c[0], c[1], c[2]);
    }
};

// ---- PWA icons (unchanged look) --------------------------------------------
const outDir = path.join(__dirname, '..', 'public');
fs.mkdirSync(outDir, { recursive: true });
for (const size of [192, 512, 180]) {
  const name = size === 180 ? 'apple-touch-icon.png' : `icon-${size}.png`;
  const png = makePng(size, size, (set, w, h) => {
    fillRect(set, w, h, EMBER);
    drawMark(set, 0, 0, size);
  });
  fs.writeFileSync(path.join(outDir, name), png);
  console.log('wrote', name);
}

// ---- Android launcher icons + splash ----------------------------------------
const resDir = path.join(__dirname, '..', 'android', 'app', 'src', 'main', 'res');
if (fs.existsSync(resDir)) {
  const write = (rel, buf) => {
    const p = path.join(resDir, rel);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, buf);
    console.log('wrote android', rel);
  };

  const DENSITIES = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };
  for (const [d, mult] of Object.entries(DENSITIES)) {
    const n = Math.round(48 * mult); // legacy launcher size
    write(`mipmap-${d}/ic_launcher.png`, makePng(n, n, (set, w, h) => {
      fillRect(set, w, h, EMBER);
      drawMark(set, 0, 0, n);
    }));
    write(`mipmap-${d}/ic_launcher_round.png`, makePng(n, n, (set) => {
      fillCircle(set, n, EMBER); // mark stays inside the circle (r≈0.46 max)
      drawMark(set, 0, 0, n);
    }));
    // Adaptive foreground: 108dp canvas, content inside the ~66dp safe circle.
    const f = Math.round(108 * mult);
    write(`mipmap-${d}/ic_launcher_foreground.png`, makePng(f, f, (set) => {
      drawMark(set, f * 0.21, f * 0.21, f * 0.58);
    }));
  }

  // Splash: dark theme background with the mark centred.
  const SPLASH = {
    'drawable': [480, 320],
    'drawable-land-mdpi': [480, 320], 'drawable-land-hdpi': [800, 480],
    'drawable-land-xhdpi': [1280, 720], 'drawable-land-xxhdpi': [1600, 960],
    'drawable-land-xxxhdpi': [1920, 1280],
    'drawable-port-mdpi': [320, 480], 'drawable-port-hdpi': [480, 800],
    'drawable-port-xhdpi': [720, 1280], 'drawable-port-xxhdpi': [960, 1600],
    'drawable-port-xxxhdpi': [1280, 1920],
  };
  for (const [dir, [w, h]] of Object.entries(SPLASH)) {
    const s = Math.round(0.34 * Math.min(w, h));
    write(`${dir}/splash.png`, makePng(w, h, (set) => {
      fillRect(set, w, h, DARK);
      drawMark(set, (w - s) / 2, (h - s) / 2, s);
    }));
  }
}
