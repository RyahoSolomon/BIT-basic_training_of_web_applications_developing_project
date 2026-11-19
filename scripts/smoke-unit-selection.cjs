// Exercise avatar selection, independent move allowances and round completion with real pointer input.
const assert = require('node:assert/strict');
const { withBrowser } = require('./smoke-browser.cjs');

const battlePage = 'game/battle/index.html';

async function smoke({ evaluate, pointerClick, open, until, cdp }) {
  async function click(selector) {
    await until('loaded control ' + selector, () => evaluate(`(() => {
      const element = document.querySelector(${JSON.stringify(selector)});
      return element && (!(element instanceof HTMLImageElement) || (element.complete && element.naturalWidth > 0));
    })()`));
    await pointerClick(selector);
  }
  async function portrait(id) {
    const selector = await evaluate(`'#hover_initial_mask_' + units[${id}].x + '_' + units[${id}].y`);
    await click(selector);
  }
  async function active(id, phase = 'player') {
    await until('unit ' + id + ' in ' + phase, () => evaluate(
      `current_act_unit === ${id} && battle_turn_flow.phase === ${JSON.stringify(phase)}`));
  }
  async function startBattle(level = 1, fixture = false) {
    await open('game/pages/menu.html');
    await evaluate(`(() => {
      localStorage.clear();
      GameProgress.newGame('旅人');
      localStorage.testachievement = JSON.stringify(Object.fromEntries(GameProfile.achievementKeys.map(key => [key, true])));
      const current = JSON.parse(localStorage.current);
      current.level = ${level};
      localStorage.current = JSON.stringify(current);
      localStorage.IsFirstPlay = 'false';
      GamePreferences.setVolume('music', 0);
    })()`);
    await open(battlePage);
    await click('#mission_confirm_button');
    if (!fixture) return;
    await evaluate(`(() => {
      map = Array.from({length: height}, () => Array(width).fill(7));
      yedai_level = {level: 4, exp: 0};
      units = [new Protagonist(0), new YuanLan(1), new YeDai(2), new Goblin(3), new Goblin(4)];
      const positions = [[4,2], [3,2], [5,2], [4,5], [7,14]];
      units.forEach((unit, id) => Object.assign(unit, {
        x: positions[id][0], y: positions[id][1], health: 30, max_health: 30,
        armor: 0, max_armor: 0, attack: 3, AI_type: 'wait',
      }));
      units[2].max_range = 3;
      units_count = units.length;
      items = [];
      current_act_unit = 0;
      round = 3;
      initial_board();
      start_turn();
    })()`);
  }
  async function skip() {
    await click('#operation_hover_initial_mask img[onclick="selected_skip()"]');
  }
  async function gray(id, expected) {
    assert.equal(await evaluate(`getComputedStyle(document.getElementById('unit_${id}')).filter`),
      expected ? 'grayscale(1)' : 'none');
    assert.equal(await evaluate(`getComputedStyle(document.getElementById('health_text_${id}')).filter`), 'none',
      'Action status must not gray the health labels');
  }

  await startBattle();
  for (const id of [2, 1, 0]) {
    await portrait(id);
    await active(id);
  }
  assert.equal(await evaluate('round'), 0);
  console.log('PASS  actual second map allows selecting all three portraits without advancing the round');

  await startBattle(1, true);
  await portrait(2);
  await click('#operation_hover_initial_mask_0');
  await click('#mask img[id="5_3"]');
  assert.deepEqual(await evaluate('[current_act_unit, units[2].x, units[2].y, have_moved]'), [2,5,3,true]);
  await gray(2, false);
  await portrait(1);
  assert.equal(await evaluate('have_moved'), false);
  await portrait(2);
  assert.equal(await evaluate('have_moved'), true);
  await click('#operation_hover_initial_mask_0');
  assert.equal(await evaluate('selected_operation'), '', 'The moved actor must not regain the move button');
  await evaluate('move_selected_unit(5, 4)');
  assert.deepEqual(await evaluate('[units[2].x, units[2].y]'), [5,3]);
  await portrait(0);
  await click('#operation_hover_initial_mask_0');
  assert.ok(await evaluate('document.getElementById("mask").children.length > 0'));
  await portrait(1);
  assert.deepEqual(await evaluate('({current:current_act_unit, operation:selected_operation, masks:document.getElementById("mask").children.length})'),
    {current:1, operation:'', masks:0}, 'Changing the actor must remove the old move range');
  await portrait(2);
  await click('#operation_hover_initial_mask_1');
  await click('#mask img[id="4_5"]');
  assert.deepEqual(await evaluate('[current_act_unit, units[3].health, battle_turn_flow.phase]'), [2,27,'waiting']);
  assert.equal(await evaluate('select_player_unit(1)'), false, 'Waiting must not accept another actor');
  await gray(2, true);
  await active(0);
  await portrait(2);
  assert.equal(await evaluate('current_act_unit'), 0, 'A finished actor cannot be selected again');
  assert.equal(await evaluate('units[3].health'), 27);
  await portrait(1);
  await skip();
  await active(0);
  await gray(1, true);
  await skip();
  await active(3, 'confirmation');
  for (const id of [0,1,2]) await gray(id, true);
  await portrait(0);
  assert.equal(await evaluate('current_act_unit'), 3, 'A player portrait cannot interrupt AI confirmation');
  await click('#operation_hover_initial_mask_0');
  await active(4, 'confirmation');
  await click('#operation_hover_initial_mask_0');
  await active(0);
  assert.equal(await evaluate('round'), 4, 'The full round must advance exactly once');
  for (const id of [2,1,0]) {
    await gray(id, false);
    await portrait(id);
    assert.equal(await evaluate('have_moved'), false, 'Each player regains movement next round');
  }
  await portrait(2);
  await click('#operation_hover_initial_mask_0');
  await click('#mask img[id="5_4"]');
  assert.deepEqual(await evaluate('[units[2].x, units[2].y, have_moved]'), [5,4,true]);
  console.log('PASS  moved actors can return to attack, finish in reverse order, gray once and reset next round');

  await startBattle(1, true);
  await evaluate('units[0].health = 20; units_display_update()');
  await portrait(2);
  await click('#operation_hover_initial_mask img[onclick="selected_buff()"]');
  await click('#mask img[id="4_2"]');
  assert.deepEqual(await evaluate('[current_act_unit, units[0].health, units[0].reinforce, has_unit_acted(units[2]), has_unit_acted(units[0])]'),
    [2,22,5,true,false], 'Clicking a friendly skill target must cast instead of selecting its actor');
  await active(0);
  await click('#operation_hover_initial_mask_1');
  await click('#mask img[id="3_2"]');
  assert.deepEqual(await evaluate('[current_act_unit, units[1].health, has_unit_acted(units[0]), has_unit_acted(units[1])]'),
    [0,26,true,false], 'An attack target keeps priority over avatar selection, including friendly fire');
  console.log('PASS  friendly skill and attack targets retain priority over portrait switching');

  await startBattle(3);
  await active(0, 'confirmation');
  await portrait(4);
  assert.equal(await evaluate('current_act_unit'), 0);
  await click('#operation_hover_initial_mask_0');
  await active(1, 'confirmation');
  await portrait(3);
  assert.equal(await evaluate('current_act_unit'), 1);
  await click('#operation_hover_initial_mask_0');
  await active(2);
  await portrait(4);
  await active(4);
  assert.equal(await evaluate('can_select_player_unit(0)'), false);
  console.log('PASS  fourth-map NPCs keep their opening actions and confirmations before player selection');

  await startBattle(1, true);
  await click('#check_mission_info_mask');
  await evaluate('units_display_update()');
  assert.equal(await evaluate('select_player_unit(1)'), false);
  assert.equal(await evaluate('current_act_unit'), 0);
  await click('#mission_confirm_button');
  const hoverPoint = await evaluate(`(() => {
    const rect = document.getElementById('hover_initial_mask_3_2').getBoundingClientRect();
    return {x: rect.x + rect.width / 2, y: rect.y + rect.height / 2};
  })()`);
  await cdp.send('Input.dispatchMouseEvent', {type: 'mouseMoved', x: 0, y: 0});
  await cdp.send('Input.dispatchMouseEvent', {type: 'mouseMoved', ...hoverPoint});
  assert.deepEqual(await evaluate(`(() => {
    const mask = document.getElementById('hover_initial_mask_3_2');
    return {cursor: getComputedStyle(mask).cursor, selectable: mask.title.includes('点击头像切换行动角色')};
  })()`), {cursor: 'pointer', selectable: true}, 'Hover feedback must recover after closing an overlay');
  await evaluate('loadPlots()');
  await portrait(1);
  assert.equal(await evaluate('current_act_unit'), 0);
  await evaluate('leave_dialogue(); achievement_popup(6)');
  await portrait(1);
  assert.equal(await evaluate('current_act_unit'), 0);
  await click('#achievement_confirm_button_mask');
  await click('[data-settings-open]');
  assert.equal(await evaluate('select_player_unit(1)'), false);
  await click('[data-settings-close]');
  await evaluate('window.dispatchEvent(new PageTransitionEvent("pagehide", {persisted:true}))');
  assert.equal(await evaluate('select_player_unit(1)'), false);
  await evaluate('window.dispatchEvent(new PageTransitionEvent("pageshow", {persisted:true}))');
  await portrait(1);
  await active(1);
  await portrait(0);
  await evaluate('units[1].is_alive=false; units[1].health=0; units_display_update()');
  await portrait(1);
  assert.equal(await evaluate('current_act_unit'), 0);
  assert.equal(await evaluate('document.getElementById("unit_1")'), null);
  await skip();
  await active(2);
  await evaluate('stop_turn_flow()');
  await portrait(0);
  assert.equal(await evaluate('current_act_unit'), 2);
  assert.equal(await evaluate('can_select_player_unit(0)'), false);
  console.log('PASS  overlays, suspension, dead actors and ended battles reject switching without disturbing the turn');
}

withBrowser(smoke).catch(error => { console.error(error.stack || error.message); process.exitCode = 1; });
