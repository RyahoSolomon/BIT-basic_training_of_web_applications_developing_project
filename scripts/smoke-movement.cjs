// Verify shared movement ranges and actual player/AI actions in an isolated browser.
const assert = require('node:assert/strict');
const { withBrowser } = require('./smoke-browser.cjs');

const battlePage = 'game/battle/index.html';

async function smoke({ evaluate, pointerClick, page, open, until }) {
  async function click(selector) {
    await until('clickable image ' + selector, () => evaluate(`(() => {
      const element = document.querySelector(${JSON.stringify(selector)});
      return element && (!(element instanceof HTMLImageElement) || (element.complete && element.naturalWidth > 0));
    })()`));
    await pointerClick(selector);
  }
  await open('game/pages/menu.html');

  async function startBattle(level = 1) {
    await evaluate(`(() => {
      localStorage.clear();
      localStorage.setItem('username', 'movement-smoke-player');
      localStorage.setItem('movement-smoke-playerachievement', JSON.stringify({
        ach1: false, ach2: false, ach3: false, ach4: false,
        ach5: false, ach6: false, ach7: false, ach8: false,
      }));
      GameProgress.newGame();
      const current = JSON.parse(localStorage.current);
      current.level = ${level};
      current.is_plot_music_on = false;
      current.is_inwar_music_on = false;
      localStorage.setItem('current', JSON.stringify(current));
      localStorage.setItem('IsFirstPlay', 'false');
    })()`);
    await open(battlePage);
    await click('#mission_confirm_mask');
  }

  let comparedUnits = 0;
  for (let level = 0; level < 6; level++) {
    await startBattle(level);
    const ranges = await evaluate(`(() => {
      const result = [];
      for (let id = 0; id < units.length; id++) {
        if (!units[id].is_alive) continue;
        current_act_unit = id;
        have_moved = false;
        const state = read_battle_state();
        const before = units.map(unit => [unit.x, unit.y, unit.speed]);
        const shared = MovementRules.findReachableCells(state, id);
        const ai = AiRules.getCandidates(state, id).reachableCells;
        selected_move(id);
        const highlighted = Array.from(document.querySelectorAll('#mask img.clickable_mask'),
          element => element.id.split('_').map(Number));
        result.push({id, side: units[id].side, before,
          after: units.map(unit => [unit.x, unit.y, unit.speed]),
          shared: shared.map(cell => [cell.x, cell.y]),
          ai: ai.map(cell => [cell.x, cell.y]), highlighted});
      }
      return result;
    })()`);
    assert.ok(ranges.some(range => range.side === 0));
    assert.ok(ranges.some(range => range.side === 1));
    for (const range of ranges) {
      const label = `Map ${level + 1}, unit ${range.id}`;
      assert.deepEqual(range.highlighted, range.shared, label + ': player highlight order');
      assert.deepEqual(range.ai, range.shared, label + ': AI candidate order');
      assert.deepEqual(range.after, range.before, label + ': range queries do not move units');
      comparedUnits++;
    }
  }
  console.log('PASS  six actual battle maps share player highlights and AI ranges for ' + comparedUnits + ' living units');

  await startBattle();
  await evaluate(`(() => {
    map = Array.from({length: height}, () => Array(width).fill(4));
    for (let y = 1; y <= 6; y++) map[4][y] = 7;
    units = [new Protagonist(0), new YuanLan(1), new Goblin(2), new Ghoul(3)];
    Object.assign(units[0], {x: 4, y: 1, speed: 5, attack: 3});
    Object.assign(units[1], {x: 4, y: 2});
    Object.assign(units[2], {x: 4, y: 5, health: 10, armor: 0});
    Object.assign(units[3], {x: 4, y: 3, health: 0, is_alive: false});
    units_count = units.length;
    items = [];
    current_act_unit = 0;
    have_moved = false;
    initial_board();
    start_turn();
  })()`);
  const corridor = await evaluate(`(() => {
    const range = () => MovementRules.findReachableCells(read_battle_state(), 0).map(cell => [cell.x, cell.y]);
    const normal = range();
    units[0].speed = 0;
    const zeroSpeed = range();
    units[0].speed = 1;
    const allyOnly = range();
    units[0].speed = 2;
    const throughAlly = range();
    units[0].speed = 5;
    units[2].is_alive = false;
    const throughDeadEnemy = range();
    units[2].is_alive = true;
    selected_move(0);
    const rejected = [];
    for (const [x, y] of [[3, 1], [4, 2], [4, 5], [4, 6]]) {
      click_block(x, y);
      rejected.push([units[0].x, units[0].y, have_moved]);
    }
    // A highlighted destination may become occupied before its event is processed.
    units[2].y = 4;
    click_block(4, 4);
    const stale = [units[0].x, units[0].y, have_moved];
    units[2].y = 5;
    selected_move(0);
    return {normal, zeroSpeed, allyOnly, throughAlly, throughDeadEnemy, rejected, stale};
  })()`);
  assert.deepEqual(corridor.normal, [[4, 3], [4, 4]]);
  assert.deepEqual(corridor.zeroSpeed, []);
  assert.deepEqual(corridor.allyOnly, []);
  assert.deepEqual(corridor.throughAlly, [[4, 3]]);
  assert.deepEqual(corridor.throughDeadEnemy, [[4, 3], [4, 4], [4, 5], [4, 6]]);
  assert.deepEqual(corridor.rejected, Array.from({length: 4}, () => [4, 1, false]));
  assert.deepEqual(corridor.stale, [4, 1, false]);

  await click('#mask img[id="4_4"]');
  assert.deepEqual(await evaluate('({x: units[0].x, y: units[0].y, moved: have_moved, current: current_act_unit})'),
    {x: 4, y: 4, moved: true, current: 0});
  assert.equal(await evaluate('document.getElementById("operation_hover_initial_mask_0").getAttribute("onclick")'), null);
  await click('#operation_hover_initial_mask_0');
  assert.equal(await evaluate('selected_operation'), '');
  await evaluate('selected_move(0); click_block(4, 3);');
  assert.deepEqual(await evaluate('[units[0].x, units[0].y]'), [4, 4]);
  await click('#operation_hover_initial_mask_1');
  await click('#mask img[id="4_5"]');
  assert.equal(await evaluate('units[2].health'), 7, 'The player can still attack after moving');
  assert.equal(await evaluate('current_act_unit'), 1, 'Attacking advances to the next living unit');
  await page(battlePage);
  console.log('PASS  ally traversal, enemy/dead occupancy, speed limits and real move-then-attack actions');

  await startBattle();
  const detour = await evaluate(`(() => {
    map = Array.from({length: height}, () => Array(width).fill(4));
    for (const [x, y] of [[4, 1], [3, 1], [2, 1], [2, 2], [2, 3], [3, 3], [4, 3]]) map[x][y] = 7;
    units = [new Protagonist(0)];
    Object.assign(units[0], {x: 4, y: 1, speed: 3});
    units_count = 1;
    current_act_unit = 0;
    have_moved = false;
    selected_move(0);
    const shortRange = MovementRules.findReachableCells(read_battle_state(), 0).map(cell => [cell.x, cell.y]);
    click_block(4, 3);
    const position = [units[0].x, units[0].y, have_moved];
    units[0].speed = 6;
    const longRange = MovementRules.findReachableCells(read_battle_state(), 0).map(cell => [cell.x, cell.y]);
    return {shortRange, position, longRange};
  })()`);
  assert.deepEqual(detour.shortRange, [[3, 1], [2, 1], [2, 2]]);
  assert.deepEqual(detour.position, [4, 1, false], 'Manhattan proximity cannot bypass a longer blocked route');
  assert.deepEqual(detour.longRange, [[3, 1], [2, 1], [2, 2], [2, 3], [3, 3], [4, 3]]);
  console.log('PASS  path length, rather than straight-line distance, bounds move execution');

  for (const kind of ['attack', 'move', 'wait']) {
    await startBattle();
    const outcome = await evaluate(`(() => {
      map = Array.from({length: height}, () => Array(width).fill(4));
      for (let y = 1; y <= 9; y++) map[4][y] = 7;
      units = [new Goblin(0), new Protagonist(1), new YuanLan(2)];
      Object.assign(units[0], {x: 4, y: 1, speed: 2, attack: 3, min_range: 1, max_range: 1,
        AI_type: ${JSON.stringify(kind === 'wait' ? 'wait' : 'normal')}});
      Object.assign(units[1], {x: 4, y: ${kind === 'move' ? 8 : 4}, health: 10, armor: 0});
      Object.assign(units[2], {x: 4, y: 9});
      units_count = units.length;
      items = [];
      current_act_unit = 0;
      have_moved = false;
      initial_board();
      reset_mask();
      reset_operations();
      const random = Math.random;
      try {
        Math.random = () => 0;
        computer_operate();
      } finally {
        Math.random = random;
      }
      return {position: [units[0].x, units[0].y], targetHealth: units[1].health,
        current: current_act_unit,
        confirm: document.getElementById('operation_hover_initial_mask_0').getAttribute('onclick')};
    })()`);
    assert.deepEqual(outcome.position, kind === 'wait' ? [4, 1] : [4, 3], kind + ': AI final position');
    assert.equal(outcome.targetHealth, kind === 'attack' ? 7 : 10, kind + ': damage only when attacking');
    assert.equal(outcome.current, 0, kind + ': AI waits for confirmation');
    assert.match(outcome.confirm, /confirm\(/);
    await click('#operation_hover_initial_mask_0');
    assert.equal(await evaluate('current_act_unit'), 1, kind + ': confirmation advances once');
    assert.equal(await evaluate('units[1].health'), outcome.targetHealth, kind + ': confirmation does not repeat damage');
  }
  console.log('PASS  actual AI movement, attack and wait actions retain the confirmation flow');
}

withBrowser(smoke, {userGesture: false}).catch(error => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
