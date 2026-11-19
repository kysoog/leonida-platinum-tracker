// Deterministic submission packaging for the Leonida Platinum field manual.
// Node 22 standard library only; the vendored dossier implementation is never modified.
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

const repositoryRoot = fileURLToPath(new URL('.', import.meta.url));
const outputRoot = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(outputRoot, { recursive: true });
rmSync(join(outputRoot, 'app'), { recursive: true, force: true });
rmSync(join(outputRoot, 'screenshots'), { recursive: true, force: true });
cpSync(join(repositoryRoot, 'app'), join(outputRoot, 'app'), { recursive: true, dereference: false });
mkdirSync(join(outputRoot, 'screenshots'), { recursive: true });
if (existsSync(join(repositoryRoot, 'screenshots'))) {
  cpSync(join(repositoryRoot, 'screenshots'), join(outputRoot, 'screenshots'), { recursive: true, dereference: false });
}

const dossier = buildDossier(outputRoot, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
});
writeFileSync(join(outputRoot, 'dossier.json'), dossier);
console.log(`Leonida Platinum packaged in ${outputRoot}: app/, screenshots/, dossier.json (${dossier.length} bytes).`);
