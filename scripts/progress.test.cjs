const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createStore, createNewProgress, VERSION, FORMAT, SAVE_KEY, SETTINGS_KEY } = require('../game/shared/scripts/progress.js');
const advanced = require('./fixtures/progress.json');
const timestamp = advanced.savedAt;
const encoded = JSON.stringify;
const clone = value => JSON.parse(encoded(value));

function memoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial).map(([key, value]) => [key, String(value)]));
  let failingKey, failingError;
  return {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) {
      if (key === failingKey) {
        failingKey = undefined;
        throw failingError;
      }
      values.set(key, String(value));
    },
    removeItem(key) { values.delete(key); },
    failNextWriteTo(key, error = new Error('Simulated storage failure')) {
      failingKey = key;
      failingError = error;
    },
    dump() { return Object.fromEntries(values); },
  };
}

function setup(initial = {}) {
  const storage = memoryStorage(initial);
  const store = createStore(storage, () => new Date(timestamp));
  return { storage, store };
}

function expectUnchanged(storage, action, code) {
  const before = storage.dump();
  assert.throws(action, error => {
    assert.equal(error.code, code);
    return true;
  });
  assert.deepEqual(storage.dump(), before, 'Rejected operation must not change any stored data');
}

test('new game needs no account and immediately persists a complete initial save', () => {
  const { storage, store } = setup();
  assert.equal(store.hasSave(), false);
  const save = store.newGame('test');
  assert.equal(save.format, FORMAT);
  assert.equal(save.version, VERSION);
  assert.equal(save.savedAt, timestamp);
  assert.equal(save.playerName, 'test');
  assert.equal(storage.getItem('playerName'), 'test');
  assert.equal(storage.getItem('username'), 'test');
  assert.deepEqual(save.progress, createNewProgress());
  assert.deepEqual(save.achievements, Object.fromEntries(['ach1', 'ach2', 'ach3', 'ach4', 'ach6', 'ach7', 'ach8'].map(key => [key, 0])));
  assert.equal(save.endingFlag, 0);
  assert.deepEqual(save.settings, {music: {volume: 50, muted: false}, sound: {volume: 50, muted: false}});
  assert.deepEqual(JSON.parse(storage.getItem(SAVE_KEY)), save);
  assert.deepEqual(JSON.parse(storage.getItem(SETTINGS_KEY)), save.settings);
  assert.deepEqual(store.capture(), save);
  assert.equal(store.hasSave(), true);
  assert.equal('is_plot_music_on' in save.progress.current, false);
  assert.equal('is_inwar_music_on' in save.progress.current, false);
  assert.equal('saveSlot' in store, false);
  assert.equal('restoreSlot' in store, false);
  assert.equal('listSlots' in store, false);
});

test('new game resets run progress and branch flag while retaining achievements and independent settings', () => {
  const { storage, store } = setup();
  store.importSave(encoded(advanced));
  const save = store.newGame('test');
  assert.deepEqual(save.progress, createNewProgress());
  assert.deepEqual(save.achievements, advanced.achievements);
  assert.deepEqual(save.settings, advanced.settings);
  assert.equal(save.endingFlag, 0);
  assert.equal(storage.getItem('testflag'), '0');
  assert.deepEqual(JSON.parse(storage.getItem(SAVE_KEY)), save);
  assert.notDeepEqual(save.progress, advanced.progress);
});

test('new game requires an explicit valid name before changing any existing run or save', () => {
  for (const existingRun of [false, true]) {
    const { storage, store } = setup();
    if (existingRun) store.importSave(encoded({...advanced, playerName: '旧名字'}));
    for (const name of [undefined, null, '', ' ', '一二三四五六七八', '123456789012345',
      ' 1234567890123 ', '<img>', 'A\n', 'A\u200d', 'A\u202e', 'A"']) {
      expectUnchanged(storage, () => store.newGame(name), 'INVALID_NAME');
    }
    for (const [raw, name] of [[' 一二三四五六 ', '一二三四五六'], ['12345678901234', '12345678901234'],
      ['𠀀'.repeat(7), '𠀀'.repeat(7)], ['旅人_A-1', '旅人_A-1']]) {
      assert.equal(store.newGame(raw).playerName, name);
      assert.equal(storage.getItem('playerName'), name);
      assert.equal(JSON.parse(storage.getItem(SAVE_KEY)).playerName, name);
    }
  }
});

