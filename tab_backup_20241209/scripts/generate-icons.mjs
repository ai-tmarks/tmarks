import sharp from 'sharp';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const sizes = [16, 48, 128];
const iconsDir = join(__dirname, '..', 'public', 'icons');

// Ensure icons directory exists
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Create SVG buffer for each size
const createSvg = (size) => `
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" rx="${size * 0.2}" fill="#3B82F6"/>
  <circle cx="${size/2}" cy="${size*0.4}" r="${size*0.15}" fill="white"/>
  <path d="M ${size*0.3} ${size*0.55} L ${size*0.5} ${size*0.75} L ${size*0.7} ${size*0.55}"
        stroke="white" stroke-width="${size*0.08}" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
</svg>
`;

async function generateIcons() {
  console.log('Generating placeholder icons...');

  for (const size of sizes) {
    const svg = Buffer.from(createSvg(size));
    const outputPath = join(iconsDir, `icon-${size}.png`);

    await sharp(svg)
      .resize(size, size)
      .png()
      .toFile(outputPath);

    console.log(`✓ Created ${outputPath}`);
  }

  console.log('\nIcons generated successfully!');
  console.log('Note: These are placeholder icons. For production, please create custom icons.');
}

generateIcons().catch(console.error);
