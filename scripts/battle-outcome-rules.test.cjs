const assert = require('node:assert/strict');
const { test } = require('node:test');
const { evaluate } = require('../game/battle/scripts/battle-outcome-rules.js');

function player(overrides = {}) {
  return { name: 'user', commander_type: 'player', side: 0, is_alive: true, x: 1, y: 1, ...overrides };
}

function enemy(overrides = {}) {
  return { name: 'goblin', commander_type: 'computer', side: 1, is_alive: true, x: 1, y: 8, ...overrides };
}

function ally(name, overrides = {}) {
  return { name, commander_type: 'computer', side: 0, is_alive: true, x: 2, y: 1, ...overrides };
}

function battle(overrides = {}) {
  return {
    level: 0, round: 1, spiritCount: 0,
    units: [player(), player({ name: 'yuanlan' }), enemy()],
    achievements: { ach1: false, ach4: false, ach8: false },
    perfectLevels: [false, false, false, false, false, false],
    ...overrides,
  };
}

function freeze(value) {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}

test('all six levels remain ongoing before their objective is met', () => {
  for (let level = 0; level < 6; level++) {
    const initial = battle({ level });
    initial.units.push(ally('zijue'), ally('desperate'));
    const result = evaluate(initial);
    assert.equal(result.outcome, 'ongoing', `level ${level}`);
    assert.deepEqual(result.achievementKeys, []);
    assert.deepEqual(result.perfectLevels, initial.perfectLevels);
  }
});

test('levels zero through three win when the last enemy is dead', () => {
  for (let level = 0; level <= 3; level++) {
    const result = evaluate(battle({
      level,
      units: [player(), player({ name: 'yedai' }), enemy({ is_alive: false }), ally('zijue')],
    }));
    assert.equal(result.outcome, 'win', `level ${level}`);
    assert.equal(result.perfectLevels[level], true);
    assert.deepEqual(result.achievementKeys, level === 0 ? ['ach8'] : []);
  }
});

test('level zero accepts all three exit cells and any living friendly unit without granting the kill achievement', () => {
  for (const x of [3, 4, 5]) {
    for (const visitor of [player({ x, y: 19 }), ally('escort', { x, y: 19 })]) {
      const result = evaluate(battle({ units: [player(), player({ name: 'yedai' }), enemy(), visitor] }));
      assert.equal(result.outcome, 'win');
      assert.deepEqual(result.achievementKeys, []);
    }
  }
  for (const visitor of [
    ally('escort', { x: 2, y: 19 }),
    ally('escort', { x: 6, y: 19 }),
    ally('escort', { x: 4, y: 18 }),
    ally('escort', { x: 4, y: 19, is_alive: false }),
    enemy({ x: 4, y: 19 }),
  ]) {
    assert.equal(evaluate(battle({ units: [player(), enemy(), visitor] })).outcome, 'ongoing');
  }
});

test('player defeat takes precedence over every simultaneous victory condition in levels zero through four', () => {
  for (let level = 0; level <= 4; level++) {
    const initial = battle({
      level, spiritCount: 8,
      units: [player({ is_alive: false }), enemy({ is_alive: false }), ally('zijue', { x: 4, y: 19 })],
      perfectLevels: [true, true, true, true, true, true],
    });
    const result = evaluate(initial);
    assert.equal(result.outcome, 'lose', `level ${level}`);
    assert.deepEqual(result.achievementKeys, []);
    assert.deepEqual(result.perfectLevels, initial.perfectLevels);
  }
});

test('a living NPC cannot replace all missing player characters in levels zero through four', () => {
  for (let level = 0; level <= 4; level++) {
    assert.equal(evaluate(battle({ level, units: [ally('zijue'), enemy()] })).outcome, 'lose');
  }
});

test('level three requires the first friendly Zijue to survive, including on a cleared board', () => {
  const cleared = [player(), enemy({ is_alive: false })];
  for (const guardians of [
    [],
    [ally('zijue', { is_alive: false })],
    [ally('zijue', { side: 1, is_alive: false })],
    [ally('zijue', { is_alive: false }), ally('zijue')],
  ]) {
    assert.equal(evaluate(battle({ level: 3, units: [...cleared, ...guardians] })).outcome, 'lose');
  }
  assert.equal(evaluate(battle({ level: 3, units: [...cleared, ally('zijue'), ally('zijue', { is_alive: false })] })).outcome, 'win');
});

test('level four wins at eight spirits even while enemies remain, but clearing enemies alone is insufficient', () => {
  assert.equal(evaluate(battle({ level: 4, spiritCount: 7 })).outcome, 'ongoing');
  for (const spiritCount of [8, 9]) {
    assert.equal(evaluate(battle({ level: 4, spiritCount })).outcome, 'win');
  }
  assert.equal(evaluate(battle({ level: 4, units: [player(), enemy({ is_alive: false })] })).outcome, 'ongoing');
});

