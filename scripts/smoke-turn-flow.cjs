// Verify that delayed turn handoffs remain responsive, ordered and safe to repeat.
const assert = require('node:assert/strict');
const { withBrowser } = require('./smoke-browser.cjs');

const battlePage = 'game/battle/index.html';

async function smoke({ evaluate, pointerClick, page, open, until }) {
  async function click(selector) {
    await until('loaded control ' + selector, () => evaluate(`(() => {
      const element = document.querySelector(${JSON.stringify(selector)});
      return element && (!(element instanceof HTMLImageElement) || (element.complete && element.naturalWidth > 0));
    })()`));
    await pointerClick(selector);
  }

  async function startBattle(extra = '', current = 0) {
    await open('game/pages/menu.html');
    await evaluate(`(() => {
      localStorage.clear();
      localStorage.setItem('username', 'turn-flow-smoke-player');
      localStorage.setItem('turn-flow-smoke-playerachievement', JSON.stringify({
        ach1: true, ach2: true, ach3: true, ach4: true,
        ach5: true, ach6: true, ach7: true, ach8: true,
      }));
      GameProgress.newGame();
      const current = JSON.parse(localStorage.current);
      current.level = 1;
      current.is_plot_music_on = false;
      current.is_inwar_music_on = false;
      localStorage.setItem('current', JSON.stringify(current));
      localStorage.setItem('IsFirstPlay', 'false');
    })()`);
    await open(battlePage);
    await click('#mission_confirm_mask');
    await evaluate(`(() => {
      map = Array.from({length: height}, () => Array(width).fill(7));
      units = [new Protagonist(0), new Goblin(1)];
      Object.assign(units[0], {x: 4, y: 1, health: 30, max_health: 30, armor: 0, max_armor: 0});
      Object.assign(units[1], {x: 4, y: 8, health: 30, max_health: 30, armor: 0, max_armor: 0, AI_type: 'wait'});
      items = [];
      round = 3;
      ${extra}
      units_count = units.length;
      current_act_unit = ${current};
      initial_board();
      Math.random = () => 0;
      start_turn();
    })()`);
  }

  async function state() {
    return evaluate(`({
      current: current_act_unit, round, phase: battle_turn_flow.phase,
      units: units.map(unit => ({x: unit.x, y: unit.y, health: unit.health, armor: unit.armor,
        alive: unit.is_alive, poison: unit.poison, blooding: unit.blooding,
        reinforce: unit.reinforce, attack: unit.attack, speed: unit.speed, cooldown: unit.current_cooldown})),
      items: items.map(item => ({type: item.type, x: item.x, y: item.y})),
    })`);
  }

  async function afterDelay() {
    await evaluate('window.delayProbeFinished = false; setTimeout(() => { delayProbeFinished = true; }, 450);');
    await until('past the normal handoff interval', () => evaluate('delayProbeFinished'));
  }

  await startBattle();
  const immediate = await evaluate(`(() => {
    window.responsiveness = {};
    const record = () => ({phase: battle_turn_flow.phase, current: current_act_unit});
    setTimeout(() => { responsiveness.timer = record(); }, 0);
    requestAnimationFrame(() => { responsiveness.frame = record(); });
    document.getElementById('check_mission_info_mask').addEventListener('click', () => {
      responsiveness.click = record();
    }, {once: true});
    selected_skip();
    return {phase: battle_turn_flow.phase, current: current_act_unit,
      selected: selected_operation, masks: document.getElementById('mask').children.length,
      operations: document.getElementById('operation_hover_initial_mask').children.length};
  })()`);
  assert.deepEqual(immediate, {phase: 'waiting', current: 0, selected: '', masks: 0, operations: 0});
  await click('#check_mission_info_mask');
  await until('timer, drawing and mouse input during the handoff', () => evaluate(
    'responsiveness.timer && responsiveness.frame && responsiveness.click'));
  assert.deepEqual(await evaluate('responsiveness'), {
    timer: {phase: 'waiting', current: 0},
    frame: {phase: 'waiting', current: 0},
    click: {phase: 'waiting', current: 0},
  });
  await click('#mission_confirm_mask');
  await until('next unit after the responsive wait', () => evaluate('current_act_unit === 1 && battle_turn_flow.phase === "confirmation"'));
  console.log('PASS  timers, rendering and a real task-button click run while the previous turn is waiting');

  await startBattle();
  await evaluate('selected_move(0); click_block(4, 2); start_turn();');
  assert.equal(await evaluate('have_moved'), true, 'Repeated start cannot restore the movement allowance');
  assert.deepEqual(await evaluate('[units[0].x, units[0].y]'), [4, 2]);
  await evaluate('place_trap_on(4, 3, 3);');
  const firstCast = await state();
  assert.equal(firstCast.phase, 'waiting');
  assert.equal(firstCast.items.length, 1);
  await evaluate(`
    place_trap_on(4, 3, 3); use_ice_storm(4, 8, 3); whack(4, 8, 3);
    poison_cloud(4, 8, 3); reinforce(0); move_selected_unit(4, 3);
    selected_defend(); selected_attack(0); selected_move(0); selected_trap();
    selected_ice_storm(); selected_whack(); selected_poison(); selected_buff();
    click_block(4, 8); selected_skip(); end_turn(); start_turn(); computer_operate();
  `);
  assert.deepEqual(await state(), firstCast, 'Action handlers must reject calls before damage or cooldown changes');
  await until('single handoff after rejected repeated skills', () => evaluate('current_act_unit === 1 && battle_turn_flow.phase === "confirmation"'));
  assert.equal((await state()).items.length, 1);
  console.log('PASS  repeated start preserves movement and all player action handlers reject the waiting interval');

  await startBattle(`
    units = [new Goblin(0), new Goblin(1), new Protagonist(2)];
    Object.assign(units[0], {x: 4, y: 1, speed: 2, attack: 3, min_range: 1, max_range: 1});
    Object.assign(units[1], {x: 4, y: 7, speed: 2, attack: 3, min_range: 1, max_range: 1});
    Object.assign(units[2], {x: 4, y: 4, health: 30, max_health: 30, armor: 0, max_armor: 0});
  `);
  const firstAI = await state();
  assert.equal(firstAI.phase, 'confirmation');
  assert.equal(firstAI.current, 0);
  assert.equal(firstAI.units[2].health, 27);
  await evaluate(`
    window.firstAIButton = document.getElementById('operation_hover_initial_mask_0');
    window.firstAICallback = firstAIButton.onclick;
    start_turn(); computer_operate(); initial_confirm(); end_turn(); confirm();
  `);
  assert.deepEqual(await state(), firstAI);
  await afterDelay();
  assert.deepEqual(await state(), firstAI, 'AI must remain at its confirmation until the player clicks');
  await click('#operation_hover_initial_mask_0');
  await evaluate('firstAIButton.click(); firstAICallback(); end_turn(); computer_operate();');
  await until('second AI awaiting its own confirmation', () => evaluate('current_act_unit === 1 && battle_turn_flow.phase === "confirmation"'));
  const secondAI = await state();
  assert.equal(secondAI.units[2].health, 24);
  await evaluate(`
    window.secondAIButton = document.getElementById('operation_hover_initial_mask_0');
    firstAIButton.click(); firstAICallback(); start_turn(); computer_operate(); end_turn();
  `);
  await afterDelay();
  assert.deepEqual(await state(), secondAI, 'The first AI button cannot consume the next AI confirmation');
  await click('#operation_hover_initial_mask_0');
  await until('player after both AI confirmations', () => evaluate('current_act_unit === 2 && battle_turn_flow.phase === "player"'));
  const playerTurn = await state();
  await evaluate('firstAIButton.click(); firstAICallback(); secondAIButton.click();');
  assert.deepEqual(await state(), playerTurn);
  console.log('PASS  consecutive AI attacks apply damage once and each requires its own current confirmation');

  await startBattle(`
    units = [new Protagonist(0), new YuanLan(1), new YeDai(2), new Goblin(3)];
    units.forEach((unit, id) => Object.assign(unit, {x: 4, y: id + 1, health: 10, armor: 0, max_armor: 0}));
    units[0].blooding = true;
    units[1].is_alive = false;
    units[1].health = 0;
    units[3].AI_type = 'wait';
    window.roundCalls = 0;
    const originalEndRound = end_round;
    end_round = () => { roundCalls++; return originalEndRound(); };
  `);
  await evaluate('selected_skip(); end_turn();');
  await until('skip deceased player', () => evaluate('current_act_unit === 2 && battle_turn_flow.phase === "player"'));
  assert.equal(await evaluate('roundCalls'), 0);
  await evaluate('selected_skip();');
  await until('last AI in the round', () => evaluate('current_act_unit === 3 && battle_turn_flow.phase === "confirmation"'));
  await evaluate('window.roundConfirmation = document.getElementById("operation_hover_initial_mask_0");');
  await click('#operation_hover_initial_mask_0');
  await evaluate('roundConfirmation.click();');
  await until('first unit of the next round', () => evaluate('current_act_unit === 0 && battle_turn_flow.phase === "player"'));
  assert.deepEqual(await evaluate('({round, calls: roundCalls, health: units[0].health})'), {round: 4, calls: 1, health: 8});
  await evaluate('roundConfirmation.click();');
  assert.deepEqual(await evaluate('({round, calls: roundCalls, health: units[0].health})'), {round: 4, calls: 1, health: 8});
  console.log('PASS  deceased units are skipped and round effects execute exactly once at the boundary');

  await startBattle(`
    units = [new Goblin(0), new Protagonist(1)];
    Object.assign(units[0], {x: 4, y: 1, speed: 2, attack: 3, min_range: 1, max_range: 1});
    Object.assign(units[1], {x: 4, y: 4, health: 1, armor: 0});
    window.lossCalls = 0;
    lose = () => { lossCalls++; };
  `);
  assert.deepEqual(await evaluate('({result: check_game(), calls: lossCalls, phase: battle_turn_flow.phase})'),
    {result: 2, calls: 0, phase: 'confirmation'});
  await evaluate('end_turn(); computer_operate();');
  assert.equal(await evaluate('lossCalls'), 0, 'A fatal AI action still needs its confirmation');
  await click('#operation_hover_initial_mask_0');
  assert.deepEqual(await evaluate('({calls: lossCalls, phase: battle_turn_flow.phase, timer: battle_turn_flow.timer})'),
    {calls: 1, phase: 'ended', timer: null});
  console.log('PASS  a fatal AI attack waits for player confirmation before settlement');

  await startBattle();
  await evaluate(`
    window.winCalls = 0;
    win = () => { winCalls++; };
    end_turn();
    units[1].is_alive = false;
    settle_battle();
  `);
  await afterDelay();
  assert.deepEqual(await evaluate('({current: current_act_unit, calls: winCalls, phase: battle_turn_flow.phase, timer: battle_turn_flow.timer})'),
    {current: 0, calls: 1, phase: 'ended', timer: null});
  console.log('PASS  terminal settlement cancels an already scheduled handoff');

  await startBattle();
  await evaluate('end_turn(); window.dispatchEvent(new PageTransitionEvent("pagehide", {persisted: true}));');
  await afterDelay();
  assert.deepEqual(await evaluate('({current: current_act_unit, phase: battle_turn_flow.phase, timer: battle_turn_flow.timer, suspended: battle_turn_flow.suspended})'),
    {current: 0, phase: 'waiting', timer: null, suspended: true});
  await evaluate('window.dispatchEvent(new PageTransitionEvent("pageshow", {persisted: true})); window.dispatchEvent(new PageTransitionEvent("pageshow", {persisted: true}));');
  await until('one handoff after restoring a cached page', () => evaluate('current_act_unit === 1 && battle_turn_flow.phase === "confirmation"'));
  const restored = await state();
  await evaluate('window.dispatchEvent(new PageTransitionEvent("pagehide", {persisted: true})); window.dispatchEvent(new PageTransitionEvent("pageshow", {persisted: true}));');
  await afterDelay();
  assert.deepEqual(await state(), restored, 'Restoring a displayed AI action cannot execute it again');
  console.log('PASS  page suspension cancels the wait and restoration resumes it once without replaying AI');

  for (const outcome of ['win', 'lose']) {
    await startBattle();
    const stopped = await evaluate(`(() => {
      end_turn();
      ${outcome}();
      return {phase: battle_turn_flow.phase, timer: battle_turn_flow.timer};
    })()`);
    assert.deepEqual(stopped, {phase: 'ended', timer: null});
    await page('game/battle/results/level-2/' + outcome + '.html');
  }
  console.log('PASS  direct victory and defeat navigation also cancel pending turn work');
}

withBrowser(smoke, {userGesture: false}).catch(error => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
