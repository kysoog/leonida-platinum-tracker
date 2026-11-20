import { readFileSync, readdirSync, lstatSync, statSync } from 'node:fs';
import { execFileSync, spawnSync } from 'node:child_process';
import { extname, join, resolve } from 'node:path';
import {
  buildDossier, readAppTree, htmlFacts, importMapOf, pageBaseFrom, resolveAppPath,
  resolveModule, sourceImports, dynamicImports, cssReferences,
} from '../vendor/makefun-frontend.ts';

const CAPS = { text_max_bytes: 163840, screenshots: { max: 4, max_bytes: 262144 }, app_max_files: 993, app_max_bytes: 50331648 };
const APP = resolve('app');
const failures = [];
const referenceLog = [];
const check = (condition, message) => { if (!condition) failures.push(message); };
const read = (path) => readFileSync(path, 'utf8');
const files = [];
const directories = [];

function walk(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const absolute = join(directory, entry.name);
    const stats = lstatSync(absolute);
    check(!stats.isSymbolicLink() && (stats.isFile() || stats.isDirectory()), `Special file in app/: ${absolute}`);
    if (stats.isDirectory()) { directories.push(absolute); walk(absolute); }
    else if (stats.isFile()) files.push(absolute);
  }
}
walk(APP);
const totalBytes = files.reduce((sum, file) => sum + statSync(file).size, 0);
check(files.length + directories.length <= 993, 'app/ exceeds 993 files and directories.');
check(totalBytes <= 50331648, 'app/ exceeds 48 MiB.');
check(statSync(resolve(APP, 'index.html')).isFile() && statSync(resolve(APP, 'index.html')).size <= 1048576, 'index.html is not a regular file within 1 MiB.');
for (const file of [...files, ...directories]) check(Buffer.byteLength(file.slice(APP.length + 1)) <= 1000, `Path over 1000 bytes: ${file}`);
console.log(`PASS app_files: ${files.length + directories.length} entries, ${totalBytes} bytes, 0 symlinks, index.html ${statSync(resolve(APP, 'index.html')).size} bytes`);

