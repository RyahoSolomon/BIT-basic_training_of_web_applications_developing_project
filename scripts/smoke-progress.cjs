// Verify the single local save through real menu/map navigation and browser storage.
const assert = require('node:assert/strict');
const advanced = require('./fixtures/progress.json');
const { withBrowser } = require('./smoke-browser.cjs');
const menuPage = 'game/pages/menu.html';
const mapPage = 'game/map/index.html';
const newGameLink = 'a[onclick="return construct()"]';
const continueButton = '#continue-game';

async function smoke({ evaluate, pointerClick: click, page, open, until }) {
  const readStorage = () => evaluate('Object.fromEntries(Object.entries(localStorage))');
  const readSave = () => evaluate('JSON.parse(localStorage.getItem("game.save"))');
  const capture = () => evaluate('GameProgress.capture()');
  const withoutTime = save => { const {savedAt, ...rest} = save; return rest; };
  async function importSave(save) {
    return evaluate('GameProgress.importSave(' + JSON.stringify(JSON.stringify(save)) + ')');
  }
  async function start(name) {
    await click(newGameLink);
    await until('name dialog', () => evaluate('document.getElementById("player-name-dialog").open'));
    await evaluate(`(() => {
      const input = document.getElementById('player-name');
      input.value = ${JSON.stringify(name)};
      input.dispatchEvent(new Event('input', {bubbles: true}));
    })()`);
    await click('[data-name-confirm]');
    await page('game/story/chapter-0/background.html');
  }
  async function assertRestored(expected, label) {
    await page(mapPage);
    assert.deepEqual(withoutTime(await capture()), withoutTime(expected), label + ': active snapshot');
    assert.deepEqual(withoutTime(await readSave()), withoutTime(expected), label + ': automatic save');
    assert.equal(await evaluate('getComputedStyle(document.getElementById("level-6")).display'), 'block',
      label + ': hidden final level remains unlocked');
  }

  await open(menuPage);
  assert.equal(await evaluate('GameProgress.hasSave()'), false);
  assert.equal(await evaluate('localStorage.getItem("username")'), 'test');
  const initialStorage = await readStorage();
  assert.equal(await evaluate("document.querySelector('#continue-game').disabled"), true);
  await click(continueButton);
  await page(menuPage);
  assert.equal(await evaluate('document.getElementById("continue-error").innerText'), '');
  assert.deepEqual(await readStorage(), initialStorage, 'Continue before starting must not create a run');
  assert.equal(await evaluate('(() => {try {GameProgress.exportSave();} catch (error) {return error.code;}})()'), 'NO_PROGRESS');

  await click(newGameLink);
  await until('name dialog', () => evaluate('document.getElementById("player-name-dialog").open'));
  assert.deepEqual(await readStorage(), initialStorage, 'Opening the name dialog must not create or replace progress');
  await click('[data-name-close]');
  assert.deepEqual(await readStorage(), initialStorage, 'Cancelling name input must not alter the save');
  await start('旅人_A1');
  const initial = await readSave();
  assert.equal(initial.format, 'the-origin-of-god');
  assert.equal(initial.version, 1);
  assert.equal(initial.playerName, '旅人_A1');
  assert.equal(await evaluate('GameProfile.getName()'), '旅人_A1');
  assert.equal(await evaluate('localStorage.getItem("username")'), 'test');
  assert.ok(Number.isFinite(Date.parse(initial.savedAt)));
  assert.deepEqual(initial.progress.levels, Array(6).fill(0));
  assert.equal(initial.progress.isFirstPlay, true);
  assert.equal(initial.progress.chapterName, '序章');
  assert.deepEqual(initial.settings, {music: {volume: 50, muted: false}, sound: {volume: 50, muted: false}});
  await click('[data-settings-open]');
  await click('[data-menu-leave]');
  await page(menuPage);
  await click(continueButton);
  await page(mapPage);
  assert.deepEqual(withoutTime(await readSave()), withoutTime(initial));
  console.log('PASS  no-account start immediately creates one complete local save');

  assert.deepEqual(await importSave(advanced), advanced);
  assert.equal(await evaluate('GameProfile.getName()'), advanced.playerName);
  assert.deepEqual(await readSave(), advanced);
  assert.deepEqual(await evaluate('JSON.parse(localStorage.getItem("game.settings"))'), advanced.settings);
  await open(menuPage);
  await click(continueButton);
  await assertRestored(advanced, 'Imported save');

  const newSettings = {music: {volume: 62, muted: false}, sound: {volume: 19, muted: true}};
  await open(menuPage);
  await evaluate(`
    localStorage.setItem('current', ${JSON.stringify(JSON.stringify(initial.progress.current))});
    localStorage.setItem('testachievement', ${JSON.stringify(JSON.stringify(initial.achievements))});
    localStorage.setItem('testflag', '0');
    localStorage.setItem('playerName', '临时名');
    localStorage.setItem('game.settings', ${JSON.stringify(JSON.stringify(newSettings))});
  `);
  await click(continueButton);
  await assertRestored({...advanced, settings: newSettings}, 'Continue with newer settings');
  console.log('PASS  continue restores progress, clues, achievements and flag while preserving global audio choices');

  const failedAutoSave = await evaluate(`(() => {
    const originalSave = localStorage.getItem('game.save');
    const originalCurrent = localStorage.getItem('current');
    try {
      const corrupt = JSON.parse(originalCurrent);
      corrupt.user_level.level = 0;
      localStorage.setItem('current', JSON.stringify(corrupt));
      save();
      return {message: document.getElementById('map-save-error').innerText, originalSave, saved: localStorage.getItem('game.save')};
    } finally {
      localStorage.setItem('current', originalCurrent);
    }
  })()`);
  assert.match(failedAutoSave.message, /^自动保存失败：/);
  assert.equal(failedAutoSave.saved, failedAutoSave.originalSave);
  assert.equal(await evaluate('save(); document.getElementById("map-save-error").textContent'), '');

  const exported = await evaluate(`(() => {
    const current = JSON.parse(localStorage.current);
    current.user_level.exp = 91;
    localStorage.current = JSON.stringify(current);
    const achievements = JSON.parse(localStorage.testachievement);
    achievements.ach3 = 1;
    localStorage.testachievement = JSON.stringify(achievements);
    return GameProgress.exportSave();
  })()`);
  const exportedSave = JSON.parse(exported);
  assert.match(exported, /\n  "format":/);
  assert.equal(exportedSave.progress.current.user_level.exp, 91);
  assert.equal(exportedSave.achievements.ach3, 1);
  assert.deepEqual(await readSave(), exportedSave, 'Download first persists the latest active state');
  await evaluate('localStorage.clear()');
  await open(menuPage);
  assert.equal(await evaluate('GameProgress.hasSave()'), false);
  assert.deepEqual(await importSave(exportedSave), exportedSave);
  await click(continueButton);
  await assertRestored(exportedSave, 'Export/import round trip');
  console.log('PASS  exported JSON restores full progress, achievements and settings in an empty browser profile');

  for (const [label, text, code] of [
    ['broken JSON', '{', 'INVALID_SAVE'],
    ['wrong format', JSON.stringify({...advanced, format: 'other'}), 'INVALID_SAVE'],
    ['unsupported version', JSON.stringify({...advanced, version: 2}), 'UNSUPPORTED_VERSION'],
    ['incomplete achievements', JSON.stringify({...advanced, achievements: {ach1: 1}}), 'INVALID_SAVE'],
    ['invalid settings', JSON.stringify({...advanced, settings: {...advanced.settings, sound: {volume: 0, muted: false}}}), 'INVALID_SAVE'],
    ['malicious name', JSON.stringify({...advanced, playerName: '<script>'}), 'INVALID_SAVE'],
    ['noncanonical name', JSON.stringify({...advanced, playerName: ' test '}), 'INVALID_SAVE'],
  ]) {
    const before = await readStorage();
    assert.equal(await evaluate(`(() => {
      try { GameProgress.importSave(${JSON.stringify(text)}); }
      catch (error) { return error.code; }
    })()`), code, label);
    assert.deepEqual(await readStorage(), before, label + ': rejected import must not write anything');
  }

  const beforeFailure = await readStorage();
  const failure = await evaluate(`(() => {
    const original = Storage.prototype.setItem;
    let rejected = false;
    Storage.prototype.setItem = function(key, value) {
      if (key === 'game.save' && !rejected) {
        rejected = true;
        throw new DOMException('Storage full', 'QuotaExceededError');
      }
      return original.call(this, key, value);
    };
    try { GameProgress.importSave(${JSON.stringify(JSON.stringify(advanced))}); }
    catch (error) { return error.code; }
    finally { Storage.prototype.setItem = original; }
  })()`);
  assert.equal(failure, 'STORAGE_ERROR');
  assert.deepEqual(await readStorage(), beforeFailure, 'Failed save write rolls back active progress and settings');
  console.log('PASS  malformed imports and failed storage writes preserve all prior data');

  await open(menuPage);
  const beforeCancel = await readStorage();
  assert.equal(JSON.parse(beforeCancel.testachievement).ach3, 1);
  await click(newGameLink);
  await until('name dialog', () => evaluate('document.getElementById("player-name-dialog").open'));
  await click('[data-name-close]');
  assert.deepEqual(await readStorage(), beforeCancel, 'Cancelling a new name preserves the current run');
  await start('新旅人_B2');
  const restarted = await readSave();
  assert.equal(restarted.playerName, '新旅人_B2');
  assert.equal(await evaluate('GameProfile.getName()'), '新旅人_B2');
  assert.equal(await evaluate('localStorage.getItem("username")'), 'test');
  assert.deepEqual(restarted.progress, initial.progress);
  assert.deepEqual(restarted.achievements, initial.achievements);
  assert.deepEqual((await capture()).achievements, initial.achievements);
  assert.deepEqual(restarted.settings, exportedSave.settings);
  assert.equal(restarted.endingFlag, 0);
  await open('game/pages/achievements.html');
  assert.equal(await evaluate('document.querySelector("[data-achievement=ach3] .exh").textContent.trim()'), '隐藏成就');
  console.log('PASS  confirming a new character resets achievements in the game and save while preserving audio settings');
}

withBrowser(smoke, {userGesture: false}).catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
