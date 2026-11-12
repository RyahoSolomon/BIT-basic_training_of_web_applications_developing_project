// Node 22+, Chrome or Edge. Set BROWSER_PATH to select a browser executable.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { pathToFileURL } = require('node:url');
const { setTimeout: delay } = require('node:timers/promises');

const root = path.resolve(__dirname, '..');
const username = 'smoke-player';
const password = 'smoke-only';

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

async function smoke() {
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
    async function submitCredentials(form, register = false) {
      const values = {username, password};
      if (register) values['confirm-password'] = password;
      for (const [id, value] of Object.entries(values)) {
        await evaluate('document.getElementById(' + JSON.stringify(id) + ').value = ' + JSON.stringify(value));
      }
      await click(form + ' button[type="submit"]');
    }
    await cdp.send('Page.navigate', {url: pathToFileURL(path.join(root, 'index.html')).href});
    await page('index.html');
    await click('a[href="main/register.html"]');
    await page('main/register.html');
    await submitCredentials('#registerForm', true);
    await page('main/login.html');
    await submitCredentials('#loginForm');
    await page('main/_INDEX.html');
    assert.equal(await evaluate('localStorage.username'), username);
    await click('a[href="story/chapter0/background.html"]');
    await page('main/story/chapter0/background.html');
    await click('.button-save');
    await page('main/story/map/map.html');
    const save = await evaluate('JSON.parse(localStorage.getItem(localStorage.username + "autosave"))');
    assert.equal(save.saveurl, 0);
    assert.equal(save.MSYgamename, '序章');
    for (let i = 1; i <= 6; i++) assert.equal(save['level' + i], '0');
    const current = JSON.parse(save.current);
    assert.equal(current.level, 0);
    assert.equal(current.user_level.level, 1);
    assert.deepEqual(current.perfect_level_complete, Array(6).fill(false));
    await click('#Level1');
    await page('main/story/chapter1/plot.html');
    await click('.button-save');
    // Keep controlling the game tab if the first-play tutorial opens in a new tab.
    await page('main/story/war_chess/war_chess.html');
    assert.equal(await evaluate('level'), 0);
    await click('#mission_confirm_mask');
    assert.ok(await evaluate('document.querySelector("#unit_0") && !!document.querySelector("#operation_button_0")'));
    await click('#skip_game_hover_initial_mask');
    await page('main/story/war_chess/result/level_1/win.html');
    assert.match(await evaluate('document.querySelector(".result_inform").textContent'), /胜利/);
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
    await fs.promises.rm(profile, {recursive: true, force: true, maxRetries: 10, retryDelay: 200});
  }
}

smoke().then(() => console.log('PASS  first battle victory via skip')).catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