test('changing display names retains the fixed achievement identity and continue restores the saved name', () => {
  const { storage, store } = setup();
  store.importSave(encoded({...advanced, playerName: '旧名字'}));
  const renamed = store.newGame(' 新旅人_A ');
  assert.equal(renamed.playerName, '新旅人_A');
  assert.deepEqual(renamed.achievements, advanced.achievements);
  assert.deepEqual(renamed.settings, advanced.settings);
  assert.equal(storage.getItem('username'), 'test');
  assert.equal(storage.getItem('新旅人_Aachievement'), null);
  storage.setItem('playerName', '临时名');
  assert.equal(store.restoreAuto().playerName, '新旅人_A');
  assert.equal(storage.getItem('playerName'), '新旅人_A');
  const fresh = setup();
  assert.equal(fresh.store.importSave(store.exportSave()).playerName, '新旅人_A');
  assert.equal(fresh.store.capture().playerName, '新旅人_A');
});

test('malicious, missing or noncanonical names are rejected before importing any fields', () => {
  const { storage, store } = setup();
  store.newGame('原名字');
  for (const playerName of [undefined, null, '', '<script>', 'A\n', 'A\u200d', 'A\u202e', 'A\u2067',
    'A"', "A'", ' A', 'A ', '一二三四五六七八', '123456789012345']) {
    expectUnchanged(storage, () => store.importSave(encoded({...advanced, playerName})), 'INVALID_SAVE');
  }
});

test('renaming changes both names while preserving the distinct live state and saved checkpoint', () => {
  const { storage, store } = setup();
  store.importSave(encoded({...advanced, playerName: '旧名字'}));
  storage.setItem('current', encoded({...advanced.progress.current, user_level: {level: 6, exp: 77}}));
  storage.setItem('testachievement', encoded({...advanced.achievements, ach3: 1}));
  storage.setItem('testflag', '0');
  storage.setItem(SETTINGS_KEY, encoded({music: {volume: 65, muted: false}, sound: {volume: 12, muted: true}}));
  const before = storage.dump();
  assert.equal(store.renamePlayer(' 新旅人_A-1 '), '新旅人_A-1');
  const expectedSave = {...advanced, playerName: '新旅人_A-1'};
  assert.deepEqual(storage.dump(), {...before, playerName: '新旅人_A-1', [SAVE_KEY]: encoded(expectedSave)});
  assert.equal(store.capture().playerName, '新旅人_A-1');
  assert.equal(store.restoreAuto().playerName, '新旅人_A-1');
  assert.equal(JSON.parse(store.exportSave()).playerName, '新旅人_A-1');
  assert.equal(storage.getItem('username'), 'test');
});

test('renaming without a save only changes the name and never starts or saves a run', () => {
  for (const existingRun of [false, true]) {
    const { storage, store } = setup();
    if (existingRun) {
      store.newGame('旧名字');
      storage.removeItem(SAVE_KEY);
    }
    for (const name of ['一二三四五六七', '12345678901234', '𠀀'.repeat(7), '〇_A-1']) {
      const before = storage.dump();
      assert.equal(store.renamePlayer(name), name);
      assert.deepEqual(storage.dump(), {...before, playerName: name});
      assert.equal(store.hasSave(), false);
    }
  }
});