// The original kit commit is the immutable authority for official wording.
// Never compare against HEAD: that would let edited official text ratify itself.
const starter = JSON.parse(execFileSync('git', ['show', '12f8900:app/data/trophies.json'], { encoding: 'utf8' }));
const currentBytes = statSync(resolve(APP, 'data/trophies.json')).size;
const current = JSON.parse(read(resolve(APP, 'data/trophies.json')));
const byName = new Map(current.trophies.map((trophy) => [trophy.name, trophy]));
const missingGuides = starter.trophies.filter((official) => !byName.get(official.name)?.guide?.trim()).map((trophy) => trophy.name);
const changedOfficialText = starter.trophies.filter((official) => {
  const trophy = byName.get(official.name);
  return !trophy || trophy.description !== official.description || trophy.grade !== official.grade;
}).map((trophy) => trophy.name);
check(currentBytes <= 2097152, 'trophies.json exceeds 2 MiB.');
check(current.trophies.length === 55, `Expected 55 trophy entries, found ${current.trophies.length}.`);
check(missingGuides.length === 0, `Official trophies missing / blank guides: ${missingGuides.join(', ')}`);
check(changedOfficialText.length === 0, `Official descriptions or grades changed: ${changedOfficialText.join(', ')}`);
check(current.trophies.every((trophy) => Array.isArray(trophy.sources) && trophy.sources.length > 0 && trophy.sources.every((source) => source.label?.trim() && source.use?.trim() && /^https:\/\//.test(source.url ?? ''))), 'A trophy guide is missing its named linked sources.');
check(current.trophies.every((trophy) => trophy.guide.length >= 180 && trophy.guide.trim() !== trophy.description.trim()), 'A field guide is missing or too superficial.');
// Hash-pinned authoring gate: every note must name its research and link it locally in JSON.
check(current.trophies.every((trophy) => trophy.sources.some((source) => /PowerPyx/.test(source.label)) && trophy.sources.some((source) => /PSNProfiles/.test(source.label))), 'Every guide must name its specialist guide and official-list source.');
const missables = current.trophies.filter((trophy) => trophy.missable);
check(missables.length === 1 && missables[0].id === 28, 'The cited roadmap has exactly one potential missable: Positive Mental Attitude.');
check(missables[0]?.missableWindow === 'Chapter 1 · after Down to Earth · before Chapter 2 · 1 of 18 meditations', 'The Chapter 1 missable window or 1-of-18 meditation detail is missing.');
check(current.trophies.every((trophy) => trophy.unlockContext?.trim() && trophy.progressCheck?.trim()), 'Every trophy needs practical placement and a concrete earned check.');
const gradeCounts = Object.fromEntries(['platinum', 'silver', 'gold', 'bronze'].map((grade) => [grade, current.trophies.filter((trophy) => trophy.grade === grade).length]));
check(JSON.stringify(gradeCounts) === JSON.stringify({ platinum: 1, silver: 6, gold: 2, bronze: 46 }), `Grade totals drifted: ${JSON.stringify(gradeCounts)}`);
const indexText = read(resolve(APP, 'index.html'));
for (const [grade, count] of Object.entries(gradeCounts)) check(indexText.includes(`grade-token ${grade}"></span><strong>${count}</strong>`), `Visible ${grade} count does not match the data.`);
const invalidKinds = current.trophies.filter((trophy) => !['story', 'missable', 'collectibles', 'activities', 'online'].includes(trophy.kind));
check(invalidKinds.length === 0, 'A trophy has an invalid kind.');
check(current.trophies.every((trophy) => Number.isInteger(trophy.roadmapStage) && trophy.roadmapStage >= 1 && trophy.roadmapStage <= 6), 'Invalid roadmap stage.');
console.log(`PASS trophies: ${starter.trophies.length - missingGuides.length}/55 official names with non-blank guides; names, descriptions and grades exact; all guides sourced; JSON ${currentBytes} bytes`);

const index = read(resolve(APP, 'index.html'));
const facts = htmlFacts(index);
const tree = readAppTree(APP, CAPS);
const importMap = importMapOf(facts).map;
const base = pageBaseFrom(facts, 'index.html');
const appFiles = new Set(tree.files.map((file) => file.path));
const mediaData = /^data:(?:image|audio|video|font)\//i;

function verifyReference(ref, from, kind, dataAllowed = false) {
  if (typeof ref !== 'string' || ref.trim() === '') { failures.push(`Empty ${kind} reference in ${from}`); return; }
  referenceLog.push(`${from}: ${ref.slice(0, 90)}`);
  if (/^https?:|^\/\/|^[a-z][a-z\d+.-]*:\/\//i.test(ref)) { failures.push(`Remote reference ${ref} in ${from}`); return; }
  if (ref.startsWith('data:')) {
    check(dataAllowed && mediaData.test(ref), `Disallowed data URI used as ${kind} in ${from}`);
    return;
  }
  if (/^[a-z][a-z\d+.-]*:/i.test(ref)) { failures.push(`Non-local scheme reference ${ref} in ${from}`); return; }
  const target = resolveAppPath(ref, from.endsWith('.html') ? base : from);
  check(target !== null && appFiles.has(target), `Missing local ${kind} target ${ref} from ${from} (resolved ${target})`);
}

for (const script of facts.scripts) if (script.src !== null) verifyReference(script.src, 'index.html', 'script');
for (const link of facts.links) {
  if (/stylesheet|modulepreload|preload|prefetch|icon|apple-touch-icon|mask-icon|manifest/.test(link.rel)) verifyReference(link.href, 'index.html', `link ${link.rel}`, /icon/.test(link.rel));
}
for (const resource of facts.resources) verifyReference(resource.src, 'index.html', resource.tag, resource.tag !== 'iframe');
for (const map of facts.importMaps) {
  check(!map.error, `Import map does not parse: ${map.error}`);
  if (map.value && typeof map.value === 'object') for (const group of ['imports', 'scopes']) {
    const inspect = (value) => { if (typeof value === 'string') verifyReference(value, 'index.html', 'import map'); else if (value && typeof value === 'object') Object.values(value).forEach(inspect); };
    inspect(map.value[group]);
  }
}

const srcsetPattern = /\b(?:srcset|poster)\s*=\s*(["'])(.*?)\1/gis;
for (const match of index.matchAll(srcsetPattern)) {
  for (const candidate of match[2].split(',')) verifyReference(candidate.trim().split(/\s+/)[0], 'index.html', 'responsive media', true);
}

const reachableModules = new Set();
function walkModule(path) {
  if (reachableModules.has(path)) return;
  reachableModules.add(path);
  const source = read(resolve(APP, path));
  for (const specifier of sourceImports(source)) {
    const target = resolveModule(specifier, path, importMap, base);
    check(target !== null && appFiles.has(target), `Static import ${specifier} from ${path} does not resolve inside app/.`);
    if (target && appFiles.has(target) && /\.m?js$/.test(target)) walkModule(target);
  }
  for (const specifier of dynamicImports(source)) {
    if (specifier === null) { failures.push(`Computed import() found in ${path}`); continue; }
    const target = resolveModule(specifier, path, importMap, base);
    check(target !== null && appFiles.has(target), `Dynamic import ${specifier} from ${path} does not resolve inside app/.`);
  }
}
walkModule('app.js');

for (const file of files.filter((name) => /\.(?:css|html)$/.test(name))) {
  const source = read(file);
  const styles = file.endsWith('.html') ? htmlFacts(source).styles : [source];
  for (const style of styles) for (const reference of cssReferences(style)) {
    verifyReference(reference.ref, file.startsWith(APP) ? file.slice(APP.length + 1) : file, `CSS ${reference.kind}`, reference.kind !== 'import');
  }
}

for (const file of files.filter((name) => /\.(?:js|mjs)$/.test(name))) {
  const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
  check(result.status === 0, `JavaScript parse failed ${file}: ${result.stderr}`);
}
// Citation hrefs in JSON and <a> elements are deliberately outbound reads,
// opened only after a reader clicks. htmlFacts and import/fetch scans above
// still reject every load-bearing remote stylesheet, script, media or module.
console.log(`PASS references: ${referenceLog.length} HTML/media references inspected; ${reachableModules.size} modules reachable and parsed; all load-bearing references local`);
console.log(`PASS js_parses: ${files.filter((name) => /\.m?js$/.test(name)).length} JavaScript modules parsed by Node`);

function jpegDimensions(bytes) {
  let offset = 2;
  while (offset + 9 < bytes.length) {
    if (bytes[offset] !== 0xff) { offset++; continue; }
    const marker = bytes[offset + 1];
    const length = bytes.readUInt16BE(offset + 2);
    if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
      return { width: bytes.readUInt16BE(offset + 7), height: bytes.readUInt16BE(offset + 5) };
    }
    offset += 2 + length;
  }
  throw new Error('No JPEG frame header.');
}

const shots = readdirSync('screenshots').filter((name) => !name.startsWith('.')).sort();
check(shots.length >= 3 && shots.length <= 4, `Expected 3 or 4 screenshots; found ${shots.length}.`);
for (const name of shots) {
  const bytes = readFileSync(resolve('screenshots', name));
  check(/^[A-Za-z0-9._-]{1,128}$/.test(name) && !name.startsWith('-'), `Invalid screenshot name ${name}`);
  check(bytes.length <= 262144, `${name} exceeds 256 KiB.`);
  let format;
  let dimensions;
  if (bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) {
    format = 'PNG';
    dimensions = { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
  } else if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes.at(-2) === 0xff && bytes.at(-1) === 0xd9) {
    format = 'JPEG';
    dimensions = jpegDimensions(bytes);
  } else failures.push(`${name} is not a whole PNG or JPEG.`);
  if (dimensions) {
    check(Math.max(dimensions.width, dimensions.height) <= 1280, `${name} long side exceeds 1280.`);
    check(Math.min(dimensions.width, dimensions.height) >= 480, `${name} short side is under 480.`);
    check(dimensions.width === 1280 && dimensions.height === 800, `${name} must use the deterministic 1280x800 capture frame.`);
    console.log(`PASS screenshot: ${name} ${format} ${bytes.length} bytes ${dimensions.width}x${dimensions.height}`);
  }
}

const citedUrls = new Set(current.trophies.flatMap((trophy) => trophy.sources.map((source) => source.url)));
check(citedUrls.size >= 2 && read(resolve(APP, 'index.html')).includes('href="https://make.fun/bounty/gta6-trophy-guide-01"'), 'Research or make.fun outbound links are missing.');
console.log(`PASS citations: ${citedUrls.size} distinct research URLs plus the make.fun header link are user-initiated anchors, not fetched assets`);
const expectedDossier = Buffer.from(buildDossier(resolve('.'), CAPS));
const packagedRoot = resolve(process.env.MAKEFUN_OUTPUT_DIR ?? '/root/makefun/tg2-scratch/out');
const actualDossier = readFileSync(resolve(packagedRoot, 'dossier.json'));
check(expectedDossier.equals(actualDossier), `dossier.json differs from fresh buildDossier output (${expectedDossier.length} expected bytes vs ${actualDossier.length} actual).`);
check(actualDossier.length <= 1572864, 'dossier.json exceeds 1.5 MiB.');
console.log(`${expectedDossier.equals(actualDossier) ? 'PASS' : 'FAIL'} dossier_matches: ${actualDossier.length} bytes byte-identical to buildDossier`);

if (failures.length) {
  console.error(`\nVERIFICATION FAILED (${failures.length}):`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log('ALL LOCAL GATE CHECKS PASSED');
