const assert = require('node:assert/strict');
const { test } = require('node:test');
const { createStore, createNewProgress, VERSION } = require('../game/shared/scripts/progress.js');
const legacy = require('./fixtures/legacy-progress.json');

const timestamp = '2026-11-13T04:05:06.000Z';

function memoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial).map(([key, value]) => [key, String(value)]));
  let failingKey;
  let failingError;
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
  const storage = memoryStorage({ username: legacy.username, ...initial });
  const store = createStore(storage, () => new Date(timestamp));
  return { storage, store };
}

function storedProgress(storage) {
  return {
    current: JSON.parse(storage.getItem('current')),
    levels: Array.from({ length: 6 }, (_, index) => Number(storage.getItem('level' + (index + 1)))),
    chapterName: storage.getItem('MSYgamename'),
    isFirstPlay: storage.getItem('IsFirstPlay') === 'true',
  };
}

function expectUnchanged(storage, action, code) {
  const before = storage.dump();
  assert.throws(action, error => {
    assert.equal(error.code, code);
    return true;
  });
  assert.deepEqual(storage.dump(), before, 'Rejected operation must not change any stored data');
}

function encoded(value) { return JSON.stringify(value); }

test('new games reset all progress from the shared definition without resetting account data or saves', () => {
  const autoKey = legacy.username + 'autosave';
  const achievementKey = legacy.username + 'achievement';
  const flagKey = legacy.username + 'flag';
  const { storage, store } = setup({
    ...legacy.activeStorage,
    [autoKey]: encoded(legacy.autosave),
    [achievementKey]: '{"ach1":1,"ach2":1}',
  });
  const before = storage.dump();
  const snapshot = store.newGame();
  assert.equal(snapshot.version, VERSION);
  assert.equal(VERSION, 1);
  assert.equal(snapshot.savedAt, timestamp);
  assert.deepEqual(snapshot.progress, createNewProgress());
  assert.deepEqual(storedProgress(storage), snapshot.progress);
  assert.deepEqual(snapshot.progress.levels, [0, 0, 0, 0, 0, 0]);
  assert.equal(snapshot.progress.chapterName, '序章');
  assert.equal(snapshot.progress.isFirstPlay, true);
  const current = snapshot.progress.current;
  assert.equal(current.level, 0);
  assert.equal(current.hidden_clue_god, false);
  assert.equal(current.hidden_clue_poison, false);
  assert.equal(current.is_plot_music_on, true);
  assert.equal(current.is_inwar_music_on, true);
  for (const name of ['user_level', 'yuanlan_level', 'yedai_level']) {
    assert.deepEqual(current[name], { level: 1, exp: 0 });
  }
  assert.deepEqual(current.perfect_level_complete, Array(6).fill(false));
  for (const key of [autoKey, achievementKey, flagKey]) assert.equal(storage.getItem(key), before[key]);
});

test('new-game defaults are independent objects and new games do not require a username', () => {
  const first = createNewProgress();
  first.current.user_level.level = 99;
  first.current.perfect_level_complete[0] = true;
  first.levels[0] = 1;
  const second = createNewProgress();
  assert.equal(second.current.user_level.level, 1);
  assert.equal(second.current.perfect_level_complete[0], false);
  assert.equal(second.levels[0], 0);
  const storage = memoryStorage();
  const snapshot = createStore(storage).newGame();
  assert.deepEqual(storedProgress(storage), snapshot.progress);
});

test('automatic and manual saves use the same versioned progress and survive both restore paths', () => {
  const { storage, store } = setup(legacy.activeStorage);
  const expected = storedProgress(storage);
  const auto = store.saveAuto();
  const slot = store.saveSlot(4);
  assert.deepEqual(auto, slot);
  assert.equal(auto.version, 1);
  assert.equal(auto.savedAt, timestamp);
  assert.deepEqual(auto.progress, expected);
  assert.deepEqual(JSON.parse(storage.getItem(legacy.username + 'autosave')), auto);
  assert.deepEqual(JSON.parse(storage.getItem(legacy.username + 'savearea'))[4], slot);
  store.newGame();
  assert.deepEqual(store.restoreAuto().progress, expected);
  assert.deepEqual(storedProgress(storage), expected);
  store.newGame();
  assert.deepEqual(store.restoreSlot(4).progress, expected);
  assert.deepEqual(storedProgress(storage), expected);
});

