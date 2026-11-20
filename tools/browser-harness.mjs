import { createReadStream, mkdtempSync, rmSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { extname, resolve, sep } from 'node:path';

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8' };

function serveApplication(root, port) {
  const server = createServer((request, response) => {
    let pathname;
    try { pathname = decodeURIComponent(new URL(request.url ?? '/', 'local://guide').pathname); }
    catch { response.writeHead(400).end(); return; }
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      response.writeHead(405, { allow: 'GET, HEAD' }).end();
      return;
    }
    if (pathname.endsWith('/')) pathname += 'index.html';
    const file = resolve(root, `.${pathname}`);
    if (file !== root && !file.startsWith(`${root}${sep}`)) { response.writeHead(403).end(); return; }
    try {
      if (!statSync(file).isFile()) throw new Error('not a file');
      response.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream', 'cache-control': 'no-store' });
      createReadStream(file).pipe(response);
    } catch { response.writeHead(404).end(); }
  });
  return new Promise((resolveServer) => server.listen(port, '127.0.0.1', () => resolveServer(server)));
}

class CdpConnection {
  constructor(socket) {
    this.socket = socket;
    this.nextId = 1;
    this.pending = new Map();
    this.listeners = new Map();
    socket.addEventListener('message', (event) => {
      const message = JSON.parse(event.data);
      if (message.id) {
        const pending = this.pending.get(message.id);
        if (!pending) return;
        this.pending.delete(message.id);
        if (message.error) pending.reject(new Error(`${message.error.message}: ${JSON.stringify(message.error.data ?? {})}`));
        else pending.resolve(message.result);
      } else {
        for (const listener of this.listeners.get(message.method) ?? []) listener(message.params, message.sessionId);
      }
    });
  }

  static async attach(webSocketUrl) {
    const socket = new WebSocket(webSocketUrl);
    await new Promise((resolveOpen, reject) => {
      socket.addEventListener('open', resolveOpen, { once: true });
      socket.addEventListener('error', reject, { once: true });
    });
    return new CdpConnection(socket);
  }

  send(method, params = {}, sessionId) {
    const id = this.nextId++;
    return new Promise((resolveSend, reject) => {
      this.pending.set(id, { resolve: resolveSend, reject });
      this.socket.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
    });
  }

  on(method, listener) {
    const listeners = this.listeners.get(method) ?? [];
    listeners.push(listener);
    this.listeners.set(method, listeners);
  }

  close() { this.socket.close(); }
}

async function waitForDebugPort(port) {
  const deadline = Date.now() + 10000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/version`);
      if (response.ok) return (await response.json()).webSocketDebuggerUrl;
    } catch {}
    await new Promise((resolveWait) => setTimeout(resolveWait, 60));
  }
  throw new Error('Chromium debugging port did not become ready.');
}

export async function startBrowserHarness(appRoot) {
  const port = 41733;
  const debugPort = 9233;
  const profile = mkdtempSync(resolve(process.env.TG2_SCRATCH_DIR ?? '/root/makefun/tg2-scratch', 'browser-profile-'));
  const server = await serveApplication(appRoot, port);
  const chromium = spawn('/usr/bin/chromium', [
    '--headless=new', '--no-sandbox', '--disable-dev-shm-usage', '--hide-scrollbars',
    '--disable-background-networking', '--disable-component-update', '--disable-sync',
    `--remote-debugging-port=${debugPort}`, `--user-data-dir=${profile}`, '--no-first-run', 'about:blank',
  ], { stdio: ['ignore', 'ignore', 'pipe'] });
  let diagnostic = '';
  chromium.stderr.on('data', (chunk) => { diagnostic += chunk.toString(); });
  let connection;
  try {
    const webSocketUrl = await waitForDebugPort(debugPort);
    connection = await CdpConnection.attach(webSocketUrl);
  } catch (error) {
    chromium.kill('SIGTERM');
    server.close();
    rmSync(profile, { recursive: true, force: true });
    throw new Error(`${error.message}\n${diagnostic.slice(-1200)}`);
  }

  async function openPage() {
    const { targetId } = await connection.send('Target.createTarget', { url: 'about:blank' });
    const { sessionId } = await connection.send('Target.attachToTarget', { targetId, flatten: true });
    const exceptions = [];
    const errorEvents = [];
    connection.on('Runtime.exceptionThrown', (params, eventSession) => {
      if (eventSession === sessionId) exceptions.push(params.exceptionDetails.exception?.description ?? params.exceptionDetails.text);
    });
    connection.on('Log.entryAdded', (params, eventSession) => {
      if (eventSession === sessionId && params.entry.level === 'error') errorEvents.push(params.entry.text);
    });
    await connection.send('Page.enable', {}, sessionId);
    await connection.send('Runtime.enable', {}, sessionId);
    await connection.send('Log.enable', {}, sessionId);

    async function evaluate(expression) {
      const result = await connection.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }, sessionId);
      if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text);
      return result.result.value;
    }

    async function waitForFlag() {
      const deadline = Date.now() + 12000;
      while (Date.now() < deadline) {
        const populated = await evaluate(`document.readyState === 'complete' && (document.querySelector('.trophy-row') !== null || document.querySelector('#loadError:not([hidden])') !== null) && (document.querySelector('.view-tab.is-active')?.dataset.viewTarget !== 'roadmap' || document.querySelector('#roadmapRoute .stage-detail') !== null)`);
        if (populated) {
          await evaluate('new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))');
          return;
        }
        await new Promise((resolveWait) => setTimeout(resolveWait, 40));
      }
      throw new Error(`Trophy UI did not populate. Exceptions: ${JSON.stringify(exceptions)}. Load error: ${await evaluate("document.querySelector('#loadError')?.textContent ?? ''")}`);
    }

    return {
      sessionId,
      targetId,
      exceptions,
      errorEvents,
      evaluate,
      waitForFlag,
      send: (method, params = {}) => connection.send(method, params, sessionId),
      setProgress(earned, spoilers) {
        const payload = JSON.stringify({ schema: 'leonida-platinum-tracker/v1', earned, hideStorySpoilers: spoilers });
        const source = `if (!sessionStorage.getItem('leonida-seeded')) { localStorage.setItem('leonida-platinum-progress-v1', ${JSON.stringify(payload)}); sessionStorage.setItem('leonida-seeded', '1'); }`;
        return connection.send('Page.addScriptToEvaluateOnNewDocument', { source }, sessionId);
      },
      async navigate(url = `http://127.0.0.1:${port}/index.html`) {
        await connection.send('Page.navigate', { url }, sessionId);
        await waitForFlag();
      },
      async viewport(width, height) {
        await connection.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false }, sessionId);
      },
      async close() { await connection.send('Target.closeTarget', { targetId }); },
    };
  }

  return {
    openPage,
    async close() {
      const exited = new Promise((resolveExit) => chromium.once('exit', resolveExit));
      connection.send('Browser.close').catch(() => chromium.kill('SIGTERM'));
      await Promise.race([exited, new Promise((resolveWait) => setTimeout(resolveWait, 2500))]);
      if (chromium.exitCode === null) {
        chromium.kill('SIGKILL');
        await Promise.race([exited, new Promise((resolveWait) => setTimeout(resolveWait, 1500))]);
      }
      connection.close();
      await new Promise((resolveClose) => server.close(resolveClose));
      await new Promise((resolveWait) => setTimeout(resolveWait, 120));
      rmSync(profile, { recursive: true, force: true, maxRetries: 30, retryDelay: 100 });
    },
  };
}
