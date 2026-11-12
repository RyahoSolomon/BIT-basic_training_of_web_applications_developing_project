// Node 22+, Chrome or Edge. Set BROWSER_PATH to select a browser executable.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { pathToFileURL } = require('node:url');
const { setTimeout: delay } = require('node:timers/promises');

const root = path.resolve(__dirname, '..');

function findBrowser() {
  if (process.env.BROWSER_PATH) return process.env.BROWSER_PATH;
  const candidates = [process.env.ProgramFiles, process.env['ProgramFiles(x86)'], process.env.LOCALAPPDATA]
    .filter(Boolean)
    .flatMap(dir => ['Google/Chrome/Application/chrome.exe', 'Microsoft/Edge/Application/msedge.exe']
      .map(exe => path.join(dir, exe)));
  candidates.push('/usr/bin/google-chrome', '/usr/bin/chromium',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome');
  const browser = candidates.find(file => fs.existsSync(file));
  if (!browser) throw new Error('Set BROWSER_PATH to a Chrome or Edge executable.');
  return browser;
}

async function until(label, check, timeout = 12000) {
  const deadline = Date.now() + timeout;
  do {
    const value = await check();
    if (value) return value;
    await delay(50);
  } while (Date.now() < deadline);
  throw new Error('Timed out waiting for ' + label);
}

async function connect(url, onEvent) {
  const ws = new WebSocket(url);
  await until('browser connection', () => {
    if (ws.readyState === WebSocket.CLOSED) throw new Error('Browser connection closed.');
    return ws.readyState === WebSocket.OPEN;
  });
  let sequence = 0;
  const pending = new Map();
  ws.addEventListener('message', event => {
    const msg = JSON.parse(event.data);
    if (!msg.id) return onEvent(msg);
    const request = pending.get(msg.id);
    if (!request) return;
    if (msg.error) request.reject(new Error(request.method + ': ' + msg.error.message));
    else request.resolve(msg.result);
  });
  ws.addEventListener('close', () => {
    for (const request of pending.values()) request.reject(new Error('Browser connection closed.'));
  });
  function send(method, params = {}) {
    const id = ++sequence;
    const promise = new Promise((resolve, reject) => {
      pending.set(id, { method, resolve, reject });
      ws.send(JSON.stringify({ id, method, params }));
    });
    const timer = setTimeout(() => pending.get(id)?.reject(new Error('Timed out: ' + method)), 12000);
    return promise.finally(() => { clearTimeout(timer); pending.delete(id); });
  }
  return { send, close: () => ws.close() };
}

async function withBrowser(run) {
  const browser = findBrowser();
  const profile = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'bit-game-smoke-'));
  let chrome, cdp, launchError, stopped;
  try {
    chrome = spawn(browser, [
      '--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + profile,
      '--no-first-run', '--disable-extensions', '--disable-background-networking',
      ...(path.basename(browser).toLowerCase() === 'msedge.exe' ? ['--edge-skip-compat-layer-relaunch'] : []),
      '--host-resolver-rules=MAP *.googleapis.com ~NOTFOUND, MAP *.gstatic.com ~NOTFOUND',
      '--window-size=1440,1000', 'about:blank',
    ], { stdio: 'ignore', windowsHide: true });
    stopped = new Promise(resolve => chrome.once('close', resolve));
    chrome.once('error', error => { launchError = error; });
    const portFile = path.join(profile, 'DevToolsActivePort');
    const port = await until('browser startup', async () => {
      if (launchError) throw launchError;
      if (chrome.exitCode !== null) throw new Error('Browser exited during startup: ' + chrome.exitCode);
      if (fs.existsSync(portFile)) return (await fs.promises.readFile(portFile, 'utf8')).split(/\r?\n/)[0];
    });
    const tabs = await fetch('http://127.0.0.1:' + port + '/json/list', {signal: AbortSignal.timeout(5000)}).then(r => r.json());
    const tab = tabs.find(t => t.type === 'page' && t.url === 'about:blank');
    assert.ok(tab, 'Missing initial browser tab');
    const errors = [];
    cdp = await connect(tab.webSocketDebuggerUrl, ({method, params}) => {
      if (method === 'Runtime.exceptionThrown') {
        const e = params.exceptionDetails;
        errors.push(e.exception?.description || e.text);
      }
      if (method === 'Page.javascriptDialogOpening') {
        cdp.send('Page.handleJavaScriptDialog', {accept: true}).catch(e => errors.push(e.message));
      }
    });
    await cdp.send('Runtime.enable');
    await cdp.send('Page.enable');
    await cdp.send('Network.enable');
    await cdp.send('Network.setBlockedURLs', {
      urls: ['*://fonts.googleapis.com/*', '*://fonts.gstatic.com/*'],
    });
    async function evaluate(expression) {
      const result = await cdp.send('Runtime.evaluate', {expression, returnByValue: true, userGesture: true});
      if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
      return result.result.value;
    }
    async function page(file) {
      const href = pathToFileURL(path.join(root, file)).href;
      await until(file, async () => {
        assert.deepEqual(errors, [], 'Uncaught script errors: ' + errors.join('\n'));
        try {
          return await evaluate('location.href === ' + JSON.stringify(href) + ' && document.readyState === "complete"');
        } catch (e) {
          if (!/context was destroyed|Cannot find context/.test(e.message)) throw e;
        }
      });
      console.log('OK  ' + file);
    }
    async function click(selector) {
      await evaluate('document.querySelector(' + JSON.stringify(selector) + ').click()');
    }
    async function pointerClick(selector) {
      const point = await evaluate(`(() => {
        const element = document.querySelector(${JSON.stringify(selector)});
        if (!element) throw new Error("Missing clickable element");
        element.scrollIntoView({ block: "center" });
        const box = element.getBoundingClientRect();
        const x = box.x + box.width / 2;
        const y = box.y + box.height / 2;
        if (!box.width || !box.height || !element.contains(document.elementFromPoint(x, y))) {
          throw new Error("Element is hidden or covered: " + ${JSON.stringify(selector)});
        }
        return { x, y };
      })()`);
      await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', button: 'left', clickCount: 1, ...point });
      await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', button: 'left', clickCount: 1, ...point });
    }
    async function open(file) {
      await cdp.send('Page.navigate', {url: pathToFileURL(path.join(root, file)).href});
      await page(file);
    }
    await run({ evaluate, click, pointerClick, page, open, cdp, until });
    assert.deepEqual(errors, [], 'Uncaught script errors: ' + errors.join('\n'));
  } finally {
    if (cdp) {
      try { await cdp.send('Browser.close'); } catch { /* Chrome may close the connection first. */ }
      cdp.close();
    }
    if (chrome?.pid && chrome.exitCode === null && chrome.signalCode === null) {
      const exited = await Promise.race([stopped.then(() => true), delay(1500, false, {ref: false})]);
      if (!exited) {
        chrome.kill();
        await until('browser shutdown', () => chrome.exitCode !== null || chrome.signalCode !== null, 5000);
      }
    }
    const resolvedProfile = path.resolve(profile);
    assert.equal(path.dirname(resolvedProfile), path.resolve(os.tmpdir()));
    assert.ok(path.basename(resolvedProfile).startsWith('bit-game-smoke-'));
    await fs.promises.rm(resolvedProfile, {recursive: true, force: true, maxRetries: 10, retryDelay: 200});
  }
}

module.exports = { withBrowser };
