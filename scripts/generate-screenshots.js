import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

const screenshotsDir = path.resolve('public/screenshots');
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

// Function to generate valid PNG using raw pixel buffer & zlib
function createPng(width, height, getPixelRgba) {
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
      const [r, g, b, a] = getPixelRgba(x, y, width, height);
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

// Mobile screenshot (750x1334)
function renderMobilePixel(x, y, w, h) {
  // Palette
  const brandNavy = [0, 8, 54, 255]; // #000836
  const bgSlate = [241, 245, 249, 255]; // #f1f5f9
  const white = [255, 255, 255, 255];
  const orange = [249, 115, 22, 255]; // #f97316
  const blue = [37, 99, 235, 255]; // #2563eb
  const textDark = [15, 23, 42, 255]; // #0f172a
  const textMuted = [100, 116, 139, 255]; // #64748b
  const cardBorder = [226, 232, 240, 255];

  // 1. Status bar (0 -> 44)
  if (y < 44) {
    return brandNavy;
  }

  // 2. Header (44 -> 140)
  if (y >= 44 && y < 140) {
    // Header background with slight gradient
    if (y === 139) return [14, 28, 80, 255];
    // Brand title & logo area
    // Center logo circle
    const logoX = 90, logoY = 92, logoR = 26;
    const dx = x - logoX, dy = y - logoY;
    if (dx * dx + dy * dy <= logoR * logoR) {
      return orange;
    }
    // Logo text bar simulation
    if (x >= 130 && x <= 360 && y >= 82 && y <= 102) {
      return white;
    }
    // Action buttons right
    if (x >= w - 100 && x <= w - 60 && y >= 75 && y <= 105) {
      return [30, 41, 75, 255];
    }
    if (x >= w - 50 && x <= w - 20 && y >= 75 && y <= 105) {
      return [30, 41, 75, 255];
    }
    return brandNavy;
  }

  // 3. Search & Quick Filters Bar (140 -> 230)
  if (y >= 140 && y < 230) {
    // Search input container
    if (x >= 24 && x <= w - 24 && y >= 155 && y <= 205) {
      // Rounded input box
      return white;
    }
    if (x >= 40 && x <= 70 && y >= 175 && y <= 185) {
      return textMuted; // Search icon placeholder
    }
    if (x >= 80 && x <= 340 && y >= 175 && y <= 185) {
      return textMuted; // Search text placeholder
    }
    return bgSlate;
  }

  // 4. Tab Navigation Bar (230 -> 290)
  if (y >= 230 && y < 290) {
    // Active Tab: "Il mio archivio" (24 -> 220)
    if (x >= 24 && x <= 220 && y >= 245 && y <= 280) {
      return blue;
    }
    // Secondary Tab: "Ultimi Articoli" (235 -> 410)
    if (x >= 235 && x <= 410 && y >= 245 && y <= 280) {
      return white;
    }
    // Tab: "Accade Oggi" (425 -> 580)
    if (x >= 425 && x <= 580 && y >= 245 && y <= 280) {
      return white;
    }
    return bgSlate;
  }

  // 5. Article Cards Feed (290 -> h)
  const cardStartY = 305;
  const cardH = 310;
  const cardGap = 20;

  for (let i = 0; i < 3; i++) {
    const cy1 = cardStartY + i * (cardH + cardGap);
    const cy2 = cy1 + cardH;

    if (y >= cy1 && y <= cy2) {
      if (x >= 24 && x <= w - 24) {
        // Card borders
        if (x === 24 || x === w - 24 || y === cy1 || y === cy2) {
          return cardBorder;
        }
        // Card Image header
        if (y < cy1 + 160) {
          // Dynamic colored image banner
          const grad = (x / w) * 0.4 + (i * 0.2);
          if (i === 0) return [Math.floor(20 + grad * 40), Math.floor(60 + grad * 60), 140, 255];
          if (i === 1) return [Math.floor(180 + grad * 30), Math.floor(70 + grad * 40), 30, 255];
          return [Math.floor(30 + grad * 50), Math.floor(120 + grad * 60), 100, 255];
        }
        // Category Pill
        if (y >= cy1 + 175 && y <= cy1 + 195 && x >= 44 && x <= 160) {
          return [238, 242, 255, 255];
        }
        // Article Title Lines
        if (y >= cy1 + 210 && y <= cy1 + 224 && x >= 44 && x <= w - 60) {
          return textDark;
        }
        if (y >= cy1 + 232 && y <= cy1 + 246 && x >= 44 && x <= w - 160) {
          return textDark;
        }
        // Summary snippet lines
        if (y >= cy1 + 260 && y <= cy1 + 270 && x >= 44 && x <= w - 80) {
          return textMuted;
        }
        if (y >= cy1 + 278 && y <= cy1 + 288 && x >= 44 && x <= w - 120) {
          return textMuted;
        }
        return white;
      }
    }
  }

  return bgSlate;
}

// Desktop screenshot (1280x720)
function renderDesktopPixel(x, y, w, h) {
  const brandNavy = [0, 8, 54, 255];
  const bgSlate = [241, 245, 249, 255];
  const white = [255, 255, 255, 255];
  const orange = [249, 115, 22, 255];
  const blue = [37, 99, 235, 255];
  const textDark = [15, 23, 42, 255];
  const textMuted = [100, 116, 139, 255];
  const cardBorder = [226, 232, 240, 255];

  // 1. Top Navigation Bar (0 -> 64)
  if (y < 64) {
    if (y === 63) return [14, 28, 80, 255];
    // Brand Logo
    const logoX = 45, logoY = 32, logoR = 18;
    const dx = x - logoX, dy = y - logoY;
    if (dx * dx + dy * dy <= logoR * logoR) return orange;
    // Brand Title
    if (x >= 75 && x <= 220 && y >= 24 && y <= 40) return white;
    // Center Search Input
    if (x >= 320 && x <= 720 && y >= 14 && y <= 50) return [255, 255, 255, 220];
    if (x >= 335 && x <= 480 && y >= 27 && y <= 37) return textMuted;
    // Nav items right
    if (x >= w - 380 && x <= w - 280 && y >= 24 && y <= 40) return white; // Archivio
    if (x >= w - 260 && x <= w - 160 && y >= 24 && y <= 40) return white; // Rubriche
    if (x >= w - 140 && x <= w - 40 && y >= 16 && y <= 48) return orange; // Badge
    return brandNavy;
  }

  // 2. Left Sidebar (0 -> 260 width, y >= 64)
  if (x < 260 && y >= 64) {
    if (x === 259) return cardBorder;
    // Sidebar Header
    if (y >= 84 && y <= 98 && x >= 24 && x <= 160) return textMuted;
    // Sidebar items
    for (let s = 0; s < 6; s++) {
      const sy = 120 + s * 45;
      if (y >= sy && y <= sy + 32 && x >= 16 && x <= 244) {
        if (s === 0) return [238, 242, 255, 255]; // Active item: Il mio archivio
        return white;
      }
      if (y >= sy + 10 && y <= sy + 22 && x >= 36 && x <= 180) {
        return s === 0 ? blue : textDark;
      }
    }
    return white;
  }

  // 3. Main Content Area (x >= 260, y >= 64)
  // Section banner / title
  if (y >= 84 && y <= 112 && x >= 290 && x <= 500) {
    return textDark; // "Il mio archivio" title
  }
  if (y >= 122 && y <= 134 && x >= 290 && x <= 650) {
    return textMuted; // "Risorse e articoli approfonditi sulle 5 Leggi Biologiche"
  }

  // Grid of cards (3 columns)
  const gridStartX = 290;
  const colW = 295;
  const colGap = 25;
  const rowStartY = 160;
  const rowH = 240;

  for (let c = 0; c < 3; c++) {
    const cx1 = gridStartX + c * (colW + colGap);
    const cx2 = cx1 + colW;

    for (let r = 0; r < 2; r++) {
      const ry1 = rowStartY + r * (rowH + 20);
      const ry2 = ry1 + rowH;

      if (x >= cx1 && x <= cx2 && y >= ry1 && y <= ry2) {
        if (x === cx1 || x === cx2 || y === ry1 || y === ry2) return cardBorder;
        // Image thumbnail
        if (y < ry1 + 110) {
          const colorFactor = (c * 0.3 + r * 0.4);
          return [Math.floor(20 + colorFactor * 40), Math.floor(50 + colorFactor * 80), Math.floor(130 + colorFactor * 50), 255];
        }
        // Pill tag
        if (y >= ry1 + 122 && y <= ry1 + 136 && x >= cx1 + 16 && x <= cx1 + 90) {
          return [238, 242, 255, 255];
        }
        // Card title
        if (y >= ry1 + 148 && y <= ry1 + 160 && x >= cx1 + 16 && x <= cx2 - 20) {
          return textDark;
        }
        if (y >= ry1 + 166 && y <= ry1 + 178 && x >= cx1 + 16 && x <= cx2 - 80) {
          return textDark;
        }
        // Summary text
        if (y >= ry1 + 192 && y <= ry1 + 202 && x >= cx1 + 16 && x <= cx2 - 30) {
          return textMuted;
        }
        if (y >= ry1 + 208 && y <= ry1 + 218 && x >= cx1 + 16 && x <= cx2 - 60) {
          return textMuted;
        }
        return white;
      }
    }
  }

  return bgSlate;
}

console.log('Generating mobile and desktop screenshots...');
const mobilePng = createPng(750, 1334, renderMobilePixel);
fs.writeFileSync(path.join(screenshotsDir, 'screenshot-mobile.png'), mobilePng);
console.log('Generated public/screenshots/screenshot-mobile.png (750x1334)');

const desktopPng = createPng(1280, 720, renderDesktopPixel);
fs.writeFileSync(path.join(screenshotsDir, 'screenshot-desktop.png'), desktopPng);
console.log('Generated public/screenshots/screenshot-desktop.png (1280x720)');
