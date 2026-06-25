const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const sizes = [72, 76, 96, 120, 128, 144, 152, 180, 192, 384, 512];
const iconsDir = path.join(__dirname, '../public/icons');

if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

const svgIcon = `
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#3b82f6;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#1e40af;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="96" fill="url(#bg)"/>
  <rect x="96" y="160" width="320" height="192" rx="16" fill="white" opacity="0.95"/>
  <rect x="128" y="192" width="160" height="16" rx="4" fill="#1e40af"/>
  <rect x="128" y="224" width="120" height="10" rx="3" fill="#64748b"/>
  <rect x="128" y="248" width="200" height="8" rx="2" fill="#94a3b8"/>
  <rect x="128" y="268" width="180" height="8" rx="2" fill="#94a3b8"/>
  <rect x="128" y="288" width="140" height="8" rx="2" fill="#94a3b8"/>
  <circle cx="380" cy="260" r="40" fill="#1e40af" opacity="0.2"/>
  <path d="M380 235 L380 285 M355 260 L405 260" stroke="#1e40af" stroke-width="8" stroke-linecap="round"/>
</svg>
`;

async function generateIcons() {
  console.log('Generating PWA icons...');
  
  const svgBuffer = Buffer.from(svgIcon);
  
  for (const size of sizes) {
    const filename = size === 180 ? 'apple-touch-icon.png' : `icon-${size}x${size}.png`;
    const outputPath = path.join(iconsDir, filename);
    
    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(outputPath);
    
    console.log(`Generated: ${filename}`);
  }
  
  // Generate splash screen (for iOS)
  await sharp(svgBuffer)
    .resize(1242, 2688, {
      fit: 'contain',
      background: { r: 15, g: 23, b: 42, alpha: 1 }
    })
    .png()
    .toFile(path.join(iconsDir, 'splash.png'));
  
  console.log('Generated: splash.png');
  console.log('All icons generated successfully!');
}

generateIcons().catch(console.error);
