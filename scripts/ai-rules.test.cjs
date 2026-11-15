const assert = require('node:assert/strict');
const { test } = require('node:test');
const { getCandidates, chooseAction } = require('../game/battle/scripts/ai-rules.js');
const { findReachableCells } = require('../game/battle/scripts/movement-rules.js');

function actor(overrides = {}) {
  return { x: 0, y: 0, side: 1, is_alive: true, speed: 1, min_range: 1, max_range: 1, AI_type: 'normal', ...overrides };
}

function enemy(x, y, overrides = {}) {
  return { x, y, side: 0, is_alive: true, ...overrides };
}

function freeze(value) {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}

test('AI candidates use the same ordered movement result without mutating battle state', () => {
  const state = freeze({ map: [[0, 0, 0, 0]], units: [actor({ speed: 2 }), enemy(0, 3)] });
  const before = structuredClone(state);
  const candidates = getCandidates(state, 0);
  assert.deepEqual(candidates.reachableCells, findReachableCells(state, 0));
  chooseAction(state, 0, () => 0.5);
  assert.deepEqual(state, before);
});

test('all attack destinations retain equal priority even when enemy distances differ', () => {
  const state = { map: [[0, 0, 0, 0]], units: [actor({ speed: 2, max_range: 3 }), enemy(0, 3)] };
  const { attackMoves } = getCandidates(state, 0);
  assert.deepEqual(attackMoves.map(move => move.enemyDistance), [2, 1]);
  let calls = 0;
  assert.deepEqual(chooseAction(state, 0, () => { calls++; return 0; }),
    { type: 'attack', x: 0, y: 1, targetId: 1 });
  assert.deepEqual(chooseAction(state, 0, () => { calls++; return 0.99; }),
    { type: 'attack', x: 0, y: 2, targetId: 1 });
  assert.equal(calls, 2, 'Exactly one random choice per tied action');
});

test('minimum range and enemy-blocked target searches preserve the existing targeting rules', () => {
  const state = { map: [[0, 0, 0, 0]], units: [actor({ min_range: 2, max_range: 3 }), enemy(0, 2), enemy(0, 3)] };
  const candidates = getCandidates(state, 0);
  assert.deepEqual(candidates.attackMoves, []);
  assert.deepEqual(chooseAction(state, 0, () => { throw new Error('Only one candidate'); }),
    { type: 'move', x: 0, y: 1 });
});

test('unreachable enemies remain outside target search even inside nominal attack range', () => {
  const state = { map: [[0, 0, 4, 0]], units: [actor({ max_range: 10 }), enemy(0, 3)] };
  const candidates = getCandidates(state, 0);
  assert.deepEqual(candidates.attackMoves, []);
  assert.equal(candidates.moveMoves[0].enemyDistance, 1000);
});

test('equidistant targets keep grid traversal order instead of unit-array order', () => {
  const state = {
    map: Array.from({ length: 3 }, () => [0, 0, 0]),
    units: [actor({ x: 1, y: 1 }), enemy(2, 0), enemy(2, 2)],
  };
  const destination = getCandidates(state, 0).attackMoves.find(move => move.x === 2 && move.y === 1);
  assert.equal(destination.targetId, 2, 'y + 1 is visited before y - 1');
});

test('move-only decisions approach the closest enemy and do not randomize a unique best cell', () => {
  const state = {
    map: Array.from({ length: 3 }, () => [0, 0, 0, 0]),
    units: [actor({ x: 1, y: 0 }), enemy(1, 3)],
  };
  assert.deepEqual(chooseAction(state, 0, () => { throw new Error('Best move is unique'); }),
    { type: 'move', x: 1, y: 1 });
});

test('tied move-only destinations keep stable search order', () => {
  const state = {
    map: Array.from({ length: 3 }, () => [0, 0, 0]),
    units: [actor(), enemy(2, 2)],
  };
  assert.deepEqual(chooseAction(state, 0, () => 0), { type: 'move', x: 1, y: 0 });
  assert.deepEqual(chooseAction(state, 0, () => 0.99), { type: 'move', x: 0, y: 1 });
});

test('waiting and immobile units retain their position without adding an in-place attack', () => {
  for (const unit of [actor({ speed: 0 }), actor({ AI_type: 'wait', speed: 4 })]) {
    const state = { map: [[0, 0]], units: [unit, enemy(0, 1)] };
    assert.deepEqual(chooseAction(state, 0, () => { throw new Error('No random choice needed'); }),
      { type: 'wait', x: 0, y: 0 });
  }
});

test('dead enemies do not create attack candidates or affect the closest-enemy distance', () => {
  const state = { map: [[0, 0, 0]], units: [actor({ max_range: 4 }), enemy(0, 2, { is_alive: false })] };
  const candidates = getCandidates(state, 0);
  assert.deepEqual(candidates.attackMoves, []);
  assert.equal(candidates.moveMoves[0].enemyDistance, 1000);
});