test('invalid names, damaged saved checkpoints and failed rename writes preserve every stored value', () => {
  for (const withSave of [false, true]) {
    const { storage, store } = setup();
    if (withSave) store.importSave(encoded(advanced));
    for (const name of [undefined, null, '', ' ', '一二三四五六七八', '123456789012345',
      ' 1234567890123 ', '<img>', 'A\n', 'A\u200d', 'A\u202e', 'A"']) {
      expectUnchanged(storage, () => store.renamePlayer(name), 'INVALID_NAME');
    }
    for (const key of withSave ? ['playerName', SAVE_KEY] : ['playerName']) {
      storage.failNextWriteTo(key, new DOMException('Storage full', 'QuotaExceededError'));
      expectUnchanged(storage, () => store.renamePlayer('新名字'), 'STORAGE_ERROR');
    }
    storage.setItem(SAVE_KEY, '{broken');
    expectUnchanged(storage, () => store.renamePlayer('新名字'), 'INVALID_SAVE');
  }
  const { storage, store } = setup({[SAVE_KEY]: encoded(advanced)});
  storage.failNextWriteTo(SAVE_KEY);
  expectUnchanged(storage, () => store.renamePlayer('新名字'), 'STORAGE_ERROR');
  assert.equal(storage.getItem('playerName'), null, 'Rollback removes a newly created runtime name');
});

test('browser rename broadcasts the committed name once and never notifies on failure', () => {
  const { storage } = setup();
  const notifications = [];
  const browser = {
    localStorage: storage,
    GameProfile: require('../game/shared/scripts/profile.js'),
    CustomEvent: class {
      constructor(type, options) { this.type = type; this.detail = options.detail; }
    },
    dispatchEvent(event) {
      notifications.push({type: event.type, name: event.detail.name,
        runtimeName: storage.getItem('playerName'), savedName: JSON.parse(storage.getItem(SAVE_KEY)).playerName});
    },
  };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../game/shared/scripts/progress.js'), 'utf8'), {window: browser});
  browser.GameProgress.importSave(encoded(advanced));
  assert.equal(browser.GameProgress.renamePlayer(' 新名字 '), '新名字');
  assert.deepEqual(notifications, [{type: 'game:player-name-changed', name: '新名字',
    runtimeName: '新名字', savedName: '新名字'}]);
  expectUnchanged(storage, () => browser.GameProgress.renamePlayer('<script>'), 'INVALID_NAME');
  storage.failNextWriteTo(SAVE_KEY);
  expectUnchanged(storage, () => browser.GameProgress.renamePlayer('另一个名字'), 'STORAGE_ERROR');
  assert.equal(notifications.length, 1);
});

test('default progress objects are independent and contain all battle/map fields', () => {
  const first = createNewProgress();
  first.current.user_level.level = 6;
  first.current.perfect_level_complete[0] = true;
  first.levels[0] = 1;
  const second = createNewProgress();
  assert.deepEqual(second.current.user_level, {level: 1, exp: 0});
  assert.deepEqual(second.current.yuanlan_level, {level: 1, exp: 0});
  assert.deepEqual(second.current.yedai_level, {level: 1, exp: 0});
  assert.deepEqual(second.current.perfect_level_complete, Array(6).fill(false));
  assert.deepEqual(second.levels, Array(6).fill(0));
  assert.equal(second.chapterName, '序章');
  assert.equal(second.isFirstPlay, true);
});

test('current battle boolean achievements are saved as numeric flags without loosening file validation', () => {
  const { storage, store } = setup();
  store.importSave(encoded(advanced));
  const battleAchievements = Object.fromEntries(Object.entries(advanced.achievements)
    .map(([key, flag]) => [key, Boolean(flag)]));
  storage.setItem('testachievement', encoded(battleAchievements));
  assert.deepEqual(store.capture().achievements, advanced.achievements);
  assert.deepEqual(JSON.parse(store.exportSave()).achievements, advanced.achievements);
  assert.deepEqual(store.newGame('test').achievements, advanced.achievements);
  expectUnchanged(storage, () => store.importSave(encoded({...advanced, achievements: battleAchievements})), 'INVALID_SAVE');
});

