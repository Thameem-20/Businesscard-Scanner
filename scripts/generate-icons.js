const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const sizes = [32, 72, 76, 96, 120, 128, 144, 152, 180, 192, 384, 512];
const iconsDir = path.join(__dirname, '../public/icons');
const appDir = path.join(__dirname, '../app');
const publicDir = path.join(__dirname, '../public');

const logoCandidates = [
  path.join(publicDir, 'logo.png'),
  path.join(publicDir, 'logo.jpg'),
  path.join(publicDir, 'logo.jpeg'),
  path.join(publicDir, 'logo.svg'),
];

function findLogoSource() {
  return logoCandidates.find((candidate) => fs.existsSync(candidate));
}

async function generateIcons() {
  const logoPath = findLogoSource();

  if (!logoPath) {
    console.error('No logo found. Add your logo to one of:');
    logoCandidates.forEach((candidate) => console.error(`  - ${candidate}`));
    console.error('\nRecommended: public/logo.png (square, at least 512×512)');
    process.exit(1);
  }

  console.log(`Using logo: ${logoPath}`);

  if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true });
  }

  for (const size of sizes) {
    const filename =
      size === 180 ? 'apple-touch-icon.png' : `icon-${size}x${size}.png`;
    const outputPath = path.join(iconsDir, filename);

    await sharp(logoPath)
      .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toFile(outputPath);

    console.log(`Generated: ${filename}`);
  }

  // Browser tab favicon (Next.js auto-serves app/icon.png)
  await sharp(logoPath)
    .resize(32, 32, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(path.join(appDir, 'icon.png'));
  console.log('Generated: app/icon.png (browser favicon)');

  // iOS home screen (Next.js auto-serves app/apple-icon.png)
  await sharp(logoPath)
    .resize(180, 180, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(path.join(appDir, 'apple-icon.png'));
  console.log('Generated: app/apple-icon.png (iOS home screen)');

  // PWA splash screen
  await sharp(logoPath)
    .resize(512, 512, { fit: 'contain', background: { r: 15, g: 23, b: 42, alpha: 1 } })
    .extend({
      top: 1088,
      bottom: 1088,
      left: 365,
      right: 365,
      background: { r: 15, g: 23, b: 42, alpha: 1 },
    })
    .png()
    .toFile(path.join(iconsDir, 'splash.png'));
  console.log('Generated: splash.png');

  console.log('All icons generated successfully!');
}

generateIcons().catch(console.error);
