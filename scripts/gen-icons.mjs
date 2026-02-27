#!/usr/bin/env node
/**
 * Rasterises static/icons/icon.svg into PNG sizes needed for PWA + iOS.
 * Run once after changing the SVG source:  npm run gen:icons
 */
import { createRequire } from 'module';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { join, dirname } from 'path';

const require = createRequire(import.meta.url);
const sharp = require('sharp');

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');
const svgPath = join(projectRoot, 'static', 'icons', 'icon.svg');
const svgBuffer = readFileSync(svgPath);

const SIZES = [
  { size: 180, name: 'icon-180.png' }, // apple-touch-icon
  { size: 192, name: 'icon-192.png' }, // Android home screen
  { size: 512, name: 'icon-512.png' }, // PWA splash
];

for (const { size, name } of SIZES) {
  const outPath = join(projectRoot, 'static', 'icons', name);
  await sharp(svgBuffer)
    .resize(size, size)
    .png()
    .toFile(outPath);
  console.log(`Generated ${name} (${size}×${size})`);
}
