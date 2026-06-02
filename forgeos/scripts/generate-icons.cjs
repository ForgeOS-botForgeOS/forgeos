// Generates ForgeOS PWA icons (no external deps) — a forge-orange tile with a
// white "F". Outputs maskable-safe full-bleed PNGs into /public.
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

function makePng(size, draw) {
  const px = Buffer.alloc(size * size * 4);
  const set = (x, y, r, g, b, a = 255) => {
    if (x < 0 || y < 0 || x >= size || y >= size) return;
    const o = (y * size + x) * 4;
    px[o] = r; px[o + 1] = g; px[o + 2] = b; px[o + 3] = a;
  };
  draw(set, size);

  // raw scanlines with filter byte 0
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    px.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
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

// Original ForgeOS mark: a stylised anvil with a forge spark, drawn from
// scratch as filled blocks. Full-bleed ember background = maskable-safe.
function drawForge(set, n) {
  const rect = (x0, y0, x1, y1, c) => {
    for (let y = Math.round(y0 * n); y < Math.round(y1 * n); y++)
      for (let x = Math.round(x0 * n); x < Math.round(x1 * n); x++) set(x, y, c[0], c[1], c[2]);
  };
  const W = [245, 245, 247]; // anvil white
  const G = [255, 211, 74]; // spark gold
  const S = [9, 11, 16]; // subtle shadow (forge-dark)

  // background (slightly darker ember at the very edges via two fills)
  rect(0, 0, 1, 1, [255, 92, 53]);

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

const outDir = path.join(__dirname, '..', 'public');
fs.mkdirSync(outDir, { recursive: true });
for (const size of [192, 512, 180]) {
  const name = size === 180 ? 'apple-touch-icon.png' : `icon-${size}.png`;
  fs.writeFileSync(path.join(outDir, name), makePng(size, drawForge));
  console.log('wrote', name);
}
