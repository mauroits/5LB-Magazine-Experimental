import fs from 'fs';
import path from 'path';

const assetsDir = path.resolve('public/assets');
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}

// Crisp SVG of the 5LB logo matching Rivista-logo-1024x500-NoNeon.png
const logoSvg = `<svg xmlns="http://www.w3.org/2005/svg" viewBox="0 0 1024 500" fill="none">
  <!-- Stylized 5LB orange serif text matching Rivista-logo-1024x500-NoNeon.png -->
  <defs>
    <filter id="subtle" x="-5%" y="-5%" width="110%" height="110%">
      <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#000000" flood-opacity="0.15" />
    </filter>
  </defs>
  <g filter="url(#subtle)">
    <!-- 5LB text in exact serif rendering with baseline line -->
    <text x="30" y="320" font-family="'Times New Roman', Times, 'Baskerville', 'Playfair Display', Georgia, serif" font-weight="bold" font-size="340" fill="#ff5522" letter-spacing="-2">
      5LB
    </text>
    <!-- Baseline horizontal divider extending to the right -->
    <line x1="160" y1="330" x2="1000" y2="330" stroke="#ff5522" stroke-width="4" stroke-opacity="0.35" />
    <line x1="160" y1="330" x2="520" y2="330" stroke="#ff5522" stroke-width="5" />
  </g>
</svg>`;

// Complete version with "Magazine" for header
const logoWithTextSvg = `<svg xmlns="http://www.w3.org/2005/svg" viewBox="0 0 1024 320" fill="none">
  <g>
    <!-- 5LB logo -->
    <text x="10" y="220" font-family="'Times New Roman', Times, 'Playfair Display', Georgia, serif" font-weight="bold" font-size="240" fill="#ff5522" letter-spacing="-2">
      5LB
    </text>
    <!-- Magazine in white -->
    <text x="490" y="215" font-family="system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif" font-weight="700" font-size="140" fill="#ffffff" letter-spacing="1">
      Magazine
    </text>
    <!-- Baseline bar -->
    <line x1="130" y1="235" x2="1000" y2="235" stroke="#ffffff" stroke-width="3" stroke-opacity="0.3" />
    <line x1="130" y1="235" x2="490" y2="235" stroke="#ff5522" stroke-width="4" />
    <!-- Subtitle -->
    <text x="135" y="280" font-family="system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif" font-weight="400" font-size="38" fill="#cbd5e1" letter-spacing="0.5">
      La rivista sulle 5 Leggi Biologiche
    </text>
  </g>
</svg>`;

fs.writeFileSync(path.join(assetsDir, 'logo-5lb.svg'), logoSvg);
fs.writeFileSync(path.join(assetsDir, 'logo-5lb-header.svg'), logoWithTextSvg);

console.log('Logos successfully created in public/assets/');
