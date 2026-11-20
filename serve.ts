// Dependency-free local server. There are no remote assets or proxy routes.
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
const headers = {
  'cache-control': 'no-store',
  'x-content-type-options': 'nosniff',
  'content-security-policy': "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; font-src 'self'; object-src 'none'; base-uri 'none'; form-action 'self'",
};

createServer((request, response) => {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.writeHead(405, { ...headers, allow: 'GET, HEAD' }).end('Method not allowed');
    return;
  }
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(request.url ?? '/', 'local://app').pathname);
  } catch {
    response.writeHead(400, headers).end('Invalid path');
    return;
  }
  if (pathname.endsWith('/')) pathname += 'index.html';
  const file = resolve(applicationRoot, `.${pathname}`);
  if (file !== applicationRoot && !file.startsWith(`${applicationRoot}${sep}`)) {
    response.writeHead(403, headers).end('Forbidden');
    return;
  }
  try {
    const stats = statSync(file);
    if (!stats.isFile()) throw new Error('Not a file');
    response.writeHead(200, { ...headers, 'content-type': mediaTypes[extname(file)] ?? 'application/octet-stream', 'content-length': stats.size });
    if (request.method === 'HEAD') response.end();
    else createReadStream(file).pipe(response);
  } catch {
    response.writeHead(404, headers).end('Not found');
  }
}).listen(port, '127.0.0.1', () => console.log(`Leonida Platinum is available on http://127.0.0.1:${port}.`));