test('original game serializers produce compatible automatic and manual saves with identical progress', () => {
  const restored = [];
  for (const kind of ['auto', 'manual']) {
    const achievementKey = legacy.username + 'achievement';
    const flagKey = legacy.username + 'flag';
    const { storage, store } = setup({
      [legacy.username + 'autosave']: encoded(legacy.autosave),
      [legacy.username + 'savearea']: encoded(legacy.manualSlots),
      [achievementKey]: '{"ach2":1,"ach8":1}',
      [flagKey]: '1',
    });
    store.newGame();
    const snapshot = kind === 'auto' ? store.restoreAuto() : store.restoreSlot(legacy.manualSlot);
    const expected = {
      current: JSON.parse(legacy.activeStorage.current),
      levels: [1, 1, 1, 1, 1, 114],
      chapterName: '第五章',
      isFirstPlay: false, // Original saves did not record the tutorial flag.
    };
    assert.equal(snapshot.version, 1);
    assert.deepEqual(snapshot.progress, expected);
    assert.deepEqual(storedProgress(storage), expected);
    assert.equal(snapshot.savedAt, kind === 'auto' ? null : '2023/06/20 12:34');
    assert.equal(storage.getItem(achievementKey), '{"ach2":1,"ach8":1}');
    assert.equal(storage.getItem(flagKey), '1');
    restored.push(snapshot.progress);
  }
  assert.deepEqual(restored[0], restored[1]);
});

test('slot writes preserve other slots and saved progress remains isolated between accounts', () => {
  const { storage, store } = setup(legacy.activeStorage);
  const oldSlots = [...legacy.manualSlots];
  storage.setItem(legacy.username + 'savearea', encoded(oldSlots));
  const first = store.saveSlot(0);
  let slots = JSON.parse(storage.getItem(legacy.username + 'savearea'));
  assert.deepEqual(slots[legacy.manualSlot], legacy.manualSlots[legacy.manualSlot]);
  assert.deepEqual(slots[0], first);
  const firstAccountSlots = storage.getItem(legacy.username + 'savearea');
  storage.setItem('username', 'another-player');
  store.newGame();
  const second = store.saveSlot(0);
  store.saveAuto();
  assert.notDeepEqual(second.progress, first.progress);
  assert.equal(storage.getItem(legacy.username + 'savearea'), firstAccountSlots);
  assert.equal(storage.getItem(legacy.username + 'autosave'), null);
  storage.setItem('username', legacy.username);
  assert.deepEqual(store.restoreSlot(0).progress, first.progress);
});

test('slot listing distinguishes empty, ready, corrupt and unsupported saves without modifying storage', () => {
  const { storage, store } = setup(legacy.activeStorage);
  const valid = store.capture();
  storage.setItem(legacy.username + 'savearea', encoded([
    null,
    legacy.manualSlots[legacy.manualSlot],
    { current: 0, saveurl: 0, MSYgamename: 0 },
    { ...valid, version: 999 },
    { current: '{' },
    valid,
  ]));
  const before = storage.dump();
  const slots = store.listSlots();
  assert.equal(slots.length, 9);
  assert.deepEqual(slots.map(slot => slot.status), ['empty', 'ready', 'empty', 'invalid', 'invalid', 'ready', 'empty', 'empty', 'empty']);
  assert.deepEqual(slots[1].snapshot.progress.current, JSON.parse(legacy.activeStorage.current));
  assert.deepEqual(slots[5].snapshot, valid);
  assert.deepEqual(storage.dump(), before);
});

test('empty automatic saves and manual slots never replace current progress', () => {
  const autoKey = legacy.username + 'autosave';
  for (const value of [null, 'null', encoded({ saveurl: 1, current: 0, MSYgamename: 0 })]) {
    const { storage, store } = setup(legacy.activeStorage);
    if (value !== null) storage.setItem(autoKey, value);
    expectUnchanged(storage, () => store.restoreAuto(), 'EMPTY_SAVE');
  }
  for (const value of [null, '[]', '[null]', encoded([{ saveurl: 0, current: 0, MSYgamename: 0 }])]) {
    const { storage, store } = setup(legacy.activeStorage);
    if (value !== null) storage.setItem(legacy.username + 'savearea', value);
    expectUnchanged(storage, () => store.restoreSlot(0), 'EMPTY_SAVE');
  }
});

test('malformed, incomplete and unsupported snapshots are rejected before either restore changes storage', () => {
  const { store: source } = setup(legacy.activeStorage);
  const valid = source.capture();
  const brokenCurrent = structuredClone(valid);
  delete brokenCurrent.progress.current.hidden_clue_poison;
  const brokenLevel = structuredClone(valid);
  brokenLevel.progress.levels[0] = 114;
  const brokenCharacter = structuredClone(valid);
  brokenCharacter.progress.current.user_level.exp = -1;
  const brokenFlags = structuredClone(valid);
  brokenFlags.progress.current.perfect_level_complete = [true];
  const brokenTutorial = structuredClone(valid);
  brokenTutorial.progress.isFirstPlay = 'false';
  const invalid = [
    ['{', 'INVALID_SAVE'],
    [encoded({}), 'INVALID_SAVE'],
    [encoded(brokenCurrent), 'INVALID_SAVE'],
    [encoded(brokenLevel), 'INVALID_SAVE'],
    [encoded(brokenCharacter), 'INVALID_SAVE'],
    [encoded(brokenFlags), 'INVALID_SAVE'],
    [encoded(brokenTutorial), 'INVALID_SAVE'],
    [encoded({ ...legacy.autosave, current: '{' }), 'INVALID_SAVE'],
    [encoded({ ...valid, version: 999 }), 'UNSUPPORTED_VERSION'],
  ];
  for (const [raw, code] of invalid) {
    for (const kind of ['auto', 'manual']) {
      const { storage, store } = setup(legacy.activeStorage);
      if (kind === 'auto') storage.setItem(legacy.username + 'autosave', raw);
      else storage.setItem(legacy.username + 'savearea', '[' + raw + ']');
      expectUnchanged(storage, () => kind === 'auto' ? store.restoreAuto() : store.restoreSlot(0), code);
    }
  }
});

