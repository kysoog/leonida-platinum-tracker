// Deterministic, standard-library-only packaging for the make.fun dossier.
import { cpSync, existsSync, mkdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

const repositoryRoot = fileURLToPath(new URL('.', import.meta.url));
const outputRoot = resolve(process.env.MAKEFUN_OUTPUT_DIR ?? '/output');
for (const directory of ['app', 'screenshots', 'vendor']) {
  if (!statSync(join(repositoryRoot, directory)).isDirectory()) throw new Error(`Missing required ${directory}/ directory.`);
}

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
