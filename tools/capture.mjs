import { mkdirSync, readFileSync, rmSync, writeFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { startBrowserHarness } from './browser-harness.mjs';

const root = resolve('.');
const shotDirectory = resolve('screenshots');
const shots = JSON.parse(readFileSync('shots.json', 'utf8'));
const trophyDocument = JSON.parse(readFileSync('app/data/trophies.json', 'utf8'));
rmSync(shotDirectory, { recursive: true, force: true });
mkdirSync(shotDirectory, { recursive: true });
const browser = await startBrowserHarness(resolve(root, 'app'));

async function settleAfterAction(page) {
  await page.evaluate('new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))');
  await page.waitForFlag();
}

try {
  for (const shot of shots) {
    const page = await browser.openPage();
    await page.viewport(shot.viewport.width, shot.viewport.height);
    const earnedNames = (shot.earned ?? []).map((earned) => typeof earned === 'number'
      ? trophyDocument.trophies.find((trophy) => trophy.id === earned).name
      : earned);
    await page.setProgress(earnedNames, shot.spoilers ?? true);
    await page.navigate();

    if (shot.view === 'roadmap') {
      await page.evaluate("document.querySelector('.view-tab[data-view-target=\"roadmap\"]').click()");
      await page.waitForFlag();
    }
    if (shot.kind) {
      await page.evaluate(`document.querySelector('[data-kind="${shot.kind}"]').click()`);
      await page.waitForFlag();
    }
    if (shot.roadmapStage) {
      await page.evaluate(`document.querySelector('[data-roadmap-stage="${shot.roadmapStage}"]').click()`);
      await page.waitForFlag();
    }
    if (shot.selected) {
      await page.evaluate(`document.querySelector('[data-open-trophy="${shot.selected}"]').click()`);
      await page.waitForFlag();
    }
    if (shot.listAnchor) {
      await page.evaluate(`(() => {
        const list = document.querySelector('#trophyList');
        const row = document.querySelector('[data-trophy-row="${shot.listAnchor}"]');
        list.scrollTop += row.getBoundingClientRect().top - list.getBoundingClientRect().top;
      })()`);
    }
    await settleAfterAction(page);
    const geometry = await page.evaluate(`({
      viewport: [innerWidth, innerHeight],
      pageOverflow: document.documentElement.scrollWidth > innerWidth,
      guide: (() => { const panel = document.querySelector('.guide-scroll'); return panel ? { client: panel.clientHeight, scroll: panel.scrollHeight } : null; })(),
      sources: Array.from(document.querySelectorAll('.source-entry a')).map((link) => {
        const rect = link.getBoundingClientRect();
        return { text: link.textContent, href: link.href, visible: rect.top >= 0 && rect.bottom <= innerHeight, rect: [Math.round(rect.x), Math.round(rect.y), Math.round(rect.width), Math.round(rect.height)] };
      }),
      roadmap: (() => { const list = document.querySelector('.stage-trophy-list'); return list ? { client: list.clientHeight, scroll: list.scrollHeight, rows: list.children.length } : null; })(),
      checklistNames: Array.from(document.querySelectorAll('.trophy-name')).filter((name) => {
        const rect = name.getBoundingClientRect();
        return rect.bottom > 0 && rect.top < innerHeight;
      }).map((name) => ({ text: name.textContent, rect: [Math.round(name.getBoundingClientRect().x), Math.round(name.getBoundingClientRect().y), Math.round(name.getBoundingClientRect().width), Math.round(name.getBoundingClientRect().height)], clipped: name.scrollWidth > name.clientWidth }))
    })`);
    if (!/^[A-Za-z0-9._-]{1,128}$/.test(shot.file) || !/\.(?:png|jpe?g)$/i.test(shot.file)) throw new Error(`Invalid capture path: ${shot.file}`);
    if (shot.viewport.width !== 1280 || shot.viewport.height !== 800) throw new Error('Captures must be 1280x800 to match the judge cover frame.');
    const capture = await page.send('Page.captureScreenshot', {
      format: 'jpeg', quality: 90, fromSurface: true, captureBeyondViewport: false,
    });
    const output = resolve(shotDirectory, shot.file);
    writeFileSync(output, Buffer.from(capture.data, 'base64'));
    console.log(`LAYOUT ${shot.file}: ${JSON.stringify(geometry)}`);
    console.log(`${shot.file}: ${statSync(output).size} bytes; CDP exceptions ${JSON.stringify(page.exceptions)}; browser errors ${JSON.stringify(page.errorEvents)}`);
    if (page.exceptions.length) throw new Error(`Page exception while capturing ${shot.file}.`);
    await page.close();
  }
} finally {
  await browser.close();
}
