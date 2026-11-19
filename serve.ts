// Local static server for Leonida Platinum. No dependencies and no remote resources.
import { createReadStream, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const applicationRoot = resolve(fileURLToPath(new URL('./app', import.meta.url)));
const portArgument = process.argv.indexOf('--port');
const candidate = portArgument === -1 ? 8080 : Number(process.argv[portArgument + 1]);
const port = Number.isInteger(candidate) && candidate > 0 && candidate < 65536 ? candidate : 8080;
const mediaTypes: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
};

createServer((request, response) => {
  let pathname = '/';
  try {
    pathname = decodeURIComponent(new URL(request.url ?? '/', 'local://app').pathname);
  } catch {
    response.writeHead(400).end('Invalid path');
    return;
  }
  if (pathname.endsWith('/')) pathname += 'index.html';
  const file = resolve(applicationRoot, `.${pathname}`);
  if (file !== applicationRoot && !file.startsWith(`${applicationRoot}${sep}`)) {
    response.writeHead(403).end('Forbidden');
    return;
  }
  try {
    if (!statSync(file).isFile()) throw new Error('Not a file');
    response.writeHead(200, { 'content-type': mediaTypes[extname(file)] ?? 'application/octet-stream', 'cache-control': 'no-store' });
    createReadStream(file).pipe(response);
  } catch {
    response.writeHead(404).end('Not found');
  }
}).listen(port, '127.0.0.1', () => console.log(`Leonida Platinum is available on local port ${port}.`));