test('story choices immediately save their flag and achievement with the latest live progress', () => {
  const { storage, store } = setup();
  store.newGame('旅人');
  const current = {...createNewProgress().current, level: 1, user_level: {level: 3, exp: 27}};
  storage.setItem('current', encoded(current));
  storage.setItem('level2', '1');
  const before = storage.dump();
  assert.deepEqual(store.applyStoryEffects([
    {type: 'setFlag', value: 1},
    {type: 'achievement', id: 'ach2', title: '保护坚果', description: '放走妖族监国'},
  ]), {unlocked: ['ach2']});
  const saved = JSON.parse(storage.getItem(SAVE_KEY));
  assert.equal(saved.endingFlag, 1);
  assert.equal(saved.achievements.ach2, 1);
  assert.deepEqual(saved.progress.current, current);
  assert.equal(saved.progress.levels[1], 1);
  assert.deepEqual(storage.dump(), {...before, testflag: '1',
    testachievement: encoded(saved.achievements), [SAVE_KEY]: encoded(saved)},
  'Applying a story result must not rewrite other active storage fields');
  storage.setItem('testflag', '0');
  storage.setItem('testachievement', encoded({...saved.achievements, ach2: 0}));
  assert.equal(store.restoreAuto().endingFlag, 1);
  assert.equal(store.capture().achievements.ach2, 1);
});

test('repeated story achievements report only newly unlocked IDs, including legacy boolean flags', () => {
  const { storage, store } = setup();
  store.newGame('旅人');
  const achievements = store.capture().achievements;
  storage.setItem('testachievement', encoded({...achievements, ach1: true, ach2: false}));
  const effects = [{type: 'achievement', id: 'ach1'}, {type: 'achievement', id: 'ach2'},
    {type: 'achievement', id: 'ach2'}];
  assert.deepEqual(store.applyStoryEffects(effects), {unlocked: ['ach2']});
  assert.deepEqual(store.applyStoryEffects(effects), {unlocked: []});
  assert.equal(store.capture().achievements.ach1, 1);
  assert.equal(store.capture().achievements.ach2, 1);
  assert.equal(store.capture().endingFlag, 0, 'An achievement must not implicitly choose a story branch');
  assert.deepEqual(store.applyStoryEffects([{type: 'setFlag', value: 1}]), {unlocked: []});
  assert.deepEqual(store.applyStoryEffects([{type: 'setFlag', value: 0}]), {unlocked: []});
  assert.equal(JSON.parse(storage.getItem(SAVE_KEY)).endingFlag, 0);
});

test('invalid story effects and missing or corrupt progress never partially apply a choice', () => {
  const { storage, store } = setup();
  expectUnchanged(storage, () => store.applyStoryEffects([{type: 'setFlag', value: 1}]), 'NO_PROGRESS');
  store.newGame('旅人');
  for (const invalid of [undefined, null, {}, [null], [{type: 'unknown'}],
    [{type: 'setFlag', value: '1'}], [{type: 'setFlag', value: true}], [{type: 'setFlag', value: 2}],
    [{type: 'achievement', id: 'ach9'}], [{type: 'achievement', id: '__proto__'}],
    [{type: 'achievement', id: 'toString'}], [{type: 'achievement'}]]) {
    const effects = Array.isArray(invalid)
      ? [{type: 'setFlag', value: 1}, {type: 'achievement', id: 'ach2'}, ...invalid] : invalid;
    expectUnchanged(storage, () => store.applyStoryEffects(effects), 'INVALID_STORY_EFFECT');
  }
  storage.setItem('testachievement', '{broken');
  expectUnchanged(storage, () => store.applyStoryEffects([{type: 'setFlag', value: 1}]), 'INVALID_PROGRESS');
});

test('failed story choice writes roll back both active results and the save before returning an unlock', () => {
  for (const missingResults of [false, true]) {
    for (const key of ['testflag', 'testachievement', SAVE_KEY]) {
      const { storage, store } = setup();
      store.newGame('旅人');
      if (missingResults) {
        storage.removeItem('testflag');
        storage.removeItem('testachievement');
      }
      storage.failNextWriteTo(key, new DOMException('Storage full', 'QuotaExceededError'));
      const effects = [{type: 'setFlag', value: 1}, {type: 'achievement', id: 'ach2'}];
      expectUnchanged(storage, () => store.applyStoryEffects(effects), 'STORAGE_ERROR');
      assert.deepEqual(store.applyStoryEffects(effects), {unlocked: ['ach2']},
        'Retry after a failed save must still report the newly awarded achievement');
    }
  }
});

