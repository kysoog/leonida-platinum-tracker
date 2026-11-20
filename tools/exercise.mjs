import { mkdirSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { startBrowserHarness } from './browser-harness.mjs';

// Test evidence and downloads never enter the recorded repository tree.
const artifacts = resolve(process.env.TG2_SCRATCH_DIR ?? '/root/makefun/tg2-scratch/exercise-artifacts');
mkdirSync(artifacts, { recursive: true });
for (const name of ['leonida-platinum-checklist.json', 'tracker-evidence.json']) rmSync(resolve(artifacts, name), { force: true });
const browser = await startBrowserHarness(resolve('app'));
const page = await browser.openPage();
const evidence = { artifacts };

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
  await page.viewport(1280, 800);
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

  const downloadPath = resolve(artifacts, 'leonida-platinum-checklist.json');
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
  evidence.afterImport = { localStorage: await storage(), toast: await page.evaluate("document.querySelector('#toast').textContent") };

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

  await page.evaluate("document.querySelector('[data-kind=\"missable\"]').click()");
  await page.waitForFlag();
  await page.evaluate("document.querySelector('[data-open-trophy=\"28\"]').click()");
  await page.waitForFlag();
  evidence.missable = await page.evaluate(`({
    rows: document.querySelectorAll('.trophy-row').length,
    window: document.querySelector('.missable-window strong').textContent,
    sources: Array.from(document.querySelectorAll('.source-entry a')).map((a) => ({ label: a.textContent, href: a.href }))
  })`);
  await page.evaluate("document.querySelector('[data-view-target=\"roadmap\"]').click()");
  await page.waitForFlag();
  await page.evaluate("document.querySelector('[data-roadmap-stage=\"5\"]').click()");
  await page.waitForFlag();
  evidence.roadmap = await page.evaluate(`({
    stages: document.querySelectorAll('[data-roadmap-stage]').length,
    activeStage: document.querySelector('.route-stage.is-active').dataset.roadmapStage,
    rows: document.querySelectorAll('.stage-trophy').length,
    summary: document.querySelector('#roadmapSummary').textContent
  })`);
  evidence.cdpExceptions = page.exceptions;
  evidence.browserErrors = page.errorEvents;
  writeFileSync(resolve(artifacts, 'tracker-evidence.json'), `${JSON.stringify(evidence, null, 2)}\n`);
  console.log(JSON.stringify(evidence, null, 2));

  const persisted = evidence.afterReload.localStorage.earned.length === 3;
  const imported = evidence.afterImport.localStorage.earned.length === 3;
  const spoilerWorks = evidence.spoilersOn.hiddenStoryName.includes('hidden') && evidence.spoilersOff.revealedStoryName === 'T**s Ass Drug Money';
  const missableWorks = evidence.missable.rows === 1 && evidence.missable.window.includes('Chapter 1') && evidence.missable.sources.length === 2;
  const routeWorks = evidence.roadmap.stages === 6 && evidence.roadmap.activeStage === '5' && evidence.roadmap.rows === 11;
  if (![persisted, imported, spoilerWorks, missableWorks, routeWorks].every(Boolean) || page.exceptions.length || page.errorEvents.length) {
    throw new Error('Tracker exercise failed an assertion.');
  }
  console.log('EXERCISE PASS: persistence, reload, export, import, spoilers, citation links, missable window and six-stage route.');
} finally {
  await browser.close();
}
