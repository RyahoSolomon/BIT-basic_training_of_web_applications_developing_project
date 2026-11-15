// Exercise both restore entry points with saves emitted by the archived game.
const assert = require('node:assert/strict');
const legacy = require('./fixtures/legacy-progress.json');
const { withBrowser } = require('./smoke-browser.cjs');

const menuPage = 'game/pages/menu.html';
const mapPage = 'game/map/index.html';
const loadPage = 'game/pages/load.html';
const savePage = 'game/pages/save.html';
const newGameLink = 'a[href="../story/chapter-0/background.html"]';
const continueLink = 'a[onclick="return load()"]';

async function smoke({ evaluate, pointerClick: click, page, open }) {
  const username = 'progress-smoke-player';
  const autoKey = username + 'autosave';
  const slotsKey = username + 'savearea';

  async function readStorage() {
    return evaluate('Object.fromEntries(Object.entries(localStorage))');
  }

  async function put(key, value) {
    await evaluate(value === null
      ? `localStorage.removeItem(${JSON.stringify(key)})`
      : `localStorage.setItem(${JSON.stringify(key)}, ${JSON.stringify(value)})`);
  }

  async function writeActive(progress) {
    const values = {
      current: JSON.stringify(progress.current),
      MSYgamename: progress.chapterName,
      IsFirstPlay: String(progress.isFirstPlay),
      ...Object.fromEntries(progress.levels.map((value, index) => ['level' + (index + 1), String(value)])),
    };
    await evaluate(`
      for (const [key, value] of Object.entries(${JSON.stringify(values)})) localStorage.setItem(key, value);
    `);
  }

  async function readActive() {
    return evaluate(`({
      current: JSON.parse(localStorage.current),
      levels: Array.from({length: 6}, (_, index) => Number(localStorage.getItem('level' + (index + 1)))),
      chapterName: localStorage.MSYgamename,
      isFirstPlay: localStorage.IsFirstPlay === 'true',
    })`);
  }

  async function assertRestored(expected, label) {
    await page(mapPage);
    assert.deepEqual(await readActive(), expected, label + ': restored progress');
    const automatic = await evaluate(`JSON.parse(localStorage.getItem(${JSON.stringify(autoKey)}))`);
    assert.equal(automatic.version, 1, label + ': map writes the current save version');
    assert.deepEqual(automatic.progress, expected, label + ': map auto-save retains restored fields');
    assert.equal(await evaluate('getComputedStyle(document.getElementById("level-6")).display'), 'block',
      label + ': hidden final level remains unlocked');
  }

  // Use real registration and login to establish account-owned achievements.
  await open('game/pages/register.html');
  await evaluate(`
    document.getElementById('username').value = ${JSON.stringify(username)};
    document.getElementById('password').value = 'progress-smoke';
    document.getElementById('confirm-password').value = 'progress-smoke';
  `);
  await click('#registerForm button[type="submit"]');
  await page('game/pages/login.html');
  await evaluate(`
    document.getElementById('username').value = ${JSON.stringify(username)};
    document.getElementById('password').value = 'progress-smoke';
  `);
  await click('#loginForm button[type="submit"]');
  await page(menuPage);
  const freshAccount = await readStorage();
  await click(continueLink);
  await page(menuPage);
  assert.deepEqual(await readStorage(), freshAccount, 'Continue before the first game must not create progress');

  await click(newGameLink);
  await page('game/story/chapter-0/background.html');
  await click('.button-save');
  await page(mapPage);
  const initial = await readActive();
  assert.equal(initial.chapterName, '序章');
  assert.deepEqual(initial.levels, Array(6).fill(0));
  assert.equal(initial.isFirstPlay, true);
  assert.equal(initial.current.hidden_clue_god, false);
  assert.equal(initial.current.hidden_clue_poison, false);
  for (const key of ['user_level', 'yuanlan_level', 'yedai_level']) {
    assert.deepEqual(initial.current[key], {level: 1, exp: 0});
  }

  const advanced = {
    current: JSON.parse(legacy.autosave.current),
    levels: Array.from({length: 6}, (_, index) => Number(legacy.autosave['level' + (index + 1)])),
    chapterName: legacy.autosave.MSYgamename,
    isFirstPlay: false,
  };
  await writeActive(advanced);
  await open(mapPage);
  const automatic = await evaluate(`JSON.parse(localStorage.getItem(${JSON.stringify(autoKey)}))`);
  // Exercise the complete map load handler when current progress cannot be saved.
  const failedAutoSave = await evaluate(`(() => {
    const key = localStorage.username + 'autosave';
    const originalAutosave = localStorage.getItem(key);
    const originalCurrent = localStorage.getItem('current');
    const originalAlert = window.alert;
    const messages = [];
    try {
      const corrupt = JSON.parse(originalCurrent);
      corrupt.user_level.level = 0;
      localStorage.setItem('current', JSON.stringify(corrupt));
      window.alert = message => messages.push(String(message));
      window.onload();
      return {messages, originalAutosave, autosave: localStorage.getItem(key)};
    } finally {
      window.alert = originalAlert;
      localStorage.setItem('current', originalCurrent);
    }
  })()`);
  assert.equal(failedAutoSave.messages.length, 1, 'Failed auto-save must not also show a success alert');
  assert.match(failedAutoSave.messages[0], /^自动保存失败：/);
  assert.equal(failedAutoSave.autosave, failedAutoSave.originalAutosave,
    'Failed auto-save must preserve the previous good save byte for byte');
  assert.deepEqual(await readActive(), advanced, 'Failure test restores active progress');
  console.log('PASS  failed map auto-save reports failure only and preserves the previous good save');

  await click('.button-save');
  await page(savePage);
  await click('#save1');
  const manual = await evaluate(`JSON.parse(localStorage.getItem(${JSON.stringify(slotsKey)}))[0]`);
  assert.equal(automatic.version, 1);
  assert.equal(manual.version, automatic.version);
  assert.ok(Number.isFinite(Date.parse(manual.savedAt)));
  assert.deepEqual(manual.progress, advanced);
  assert.deepEqual(manual.progress, automatic.progress, 'Auto and manual save use the same progress definition');

  await writeActive(initial);
  await open(menuPage);
  await click(continueLink);
  await assertRestored(advanced, 'Versioned auto-save');
  await writeActive(initial);
  await open(loadPage);
  assert.equal(await evaluate('document.getElementById("gamename0").textContent'), advanced.chapterName);
  await click('#save1');
  await assertRestored(advanced, 'Versioned manual slot');
  console.log('PASS  new game, automatic save and manual slots share versioned progress');

  // Achievements and their presentation marker belong to the account, not a run.
  await evaluate(`(() => {
    const key = localStorage.username + 'achievement';
    const achievements = JSON.parse(localStorage.getItem(key));
    achievements.ach8 = 1;
    localStorage.setItem(key, JSON.stringify(achievements));
    localStorage.setItem(localStorage.username + 'flag', '1');
  })()`);
  const accountState = await evaluate(`({
    achievements: localStorage.getItem(localStorage.username + 'achievement'),
    flag: localStorage.getItem(localStorage.username + 'flag'),
  })`);

  await writeActive(initial);
  await put(autoKey, JSON.stringify(legacy.autosave));
  await open(menuPage);
  await click(continueLink);
  await assertRestored(advanced, 'Original auto-save');

  await writeActive(initial);
  await put(slotsKey, JSON.stringify(legacy.manualSlots));
  await open(loadPage);
  assert.equal(await evaluate(`document.getElementById('gamename${legacy.manualSlot}').textContent`), advanced.chapterName);
  assert.equal(await evaluate(`document.getElementById('time${legacy.manualSlot}').textContent`),
    legacy.manualSlots[legacy.manualSlot].currentDateTime);
  await click('#save' + (legacy.manualSlot + 1));
  await assertRestored(advanced, 'Original manual slot with obsolete saved URL');
  assert.deepEqual(await evaluate(`({
    achievements: localStorage.getItem(localStorage.username + 'achievement'),
    flag: localStorage.getItem(localStorage.username + 'flag'),
  })`), accountState);
  console.log('PASS  both original save formats preserve levels, unlocks, clues, music and perfect completions');

  const corruptCurrent = {...legacy.autosave, current: '{broken-json'};
  const missingCharacter = JSON.parse(legacy.autosave.current);
  delete missingCharacter.yuanlan_level;
  const invalidProgress = {...legacy.autosave, current: JSON.stringify(missingCharacter)};
  const emptyPlaceholder = {saveurl: 1, current: 0, MSYgamename: 0};
  const future = {...manual, version: 999};
  const rejected = [
    ['missing', null, null],
    ['legacy empty placeholder', JSON.stringify(emptyPlaceholder), JSON.stringify([emptyPlaceholder])],
    ['malformed JSON', '{broken-json', '{broken-json'],
    ['malformed current', JSON.stringify(corruptCurrent), JSON.stringify([corruptCurrent])],
    ['missing character', JSON.stringify(invalidProgress), JSON.stringify([invalidProgress])],
    ['future save version', JSON.stringify(future), JSON.stringify([future])],
  ];
  for (const [label, autoValue, slotsValue] of rejected) {
    await writeActive(advanced);
    await put(autoKey, autoValue);
    await open(menuPage);
    const beforeAuto = await readStorage();
    await click(continueLink);
    await page(menuPage);
    assert.deepEqual(await readStorage(), beforeAuto, label + ': rejected continue must not write anything');

    await put(slotsKey, slotsValue);
    await open(loadPage);
    const beforeManual = await readStorage();
    await click('#save1');
    await page(loadPage);
    assert.deepEqual(await readStorage(), beforeManual, label + ': rejected slot must not write anything');
  }
  console.log('PASS  empty, corrupt and unsupported saves leave current progress intact in both restore flows');

  // A fresh run resets all progress through the same schema while retaining account records.
  await open(menuPage);
  await click(newGameLink);
  await page('game/story/chapter-0/background.html');
  assert.deepEqual(await readActive(), initial, 'New game resets an advanced run');
  assert.deepEqual(await evaluate(`({
    achievements: localStorage.getItem(localStorage.username + 'achievement'),
    flag: localStorage.getItem(localStorage.username + 'flag'),
  })`), accountState, 'New game preserves cumulative achievements');
  console.log('PASS  new game resets run progress without rolling back account achievements');
}

withBrowser(smoke, {userGesture: false}).catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
