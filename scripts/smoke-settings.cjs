const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { setTimeout: delay } = require('node:timers/promises');
const { withBrowser } = require('./smoke-browser.cjs');
const { startGame } = require('./smoke-player-helpers.cjs');

const menu = 'game/pages/menu.html';
const map = 'game/map/index.html';
const story = 'game/story/chapter-1/plot.html';
const battle = 'game/battle/index.html';

async function smoke({ evaluate, pointerClick: click, page, open, cdp, until }) {
  const downloads = await fs.mkdtemp(path.join(os.tmpdir(), 'bit-settings-smoke-'));

  async function panel() {
    assert.equal(await evaluate('document.querySelectorAll("[data-settings-open]").length'), 1);
    assert.equal(await evaluate('document.querySelectorAll(".button-save, .button-return, .button-music").length'), 0,
      'Old independent controls must be replaced by settings');
    await click('[data-settings-open]');
    await until('settings dialog', () => evaluate('document.getElementById("game-settings").open'));
  }

  async function close() {
    await click('[data-settings-close]');
    assert.equal(await evaluate('document.getElementById("game-settings").open'), false);
    await cdp.send('Runtime.evaluate', {
      expression: 'new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))',
      awaitPromise: true,
    });
  }

  async function volume(channel, value) {
    await evaluate(`(() => {
      const input = document.querySelector('[data-channel="${channel}"] input[type="range"]');
      input.value = ${value};
      input.dispatchEvent(new Event('input', { bubbles: true }));
    })()`);
    assert.equal(await evaluate(`GamePreferences.effectiveVolume('${channel}')`), value);
    assert.match(await evaluate(`document.querySelector('[data-channel="${channel}"] output').textContent`),
      new RegExp(String(value)), 'The displayed volume did not follow the slider');
  }

  async function toggle(channel) {
    await click('[data-channel="' + channel + '"] [data-volume-toggle]');
  }

  function withoutTimestamp(save) {
    const { savedAt, ...content } = save;
    assert.ok(Number.isFinite(Date.parse(savedAt)), 'Save lacks a valid timestamp');
    return content;
  }

  try {
    // Exercise the real browser download fallback without opening a native picker.
    await cdp.send('Page.addScriptToEvaluateOnNewDocument', {
      source: 'window.showSaveFilePicker = undefined;',
    });
    await open(menu);
    assert.deepEqual(await evaluate('GamePreferences.get()'), {
      music: { volume: 50, muted: false }, sound: { volume: 50, muted: false },
    });
    await panel();
    await evaluate('window.settingsEvents = 0; window.addEventListener("game-settings-change", () => settingsEvents++);');
    await toggle('music');
    assert.deepEqual(await evaluate('GamePreferences.get().music'), { volume: 50, muted: true });
    assert.equal(await evaluate('document.getElementById("audioPlayer").volume'), 0);
    await toggle('music');
    assert.equal(await evaluate('GamePreferences.effectiveVolume("music")'), 50);
    await volume('music', 80);
    await toggle('music');
    await volume('music', 35);
    assert.deepEqual(await evaluate('GamePreferences.get().music'), { volume: 35, muted: false });
    await volume('music', 0);
    assert.deepEqual(await evaluate('GamePreferences.get().music'), { volume: 35, muted: true });
    await toggle('music');
    assert.equal(await evaluate('GamePreferences.effectiveVolume("music")'), 35);
    await volume('sound', 65);
    assert.ok(await evaluate('settingsEvents >= 8'), 'Preference changes did not notify the current page');
    await close();
    console.log('PASS  default volumes, mute restoration, zero-volume memory and live slider controls');

    await startGame({ evaluate, click, page, cdp, until });
    assert.equal(await evaluate('localStorage.username'), 'test');
    assert.ok(await evaluate('!!localStorage.getItem("game.save")'));
    await evaluate('localStorage.setItem("IsFirstPlay", "false")');
    for (const file of [map, story, battle]) {
      await open(file);
      if (file === battle) await click('#mission_confirm_mask');
      if (file === story) await until('story ready', () => evaluate(`
        getComputedStyle(document.querySelector('#story-player .image-container')).visibility === 'visible'
        && document.body.dataset.storyTransitioning !== 'true'
      `));
      const before = await evaluate('document.querySelector("#story-player .text")?.textContent || null');
      await panel();
      assert.deepEqual(await evaluate('GamePreferences.get()'), {
        music: { volume: 35, muted: false }, sound: { volume: 65, muted: false },
      });
      assert.equal(await evaluate('document.getElementById("audioPlayer").volume'), 0.35);
      await toggle('music');
      assert.equal(await evaluate('document.getElementById("audioPlayer").volume'), 0);
      await toggle('music');
      assert.equal(await evaluate('document.getElementById("audioPlayer").volume'), 0.35);
      await close();
      assert.equal(await evaluate('document.querySelector("#story-player .text")?.textContent || null'), before,
        'Using settings advanced the story');
    }
    console.log('PASS  map/story/battle share volumes and settings never advance narration');

    await open(map);
    await evaluate(`(() => {
      const current = JSON.parse(localStorage.current);
      current.level = 2;
      current.user_level = { level: 4, exp: 17 };
      current.hidden_clue_god = true;
      current.hidden_clue_poison = true;
      current.perfect_level_complete[0] = true;
      localStorage.current = JSON.stringify(current);
      localStorage.level1 = '1';
      localStorage.level2 = '1';
      localStorage.testachievement = JSON.stringify({ach1: false, ach2: true, ach3: false, ach4: false,
        ach5: false, ach6: false, ach7: false, ach8: true});
      localStorage.testflag = '1';
    })()`);
    const expected = await evaluate('JSON.parse(GameProgress.exportSave())');
    await cdp.send('Page.setDownloadBehavior', { behavior: 'allow', downloadPath: downloads });
    await panel();
    await evaluate(`
      window.nativeSave = { calls: [] };
      window.showSaveFilePicker = async options => {
        nativeSave.options = options;
        nativeSave.calls.push('picker');
        return { createWritable: async () => {
          nativeSave.calls.push('createWritable');
          return {
            write: async text => { nativeSave.text = text; nativeSave.calls.push('write'); },
            close: async () => { nativeSave.calls.push('close'); },
          };
        } };
      };
    `);
    await click('[data-save-download]');
    await until('native save writer closed', () => evaluate('nativeSave.calls.includes("close")'));
    const nativeSave = await evaluate('nativeSave');
    assert.equal(nativeSave.options.suggestedName, 'save_test.json');
    assert.deepEqual(nativeSave.options.types[0].accept, { 'application/json': ['.json'] });
    assert.deepEqual(nativeSave.calls, ['picker', 'createWritable', 'write', 'close']);
    assert.deepEqual(withoutTimestamp(JSON.parse(nativeSave.text)), withoutTimestamp(expected));
    assert.equal(await evaluate('document.querySelector(".settings-status").textContent'), '存档已导出。');
    await close();
    await panel();
    await evaluate(`
      window.saveCancelled = false;
      window.showSaveFilePicker = async () => {
        saveCancelled = true;
        throw new DOMException('User cancelled the picker', 'AbortError');
      };
    `);
    await click('[data-save-download]');
    await until('native picker cancelled', () => evaluate('saveCancelled'));
    assert.equal(await evaluate('document.querySelector(".settings-status").textContent'), '',
      'Cancelling the native picker was reported as an export failure');
    await evaluate('window.showSaveFilePicker = undefined');
    await click('[data-save-download]');
    const filename = await until('downloaded JSON save', async () => {
      const files = await fs.readdir(downloads);
      return files.find(file => file.endsWith('.json'));
    });
    const exported = JSON.parse(await fs.readFile(path.join(downloads, filename), 'utf8'));
    assert.deepEqual(withoutTimestamp(exported), withoutTimestamp(expected));
    assert.deepEqual(exported.settings, {
      music: { volume: 35, muted: false }, sound: { volume: 65, muted: false },
    });
    await click('[data-menu-leave]');
    await page(menu);
    assert.deepEqual(withoutTimestamp(await evaluate('JSON.parse(localStorage.getItem("game.save"))')),
      withoutTimestamp(expected), 'Returning to menu lost current progress');

    await evaluate(`
      GameProgress.newGame('test');
      localStorage.testachievement = JSON.stringify({ach1:false,ach2:false,ach3:false,ach4:false,
        ach5:false,ach6:false,ach7:false,ach8:false});
      GamePreferences.setVolume('music', 12);
      GamePreferences.setVolume('sound', 20);
    `);
    await panel();
    assert.ok(await evaluate('!!document.querySelector("[data-save-upload]")'));
    const { root } = await cdp.send('DOM.getDocument');
    const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: root.nodeId, selector: 'input[type="file"][data-save-file]' });
    assert.ok(nodeId, 'Missing save upload file input');
    await cdp.send('DOM.setFileInputFiles', { nodeId, files: [path.join(downloads, filename)] });
    await page(map);
    await until('uploaded save applied', () => evaluate(`
      localStorage.testflag === '1'
      && JSON.parse(localStorage.current).user_level.level === 4
      && GamePreferences.effectiveVolume('music') === 35
    `));
    const restored = await evaluate('JSON.parse(GameProgress.exportSave())');
    assert.deepEqual(withoutTimestamp(restored), withoutTimestamp(expected),
      'Uploaded save did not restore progress, achievements, branch flags and audio preferences');
    console.log('PASS  native save writer/cancellation and actual JSON download/upload restore complete save; menu return saves progress');

    for (const ending of ['cast', 'true-ending-first']) {
      await open('game/story/chapter-6/' + ending + '.html');
      assert.equal(await evaluate('document.querySelector("video[data-music-volume]").volume'), 0.35);
      assert.equal(await evaluate('document.querySelector("video[data-music-volume]").muted'), false);
      if (ending === 'true-ending-first') {
        await evaluate('Shutoff()');
        await delay(5200);
        assert.equal(await evaluate('document.getElementById("audioPlayer").dataset.musicSuspended'), 'true',
          'Starting the credits did not suspend the ending background music');
        assert.equal(await evaluate('document.getElementById("audioPlayer").paused'), true);
        assert.equal(await evaluate('getComputedStyle(document.querySelector(".video-container")).display'), 'block');
      }
      await panel();
      await toggle('music');
      assert.equal(await evaluate('document.querySelector("video[data-music-volume]").volume'), 0);
      assert.equal(await evaluate('document.querySelector("video[data-music-volume]").muted'), true);
      await toggle('music');
      assert.equal(await evaluate('document.querySelector("video[data-music-volume]").volume'), 0.35);
      assert.equal(await evaluate('document.querySelector("video[data-music-volume]").muted'), false);
      await volume('music', 73);
      assert.equal(await evaluate('document.querySelector("video[data-music-volume]").volume'), 0.73);
      if (ending === 'true-ending-first') {
        assert.equal(await evaluate('document.getElementById("audioPlayer").paused'), true,
          'Changing credits volume restarted the ending background music');
        assert.equal(await evaluate('document.getElementById("audioPlayer").dataset.musicSuspended'), 'true');
      }
      await volume('music', 35);
      await close();
    }
    console.log('PASS  both credits videos share music volume/mute; settings remain accessible and old BGM stays suspended');
  } finally {
    const resolved = path.resolve(downloads);
    assert.equal(path.dirname(resolved), path.resolve(os.tmpdir()));
    assert.ok(path.basename(resolved).startsWith('bit-settings-smoke-'));
    await fs.rm(resolved, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  }
}

withBrowser(smoke).then(() => console.log('PASS  shared game settings')).catch(error => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