test('import, capture, save and export retain the full snapshot including settings and achievements', () => {
  const { storage, store } = setup({username: 'irrelevant-account'});
  assert.deepEqual(store.importSave(encoded(advanced)), advanced);
  assert.deepEqual(store.capture(), advanced);
  assert.equal(storage.getItem('username'), 'test');
  const beforeCapture = storage.dump();
  store.capture();
  assert.deepEqual(storage.dump(), beforeCapture, 'Capture does not mutate storage');
  const current = clone(advanced.progress.current);
  current.user_level.exp = 91;
  storage.setItem('current', encoded(current));
  const achievements = {...advanced.achievements, ach3: 1};
  storage.setItem('testachievement', encoded(achievements));
  storage.setItem('testflag', '0');
  const settings = {music: {volume: 1, muted: false}, sound: {volume: 100, muted: true}};
  storage.setItem(SETTINGS_KEY, encoded(settings));
  const exported = store.exportSave();
  assert.match(exported, /\n  "format":/);
  const save = JSON.parse(exported);
  assert.deepEqual(save.progress.current, current);
  assert.deepEqual(save.achievements, achievements);
  assert.equal(save.endingFlag, 0);
  assert.deepEqual(save.settings, settings);
  assert.deepEqual(JSON.parse(storage.getItem(SAVE_KEY)), save);
  assert.deepEqual(store.saveAuto(), save);
  const fresh = setup();
  assert.deepEqual(fresh.store.importSave(exported), save);
  assert.deepEqual(fresh.store.capture(), save);
});

test('continue restores progress and achievements without overwriting newer global audio choices', () => {
  const { storage, store } = setup();
  store.importSave(encoded(advanced));
  storage.setItem('current', encoded(createNewProgress().current));
  storage.setItem('testachievement', encoded({...advanced.achievements, ach8: 0}));
  storage.setItem('testflag', '0');
  const settings = {music: {volume: 62, muted: false}, sound: {volume: 19, muted: true}};
  storage.setItem(SETTINGS_KEY, encoded(settings));
  assert.deepEqual(store.restoreAuto(), advanced);
  assert.deepEqual(store.capture(), {...advanced, settings});
  assert.deepEqual(JSON.parse(storage.getItem(SETTINGS_KEY)), settings);
  assert.deepEqual(JSON.parse(storage.getItem(SAVE_KEY)), advanced, 'Restore does not silently rewrite the save');
  storage.removeItem(SETTINGS_KEY);
  store.restoreAuto();
  assert.equal(storage.getItem(SETTINGS_KEY), null, 'Continue does not initialize settings from an older save either');
});

test('missing progress, malformed saves and unsupported versions never write anything', () => {
  const { storage, store } = setup();
  for (const action of [store.capture, store.saveAuto, store.exportSave]) {
    expectUnchanged(storage, action, 'NO_PROGRESS');
  }
  expectUnchanged(storage, store.restoreAuto, 'EMPTY_SAVE');
  const invalid = [null, '', '{', 'null', '[]', encoded({current: '{}'}), encoded({...advanced, format: 'another-game'})];
  for (const value of invalid) expectUnchanged(storage, () => store.importSave(value), 'INVALID_SAVE');
  for (const version of [undefined, 0, 2, '1']) {
    expectUnchanged(storage, () => store.importSave(encoded({...advanced, version})), 'UNSUPPORTED_VERSION');
  }
  storage.setItem(SAVE_KEY, '{broken');
  assert.equal(store.hasSave(), false);
  expectUnchanged(storage, store.restoreAuto, 'INVALID_SAVE');
});

