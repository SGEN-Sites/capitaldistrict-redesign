// raster-logo.mjs: render the client's round badge (a 2.8 MB SVG wrapping two embedded PNGs) to a light transparent PNG.
import fs from 'node:fs';
import { chromium } from './pw.mjs';
const svg = fs.readFileSync('src/assets/brand/round-logo.svg', 'utf8');
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1000, height: 1000 }, deviceScaleFactor: 1 });
await p.setContent(`<html><body style="margin:0;background:transparent">${svg.replace('width="486" height="486"', 'width="1000" height="1000"')}</body></html>`);
await p.waitForTimeout(800);
await p.locator('svg').first().screenshot({ path: 'private/round-logo-1000.png', omitBackground: true });
await b.close(); console.log('ok');
