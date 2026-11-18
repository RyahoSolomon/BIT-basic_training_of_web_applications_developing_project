const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { setTimeout: delay } = require('node:timers/promises');
const { withBrowser } = require('./smoke-browser.cjs');
const { startGame } = require('./smoke-player-helpers.cjs');

const root = path.resolve(__dirname, '..');
const opening = 'game/story/chapter-0/background.html';
const chapter1 = 'game/story/chapter-1/plot.html';
const map = 'game/map/index.html';
const battle = 'game/battle/index.html';
const toBattle = { label: '跳过对白，进入战斗', destination: battle };
const toMap = { label: '跳过对白，返回地图', destination: map };
const skipEnding = { label: '跳过结局，返回地图', destination: map };
const expectedRoutes = {
  'chapter-0/background.html': { label: '跳过序章，进入地图', destination: map },
  'chapter-1/plot.html': toBattle, 'chapter-1/plot-after.html': toMap,
  'chapter-2/plot.html': toBattle, 'chapter-2/plot-after.html': { label: '跳至下一选项', destination: map },
  'chapter-3/plot.html': toBattle, 'chapter-3/plot-after.html': toMap,
  'chapter-4/plot1.html': toBattle, 'chapter-4/plot3.html': toMap,
  'chapter-5/plot1.html': toBattle, 'chapter-5/plota.html': { label: '跳过对白和结局尾声，返回地图', destination: map },
  'chapter-5/plotb.html': toMap, 'chapter-5/bad-ending.html': skipEnding,
  'chapter-6/plot1.html': toBattle, 'chapter-6/bad-ending.html': skipEnding,
};

async function storyPages(directory = path.join(root, 'game/story')) {
  const pages = [];
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) pages.push(...await storyPages(file));
    else if (entry.name.endsWith('.html') && /src\s*=\s*["'][^"']*story-player\.js["']/.test(await fs.readFile(file, 'utf8'))) {
      pages.push(path.relative(path.join(root, 'game/story'), file).replaceAll('\\', '/'));
    }
  }
  return pages.sort();
}

// Keep the real decoder and transition controller. Gate only completion of the
// second local image, so cancellation can be tested without network timing.
function installTransitionFixture(config) {
  const state = window.skipSmoke = { pending: false, skips: 0, commits: [], cancellations: 0 };
  const decode = HTMLImageElement.prototype.decode;
  HTMLImageElement.prototype.decode = function () {
    const result = decode.call(this);
    if (!config.gate || !this.src.endsWith('/002.png')) return result;
    return result.then(() => new Promise(resolve => {
      state.pending = true;
      state.release = () => { state.pending = false; resolve(); };
    }));
  };
  state.snapshot = () => ({
    skips: state.skips, commits: state.commits, cancellations: state.cancellations,
    busy: document.body.dataset.storyTransitioning === 'true',
    layers: document.querySelectorAll('.story-transition-layer').length,
    text: document.querySelector('#story-player .text')?.textContent,
    background: getComputedStyle(document.body).backgroundImage,
  });
  window.addEventListener('beforeunload', () => {
    sessionStorage.setItem('skip-opening-state', JSON.stringify(state.snapshot()));
  });
  document.addEventListener('DOMContentLoaded', () => {
    const prototype = window.StoryBackgroundTransition.prototype;
    const show = prototype.show;
    const cancel = prototype.cancel;
    prototype.show = function (source, options = {}) {
      return show.call(this, source, { ...options, onCommit: () => {
        state.commits.push(source);
        options.onCommit?.();
      } });
    };
    prototype.cancel = function () { state.cancellations++; return cancel.call(this); };
    const lines = [
      { speaker: '[测试]', text: '跳过之前的对白', background: '../../assets/images/background/001.png' },
      { speaker: '[测试]', text: '取消后不应提交的对白', background: '../../assets/images/background/002.png', transition: 'crossfade' },
    ];
    if (config.opening) {
      window.storyScene.nodes.history.lines = lines;
    } else {
      window.storyScene = {
        intro: { selector: '#absent-skip-fixture-intro' }, lines,
        skip: () => { state.skips++; state.atSkip = state.snapshot(); },
        next: () => { throw new Error('Skipping must not invoke the natural ending'); },
      };
      document.getElementById('text1')?.remove();
    }
  }, { once: true });
}