test('every imported field is validated before progress, achievements, settings or save are changed', () => {
  const changes = [
    value => { value.savedAt = 'yesterday'; },
    value => { value.savedAt = null; },
    value => { value.playerName = '<script>'; },
    value => { value.progress.current.user_level.level = 0; },
    value => { value.progress.current.yuanlan_level.exp = -1; },
    value => { delete value.progress.current.yedai_level; },
    value => { value.progress.current.level = 6; },
    value => { value.progress.current.hidden_clue_god = 1; },
    value => { value.progress.current.perfect_level_complete = [true]; },
    value => { value.progress.levels[0] = 114; },
    value => { value.progress.levels[5] = 2; },
    value => { value.progress.chapterName = ' '; },
    value => { value.progress.isFirstPlay = 'false'; },
    value => { value.achievements.ach8 = true; },
    value => { delete value.achievements.ach7; },
    value => { value.endingFlag = 2; },
    value => { value.settings.music.volume = 0; },
    value => { value.settings.sound.volume = 101; },
    value => { value.settings.sound.volume = 50.5; },
    value => { value.settings.music.muted = 0; },
    value => { delete value.settings.sound; },
  ];
  const { storage, store } = setup();
  store.newGame('test');
  for (const change of changes) {
    const value = clone(advanced);
    change(value);
    expectUnchanged(storage, () => store.importSave(encoded(value)), 'INVALID_SAVE');
    storage.setItem(SAVE_KEY, encoded(value));
    assert.equal(store.hasSave(), false);
    expectUnchanged(storage, store.restoreAuto, 'INVALID_SAVE');
  }
});

test('invalid active data cannot overwrite the previous good save', () => {
  const changes = [
    ['current', '{'],
    ['current', encoded({...advanced.progress.current, user_level: {level: 9, exp: 0}})],
    ['level2', '114'], ['level6', '2'], ['MSYgamename', ''], ['IsFirstPlay', null],
    ['testachievement', '{'], ['testflag', '2'], [SETTINGS_KEY, '{}'],
    ['playerName', null], ['playerName', '<script>'], ['playerName', 'A\n'], ['playerName', ' A'],
  ];
  for (const [key, value] of changes) {
    const { storage, store } = setup();
    store.importSave(encoded(advanced));
    if (value === null) storage.removeItem(key);
    else storage.setItem(key, value);
    expectUnchanged(storage, store.saveAuto, 'INVALID_PROGRESS');
    expectUnchanged(storage, store.exportSave, 'INVALID_PROGRESS');
  }
});

test('failed import rolls back every prior write, including newly created keys and settings', () => {
  for (const empty of [false, true]) {
    for (const failingKey of ['level3', 'username', 'playerName', 'testachievement', 'testflag', SETTINGS_KEY, SAVE_KEY]) {
      const { storage, store } = setup();
      if (!empty) store.newGame('test');
      storage.failNextWriteTo(failingKey);
      expectUnchanged(storage, () => store.importSave(encoded(advanced)), 'STORAGE_ERROR');
    }
  }
});

test('failed new game, restore, auto-save and export preserve earlier state', () => {
  for (const [key, action] of [
    ['level3', 'newGame'], ['playerName', 'newGame'], [SAVE_KEY, 'newGame'],
    ['playerName', 'restoreAuto'], ['testflag', 'restoreAuto'],
    [SAVE_KEY, 'saveAuto'], [SAVE_KEY, 'exportSave'],
  ]) {
    const { storage, store } = setup();
    store.importSave(encoded(advanced));
    storage.failNextWriteTo(key, new DOMException('Storage full', 'QuotaExceededError'));
    expectUnchanged(storage, () => store[action]('New名字'), 'STORAGE_ERROR');
  }
});

test('rollback attempts continue even when storage also rejects one rollback write', () => {
  const { storage, store } = setup();
  store.newGame('test');
  const before = storage.dump();
  const setItem = storage.setItem.bind(storage);
  let failed = false;
  storage.setItem = (key, value) => {
    if (key === SAVE_KEY) { failed = true; throw new Error('Save failed'); }
    if (failed && key === SETTINGS_KEY) throw new Error('Rollback failed');
    setItem(key, value);
  };
  assert.throws(() => store.importSave(encoded(advanced)), {code: 'STORAGE_ERROR'});
  const after = storage.dump();
  delete before[SETTINGS_KEY];
  delete after[SETTINGS_KEY];
  assert.deepEqual(after, before, 'A failed settings rollback must not prevent other keys being restored');
});
