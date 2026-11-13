const assert = require('node:assert/strict');
const { test } = require('node:test');
const { resolveDamage, gainExperience, EXPERIENCE_THRESHOLDS } = require('../game/battle/scripts/battle-rules.js');

function player(overrides = {}) {
  return {
    name: 'user', name_cn: '主角', commander_type: 'player', side: 0,
    health: 6, armor: 2, is_alive: true, exp: 0, level: 1,
    ...overrides,
  };
}

function enemy(overrides = {}) {
  return {
    name: 'goblin', name_cn: '哥布林', commander_type: 'computer', side: 1,
    health: 4, armor: 1, is_alive: true, exp: 9,
    ...overrides,
  };
}

function battle(units, overrides = {}) {
  return { units, spiritCount: 0, achievements: { ach3: false, ach7: false }, ...overrides };
}

function freeze(value) {
  if (value && typeof value === 'object') {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
  return value;
}

function unlocks(result, key) {
  return result.events.filter(event => event.type === 'achievement-unlocked' && event.key === key);
}

test('ordinary damage consumes armor before health without requiring a page or storage', () => {
  const initial = freeze(battle([player(), enemy({ health: 5, armor: 3 })]));
  const before = structuredClone(initial);
  const blocked = resolveDamage(initial, { targetId: 1, amount: 2, sourceId: 0 });
  assert.equal(blocked.state.units[1].armor, 1);
  assert.equal(blocked.state.units[1].health, 5);
  assert.equal(blocked.died, false);
  assert.deepEqual(blocked.events, []);
  const pierced = resolveDamage(blocked.state, { targetId: 1, amount: 3, sourceId: 0 });
  assert.equal(pierced.state.units[1].armor, 0);
  assert.equal(pierced.state.units[1].health, 3);
  assert.equal(pierced.state.units[1].is_alive, true);
  assert.equal(pierced.state.units[0].exp, 0);
  assert.deepEqual(initial, before, 'Damage resolution must not mutate its input');
});

test('zero damage is inert and lethal overkill clamps health and armor at zero', () => {
  const initial = battle([enemy({ health: 4, armor: 2 })]);
  const zero = resolveDamage(initial, { targetId: 0, amount: 0 });
  assert.deepEqual(zero.state, initial);
  assert.deepEqual(zero.events, []);
  assert.equal(zero.died, false);
  const lethal = resolveDamage(initial, { targetId: 0, amount: 100 });
  assert.equal(lethal.state.units[0].health, 0);
  assert.equal(lethal.state.units[0].armor, 0);
  assert.equal(lethal.state.units[0].is_alive, false);
  assert.equal(lethal.died, true);
  assert.deepEqual(lethal.events, [{ type: 'unit-died', unitId: 0 }]);
});

test('damage that bypasses armor preserves armor and still settles a death exactly once', () => {
  const initial = battle([player({ health: 2, armor: 10 })]);
  const lethal = resolveDamage(initial, { targetId: 0, amount: 2, ignoreArmor: true });
  assert.equal(lethal.state.units[0].health, 0);
  assert.equal(lethal.state.units[0].armor, 10);
  assert.equal(lethal.died, true);
  assert.deepEqual(lethal.events, [{ type: 'unit-died', unitId: 0 }]);
  const repeated = resolveDamage(lethal.state, { targetId: 0, amount: 2, ignoreArmor: true });
  assert.deepEqual(repeated.state, lethal.state);
  assert.deepEqual(repeated.events, []);
  assert.equal(repeated.died, false);
});

test('a dead spirit cannot award repeated kills or experience from later damage', () => {
  const initial = battle([player(), player({ name: 'yuanlan' }), enemy({ name: 'spirit', health: 1, armor: 0, exp: 8 })]);
  const first = resolveDamage(initial, { targetId: 2, amount: 1, sourceId: 0 });
  assert.equal(first.state.spiritCount, 1);
  assert.equal(first.state.units[0].exp, 8);
  assert.equal(first.state.units[1].exp, 2);
  assert.equal(first.died, true);
  for (const hit of [
    { targetId: 2, amount: 2 }, // Bleeding after death.
    { targetId: 2, amount: 4 }, // Poison after death.
    { targetId: 2, amount: 2, ignoreArmor: true }, // Lava after death.
    { targetId: 2, amount: 10, sourceId: 0 }, // Another direct hit.
  ]) {
    const repeated = resolveDamage(freeze(first.state), hit);
    assert.deepEqual(repeated.state, first.state);
    assert.equal(repeated.died, false);
    assert.deepEqual(repeated.events, []);
  }
});

test('eight spirit kills require eight distinct living units, even when summoned units lack uuid', () => {
  let state = battle([player(), ...Array.from({ length: 8 }, () => enemy({ name: 'spirit', health: 1, armor: 0, exp: 0 }))]);
  for (let targetId = 1; targetId <= 8; targetId++) {
    state = resolveDamage(state, { targetId, amount: 1 }).state;
    for (let tick = 0; tick < 12; tick++) {
      const repeated = resolveDamage(state, { targetId, amount: 2, ignoreArmor: tick % 2 === 0 });
      assert.equal(repeated.died, false);
      assert.deepEqual(repeated.events, []);
      state = repeated.state;
    }
    assert.equal(state.spiritCount, targetId);
    assert.equal(state.spiritCount >= 8, targetId === 8, 'A corpse must not advance the fifth battle objective');
  }
});

test('enemy kill rewards the player source and shares rounded-down experience only with other living players', () => {
  const initial = freeze(battle([
    player(),
    player({ name: 'yuanlan' }),
    player({ name: 'yedai', is_alive: false, health: 0 }),
    enemy({ side: 0 }),
    enemy({ health: 1, armor: 0, exp: 11 }),
  ]));
  const result = resolveDamage(initial, { targetId: 4, amount: 1, sourceId: 0 });
  assert.deepEqual(result.state.units.map(unit => unit.exp), [11, 2, 0, 9, 11]);
  assert.deepEqual(initial.units.map(unit => unit.exp), [0, 0, 0, 9, 11]);
});

test('a dead player source still receives its trap kill experience under the existing rules', () => {
  const initial = battle([
    player({ is_alive: false, health: 0 }),
    player({ name: 'yuanlan' }),
    enemy({ health: 1, armor: 0, exp: 8 }),
  ]);
  const result = resolveDamage(initial, { targetId: 2, amount: 1, sourceId: 0 });
  assert.equal(result.state.units[0].exp, 8);
  assert.equal(result.state.units[0].is_alive, false);
  assert.equal(result.state.units[1].exp, 2);
});

test('environmental damage, computer kills and friendly fire do not award enemy-kill experience', () => {
  for (const sourceId of [undefined, null, 2]) {
    const initial = battle([player(), enemy({ health: 1, armor: 0 }), enemy({ side: 0 })]);
    const result = resolveDamage(initial, { targetId: 1, amount: 1, sourceId });
    assert.deepEqual(result.state.units.map(unit => unit.exp), initial.units.map(unit => unit.exp));
  }
  const friendly = battle([player(), player({ name: 'yuanlan', health: 1, armor: 0, exp: 12 })]);
  const result = resolveDamage(friendly, { targetId: 1, amount: 1, sourceId: 0 });
  assert.equal(result.state.units[0].exp, 0);
  assert.equal(result.state.units[1].exp, 12);
  const sameSide = battle([player({ side: 1 }), enemy({ health: 1, armor: 0 })]);
  assert.equal(resolveDamage(sameSide, { targetId: 1, amount: 1, sourceId: 0 }).state.units[0].exp, 0);
});

test('experience keeps the existing strict threshold, one-level-per-award behavior and level-six cap', () => {
  assert.deepEqual(EXPERIENCE_THRESHOLDS, [20, 48, 96, 144, 216]);
  const initial = freeze(battle([player()]));
  const atThreshold = gainExperience(initial, 0, 20);
  assert.equal(atThreshold.state.units[0].level, 1);
  assert.equal(atThreshold.state.units[0].exp, 20);
  const aboveThreshold = gainExperience(atThreshold.state, 0, 1);
  assert.equal(aboveThreshold.state.units[0].level, 2);
  assert.equal(aboveThreshold.state.units[0].exp, 1);
  const largeAward = gainExperience(initial, 0, 200);
  assert.equal(largeAward.state.units[0].level, 2);
  assert.equal(largeAward.state.units[0].exp, 180);
  const maxed = gainExperience(battle([player({ level: 6, exp: 10 })]), 0, 1000);
  assert.equal(maxed.state.units[0].level, 6);
  assert.equal(maxed.state.units[0].exp, 1010);
  assert.equal(initial.units[0].exp, 0);
  assert.equal(initial.units[0].level, 1);
});

test('kill rewards also apply level advancement before returning the resulting state', () => {
  const initial = battle([
    player({ level: 1, exp: 19 }),
    player({ name: 'yuanlan', level: 2, exp: 48 }),
    enemy({ health: 1, armor: 0, exp: 8 }),
  ]);
  const result = resolveDamage(initial, { targetId: 2, amount: 1, sourceId: 0 });
  assert.equal(result.state.units[0].level, 2);
  assert.equal(result.state.units[0].exp, 7);
  assert.equal(result.state.units[1].level, 3);
  assert.equal(result.state.units[1].exp, 2);
});

test('maximum-level achievement considers dead players and emits only one unlock event', () => {
  const initial = freeze(battle([
    player({ level: 5, exp: 216 }),
    player({ name: 'yuanlan', level: 6 }),
    player({ name: 'yedai', level: 5, exp: 216, health: 0, is_alive: false }),
  ]));
  const stillMissing = gainExperience(initial, 0, 1);
  assert.equal(stillMissing.state.achievements.ach7, false);
  assert.deepEqual(unlocks(stillMissing, 'ach7'), []);
  const allMax = gainExperience(stillMissing.state, 2, 1);
  assert.equal(allMax.state.achievements.ach7, true);
  assert.equal(unlocks(allMax, 'ach7').length, 1);
  const repeated = gainExperience(allMax.state, 1, 10);
  assert.deepEqual(unlocks(repeated, 'ach7'), []);
  assert.equal(initial.achievements.ach7, false);
});

test('friendly-fire achievement is returned as data only for the original two player killers', () => {
  for (const name of ['user', 'yuanlan']) {
    const initial = freeze(battle([player({ name }), player({ name: 'yedai', name_cn: '叶岱', health: 1, armor: 0 })]));
    const killed = resolveDamage(initial, { targetId: 1, amount: 1, sourceId: 0 });
    assert.equal(killed.state.achievements.ach3, true);
    assert.equal(unlocks(killed, 'ach3').length, 1);
    assert.equal(killed.events.filter(event => event.type === 'unit-died').length, 1);
    assert.equal(initial.achievements.ach3, false);
    const repeated = resolveDamage(killed.state, { targetId: 1, amount: 2, sourceId: 0 });
    assert.deepEqual(repeated.events, []);
  }
  for (const killer of [player({ name: 'yedai' }), enemy({ name: 'user' })]) {
    const result = resolveDamage(battle([killer, player({ name: 'yedai', health: 1, armor: 0 })]),
      { targetId: 1, amount: 1, sourceId: 0 });
    assert.equal(result.state.achievements.ach3, false);
    assert.deepEqual(unlocks(result, 'ach3'), []);
  }
  const environmental = resolveDamage(battle([player({ name: 'yedai', health: 1, armor: 0 })]), { targetId: 0, amount: 1 });
  assert.equal(environmental.state.achievements.ach3, false);
});

test('already-unlocked numeric achievement flags are not emitted again', () => {
  const initial = battle([player({ level: 6 }), player({ name: 'yedai', level: 6, health: 1, armor: 0 })],
    { achievements: { ach3: 1, ach7: 1 } });
  const killed = resolveDamage(initial, { targetId: 1, amount: 1, sourceId: 0 });
  assert.deepEqual(unlocks(killed, 'ach3'), []);
  assert.deepEqual(unlocks(gainExperience(killed.state, 0, 1), 'ach7'), []);
});

test('invalid targets, sources and damage or experience amounts are rejected without mutation', () => {
  const initial = freeze(battle([player(), enemy()]));
  const before = structuredClone(initial);
  for (const targetId of [-1, 2, 0.5, '1', undefined]) {
    assert.throws(() => resolveDamage(initial, { targetId, amount: 1 }));
  }
  for (const sourceId of [-1, 2, 0.5, '0']) {
    assert.throws(() => resolveDamage(initial, { targetId: 1, amount: 1, sourceId }));
  }
  for (const amount of [-1, NaN, Infinity, -Infinity, '2', null]) {
    assert.throws(() => resolveDamage(initial, { targetId: 1, amount }));
    assert.throws(() => gainExperience(initial, 0, amount));
  }
  for (const unitId of [-1, 2, 0.5, '0']) assert.throws(() => gainExperience(initial, unitId, 1));
  assert.deepEqual(initial, before);
});