async function smoke({ evaluate, pointerClick: click, open, page, cdp, until }) {
  async function skipButton(label) {
    await until('loaded skip button', () => evaluate(`(() => {
      const image = document.querySelector('[data-story-skip] img');
      return image?.complete && image.naturalWidth > 0;
    })()`));
    const state = await evaluate(`(() => {
      const buttons = document.querySelectorAll('[data-story-skip]');
      const button = buttons[0];
      const box = button.getBoundingClientRect();
      const settings = document.querySelector('[data-settings-open]').getBoundingClientRect();
      return { count: buttons.length, tag: button.tagName, disabled: button.disabled,
        hint: button.querySelector('.story-skip-hint')?.textContent, accessibleName: button.getAttribute('aria-label'),
        source: button.querySelector('img').src, inHost: !!button.closest('[data-settings-host]'),
        belowSettings: box.top >= settings.bottom, width: box.width, height: box.height,
        clickable: button.contains(document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2)) };
    })()`);
    assert.equal(state.count, 1, 'A story page needs exactly one skip button');
    assert.equal(state.tag, 'BUTTON');
    assert.equal(state.disabled, false);
    if (label) {
      assert.equal(state.hint, label, 'Hover hint must describe where skipping leads');
      assert.equal(state.accessibleName, label, 'Accessible name must match the hover hint');
    }
    assert.match(state.source, /\/game\/assets\/images\/skip_dialogue\.png$/);
    assert.ok(state.inHost && state.belowSettings && state.width > 0 && state.height > 0 && state.clickable,
      'Skip must be clickable below the settings entry: ' + JSON.stringify(state));
  }

  async function checkHintVisibility() {
    async function hintVisible(visible) {
      await until('skip hint ' + (visible ? 'visible' : 'hidden'), () => evaluate(`
        document.querySelector('.story-skip-hint').checkVisibility({ opacityProperty: true, visibilityProperty: true }) === ${visible}
      `));
    }

    await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 1, y: 1 });
    await hintVisible(false);
    const point = await evaluate(`(() => {
      const box = document.querySelector('[data-story-skip]').getBoundingClientRect();
      return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
    })()`);
    await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', ...point });
    await hintVisible(true);
    await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 1, y: 1 });
    await hintVisible(false);

    await evaluate('document.querySelector("[data-settings-open]").focus()');
    for (const type of ['keyDown', 'keyUp']) {
      await cdp.send('Input.dispatchKeyEvent', { type, key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
    }
    assert.ok(await evaluate('document.activeElement.matches("[data-story-skip]")'));
    await hintVisible(true);
    await evaluate('document.activeElement.blur()');
    await hintVisible(false);
  }

  async function ready() {
    await until('visible settled story', () => evaluate(`
      document.body.dataset.storyTransitioning !== 'true'
      && !!document.querySelector('.image-container')
      && getComputedStyle(document.querySelector('.image-container')).visibility === 'visible'
    `));
  }

  await open('game/pages/menu.html');
  await startGame({ evaluate, click, page, cdp, until });
  await skipButton();
  await click('[data-story-skip]');
  await page(map);
  await evaluate('localStorage.IsFirstPlay = "false"');
  const fixture = await evaluate('Object.fromEntries(Object.entries(localStorage))');

  async function reset(chapter = 1, poison = false, god = false) {
    await evaluate(`(() => {
      localStorage.clear();
      for (const [key, value] of Object.entries(${JSON.stringify(fixture)})) localStorage.setItem(key, value);
      const current = JSON.parse(localStorage.current);
      current.level = ${Math.max(0, chapter - 1)};
      current.hidden_clue_poison = ${poison};
      current.hidden_clue_god = ${god};
      localStorage.current = JSON.stringify(current);
    })()`);
  }

  const pages = await storyPages();
  assert.deepEqual(pages, Object.keys(expectedRoutes).sort(), 'Update the expected routes when shared-player pages change');
  for (const file of pages) {
    const chapter = Number(/chapter-(\d+)/.exec(file)[1]);
    const { label, destination } = expectedRoutes[file];
    await reset(chapter);
    await open('game/story/' + file);
    await skipButton(label);
    await click('[data-story-skip]');
    if (file === 'chapter-2/plot-after.html') {
      await until('second chapter decision', () => evaluate(`!!document.querySelector('[data-story-choice="spare"]')`));
      assert.equal(await evaluate(`!!document.querySelector('[data-story-choice="kill"]')`), true);
      assert.equal(await evaluate(`!!document.querySelector('[data-story-skip]')`), false);
      assert.match(await evaluate('document.querySelector("#story-player .text").textContent'), /你怎么看\?$/);
      assert.equal(await evaluate('Number(localStorage.testflag)'), 0);
      assert.equal(await evaluate('Number(JSON.parse(localStorage.testachievement).ach2)'), 0);
      await click('[data-story-choice="spare"]');
      await until('spare achievement', () => evaluate(`!!document.querySelector('[data-story-achievement-close]')`));
      await click('[data-story-achievement-close]');
      await skipButton(toMap.label);
      await click('[data-story-skip]');
    }
    await page(destination);
    if (destination === battle) assert.equal(await evaluate('level'), chapter - 1,
      file + ': skipping entered the wrong battle');
  }
  console.log('PASS  chapter skip hints match their destinations, and chapter 2 pauses for an explicit decision');

  for (const poison of [false, true]) {
    await reset(4, poison);
    await open('game/story/chapter-4/plot3.html');
    assert.equal(await evaluate('storyScene.lines.length'), poison ? 3 : 8);
    await skipButton();
    await click('[data-story-skip]');
    await page(map);
    assert.equal(await evaluate('JSON.parse(localStorage.current).hidden_clue_poison'), poison);
  }
  for (const file of ['plota', 'plotb']) {
    await reset(5, file === 'plotb', file === 'plotb');
    await open('game/story/chapter-5/' + file + '.html');
    await skipButton();
    await click('[data-story-skip]');
    await page(map);
  }
  console.log('PASS  chapter 4 clue variants return to the map and chapter 5 skips retain their map destinations');

  for (const file of [opening, chapter1]) {
    await reset();
    await open(file);
    await ready();
    await skipButton();
    await checkHintVisibility();
    const text = await evaluate('document.querySelector("#story-player .text").textContent');
    await click('[data-settings-open]');
    const blocked = await evaluate(`(() => {
      const skip = document.querySelector('[data-story-skip]');
      const box = skip.getBoundingClientRect();
      const x = box.x + box.width / 2, y = box.y + box.height / 2;
      return { x, y, blocked: !skip.contains(document.elementFromPoint(x, y)) };
    })()`);
    assert.equal(blocked.blocked, true, 'The modal did not block the skip button');
    for (const type of ['mousePressed', 'mouseReleased']) {
      await cdp.send('Input.dispatchMouseEvent', { type, button: 'left', clickCount: 1, x: blocked.x, y: blocked.y });
    }
    await page(file);
    assert.equal(await evaluate('document.getElementById("game-settings").open'), true);
    assert.equal(await evaluate('document.querySelector("#story-player .text").textContent'), text);
    await click('[data-settings-close]');
    await until('modal no longer covers skip', () => evaluate(`(() => {
      const skip = document.querySelector('[data-story-skip]'), box = skip.getBoundingClientRect();
      return !document.getElementById('game-settings').open
        && skip.contains(document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2));
    })()`));
    await click('[data-story-skip]');
    await page(file === opening ? map : battle);
  }
  console.log('PASS  settings blocks skip clicks without advancing either narration player');

  for (const isOpening of [false, true]) {
    for (const gate of [true, false]) {
      await reset();
      const { identifier } = await cdp.send('Page.addScriptToEvaluateOnNewDocument', {
        source: '(' + installTransitionFixture.toString() + ')(' + JSON.stringify({ opening: isOpening, gate }) + ');',
      });
      try { await open(isOpening ? opening : chapter1); }
      finally { await cdp.send('Page.removeScriptToEvaluateOnNewDocument', { identifier }); }
      await ready();
      await skipButton();
      await evaluate('skipSmoke.commits = []; skipSmoke.cancellations = 0;');
      await click('.image-container');
      if (gate) {
        await until('next image decode held', () => evaluate('skipSmoke.pending && document.body.dataset.storyTransitioning === "true"'));
      } else {
        await until('crossfade started', () => evaluate(`(() => {
          const layer = document.querySelector('.story-transition-layer[data-transition="crossfade"]');
          if (!layer) return false;
          layer.getAnimations().forEach(animation => animation.pause());
          return true;
        })()`));
      }
      assert.equal(await evaluate('document.querySelector("#story-player .text").textContent'), '跳过之前的对白');
      if (isOpening) {
        await click('[data-story-skip]');
        await page(map);
        const state = await evaluate('JSON.parse(sessionStorage.getItem("skip-opening-state"))');
        assert.ok(state.cancellations >= 1, 'Opening skip did not cancel before navigation');
        assert.deepEqual(state.commits, []);
        assert.equal(state.busy, false);
        assert.equal(state.layers, 0);
        assert.equal(state.text, '跳过之前的对白');
      } else {
        await click('[data-story-skip]');
        await evaluate(`for (let i = 0; i < 4; i++) document.querySelector('[data-story-skip]').click();
          if (skipSmoke.release) skipSmoke.release();`);
        await delay(750);
        const state = await evaluate('({ ...skipSmoke.snapshot(), atSkip: skipSmoke.atSkip })');
        assert.equal(state.skips, 1, 'Repeated skip clicks invoked the function destination more than once');
        assert.deepEqual(state.commits, [], 'An interrupted transition committed after skipping');
        assert.equal(state.busy, false);
        assert.equal(state.layers, 0);
        assert.equal(state.text, '跳过之前的对白');
        assert.match(state.background, /\/001\.png/);
        assert.equal(state.atSkip.busy, false, 'The function destination ran before cancellation');
        assert.equal(state.atSkip.layers, 0);
      }
    }
  }
  console.log('PASS  decoding and active fades cancel before skip; function destinations run once and never commit stale dialogue');
}

withBrowser(smoke).then(() => console.log('PASS  story skip controls')).catch(error => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
