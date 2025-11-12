/**
 * Icon Generation Script
 * Generates PWA icons from SVG source
 * 
 * Usage: node scripts/generate-icons.js
 * 
 * Requirements:
 * - sharp: npm install -D sharp
 * - OR use an online tool like https://realfavicongenerator.net/
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const publicDir = path.join(rootDir, 'public');
const iconSvg = path.join(publicDir, 'icon.svg');

// Icon sizes needed for PWA
const iconSizes = [
  { size: 192, name: 'pwa-192x192.png' },
  { size: 512, name: 'pwa-512x512.png' },
  { size: 180, name: 'apple-touch-icon.png' }, // Apple touch icon
  { size: 32, name: 'favicon-32x32.png' },
  { size: 16, name: 'favicon-16x16.png' },
];

async function generateIcons() {
  try {
    // Check if sharp is available
    let sharp;
    try {
      sharp = (await import('sharp')).default;
    } catch (e) {
      console.error('❌ sharp is not installed. Install it with: npm install -D sharp');
      console.log('\n📝 Alternative: Use an online tool to generate icons:');
      console.log('   1. Go to https://realfavicongenerator.net/');
      console.log('   2. Upload icon.svg from the public folder');
      console.log('   3. Download and place the generated icons in the public folder');
      console.log('\n📋 Required icons:');
      iconSizes.forEach(({ size, name }) => {
        console.log(`   - ${name} (${size}x${size})`);
      });
      process.exit(1);
    }

    // Check if SVG exists
    if (!fs.existsSync(iconSvg)) {
      console.error(`❌ SVG icon not found at: ${iconSvg}`);
      process.exit(1);
    }

    console.log('🎨 Generating PWA icons from SVG...\n');

    // Read SVG
    const svgBuffer = fs.readFileSync(iconSvg);

    // Generate each icon size
    for (const { size, name } of iconSizes) {
      const outputPath = path.join(publicDir, name);
      
      await sharp(svgBuffer)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 26, g: 26, b: 26, alpha: 1 } // #1a1a1a
        })
        .png()
        .toFile(outputPath);
      
      console.log(`✅ Generated ${name} (${size}x${size})`);
    }

    console.log('\n✨ All icons generated successfully!');
    console.log('📁 Icons are in the public/ directory');
    
  } catch (error) {
    console.error('❌ Error generating icons:', error.message);
    process.exit(1);
  }
}

generateIcons();

