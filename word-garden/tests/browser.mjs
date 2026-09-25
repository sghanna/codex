import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { webkit, chromium } from 'playwright';
import { PUZZLES } from '../puzzles.js';

const APP_URL = process.env.WORD_GARDEN_URL || 'http://127.0.0.1:8768/word-garden/';
const artifacts = fileURLToPath(new URL('../.artifacts/', import.meta.url));
const projectRoot = fileURLToPath(new URL('../', import.meta.url));
await fs.mkdir(artifacts, { recursive: true });
const profile = await fs.mkdtemp(path.join(os.tmpdir(), 'word-garden-browser-'));
const offlineProfile = await fs.mkdtemp(path.join(os.tmpdir(), 'word-garden-offline-'));

async function startControlledServer(initialRevision = null) {
  let workerRevision = initialRevision;
  const types = {
    '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript',
    '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png',
  };
  const server = http.createServer(async (request, response) => {
    const pathname = new URL(request.url, 'http://localhost').pathname;
    if (!pathname.startsWith('/word-garden/')) { response.writeHead(404).end(); return; }
    const relative = pathname.slice('/word-garden/'.length) || 'index.html';
    const file = path.resolve(projectRoot, relative);
    if (!file.startsWith(projectRoot)) { response.writeHead(403).end(); return; }
    try {
      let body = await fs.readFile(file);
      if (relative === 'service-worker.js' && workerRevision) {
        const source = body.toString().replace(/const CACHE_NAME = 'word-garden-[^']+';/,
          `const CACHE_NAME = 'word-garden-test-${workerRevision}';`);
        body = Buffer.from(source);
      }
      response.writeHead(200, {
        'content-type': types[path.extname(file)] || 'application/octet-stream',
        'cache-control': 'no-store',
      }).end(body);
    } catch { response.writeHead(404).end(); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  return {
    url: `http://127.0.0.1:${server.address().port}/word-garden/`,
    setWorkerRevision: revision => { workerRevision = revision; },
    close: () => new Promise(resolve => server.close(resolve)),
  };
}

async function screenshot(page, name, viewport) {
  await page.setViewportSize(viewport);
  await page.waitForTimeout(120);
  await page.screenshot({ path: path.join(artifacts, `${name}.png`), fullPage: true });
  const metrics = await page.evaluate(() => ({
    width: document.documentElement.scrollWidth,
    viewport: window.innerWidth,
    bodyHeight: document.body.scrollHeight,
    viewportHeight: window.innerHeight,
    regions: Object.fromEntries(['#puzzle-title', '#grid', '.puzzle-footer', '#feedback'].map(selector => {
      const rect = document.querySelector(selector).getBoundingClientRect();
      return [selector, { top: rect.top, bottom: rect.bottom }];
    })),
  }));
  assert.ok(metrics.width <= metrics.viewport + 2, `${name} overflows horizontally: ${JSON.stringify(metrics)}`);
  const regions = metrics.regions;
  assert.ok(regions['#puzzle-title'].bottom <= regions['#grid'].top,
    `${name} crossword overlaps its title: ${JSON.stringify(regions)}`);
  assert.ok(regions['#grid'].bottom <= regions['.puzzle-footer'].top,
    `${name} crossword overlaps bonus/status row: ${JSON.stringify(regions)}`);
  return metrics;
}

async function addWord(page, word) {
  const used = new Set();
  for (const letter of word) {
    const buttons = page.locator(`.letter[data-letter="${letter}"]`);
    let found = false;
    for (let i = 0; i < await buttons.count(); i++) {
      const index = await buttons.nth(i).getAttribute('data-tile');
      if (!used.has(index)) {
        used.add(index);
        await buttons.nth(i).click();
        found = true;
        break;
      }
    }
    assert.ok(found, `No remaining tile for ${letter} in ${word}`);
  }
  assert.match(await page.locator('#word-preview').innerText(), new RegExp(word));
}

async function readyStatus(page) {
  return page.evaluate(async () => {
    const registration = await navigator.serviceWorker.ready;
    const worker = navigator.serviceWorker.controller || registration.active;
    if (!worker) throw new Error('No active service worker');
    return new Promise((resolve, reject) => {
      const channel = new MessageChannel();
      const timer = setTimeout(() => reject(new Error('CACHE_READY timed out')), 10000);
      channel.port1.onmessage = event => { clearTimeout(timer); resolve(event.data); };
      worker.postMessage({ type: 'CACHE_READY' }, [channel.port2]);
    });
  });
}

async function webkitFlow() {
  let context;
  let controlledServer;
  const errors = [];
  try {
    context = await webkit.launchPersistentContext(profile, {
      headless: true, serviceWorkers: 'allow', viewport: { width: 390, height: 844 },
    });
    context.setDefaultTimeout(10000);
    let page = context.pages()[0] || await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    const response = await page.goto(APP_URL, { waitUntil: 'networkidle' });
    assert.equal(response.status(), 200);
    await page.locator('.letter').first().waitFor();
    assert.ok(await page.locator('#puzzle-progress').isVisible());

    const layouts = [];
    layouts.push(await screenshot(page, 'webkit-390x844', { width: 390, height: 844 }));
    layouts.push(await screenshot(page, 'webkit-375x667', { width: 375, height: 667 }));
    layouts.push(await screenshot(page, 'webkit-844x390', { width: 844, height: 390 }));
    console.log('WebKit layouts captured');
    await page.setViewportSize({ width: 390, height: 844 });

    await page.locator('#help-button').click();
    assert.ok(await page.locator('#help-dialog').isVisible());
    await page.locator('#help-dialog [data-close]').first().click();
    assert.ok(!await page.locator('#help-dialog').isVisible());
    await page.locator('#menu-button').click();
    assert.ok(await page.locator('#menu-dialog').isVisible());
    await page.locator('#menu-dialog [data-close]').click();
    console.log('WebKit dialogs checked');

    const first = PUZZLES[0];
    const word = first.words[0].word;
    const bonus = first.bonus[0];
    await addWord(page, bonus);
    await page.locator('#submit-button').click();
    const withBonus = await page.evaluate(() => JSON.parse(localStorage.getItem('word-garden-progress-v1')));
    assert.ok(withBonus.states[first.id]?.bonus.includes(bonus), 'Bonus word did not persist');
    console.log('WebKit bonus checked');
    if (await page.locator('.letter[aria-pressed="true"]').count()) await page.locator('#clear-button').click();
    await addWord(page, word);
    await page.locator('#undo-button').click();
    assert.ok(!(await page.locator('#word-preview').innerText()).includes(word));
    await page.locator('#clear-button').click();
    await addWord(page, word);
    await page.locator('#submit-button').click();
    assert.match(await page.locator('#puzzle-progress').innerText(), /1|word/i);
    await page.reload({ waitUntil: 'networkidle' });
    assert.match(await page.locator('#puzzle-progress').innerText(), /1|word/i);
    const stored = await page.evaluate(() => localStorage.getItem('word-garden-progress-v1'));
    assert.ok(stored && JSON.parse(stored).states[first.id]?.found.includes(word), 'Accepted word did not persist');
    console.log('WebKit answer and reload checked');

    await page.locator('#hint-button').click();
    const afterHint = await page.evaluate(() => JSON.parse(localStorage.getItem('word-garden-progress-v1')));
    assert.ok(afterHint.states[first.id].revealed.length > 0 || afterHint.states[first.id].found.length > 1,
      'Hint did not persist');

    await page.locator('#menu-button').click();
    await page.locator('input[name="input-mode"][value="swipe"]').check();
    assert.equal((await page.evaluate(() => JSON.parse(localStorage.getItem('word-garden-progress-v1')))).settings.inputMode, 'swipe');
    await page.locator('input[name="input-mode"][value="tap"]').check();
    await page.locator('#menu-dialog [data-close]').click();
    console.log('WebKit hint and settings checked');

    const readiness = await readyStatus(page);
    assert.equal(readiness.type, 'CACHE_READY');
    assert.equal(readiness.ready, true, `Missing offline assets: ${readiness.missing?.join(', ')}`);
    console.log('WebKit cache ready');
    await page.locator('#menu-button').click();
    const installDetails = page.locator('#menu-dialog details').filter({ has: page.locator('#offline-status') });
    if (!await installDetails.evaluate(details => details.open)) await installDetails.locator('summary').click();
    assert.ok(await page.locator('#offline-status').isVisible(), 'Offline readiness message is hidden');
    assert.match(await page.locator('#offline-status').textContent(), /offline|ready|available/i);
    await page.locator('#menu-dialog [data-close]').click();
    assert.deepEqual(errors, []);
    await context.close();
    context = null;
    console.log('WebKit online profile closed');

    // Install a second copy from a controlled server, then stop that server.
    // WebKit's Playwright offline toggle blocks service-worker requests itself.
    controlledServer = await startControlledServer();
    context = await webkit.launchPersistentContext(offlineProfile, {
      headless: true, serviceWorkers: 'allow',
      viewport: { width: 390, height: 844 },
    });
    context.setDefaultTimeout(10000);
    page = await context.newPage();
    await page.goto(controlledServer.url, { waitUntil: 'networkidle' });
    await page.locator('.letter').first().waitFor();
    const offlineReadiness = await readyStatus(page);
    assert.equal(offlineReadiness.ready, true, `Controlled server cache misses: ${offlineReadiness.missing?.join(', ')}`);
    await addWord(page, word);
    await page.locator('#submit-button').click();
    assert.ok((await page.evaluate(() => JSON.parse(localStorage.getItem('word-garden-progress-v1')))).states[first.id].found.includes(word));
    await context.close();
    context = null;
    await controlledServer.close();
    console.log('Controlled server stopped; relaunching WebKit profile');

    context = await webkit.launchPersistentContext(offlineProfile, {
      headless: true, serviceWorkers: 'allow', viewport: { width: 390, height: 844 },
    });
    context.setDefaultTimeout(10000);
    page = await context.newPage();
    await page.goto(controlledServer.url, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.locator('.letter').first().waitFor();
    const offlineState = await page.evaluate(() => JSON.parse(localStorage.getItem('word-garden-progress-v1')));
    assert.ok(offlineState.states[first.id].found.includes(word));
    assert.ok(await page.locator('#grid').isVisible());
    await screenshot(page, 'webkit-offline-relaunch', { width: 390, height: 844 });
    console.log('WebKit offline relaunch checked');
    for (const entry of first.words) {
      if (await page.locator('#next-button').isVisible()) break;
      if (await page.locator('.letter[aria-pressed="true"]').count()) await page.locator('#clear-button').click();
      await addWord(page, entry.word);
      await page.locator('#submit-button').click();
    }
    assert.ok(await page.locator('#next-button').isVisible(), 'Completing all answers did not offer Next puzzle');
    await page.locator('#next-button').click();
    assert.equal(await page.locator('#puzzle-title').innerText(), PUZZLES[1].title);
    const continued = await page.evaluate(() => JSON.parse(localStorage.getItem('word-garden-progress-v1')));
    assert.equal(continued.currentId, PUZZLES[1].id);
    assert.ok(continued.completed.includes(first.id));
    console.log('WebKit offline completion checked');
    return { layouts, offline: true, readiness };
  } finally {
    if (context) await context.close();
    if (controlledServer) await controlledServer.close().catch(() => {});
  }
}

async function workerUpdateFlow() {
  const updateProfile = await fs.mkdtemp(path.join(os.tmpdir(), 'word-garden-update-'));
  let server;
  let context;
  try {
    server = await startControlledServer('a');
    context = await webkit.launchPersistentContext(updateProfile, {
      headless: true, serviceWorkers: 'allow', viewport: { width: 390, height: 844 },
    });
    context.setDefaultTimeout(10000);
    const page = context.pages()[0] || await context.newPage();
    await page.goto(server.url, { waitUntil: 'networkidle' });
    await page.locator('.letter').first().waitFor();
    assert.equal((await readyStatus(page)).cacheName, 'word-garden-test-a');
    await page.evaluate(async () => { await caches.open('codex-hearts-test'); });

    server.setWorkerRevision('b');
    await page.evaluate(async () => { await (await navigator.serviceWorker.getRegistration()).update(); });
    await page.waitForFunction(async () => Boolean((await navigator.serviceWorker.getRegistration())?.waiting));
    assert.equal((await readyStatus(page)).cacheName, 'word-garden-test-a',
      'A waiting update replaced the active game before approval');
    assert.equal(await page.locator('#update-button').evaluate(button => button.hidden), true,
      'The update action should wait until the puzzle is complete');

    const first = PUZZLES[0];
    for (const entry of first.words) {
      if (await page.locator('#next-button').isVisible()) break;
      await addWord(page, entry.word);
      await page.locator('#submit-button').click();
    }
    assert.ok(await page.locator('#next-button').isVisible());
    await page.locator('#menu-button').click();
    const updateDetails = page.locator('#menu-dialog details').filter({ has: page.locator('#update-button') });
    if (!await updateDetails.evaluate(details => details.open)) await updateDetails.locator('summary').click();
    assert.equal(await page.locator('#update-button').evaluate(button => button.hidden), false);
    await Promise.all([
      page.waitForEvent('load'),
      page.locator('#update-button').click(),
    ]);
    await page.waitForFunction(async () => {
      const names = await caches.keys();
      return names.includes('word-garden-test-b') && !names.includes('word-garden-test-a');
    });
    assert.equal((await readyStatus(page)).cacheName, 'word-garden-test-b');
    const cacheNames = await page.evaluate(() => caches.keys());
    assert.ok(cacheNames.includes('codex-hearts-test'), 'Worker removed an unrelated cache');
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('word-garden-progress-v1')));
    assert.ok(saved.completed.includes(first.id), 'Update lost completed progress');
    console.log('WebKit waiting-worker update and cache isolation checked');
    return { oldCacheRemoved: true, unrelatedCacheKept: true, progressKept: true };
  } finally {
    if (context) await context.close();
    if (server) await server.close();
    await fs.rm(updateProfile, { recursive: true, force: true });
  }
}

async function chromiumTouch() {
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
    const page = await context.newPage();
    await page.goto(APP_URL, { waitUntil: 'networkidle' });
    const tile = page.locator('.letter').first();
    await tile.waitFor();
    const box = await tile.boundingBox();
    const x = box.x + box.width / 2;
    const y = box.y + box.height / 2;
    const client = await context.newCDPSession(page);
    await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id: 1 }] });
    await new Promise(resolve => setTimeout(resolve, 900));
    await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    const selected = await page.locator('.letter[aria-pressed="true"]').count();
    assert.equal(selected, 1, 'Long hold should select one tile on release');
    await page.locator('#clear-button').click();
    await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id: 1 }] });
    await client.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
    assert.equal(await page.locator('.letter[aria-pressed="true"]').count(), 0,
      'Cancelled touch should not select a tile');
    await context.close();
    return { longHoldMs: 900, cancellation: true };
  } finally { await browser.close(); }
}

try {
  const result = { webkit: await webkitFlow(), workerUpdate: await workerUpdateFlow(), chromium: await chromiumTouch() };
  await fs.writeFile(path.join(artifacts, 'browser-results.json'), JSON.stringify(result, null, 2));
  console.log(`Word Garden browser checks passed. Screenshots and results: ${artifacts}`);
} finally {
  await fs.rm(profile, { recursive: true, force: true });
  await fs.rm(offlineProfile, { recursive: true, force: true });
}
