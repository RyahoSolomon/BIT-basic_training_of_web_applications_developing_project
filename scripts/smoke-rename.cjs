const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { withBrowser } = require('./smoke-browser.cjs');
const { dialogueLines } = require('./smoke-story-helpers.cjs');
const { replaceName } = require('./smoke-player-helpers.cjs');
const fixture = require('./fixtures/progress.json');

const menu = 'game/pages/menu.html';
const map = 'game/map/index.html';
const scene = 'game/story/chapter-2/plot-after.html';

async function smoke(browser) {
  const { evaluate, pointerClick: click, open, page, cdp, until } = browser;
  const downloads = await fs.mkdtemp(path.join(os.tmpdir(), 'bit-rename-'));
  const storage = () => evaluate('Object.fromEntries(Object.entries(localStorage))');
  async function key(key, code) {
    await cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', key, code: key, windowsVirtualKeyCode: code });
    await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key, code: key, windowsVirtualKeyCode: code });
  }
  async function settings() {
    await click('[data-settings-open]');
    await until('settings open', () => evaluate('document.getElementById("game-settings").open'));
  }
  async function menuWithoutName() {
    const before = await storage();
    await settings();
    assert.equal(await evaluate('document.querySelectorAll("#game-settings .settings-name, #game-settings [data-player-name], #game-settings [data-name-edit]").length'), 0,
      'Main-menu settings must not show a character name or provide a rename button');
    assert.equal(await evaluate('document.querySelectorAll("#game-settings [data-volume-toggle]").length'), 2,
      'Hiding the name must retain both volume controls');
    await click('[data-settings-close]');
    assert.deepEqual(await storage(), before, 'Opening main-menu settings changed the name or save');
  }
  async function edit() {
    const name = await evaluate('GameProfile.getName()');
    await click('[data-name-edit]');
    await until('rename dialog open', () => evaluate('document.getElementById("player-name-dialog")?.open'));
    assert.equal(await evaluate('document.getElementById("player-name").value'), name, 'Rename must prefill the current name');
    assert.equal(await evaluate('document.getElementById("game-settings").open'), true, 'Rename must overlay settings');
    assert.equal(await evaluate(`(() => {
      const element = document.getElementById('player-name');
      const box = element.getBoundingClientRect();
      return document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2) === element;
    })()`), true, 'The name input is covered by the settings dialog');
  }
  async function renamed(name) {
    await until('rename confirmed', () => evaluate('!document.getElementById("player-name-dialog").open'));
    assert.equal(await evaluate('GameProfile.getName()'), name);
    assert.equal(await evaluate('document.querySelector("[data-player-name]").textContent'), name);
    assert.equal(await evaluate('document.getElementById("game-settings").open'), true, 'Confirm closed the underlying settings');
  }
  async function rename(name) {
    await settings();
    await edit();
    await replaceName(browser, name);
    await click('[data-name-confirm]');
    await renamed(name);
  }
  function withoutTimestamp(save) {
    const { savedAt, ...content } = save;
    assert.ok(Number.isFinite(Date.parse(savedAt)));
    return content;
  }

  try {
    await open(menu);
    assert.equal(await evaluate('GameProfile.getName()'), '', 'A fresh game must not display a default character name');
    await menuWithoutName();
    assert.equal(await evaluate('localStorage.getItem("playerName")'), null, 'Main-menu settings selected a display name');
    assert.equal(await evaluate('localStorage.getItem("game.save")'), null, 'Main-menu settings created a game before the player started');
    assert.equal(await evaluate('localStorage.getItem("current")'), null);
    await evaluate('GameProgress.importSave(' + JSON.stringify(JSON.stringify(fixture)) + ')');
    await menuWithoutName();
    console.log('PASS  main-menu settings omit name and rename controls with or without a save');
    await open(map);
    await settings();
    assert.equal(await evaluate('document.querySelector("[data-player-name]").textContent'), fixture.playerName,
      'In-game settings must display the saved character name');
    await edit();
    const before = await storage();
    for (const name of ['', '   ', '一二三四五六七八', '123456789012345', '旅人!', '<svg/onload=1>', 'A\u200bB']) {
      await replaceName(browser, name);
      assert.equal(await evaluate('document.getElementById("player-name").value'), name,
        'The rename field must contain the exact invalid input being tested');
      await key('Enter', 13);
      assert.equal(await evaluate('document.getElementById("player-name-dialog").open'), true);
      assert.ok(await evaluate('document.getElementById("player-name-error").textContent.trim()'));
      assert.deepEqual(await storage(), before, 'Invalid rename changed the existing game');
    }
    await replaceName(browser, '取消修改');
    await click('[data-name-close]');
    assert.deepEqual(await storage(), before);
    await edit();
    await replaceName(browser, '另一个名字');
    await key('Escape', 27);
    assert.equal(await evaluate('document.getElementById("player-name-dialog").open'), false);
    assert.equal(await evaluate('document.getElementById("game-settings").open'), true, 'Escape closed both dialogs');
    assert.deepEqual(await storage(), before);
    console.log('PASS  rename rejects invalid input and both cancel methods preserve the game and underlying settings');

    await edit();
    await replaceName(browser, '');
    await evaluate(`window.nameComposing = false;
      document.getElementById('player-name').addEventListener('compositionstart', () => nameComposing = true);
      document.getElementById('player-name').addEventListener('compositionend', () => nameComposing = false);`);
    const name = '青_羽-7 A';
    const raw = ' ' + name + ' ';
    await cdp.send('Input.imeSetComposition', { text: raw, selectionStart: raw.length, selectionEnd: raw.length });
    assert.equal(await evaluate('nameComposing'), true);
    await key('Enter', 13);
    assert.equal(await evaluate('document.getElementById("player-name-dialog").open'), true);
    assert.deepEqual(await storage(), before, 'IME confirmation prematurely renamed the player');
    if (await evaluate('nameComposing')) await cdp.send('Input.insertText', { text: raw });
    await until('IME committed', () => evaluate('!nameComposing'));
    assert.equal(await evaluate('document.getElementById("player-name-count").textContent'), '11/14');
    await key('Enter', 13);
    await renamed(name);
    const after = await storage();
    const expectedSave = { ...JSON.parse(before['game.save']), playerName: name };
    assert.deepEqual(after, { ...before, playerName: name, 'game.save': JSON.stringify(expectedSave) },
      'Rename changed progress, achievements, settings or the checkpoint timestamp');
    console.log('PASS  native Chinese IME and Enter rename both name copies without resetting any progress');

    await cdp.send('Page.setDownloadBehavior', { behavior: 'allow', downloadPath: downloads });
    await click('[data-save-download]');
    const filename = 'save_' + name + '.json';
    await until('renamed save downloaded', async () => (await fs.readdir(downloads)).includes(filename));
    const exported = JSON.parse(await fs.readFile(path.join(downloads, filename), 'utf8'));
    assert.deepEqual(withoutTimestamp(exported), withoutTimestamp(expectedSave));
    await click('[data-menu-leave]');
    await page(menu);
    await menuWithoutName();
    assert.equal(await evaluate('GameProfile.getName()'), name, 'Returning to the menu discarded the chosen name');
    await click('a[onclick="return load()"]');
    await page(map);
    assert.equal(await evaluate('GameProfile.getName()'), name);
    await settings();
    assert.equal(await evaluate('document.querySelector("[data-player-name]").textContent'), name);
    await click('[data-settings-close]');
    console.log('PASS  export uses the renamed filename and Continue restores the renamed save');

    await open(scene);
    const lines = await dialogueLines({ evaluate, until });
    await until('first dialogue visible', () => evaluate(`
      document.body.dataset.storyTransitioning !== 'true'
      && getComputedStyle(document.querySelector('#story-player .image-container')).visibility === 'visible'
      && document.querySelector('#story-player .text').textContent === ${JSON.stringify(lines[0].text)}
    `));
    await rename('新说话人');
    await until('renamed speaker rendered', () => evaluate(
      'document.querySelector("#story-player .topLeftText").textContent === "新说话人"'));
    assert.equal(await evaluate('document.querySelector("#story-player .text").textContent'), lines[0].text,
      'Rename advanced the current dialogue');
    await click('[data-settings-close]');
    const namedLine = lines.findIndex(line => line.text.includes('{player}'));
    assert.ok(namedLine > 0);
    for (let index = 1; index <= namedLine; index++) {
      await click('#story-player .image-container');
      await until('dialogue ' + index, () => evaluate('document.querySelector("#story-player .text").textContent === ' +
        JSON.stringify(lines[index].text.replaceAll('{player}', '新说话人'))));
    }
    await rename('一二三四五六七');
    await until('renamed dialogue text rendered', () => evaluate('document.querySelector("#story-player .text").textContent === ' +
      JSON.stringify(lines[namedLine].text.replaceAll('{player}', '一二三四五六七'))));
    assert.equal(await evaluate('document.querySelector("#story-player .topLeftText").textContent'), lines[namedLine].speaker);
    await click('[data-settings-close]');
    await page(scene);
    console.log('PASS  current story speaker and text update immediately without advancing dialogue');

    await evaluate('GameProgress.newGame("战斗旧名"); localStorage.IsFirstPlay = "false"');
    await open('game/battle/index.html');
    await rename('战斗新名');
    assert.ok((await evaluate('document.getElementById("mission_icons").textContent')).includes('战斗新名'));
    await click('[data-settings-close]');
    await click('#mission_confirm_mask');
    const beforeBattle = await evaluate('({ round, current_state, operation_count, units: units.map(unit => ({ uuid: unit.uuid, x: unit.x, y: unit.y, health: unit.health, armor: unit.armor })) })');
    await rename('在场新名');
    assert.deepEqual(await evaluate('({ round, current_state, operation_count, units: units.map(unit => ({ uuid: unit.uuid, x: unit.x, y: unit.y, health: unit.health, armor: unit.armor })) })'), beforeBattle,
      'Renaming reset or advanced the active battle');
    const hero = await evaluate(`(() => {
      const hero = units.find(unit => unit.name === 'user');
      return { name: hero.name_cn, title: document.getElementById('hover_initial_mask_' + hero.x + '_' + hero.y).title };
    })()`);
    assert.equal(hero.name, '在场新名');
    assert.ok(hero.title.includes('在场新名'));
    await click('[data-settings-close]');
    await evaluate('units.find(unit => unit.name === "user").get_hurt(999)');
    assert.ok((await evaluate('document.getElementById("announcement").textContent')).includes('在场新名在战场上陨落了'));
    console.log('PASS  battle mission, active hero tooltip and later announcements use the new name without resetting combat');
  } finally {
    const resolved = path.resolve(downloads);
    assert.equal(path.dirname(resolved), path.resolve(os.tmpdir()));
    assert.ok(path.basename(resolved).startsWith('bit-rename-'));
    await fs.rm(resolved, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  }
}

withBrowser(smoke).then(() => console.log('PASS  settings rename and live display')).catch(error => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