test('the extra level requires the guardian to survive through the round twenty boundary', () => {
  const units = [player(), enemy(), ally('desperate')];
  assert.equal(evaluate(battle({ level: 5, round: 19, units })).outcome, 'ongoing');
  for (const round of [20, 21]) {
    assert.equal(evaluate(battle({ level: 5, round, units })).outcome, 'win');
    for (const guardians of [[], [ally('desperate', { is_alive: false })], [ally('desperate', { side: 1 })]]) {
      assert.equal(evaluate(battle({ level: 5, round, units: [player(), ...guardians] })).outcome, 'lose');
    }
  }
});

test('the extra level continues after all players die while its guardian survives', () => {
  const units = [player({ is_alive: false }), enemy(), ally('desperate')];
  const before = evaluate(battle({ level: 5, round: 19, units }));
  assert.equal(before.outcome, 'ongoing');
  const after = evaluate(battle({ level: 5, round: 20, units }));
  assert.equal(after.outcome, 'win');
  assert.equal(after.perfectLevels[5], false);
  assert.deepEqual(after.achievementKeys, []);
});

test('a perfect win depends on player survival and does not require NPC survival', () => {
  const result = evaluate(battle({
    level: 2,
    units: [player(), player({ name: 'yedai' }), enemy({ is_alive: false }), ally('escort', { is_alive: false })],
  }));
  assert.equal(result.outcome, 'win');
  assert.deepEqual(result.perfectLevels, [false, false, true, false, false, false]);
  assert.deepEqual(result.achievementKeys, []);
});

test('a later imperfect win never removes a previously perfect completion', () => {
  const initial = battle({
    level: 2,
    units: [player(), player({ name: 'yedai', is_alive: false }), enemy({ is_alive: false })],
    perfectLevels: [true, false, true, false, false, false],
  });
  const result = evaluate(initial);
  assert.equal(result.outcome, 'win');
  assert.deepEqual(result.perfectLevels, initial.perfectLevels);
  assert.deepEqual(result.achievementKeys, ['ach4']);
});

test('a last perfect completion grants achievements in kill, all-perfect, sole-survivor order', () => {
  const result = evaluate(battle({
    units: [player(), enemy({ is_alive: false })],
    perfectLevels: [false, true, true, true, true, true],
  }));
  assert.equal(result.outcome, 'win');
  assert.deepEqual(result.perfectLevels, [true, true, true, true, true, true]);
  assert.deepEqual(result.achievementKeys, ['ach8', 'ach1', 'ach4']);
});

test('all-perfect and sole-survivor achievements have independent conditions', () => {
  const initial = battle({
    level: 1,
    units: [player(), player({ name: 'yedai', is_alive: false }), enemy({ is_alive: false }), ally('escort')],
    perfectLevels: [true, false, true, true, true, true],
  });
  const imperfect = evaluate(initial);
  assert.equal(imperfect.perfectLevels[1], false);
  assert.deepEqual(imperfect.achievementKeys, ['ach4']);
  initial.perfectLevels[1] = true;
  assert.deepEqual(evaluate(initial).achievementKeys, ['ach1', 'ach4']);
});

test('already unlocked achievements are omitted and applying awards makes repeated evaluation inert', () => {
  const initial = battle({
    units: [player(), enemy({ is_alive: false })],
    perfectLevels: [false, true, true, true, true, true],
    achievements: { ach1: true, ach4: false, ach8: true },
  });
  const first = evaluate(initial);
  assert.deepEqual(first.achievementKeys, ['ach4']);
  const after = {
    ...initial,
    perfectLevels: first.perfectLevels,
    achievements: { ...initial.achievements, ...Object.fromEntries(first.achievementKeys.map(key => [key, true])) },
  };
  assert.deepEqual(evaluate(after).achievementKeys, []);
  assert.equal(evaluate(after).outcome, 'win');
});

test('numeric legacy flags keep their boolean meaning when deciding awards', () => {
  const result = evaluate(battle({
    units: [player(), enemy({ is_alive: false })],
    perfectLevels: [0, 1, 1, 1, 1, 1],
    achievements: { ach1: 1, ach4: 0, ach8: 0 },
  }));
  assert.deepEqual(result.achievementKeys, ['ach8', 'ach4']);
  assert.equal(result.perfectLevels[0], true);
});

test('evaluation is deterministic and never changes the supplied state for any outcome', () => {
  for (const initial of [
    battle(),
    battle({ units: [player(), enemy({ is_alive: false })] }),
    battle({ units: [player({ is_alive: false }), enemy({ is_alive: false })] }),
  ]) {
    const before = structuredClone(initial);
    freeze(initial);
    const first = evaluate(initial);
    assert.deepEqual(evaluate(initial), first);
    assert.deepEqual(initial, before);
    assert.notEqual(first.perfectLevels, initial.perfectLevels);
  }
});

test('an unknown level remains ongoing without granting achievements', () => {
  const initial = battle({ level: 6, units: [player(), enemy({ is_alive: false })] });
  const result = evaluate(initial);
  assert.equal(result.outcome, 'ongoing');
  assert.deepEqual(result.achievementKeys, []);
  assert.deepEqual(result.perfectLevels, initial.perfectLevels);
});
