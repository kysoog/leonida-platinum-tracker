import { mkdirSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { startBrowserHarness } from './browser-harness.mjs';

const artifacts = resolve('artifacts');
mkdirSync(artifacts, { recursive: true });
for (const name of ['leonida-progress.json', 'tracker-evidence.json']) rmSync(resolve(artifacts, name), { force: true });
const browser = await startBrowserHarness(resolve('app'));
const page = await browser.openPage();
const evidence = {};

async function storage() {
  return page.evaluate("JSON.parse(localStorage.getItem('leonida-platinum-progress-v1'))");
}

async function waitForFile(path) {
  const deadline = Date.now() + 5000;
  while (Date.now() < deadline) {
    if (existsSync(path)) return;
    await new Promise((resolveWait) => setTimeout(resolveWait, 40));
  }
  throw new Error(`Download did not appear: ${path}`);
}

try {
  await page.viewport(1280, 900);
  await page.setProgress([], true);
  await page.navigate();
  for (const id of [2, 15, 17]) {
    await page.evaluate(`document.querySelector('[data-earned-id="${id}"]').click()`);
    await page.waitForFlag();
  }
  evidence.afterTicks = {
    progressText: await page.evaluate("document.querySelector('#progressValue').textContent"),
    localStorage: await storage(),
  };

  await page.send('Page.reload', { ignoreCache: true });
  await page.waitForFlag();
  evidence.afterReload = {
    progressText: await page.evaluate("document.querySelector('#progressValue').textContent"),
    checkedIds: await page.evaluate("Array.from(document.querySelectorAll('[data-earned-id]:checked')).map((box) => Number(box.dataset.earnedId))"),
    localStorage: await storage(),
  };

  const downloadPath = resolve(artifacts, 'leonida-progress.json');
  await page.send('Page.setDownloadBehavior', { behavior: 'allow', downloadPath: artifacts });
  await page.evaluate("document.querySelector('#exportProgress').click()");
  await waitForFile(downloadPath);
  evidence.exported = JSON.parse(readFileSync(downloadPath, 'utf8'));

  await page.evaluate("document.querySelector('[data-earned-id=\"17\"]').click()");
  await page.waitForFlag();
  evidence.beforeImport = await storage();
  const { root } = await page.send('DOM.getDocument', { depth: 1 });
  const { nodeId } = await page.send('DOM.querySelector', { nodeId: root.nodeId, selector: '#importProgress' });
  await page.send('DOM.setFileInputFiles', { nodeId, files: [downloadPath] });
  const importDeadline = Date.now() + 5000;
  while (Date.now() < importDeadline) {
    const current = await storage();
    if (current.earned.length === 3) break;
    await new Promise((resolveWait) => setTimeout(resolveWait, 40));
  }
  await page.waitForFlag();
  evidence.afterImport = {
    localStorage: await storage(),
    toast: await page.evaluate("document.querySelector('#toast').textContent"),
  };

  await page.evaluate("document.querySelector('[data-kind=\"story\"]').click()");
  await page.waitForFlag();
  evidence.spoilersOn = await page.evaluate(`({
    toggle: document.querySelector('#spoilerToggle').checked,
    earnedStoryName: document.querySelector('[data-trophy-name="2"]').textContent,
    hiddenStoryName: document.querySelector('[data-trophy-name="4"]').textContent,
    hiddenStoryDescription: document.querySelector('[data-trophy-description="4"]').textContent
  })`);
  await page.evaluate("document.querySelector('#spoilerToggle').click()");
  await page.waitForFlag();
  evidence.spoilersOff = await page.evaluate(`({
    toggle: document.querySelector('#spoilerToggle').checked,
    revealedStoryName: document.querySelector('[data-trophy-name="4"]').textContent,
    revealedStoryDescription: document.querySelector('[data-trophy-description="4"]').textContent
  })`);
  evidence.cdpExceptions = page.exceptions;
  evidence.browserErrors = page.errorEvents;
  writeFileSync(resolve(artifacts, 'tracker-evidence.json'), `${JSON.stringify(evidence, null, 2)}\n`);
  console.log(JSON.stringify(evidence, null, 2));

  const persisted = evidence.afterReload.localStorage.earned.length === 3;
  const imported = evidence.afterImport.localStorage.earned.length === 3;
  const spoilerWorks = evidence.spoilersOn.hiddenStoryName.includes('hidden') && evidence.spoilersOff.revealedStoryName === 'T**s Ass Drug Money';
  if (!persisted || !imported || !spoilerWorks || page.exceptions.length) throw new Error('Tracker exercise failed an assertion.');
} finally {
  await browser.close();
}
