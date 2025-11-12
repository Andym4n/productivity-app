/**
 * Manifest Validation Script
 * Validates the PWA manifest.json file for compliance
 * 
 * Usage: node scripts/validate-manifest.js
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const manifestPath = resolve(__dirname, '..', 'public', 'manifest.json');

// Required fields for PWA compliance
const requiredFields = [
  'name',
  'short_name',
  'icons',
  'start_url',
  'display',
  'background_color',
  'theme_color'
];

// Required icon sizes
const requiredIconSizes = ['192x192', '512x512'];

function validateManifest() {
  try {
    console.log('🔍 Validating PWA manifest...\n');
    
    // Read and parse manifest
    const manifestContent = readFileSync(manifestPath, 'utf-8');
    const manifest = JSON.parse(manifestContent);
    
    // Check required fields
    console.log('📋 Checking required fields...');
    const missingFields = requiredFields.filter(field => !manifest[field]);
    
    if (missingFields.length > 0) {
      console.error(`❌ Missing required fields: ${missingFields.join(', ')}`);
      process.exit(1);
    }
    console.log('✅ All required fields present');
    
    // Check icons
    console.log('\n🖼️  Checking icons...');
    if (!Array.isArray(manifest.icons) || manifest.icons.length === 0) {
      console.error('❌ Icons array is missing or empty');
      process.exit(1);
    }
    
    const iconSizes = manifest.icons.map(icon => icon.sizes);
    const hasRequiredSizes = requiredIconSizes.every(size => 
      iconSizes.some(iconSize => iconSize === size)
    );
    
    if (!hasRequiredSizes) {
      console.error(`❌ Missing required icon sizes: ${requiredIconSizes.join(', ')}`);
      process.exit(1);
    }
    
    // Check for maskable icons
    const hasMaskable = manifest.icons.some(icon => icon.purpose === 'maskable');
    if (!hasMaskable) {
      console.warn('⚠️  No maskable icons found (recommended for better PWA support)');
    } else {
      console.log('✅ Maskable icons present');
    }
    
    console.log(`✅ Found ${manifest.icons.length} icon(s)`);
    
    // Check display mode
    console.log('\n📱 Checking display mode...');
    const validDisplayModes = ['fullscreen', 'standalone', 'minimal-ui', 'browser'];
    if (!validDisplayModes.includes(manifest.display)) {
      console.warn(`⚠️  Display mode "${manifest.display}" may not be optimal`);
    } else {
      console.log(`✅ Display mode: ${manifest.display}`);
    }
    
    // Check start_url
    console.log('\n🔗 Checking URLs...');
    if (!manifest.start_url.startsWith('/')) {
      console.warn('⚠️  start_url should start with "/" for same-origin');
    } else {
      console.log(`✅ start_url: ${manifest.start_url}`);
    }
    
    if (manifest.scope && !manifest.scope.startsWith('/')) {
      console.warn('⚠️  scope should start with "/" for same-origin');
    } else if (manifest.scope) {
      console.log(`✅ scope: ${manifest.scope}`);
    }
    
    console.log('\n✨ Manifest validation complete!');
    console.log('📝 Manifest is PWA compliant');
    
  } catch (error) {
    console.error('❌ Error validating manifest:', error.message);
    process.exit(1);
  }
}

validateManifest();

