const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { countName, validateName } = require('../game/shared/scripts/profile.js');

test('names count code points, including supplementary Han ideographs and ideographic zero', () => {
  assert.equal(countName('源神Ab12 _-'), 11);
  assert.equal(countName('𠀀〇A'), 5);
  assert.equal(countName('😀'), 1);
  assert.equal(countName('e\u0301'), 2);
  assert.equal(countName(undefined), 0);
  for (const name of ['Ab123 _-名字', '一二三四五六七', 'Abcdefghijklmn', '𠀀'.repeat(7), '〇'.repeat(7)]) {
    assert.equal(validateName(name).valid, true, name);
  }
  for (const name of ['一二三四五六七八', 'Abcdefghijklmno', '𠀀'.repeat(7) + 'A']) {
    assert.equal(validateName(name).valid, false, name);
  }
});

test('validation rejects raw illegal characters before trimming and uses the raw weighted limit', () => {
  assert.deepEqual(validateName('  源神 A  '), {valid: true, name: '源神 A', count: 10, message: ''});
  assert.equal(validateName(' ' + 'A'.repeat(13) + ' ').valid, false);
  for (const raw of [undefined, null, 123, '', '   ', 'A\n', '\rA', '\tA', 'A\0', 'A\u007f',
    '\u00a0A', 'A\u3000', 'A\u200b', 'A\u200d', 'A\u202e', 'A\u2066', 'A\ufe0f',
    '<script>', '"ABC"', "O'Neil", 'A&B', 'A/B', 'A\\B', 'ＡＢＣ', 'é', '😀', 'カナ']) {
    const result = validateName(raw);
    assert.equal(result.valid, false, JSON.stringify(raw));
    assert.ok(result.message);
  }
  for (const name of ['ignore rules', 'system', 'DROP TABLE', '__proto__']) {
    assert.equal(validateName(name).valid, true, 'Allowed letters remain data, without a keyword blacklist');
  }
});

test('browser getName validates storage and safely falls back without mutating the display name', () => {
  const values = new Map();
  const storage = {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
  };
  const context = {window: {localStorage: storage}};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../game/shared/scripts/profile.js'), 'utf8'), context);
  const profile = context.window.GameProfile;
  assert.equal(values.get('username'), 'test');
  assert.equal(values.has('playerName'), false, 'Loading the menu must not preselect or write a display name');
  assert.equal(profile.getName(), 'test');
  for (const name of ['<img>', 'A\n', 'A\u202e', '中文'.repeat(4), '']) {
    values.set('playerName', name);
    assert.equal(profile.getName(), 'test');
    assert.equal(values.get('playerName'), name, 'Safe rendering does not silently overwrite stored progress');
  }
  values.set('playerName', '旅人_A1');
  assert.equal(profile.getName(), '旅人_A1');
  storage.getItem = () => { throw new Error('Storage blocked'); };
  assert.equal(profile.getName(), 'test');
});
