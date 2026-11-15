// Exercise relocated pages and resources in an isolated browser profile.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { fileURLToPath } = require('node:url');
const { withBrowser } = require('./smoke-browser.cjs');

const root = path.resolve(__dirname, '..');
const mapPage = 'game/map/index.html';
const battlePage = 'game/battle/index.html';

function htmlPages(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(directory, entry.name);
    return entry.isDirectory() ? htmlPages(full)
      : entry.name.endsWith('.html') ? [path.relative(root, full).split(path.sep).join('/')] : [];
  });
}

async function smoke({ evaluate, click, page, open, cdp, until }) {
  // Capture browser resource errors before a page's first script or stylesheet loads.
  await cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: `
    window.__localResourceErrors = [];
    window.addEventListener('error', event => {
      const element = event.target;
      const url = element?.currentSrc || element?.src || element?.href;
      if (typeof url === 'string' && url.startsWith('file:')) {
        window.__localResourceErrors.push(url);
      }
    }, true);
  ` });

  async function resources(label) {
    if (await evaluate('!!document.getElementById("story-player")')) {
      await until('story image in ' + label,
        () => evaluate('!!document.querySelector("#story-player img")'));
    }
    await until('images in ' + label, () => evaluate(`
      Array.from(document.images).every(image => image.complete)
    `));
    await evaluate('window.__fontsReady = false; document.fonts.ready.then(() => { window.__fontsReady = true; });');
    await until('fonts in ' + label, () => evaluate('window.__fontsReady'));
    const assets = await evaluate(`(() => {
      const urls = new Set();
      function add(value) {
        if (!value) return;
        try {
          const url = new URL(value, document.baseURI);
          if (url.protocol === 'file:') urls.add(url.href);
        } catch {}
      }
      for (const element of document.querySelectorAll('script[src], link[rel="stylesheet"], img, audio, video, source')) {
        add(element.currentSrc || element.src || element.href);
      }
      for (const resource of performance.getEntriesByType('resource')) add(resource.name);
      for (const element of document.querySelectorAll('*')) {
        for (const pseudo of [null, '::before', '::after']) {
          const background = getComputedStyle(element, pseudo).backgroundImage;
          for (const match of background.matchAll(/url\\(["']?([^"')]+)["']?\\)/g)) add(match[1]);
        }
      }
      return {
        urls: Array.from(urls),
        errors: window.__localResourceErrors,
        brokenImages: Array.from(document.images)
          .filter(image => image.src.startsWith('file:') && !image.naturalWidth)
          .map(image => image.src),
        brokenFonts: Array.from(document.fonts)
          .filter(font => font.status === 'error').map(font => font.family),
      };
    })()`);
    assert.deepEqual(assets.errors, [], label + ': failed local resources');
    assert.deepEqual(assets.brokenImages, [], label + ': broken images');
    assert.deepEqual(assets.brokenFonts, [], label + ': failed fonts');
    for (const url of assets.urls) {
      assert.ok(fs.existsSync(fileURLToPath(url)), label + ': missing ' + url);
    }
  }

  // Obtain the fixture through the game's real registration and new-game actions.
  const username = 'navigation-smoke-player';
  await open('game/pages/register.html');
  await evaluate(`
    document.getElementById('username').value = ${JSON.stringify(username)};
    document.getElementById('password').value = 'navigation-smoke';
    document.getElementById('confirm-password').value = 'navigation-smoke';
  `);
  await click('#registerForm button[type="submit"]');
  await page('game/pages/login.html');
  await evaluate(`
    document.getElementById('username').value = ${JSON.stringify(username)};
    document.getElementById('password').value = 'navigation-smoke';
  `);
  await click('#loginForm button[type="submit"]');
  await page('game/pages/menu.html');
  await click('a[href="../story/chapter-0/background.html"]');
  await page('game/story/chapter-0/background.html');
  await click('.button-save');
  await page(mapPage);
  await evaluate('localStorage.setItem("IsFirstPlay", "false")');
  const fixture = await evaluate('Object.fromEntries(Object.entries(localStorage))');

  async function reset() {
    await evaluate(`
      localStorage.clear();
      for (const [key, value] of Object.entries(${JSON.stringify(fixture)})) localStorage.setItem(key, value);
    `);
  }

  const pages = ['index.html', ...htmlPages(path.join(root, 'game')).sort()];
  for (const file of pages) {
    await reset();
    await open(file);
    await resources(file);
  }
  console.log('PASS  ' + pages.length + ' runtime pages, local resources and initial story images');

  await reset();
  await open('game/pages/save.html');
  await click('#save1');
  const saved = await evaluate('JSON.parse(localStorage.getItem(localStorage.username + "savearea"))[0]');
  assert.equal(saved.version, 1);
  assert.equal(saved.progress.chapterName, fixture.MSYgamename);
  assert.deepEqual(saved.progress.current, JSON.parse(fixture.current));
  await evaluate("localStorage.level1 = '999'");
  await open('game/pages/load.html');
  await click('#save1');
  await page(mapPage);
  assert.equal(await evaluate('localStorage.level1'), fixture.level1);
  console.log('PASS  manual save/load with the shared progress format');

  await reset();
  await open('game/minesweeper/index.html');
  await click('button[onclick="start()"]');
  assert.equal(await evaluate('document.querySelectorAll("#ground .blocks").length'), 225);
  // Use the built-in first-cell mine outcome to exercise dynamically inserted images.
  await evaluate(`(() => {
    const random = Math.random;
    try {
      Math.random = () => 0;
      document.querySelector('#ground .blocks').dispatchEvent(new MouseEvent('mousedown', {button: 0}));
    } finally { Math.random = random; }
  })()`);
  await until('revealed mine', () => evaluate('!!document.querySelector("#ground img")'));
  await resources('minesweeper revealed mine');
  await click('#introduction');
  await page(mapPage);
  console.log('PASS  minesweeper startup, dynamic mine image and map return');

  const winTargets = [
    'game/story/chapter-1/plot-after.html',
    'game/story/chapter-2/plot-after.html',
    'game/story/chapter-3/plot-after.html',
    'game/story/chapter-4/plot3.html',
    'game/story/chapter-5/plota.html',
    'game/story/chapter-6/true-ending-first.html',
  ];
  const loseTargets = [mapPage, mapPage, mapPage, mapPage,
    'game/story/chapter-5/bad-ending.html', 'game/story/chapter-6/bad-ending.html'];
  for (let level = 0; level < 6; level++) {
    for (const outcome of ['win', 'lose']) {
      await reset();
      await evaluate(`(() => {
        const current = JSON.parse(localStorage.current);
        current.level = ${level};
        localStorage.current = JSON.stringify(current);
      })()`);
      await open(battlePage);
      await click('#mission_confirm_mask');
      await resources('battle ' + (level + 1));
      if (outcome === 'win') await click('#skip_game_hover_initial_mask');
      else await evaluate('lose()');
      const result = 'game/battle/results/level-' + (level === 5 ? 'extra' : level + 1) + '/' + outcome + '.html';
      await page(result);
      await resources(result);
      await click('#confirm');
      const destination = (outcome === 'win' ? winTargets : loseTargets)[level];
      await page(destination);
      await resources(destination);
    }
  }
  console.log('PASS  six battle maps, victory/defeat routes and result-page continuation');

  await reset();
  await evaluate(`(() => {
    const current = JSON.parse(localStorage.current);
    current.hidden_clue_god = true;
    current.hidden_clue_poison = true;
    localStorage.current = JSON.stringify(current);
  })()`);
  await open('game/battle/results/level-5/win.html');
  await click('#confirm');
  await page('game/story/chapter-5/plotb.html');
  await resources('hidden-clue branch');

  await reset();
  await open('game/battle/results/level-extra/win.html');
  await click('#confirm');
  await page('game/story/chapter-6/true-ending-first.html');
  assert.equal(await evaluate('JSON.parse(localStorage.getItem(localStorage.username + "achievement")).ach6'), 1);
  await open('game/battle/results/level-extra/win.html');
  await click('#confirm');
  await page('game/story/chapter-6/true-ending.html');
  await resources('replayed true ending');
  console.log('PASS  hidden-clue branch and first/replayed true endings');
}

withBrowser(smoke).then(() => console.log('PASS  relocated game navigation')).catch(error => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
