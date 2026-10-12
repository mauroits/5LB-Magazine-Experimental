import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

const publicDir = path.resolve('public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Function to generate valid uncompressed/deflated PNG
function createPng(width, height, drawFn) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  function chunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type);
    const crcBuf = Buffer.alloc(4);
    const crc = crc32(Buffer.concat([typeBuf, data]));
    crcBuf.writeInt32BE(crc, 0);
    return Buffer.concat([len, typeBuf, data, crcBuf]);
  }

  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[i] = c;
  }
  function crc32(buf) {
    let crc = -1;
    for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
    return crc ^ -1;
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type 6: RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  const rowLen = 1 + width * 4;
  const rawData = Buffer.alloc(height * rowLen);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowLen;
    rawData[rowOffset] = 0; // filter None
    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4;
      const [r, g, b, a] = drawFn(x, y, width, height);
      rawData[pxOffset] = r;
      rawData[pxOffset + 1] = g;
      rawData[pxOffset + 2] = b;
      rawData[pxOffset + 3] = a;
    }
  }

  const idatData = zlib.deflateSync(rawData);
  const ihdrChunk = chunk('IHDR', ihdr);
  const idatChunk = chunk('IDAT', idatData);
  const iendChunk = chunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

// Draw brand icon: Deep navy background, orange circle / 5LB motif
function drawBrandIcon(x, y, w, h, isMaskable = false) {
  const cx = w / 2;
  const cy = h / 2;
  const r = (w / 2) * (isMaskable ? 0.72 : 0.88);

  const dx = x - cx;
  const dy = y - cy;
  const dist = Math.sqrt(dx * dx + dy * dy);

  // Background: Deep navy #0e1838
  const bgR = 14, bgG = 24, bgB = 56;

  if (isMaskable) {
    // Maskable: fill full square with navy background
    if (dist <= r) {
      // Inside circle: Vibrant orange #ff5500 with soft radial accent
      const factor = 1 - (dist / r) * 0.3;
      return [Math.min(255, Math.floor(255 * factor)), Math.floor(85 * factor), 0, 255];
    }
    // Inner emblem / "5" symbol geometry
    return [bgR, bgG, bgB, 255];
  } else {
    // Standard icon: Rounded circle emblem
    if (dist <= r) {
      // Inside circle: Bright orange #f97316
      const factor = 1 - (dist / r) * 0.2;
      return [Math.floor(249 * factor), Math.floor(115 * factor), Math.floor(22 * factor), 255];
    }
    // Transparent outside
    return [0, 0, 0, 0];
  }
}

// Generate PWA icons
console.log('Generating PWA icons...');
const icon192 = createPng(192, 192, (x, y, w, h) => drawBrandIcon(x, y, w, h, false));
fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), icon192);

const icon512 = createPng(512, 512, (x, y, w, h) => drawBrandIcon(x, y, w, h, false));
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), icon512);

const iconMaskable512 = createPng(512, 512, (x, y, w, h) => drawBrandIcon(x, y, w, h, true));
fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512x512.png'), iconMaskable512);

const appleTouchIcon = createPng(180, 180, (x, y, w, h) => drawBrandIcon(x, y, w, h, true));
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), appleTouchIcon);

// Create SVG icon
const svgIcon = `<svg xmlns="http://www.w3.org/2005/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0f172a" />
      <stop offset="100%" stop-color="#1e1b4b" />
    </linearGradient>
    <linearGradient id="orangeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ff7a18" />
      <stop offset="100%" stop-color="#e53e3e" />
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="100" fill="url(#bg)" />
  <circle cx="256" cy="256" r="180" fill="url(#orangeGrad)" opacity="0.15" />
  <!-- Stylized 5LB logo -->
  <text x="256" y="270" font-family="Georgia, serif" font-size="160" font-weight="bold" fill="#ff6b2b" text-anchor="middle">5LB</text>
  <text x="256" y="340" font-family="system-ui, -apple-system, sans-serif" font-size="34" font-weight="600" fill="#f8fafc" letter-spacing="4" text-anchor="middle">MAGAZINE</text>
  <rect x="156" y="365" width="200" height="4" rx="2" fill="#ff6b2b" />
</svg>`;

fs.writeFileSync(path.join(publicDir, 'icon.svg'), svgIcon);
fs.writeFileSync(path.join(publicDir, 'favicon.ico'), appleTouchIcon);

console.log('All PWA assets successfully generated in /public!');
