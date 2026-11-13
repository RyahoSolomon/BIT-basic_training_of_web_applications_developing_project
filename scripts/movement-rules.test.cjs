const assert = require('node:assert/strict');
const { test } = require('node:test');
const {
  findReachableCells, getWalkableNeighbors, isWalkableTerrain,
} = require('../game/battle/scripts/movement-rules.js');

function unit(overrides = {}) {
  return { x: 0, y: 0, side: 0, speed: 3, is_alive: true, ...overrides };
}

function board(rows, columns) {
  return Array.from({ length: rows }, () => Array(columns).fill(7));
}

function cellAt(cells, x, y) {
  return cells.find(cell => cell.x === x && cell.y === y);
}

function freeze(value) {
  if (value && typeof value === 'object') {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
  return value;
}

test('terrain passability preserves all existing blocked and walkable tile codes', () => {
  const blocked = [4, 11, 16, 17, 18];
  for (let code = 0; code <= 20; code++) {
    assert.equal(isWalkableTerrain(code), !blocked.includes(code), 'Terrain code ' + code);
    const state = { map: [[7, code, 7]], units: [unit({ speed: 2 })] };
    assert.deepEqual(findReachableCells(state, 0), blocked.includes(code) ? [] : [
      { x: 0, y: 1, distance: 1 }, { x: 0, y: 2, distance: 2 },
    ]);
  }
});

test('neighbors retain the old row-down, row-up, column-right, column-left order', () => {
  const map = board(3, 3);
  assert.deepEqual(getWalkableNeighbors(map, { x: 1, y: 1 }), [
    { x: 2, y: 1 }, { x: 0, y: 1 }, { x: 1, y: 2 }, { x: 1, y: 0 },
  ]);
  assert.deepEqual(getWalkableNeighbors(map, { x: 0, y: 0 }), [
    { x: 1, y: 0 }, { x: 0, y: 1 },
  ]);
  map[2][1] = 4;
  map[1][2] = 11;
  assert.deepEqual(getWalkableNeighbors(map, { x: 1, y: 1 }), [
    { x: 0, y: 1 }, { x: 1, y: 0 },
  ]);
});

test('zero or negative speed and dead actors have no movement destinations', () => {
  for (const speed of [0, -1]) {
    assert.deepEqual(findReachableCells({ map: board(3, 3), units: [unit({ speed })] }, 0), []);
  }
  assert.deepEqual(findReachableCells({ map: board(3, 3), units: [unit({ is_alive: false })] }, 0), []);
  assert.deepEqual(findReachableCells({ map: [[7]], units: [unit({ speed: 100 })] }, 0), []);
});

test('speed includes its exact boundary, excludes the origin and preserves destination order', () => {
  const state = { map: board(5, 5), units: [unit({ x: 2, y: 2, speed: 1 })] };
  const firstStep = [
    { x: 3, y: 2, distance: 1 }, { x: 1, y: 2, distance: 1 },
    { x: 2, y: 3, distance: 1 }, { x: 2, y: 1, distance: 1 },
  ];
  assert.deepEqual(findReachableCells(state, 0), firstStep);
  state.units[0].speed = 2;
  assert.deepEqual(findReachableCells(state, 0), [...firstStep,
    { x: 4, y: 2, distance: 2 }, { x: 3, y: 3, distance: 2 }, { x: 3, y: 1, distance: 2 },
    { x: 0, y: 2, distance: 2 }, { x: 1, y: 3, distance: 2 }, { x: 1, y: 1, distance: 2 },
    { x: 2, y: 4, distance: 2 }, { x: 2, y: 0, distance: 2 },
  ]);
});

test('movement cost follows the shortest walkable path instead of Manhattan distance', () => {
  const state = {
    map: [[7, 4, 7], [7, 4, 7], [7, 7, 7]],
    units: [unit({ speed: 4 })],
  };
  const shortRange = findReachableCells(state, 0);
  assert.deepEqual(cellAt(shortRange, 2, 2), { x: 2, y: 2, distance: 4 });
  assert.equal(cellAt(shortRange, 0, 2), undefined, 'A nearby cell beyond the wall takes six steps');
  assert.equal(cellAt(shortRange, 1, 2), undefined, 'The five-step cell lies outside speed four');
  state.units[0].speed = 6;
  assert.deepEqual(cellAt(findReachableCells(state, 0), 0, 2), { x: 0, y: 2, distance: 6 });
});

test('consecutive friendly units can be crossed but cannot be destinations', () => {
  const state = {
    map: board(1, 5),
    units: [unit({ speed: 4 }), unit({ y: 1 }), unit({ y: 2 })],
  };
  assert.deepEqual(findReachableCells(state, 0), [
    { x: 0, y: 3, distance: 3 }, { x: 0, y: 4, distance: 4 },
  ]);
  state.units[0].speed = 2;
  assert.deepEqual(findReachableCells(state, 0), [], 'Crossing allies still consumes movement steps');
});

test('enemies block a narrow corridor while a longer path can go around them', () => {
  const units = [unit({ speed: 4 }), unit({ y: 1, side: 1 })];
  assert.deepEqual(findReachableCells({ map: board(1, 3), units }, 0), []);
  const around = findReachableCells({ map: board(2, 3), units }, 0);
  assert.equal(cellAt(around, 0, 1), undefined, 'An enemy is never a destination');
  assert.deepEqual(cellAt(around, 0, 2), { x: 0, y: 2, distance: 4 });
});

test('dead allies and enemies neither block a path nor occupy its destination', () => {
  const state = {
    map: board(1, 4),
    units: [unit(), unit({ y: 1, is_alive: false }), unit({ y: 2, side: 1, is_alive: false })],
  };
  assert.deepEqual(findReachableCells(state, 0), [
    { x: 0, y: 1, distance: 1 }, { x: 0, y: 2, distance: 2 }, { x: 0, y: 3, distance: 3 },
  ]);
});

test('switching sides and player/computer control does not change movement rules', () => {
  const state = {
    map: board(2, 4),
    units: [unit({ commander_type: 'player' }), unit({ y: 1 }), unit({ y: 3, side: 1 })],
  };
  const playerRange = findReachableCells(state, 0);
  const switched = {
    map: state.map,
    units: state.units.map(candidate => ({
      ...candidate, side: 1 - candidate.side, commander_type: 'computer',
    })),
  };
  assert.deepEqual(findReachableCells(switched, 0), playerRange);
});

test('movement uses the requested actor rather than an implicit current unit or uuid', () => {
  const state = {
    map: board(2, 4),
    units: [unit({ speed: 0 }), unit({ x: 1, y: 3, side: 1, speed: 1 })],
  };
  assert.deepEqual(findReachableCells(state, 1), [
    { x: 0, y: 3, distance: 1 }, { x: 1, y: 2, distance: 1 },
  ]);
  assert.deepEqual(findReachableCells(state, 0), []);
});

test('searches do not mutate frozen state or return duplicate destinations through cycles', () => {
  const state = freeze({ map: board(3, 3), units: [unit({ x: 1, y: 1, speed: 10 })] });
  const before = structuredClone(state);
  const cells = findReachableCells(state, 0);
  assert.equal(cells.length, 8);
  assert.equal(new Set(cells.map(cell => cell.x + ',' + cell.y)).size, 8);
  assert.equal(cellAt(cells, 1, 1), undefined);
  assert.deepEqual(cellAt(cells, 0, 0), { x: 0, y: 0, distance: 2 });
  assert.deepEqual(findReachableCells(state, 0), cells, 'Repeated searches have stable order');
  assert.deepEqual(state, before);
});