test('a broken slot collection cannot be silently overwritten, while an individual broken slot can be replaced', () => {
  for (const value of ['{', '{}', 'true']) {
    const { storage, store } = setup(legacy.activeStorage);
    storage.setItem(legacy.username + 'savearea', value);
    expectUnchanged(storage, () => store.saveSlot(0), 'INVALID_SAVE');
    expectUnchanged(storage, () => store.restoreSlot(0), 'INVALID_SAVE');
  }
  const { storage, store } = setup(legacy.activeStorage);
  storage.setItem(legacy.username + 'savearea', encoded([{}, legacy.manualSlots[legacy.manualSlot]]));
  const snapshot = store.saveSlot(0);
  const slots = JSON.parse(storage.getItem(legacy.username + 'savearea'));
  assert.deepEqual(slots[0], snapshot);
  assert.deepEqual(slots[1], legacy.manualSlots[legacy.manualSlot]);
});

test('invalid current progress cannot overwrite an existing automatic or manual save', () => {
  const invalidChanges = [
    ['current', '{'],
    ['current', encoded({ ...JSON.parse(legacy.activeStorage.current), user_level: { level: 0, exp: 2 } })],
    ['level2', '114'],
    ['level6', '2'],
    ['MSYgamename', ''],
    ['IsFirstPlay', 'sometimes'],
  ];
  for (const [key, value] of invalidChanges) {
    const { storage, store } = setup(legacy.activeStorage);
    store.saveAuto();
    store.saveSlot(0);
    storage.setItem(key, value);
    expectUnchanged(storage, () => store.saveAuto(), 'INVALID_PROGRESS');
    expectUnchanged(storage, () => store.saveSlot(0), 'INVALID_PROGRESS');
  }
});

test('save slots require a valid index and saved data requires a current account', () => {
  const { storage, store } = setup(legacy.activeStorage);
  for (const index of [-1, 9, 0.5, '0', undefined, NaN]) {
    expectUnchanged(storage, () => store.saveSlot(index), 'INVALID_SLOT');
    expectUnchanged(storage, () => store.restoreSlot(index), 'INVALID_SLOT');
  }
  storage.removeItem('username');
  for (const action of [() => store.saveAuto(), () => store.saveSlot(0), () => store.restoreAuto(), () => store.restoreSlot(0), () => store.listSlots()]) {
    expectUnchanged(storage, action, 'NO_USER');
  }
});

test('a failed restore rolls back all earlier writes, including keys that did not exist', () => {
  for (const initiallyEmpty of [false, true]) {
    const { storage, store } = setup();
    if (!initiallyEmpty) store.newGame();
    storage.setItem(legacy.username + 'autosave', encoded(legacy.autosave));
    storage.setItem(legacy.username + 'savearea', encoded(legacy.manualSlots));
    for (const restore of [() => store.restoreAuto(), () => store.restoreSlot(legacy.manualSlot)]) {
      storage.failNextWriteTo('level3');
      expectUnchanged(storage, restore, 'STORAGE_ERROR');
    }
  }
});

test('a failed new game or saved snapshot write leaves previous progress and saves intact', () => {
  const { storage, store } = setup(legacy.activeStorage);
  store.saveAuto();
  store.saveSlot(0);
  for (const [key, action] of [
    ['level3', () => store.newGame()],
    [legacy.username + 'autosave', () => store.saveAuto()],
    [legacy.username + 'savearea', () => store.saveSlot(0)],
  ]) {
    storage.failNextWriteTo(key);
    expectUnchanged(storage, action, 'STORAGE_ERROR');
  }
});

test('native browser storage exceptions are reported consistently without changing saved data', () => {
  const { storage, store } = setup(legacy.activeStorage);
  store.saveAuto();
  for (const name of ['QuotaExceededError', 'SecurityError']) {
    storage.failNextWriteTo(legacy.username + 'autosave', new DOMException('Browser storage failure', name));
    expectUnchanged(storage, () => store.saveAuto(), 'STORAGE_ERROR');
  }
});
