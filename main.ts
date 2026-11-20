// Deterministic, standard-library-only packaging for the make.fun dossier.
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

const repositoryRoot = fileURLToPath(new URL('.', import.meta.url));
const outputRoot = resolve(process.env.MAKEFUN_OUTPUT_DIR ?? '/output');
for (const directory of ['app', 'screenshots', 'vendor']) {
  const source = join(repositoryRoot, directory);
  if (!statSync(source).isDirectory()) throw new Error(`Missing required ${directory}/ directory.`);
}

function requireRegularFile(relativePath: string, maximumBytes: number) {
  const file = join(repositoryRoot, relativePath);
  const stats = statSync(file);
  if (!stats.isFile()) throw new Error(`${relativePath} must be a regular file.`);
  if (stats.size > maximumBytes) throw new Error(`${relativePath} is ${stats.size} bytes; cap is ${maximumBytes}.`);
  return stats.size;
}

// Revision 2: fail at the entrypoint before a malformed capture reaches the dossier.
requireRegularFile('app/index.html', 1048576);
requireRegularFile('app/data/trophies.json', 2097152);
const screenshots = readdirSync(join(repositoryRoot, 'screenshots')).filter((name: string) => !name.startsWith('.')).sort();
if (screenshots.length < 3 || screenshots.length > 4) throw new Error(`Expected 3-4 screenshots, found ${screenshots.length}.`);
for (const name of screenshots) {
  if (!/^[A-Za-z0-9._-]+\.(?:png|jpe?g)$/i.test(name)) throw new Error(`Invalid screenshot name: ${name}`);
  requireRegularFile(`screenshots/${name}`, 262144);
}
console.log(`Cap check: index + 55-trophy data + ${screenshots.length} screenshots within limits.`);

mkdirSync(outputRoot, { recursive: true });
for (const directory of ['app', 'screenshots']) {
  rmSync(join(outputRoot, directory), { recursive: true, force: true });
  cpSync(join(repositoryRoot, directory), join(outputRoot, directory), { recursive: true, dereference: false, errorOnExist: false });
}

// Rebuild every time with the unchanged vendored implementation; the byte-level
// comparison in tools/verify.mjs catches a stale or post-edited dossier.
const dossier = buildDossier(outputRoot, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
});
const dossierBytes = Buffer.from(dossier);
if (dossierBytes.length > 1572864) throw new Error(`dossier.json is ${dossierBytes.length} bytes; cap is 1572864.`);
writeFileSync(join(outputRoot, 'dossier.json'), dossierBytes);
for (const required of ['app/index.html', 'screenshots', 'dossier.json']) {
  if (!existsSync(join(outputRoot, required))) throw new Error(`Packaging omitted ${required}.`);
}
console.log(`Leonida Platinum packaged in ${outputRoot}: app/, screenshots/, dossier.json (${dossierBytes.length} bytes).`);
