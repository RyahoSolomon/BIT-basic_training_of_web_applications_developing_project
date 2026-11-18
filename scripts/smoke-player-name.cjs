const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { withBrowser } = require('./smoke-browser.cjs');
const { dialogueLines, readScene } = require('./smoke-story-helpers.cjs');
const { replaceName, startGame } = require('./smoke-player-helpers.cjs');

const menu = 'game/pages/menu.html';
const opening = 'game/story/chapter-0/background.html';
const map = 'game/map/index.html';
const playerName = '青_羽-7 A';
const markupName = '<img src=x onerror=window.__nameExecuted=1>';

async function smoke(browser) {
  const { evaluate, pointerClick: click, open, page, cdp, until } = browser;
  const downloads = await fs.mkdtemp(path.join(os.tmpdir(), 'bit-player-name-'));
  async function storage() { return evaluate('Object.fromEntries(Object.entries(localStorage))'); }
  async function enter() {
    await cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
    await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
  }
  async function nameDialog() {
    await click('a[href="../story/chapter-0/background.html"]');
    await until('name dialog open', () => evaluate('document.getElementById("player-name-dialog").open'));
  }
  async function unchanged(before) {
    await page(menu);
    assert.deepEqual(await storage(), before, 'Invalid or cancelled input changed the existing game');
  }
  async function checkCount(count) {
    const text = await evaluate('document.getElementById("player-name-count").textContent');
    assert.equal(Number(text.match(/\d+/)?.[0]), count, 'Incorrect weighted name count: ' + text);
  }
  async function readNamedScene() {
    await open('game/story/chapter-2/plot-after.html');
    const lines = await dialogueLines({ evaluate, until });
    const last = lines.findIndex(line => line.text.includes('{player}'));
    assert.ok(last >= 0, 'The real dialogue fixture must address the player by name');
    let namedSpeaker = false;
    for (let index = 0; index <= last; index++) {
      const line = lines[index];
      await until('named dialogue ' + index, () => evaluate(`
        document.body.dataset.storyTransitioning !== 'true'
        && getComputedStyle(document.querySelector('#story-player .image-container')).visibility === 'visible'
        && document.querySelector('#story-player .text').textContent === ${JSON.stringify(line.text.replaceAll('{player}', playerName))}
      `));
      assert.equal(await evaluate('document.querySelector("#story-player .topLeftText").textContent'),
        line.speaker.replaceAll('{player}', playerName));
      if (line.speaker.includes('{player}')) namedSpeaker = true;
      if (index !== last) await click('#story-player .image-container');
    }
    assert.equal(namedSpeaker, true, 'The dialogue test must include the player speaking');
  }

  try {
    await open(menu);
    assert.equal(await evaluate('localStorage.getItem("playerName")'), null,
      'Loading the menu must not choose a name');
    assert.equal(await evaluate('GameProfile.getName()'), '', 'A fresh game must not supply a default character name');
    const emptyGame = await storage();
    await nameDialog();
    assert.equal(await evaluate('document.getElementById("player-name").value'), '',
      'New-game name entry must start empty');
    await replaceName(browser, '未确认');
    await click('[data-name-close]');
    await unchanged(emptyGame);

    // Seed a real save before testing rejection: no rejected input may reset it.
    await startGame(browser, '原存档');
    await evaluate(`const saved = JSON.parse(localStorage.current); saved.user_level.exp = 17;
      localStorage.current = JSON.stringify(saved); GameProgress.saveAuto();`);
    await open(menu);
    const existingGame = await storage();
    await nameDialog();
    for (const [name, count] of [
      ['', 0], ['   ', 3], ['123456789012345', 15], ['一二三四五六七八', 16],
      [' 一二三四五六七', 15], ['旅人!', 5], ['A/B', 3], ['A\\B', 3], ['é', 1], ['🙂', 1],
      ['<svg/onload=1>', 14], [markupName, markupName.length],
    ]) {
      await replaceName(browser, name);
      assert.equal(await evaluate('document.getElementById("player-name").value'), name,
        'Input must retain invalid characters so the player can correct them');
      await checkCount(count);
      // Enter must reject invalid input even when the confirm button is disabled.
      await enter();
      assert.equal(await evaluate('document.getElementById("player-name-dialog").open'), true);
      assert.ok(await evaluate('document.getElementById("player-name-error").textContent.trim()'));
      await unchanged(existingGame);
    }
    await replaceName(browser, '取消之前');
    await cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
    await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
    assert.equal(await evaluate('document.getElementById("player-name-dialog").open'), false);
    await unchanged(existingGame);
    assert.equal(await evaluate('document.querySelectorAll("#player-name-dialog svg").length'), 0,
      'The name was interpreted as markup');
    assert.equal(await evaluate('document.querySelectorAll("img[src=x]").length'), 0);
    assert.equal(await evaluate('window.__nameExecuted === undefined'), true);
    console.log('PASS  blank, forbidden and oversized names remain editable and never replace a save; cancel preserves progress');

    for (const name of ['Abcde_123-XYZ9', '一二三四五六七', '𠮷〇ABCDE12345']) {
      await startGame(browser, name);
      assert.equal(await evaluate('GameProfile.countName(localStorage.playerName)'), 14);
      assert.equal(await evaluate('localStorage.playerName'), name);
      assert.equal(await evaluate('JSON.parse(localStorage.getItem("game.save")).playerName'), name);
      await open(menu);
    }
    console.log('PASS  fourteen ASCII units, seven Chinese characters and supplementary ideographs are accepted');

    const beforeComposition = await storage();
    await nameDialog();
    await replaceName(browser, '');
    await evaluate(`window.nameCompositionEvents = []; window.nameComposing = false;
      for (const type of ['compositionstart', 'compositionend']) {
        document.getElementById('player-name').addEventListener(type, () => {
          nameCompositionEvents.push(type); nameComposing = type === 'compositionstart';
        });
      }`);
    const rawName = ' ' + playerName + ' ';
    await cdp.send('Input.imeSetComposition', { text: rawName, selectionStart: rawName.length, selectionEnd: rawName.length });
    assert.equal(await evaluate('nameComposing'), true, 'The test did not enter native IME composition');
    await enter();
    assert.equal(await evaluate('document.getElementById("player-name-dialog").open'), true,
      'Enter confirmed the game while the Chinese IME was composing');
    await unchanged(beforeComposition);
    if (await evaluate('nameComposing')) await cdp.send('Input.insertText', { text: rawName });
    await until('IME committed', () => evaluate('!nameComposing'));
    assert.equal(await evaluate('document.getElementById("player-name").value'), rawName);
    await checkCount(11);
    await enter();
    await page(opening);
    assert.equal(await evaluate('localStorage.username'), 'test', 'Display name must not replace the stable storage ID');
    assert.equal(await evaluate('localStorage.playerName'), playerName);
    assert.equal(await evaluate('GameProfile.getName()'), playerName);
    assert.equal(await evaluate('JSON.parse(localStorage.getItem("game.save")).playerName'), playerName);
    console.log('PASS  native Chinese IME Enter waits for composition; a later Enter saves the trimmed chosen name');

    await readNamedScene();
    await evaluate('localStorage.IsFirstPlay = "false"');
    await open('game/battle/index.html');
    assert.ok((await evaluate('document.getElementById("mission_icons").textContent')).includes(playerName));
    await click('#mission_confirm_mask');
    const hero = await evaluate(`(() => {
      const hero = units.find(unit => unit.name === 'user');
      return { name: hero.name_cn, title: document.getElementById('hover_initial_mask_' + hero.x + '_' + hero.y).title };
    })()`);
    assert.equal(hero.name, playerName);
    assert.ok(hero.title.includes(playerName));
    await evaluate('units.find(unit => unit.name === "user").get_hurt(999)');
    assert.ok((await evaluate('document.getElementById("announcement").textContent')).includes(playerName + '在战场上陨落了'));
    console.log('PASS  chosen name appears in real dialogue, battle mission, unit tooltip and death announcement');

    await open(map);
    await cdp.send('Page.setDownloadBehavior', { behavior: 'allow', downloadPath: downloads });
    await click('[data-settings-open]');
    await click('[data-save-download]');
    const filename = 'save_' + playerName + '.json';
    await until('named save downloaded', async () => (await fs.readdir(downloads)).includes(filename));
    const exported = JSON.parse(await fs.readFile(path.join(downloads, filename), 'utf8'));
    assert.equal(exported.playerName, playerName);
    await click('[data-menu-leave]');
    await page(menu);
    await evaluate('localStorage.playerName = "temporary"');
    await click('a[onclick="return load()"]');
    await page(map);
    assert.equal(await evaluate('GameProfile.getName()'), playerName, 'Continue did not restore the saved display name');

    await open(menu);
    await evaluate('GameProgress.newGame("other")');
    await click('[data-settings-open]');
    const { root: dom } = await cdp.send('DOM.getDocument');
    const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: dom.nodeId, selector: '[data-save-file]' });
    await cdp.send('DOM.setFileInputFiles', { nodeId, files: [path.join(downloads, filename)] });
    await page(map);
    assert.equal(await evaluate('GameProfile.getName()'), playerName, 'Import did not restore the exported name');
    const beforeInvalidImport = await storage();
    const invalidImport = await evaluate(`(() => {
      const save = JSON.parse(localStorage.getItem('game.save'));
      save.playerName = '<svg/onload=1>';
      try { GameProgress.importSave(JSON.stringify(save)); return 'accepted'; }
      catch (error) { return error.code; }
    })()`);
    assert.equal(invalidImport, 'INVALID_SAVE');
    assert.deepEqual(await storage(), beforeInvalidImport, 'Rejected imported names changed saved or runtime progress');
    console.log('PASS  named JSON download, continue and file import retain the name; hostile imported names are rejected');

    await evaluate('localStorage.playerName = ' + JSON.stringify(markupName));
    await open(opening);
    await readScene(browser, 'history');
    await dialogueLines(browser, 'main');
    await until('safe fallback speaker', () => evaluate(`
      document.body.dataset.storyTransitioning !== 'true'
      && getComputedStyle(document.querySelector('#story-player .image-container')).visibility === 'visible'
      && document.querySelector('#story-player .topLeftText').textContent === ''
    `));
    assert.equal(await evaluate('GameProfile.getName()'), '');
    assert.equal(await evaluate('document.querySelectorAll("img[src=x]").length'), 0);
    assert.equal(await evaluate('window.__nameExecuted === undefined'), true);
    console.log('PASS  tampered runtime names remain empty without creating markup or executing code');
  } finally {
    const resolved = path.resolve(downloads);
    assert.equal(path.dirname(resolved), path.resolve(os.tmpdir()));
    assert.ok(path.basename(resolved).startsWith('bit-player-name-'));
    await fs.rm(resolved, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  }
}

withBrowser(smoke).then(() => console.log('PASS  player name entry and persistence')).catch(error => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
