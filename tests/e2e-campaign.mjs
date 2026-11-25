import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';

const require = createRequire(import.meta.url);
const localAppData = process.env.LOCALAPPDATA || '';

// Locate cached playwright-core from npx cache
const npxRoot = path.join(localAppData, 'npm-cache', '_npx');
let pwPath = null;
if (fs.existsSync(npxRoot)) {
  for (const dir of fs.readdirSync(npxRoot)) {
    const candidate = path.join(npxRoot, dir, 'node_modules', 'playwright-core');
    if (fs.existsSync(candidate)) { pwPath = candidate; break; }
  }
}
if (!pwPath) {
  console.error('playwright-core not found in npx cache');
  process.exit(1);
}
const { chromium } = require(pwPath);

// Locate chromium executable
const msPlaywright = path.join(localAppData, 'ms-playwright');
let exePath = null;
for (const d of fs.readdirSync(msPlaywright)) {
  if (d.startsWith('chromium-')) {
    const p = path.join(msPlaywright, d, 'chrome-win64', 'chrome.exe');
    if (fs.existsSync(p)) { exePath = p; break; }
  }
}
if (!exePath) {
  exePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
}

const preview = spawn('npx.cmd', ['vite', 'preview', '--port', '4179', '--strictPort'], {
  cwd: path.resolve('.'),
  stdio: 'ignore',
  shell: true
});

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function run() {
  await wait(2200);
  const browser = await chromium.launch({
    executablePath: exePath,
    headless: true,
    args: [
      '--enable-webgl',
      '--use-gl=angle',
      '--use-angle=swiftshader',
      '--enable-unsafe-swiftshader',
      '--ignore-gpu-blocklist'
    ]
  });

  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
  const page = await context.newPage();

  const pageErrors = [];
  const consoleErrors = [];
  const httpErrors = [];

  page.on('pageerror', (err) => pageErrors.push(err.message));
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('response', (res) => {
    if (res.status() >= 400) httpErrors.push(`${res.status()} ${res.url()}`);
  });

  await page.goto('http://localhost:4179/', { waitUntil: 'domcontentloaded' });
  await wait(1500);

  // Dismiss cookie consent if shown
  const cookieBtn = await page.$('#btn-cookie-accept-all, #btn-cookie-save');
  if (cookieBtn) await cookieBtn.click();

  // 1. Splash -> Map
  await page.waitForSelector('#btn-splash-play', { timeout: 8000 });
  await page.click('#btn-splash-play');
  await wait(600);

  // 2. Map -> Quick Vehicle Modal -> Full Garage -> Next -> Back
  const garageShortcut = await page.$('#btn-city-vehicle-shortcut');
  if (garageShortcut) {
    await garageShortcut.click();
    await wait(400);
    const fullGarage = await page.$('#btn-open-full-garage');
    if (fullGarage) {
      await fullGarage.click();
      await wait(600);
      const nextVeh = await page.$('#btn-garage-next');
      if (nextVeh) await nextVeh.click();
      await wait(300);
      const backBtn = await page.$('#btn-garage-back');
      if (backBtn) await backBtn.click();
      await wait(600);
    }
  }

  // 3. Map -> Start Run -> Gameplay + Frame-time instrumentation
  await page.waitForSelector('#btn-enter-city-race', { timeout: 6000 });
  await page.click('#btn-enter-city-race');

  await page.evaluate(() => {
    window.__rafDeltas = [];
    let last = performance.now();
    const tick = (now) => {
      window.__rafDeltas.push(now - last);
      last = now;
      if (window.__rafDeltas.length < 300) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });

  await wait(5500); // Countdown + ~2s active driving

  // Test Weapon & Brake & Pause -> Resume -> Map
  const hornBtn = await page.$('#btn-hud-horn');
  if (hornBtn) await hornBtn.click();
  await wait(300);
  const pauseBtn = await page.$('#btn-hud-pause');
  if (pauseBtn) {
    await pauseBtn.click();
    await wait(400);
    const resumeBtn = await page.$('#btn-pause-resume');
    if (resumeBtn) await resumeBtn.click();
    await wait(400);
  }

  const metrics = await page.evaluate(() => {
    const d = window.__rafDeltas || [];
    const sorted = [...d].sort((a, b) => a - b);
    const avg = d.length ? d.reduce((a, b) => a + b, 0) / d.length : 0;
    const p95 = sorted.length ? sorted[Math.floor(sorted.length * 0.95)] : 0;
    const max = sorted.length ? sorted[sorted.length - 1] : 0;
    const spikes50 = d.filter((x) => x > 50).length;
    return { frames: d.length, avgMs: +avg.toFixed(2), p95Ms: +p95.toFixed(2), maxMs: +max.toFixed(2), spikes50 };
  });

  await browser.close();
  preview.kill();

  console.log('E2E_METRICS:', JSON.stringify(metrics));
  console.log('PAGE_ERRORS:', JSON.stringify(pageErrors));
  console.log('CONSOLE_ERRORS:', JSON.stringify(consoleErrors));
  console.log('HTTP_ERRORS:', JSON.stringify(httpErrors));

  if (pageErrors.length > 0 || httpErrors.length > 0) {
    process.exitCode = 1;
  }
}

run().catch((err) => {
  console.error(err);
  preview.kill();
  process.exit(1);
});
