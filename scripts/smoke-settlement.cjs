// Exercise both settlement entrances, queued achievement confirmations and real navigation.
const assert = require('node:assert/strict');
const { withBrowser } = require('./smoke-browser.cjs');

const battlePage = 'game/battle/index.html';
const achievementKey = 'settlement-smoke-playerachievement';

async function smoke({ evaluate, pointerClick, page, open, until }) {
  async function click(selector) {
    await until('clickable image ' + selector, () => evaluate(`(() => {
      const element = document.querySelector(${JSON.stringify(selector)});
      return element && (!(element instanceof HTMLImageElement) || (element.complete && element.naturalWidth > 0));
    })()`));
    await pointerClick(selector);
  }

  async function startBattle(level = 0) {
    await open('game/pages/menu.html');
    await evaluate(`(() => {
      localStorage.clear();
      localStorage.setItem('username', 'settlement-smoke-player');
      localStorage.setItem(${JSON.stringify(achievementKey)}, JSON.stringify({
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

  async function arrange(extra = '') {
    await evaluate(`(() => {
      map = Array.from({length: height}, () => Array(width).fill(7));
      units = [new Protagonist(0), new Goblin(1)];
      Object.assign(units[0], {x: 4, y: 1, health: 10, armor: 0, max_armor: 0});
      Object.assign(units[1], {x: 4, y: 3, health: 10, armor: 0, max_armor: 0});
      units_count = units.length;
      items = [];
      current_act_unit = 0;
      round = 3;
      current_info.perfect_level_complete = [false, false, false, false, false, false];
      ${extra}
      initial_board();
      units_display_update();
      load_items();
      window.settlementCalls = {win: 0, lose: 0, starts: 0, ids: [], writes: []};
      win = () => { settlementCalls.win++; save_exp_info(); };
      lose = () => { settlementCalls.lose++; save_exp_info(); };
      start_turn = () => { settlementCalls.starts++; };
      const popup = achievement_popup;
      achievement_popup = (id, callback) => {
        settlementCalls.ids.push(id);
        return popup(id, callback);
      };
      const setItem = Storage.prototype.setItem;
      Storage.prototype.setItem = function(key, value) {
        settlementCalls.writes.push({key: String(key), value: String(value)});
        return setItem.call(this, key, value);
      };
    })()`);
  }

  async function snapshot() {
    return evaluate(`({
      round, current: current_act_unit,
      title: document.querySelector('.achievement_title')?.textContent || '',
      content: document.querySelector('.achievement_content')?.textContent || '',
      calls: settlementCalls,
      achievements: JSON.parse(localStorage.getItem(username + 'achievement')),
      perfect: current_info.perfect_level_complete,
      interactiveMasks: {
        board: document.getElementById('mask').children.length,
        operations: document.getElementById('operation_hover_initial_mask').children.length,
      },
    })`);
  }

  async function confirmOnce() {
    await evaluate('window.previousAchievementButton = document.getElementById("achievement_confirm_button_mask")');
    await click('#achievement_confirm_button_mask');
    const after = await snapshot();
    await evaluate('previousAchievementButton.click(); end_turn(); end_round();');
    assert.deepEqual(await snapshot(), after, 'Old confirmation and repeated entrances must have no further effect');
    return after;
  }

  const expectedPopups = [
    ['杀人如麻 以杀证道', '在第一关中,选择击杀全部敌方单位而非到达指定点.'],
    ['一个都不许少', '所有关卡都至少在没有己方角色阵亡的情况下通关.'],
    ['向死则生', '在只剩一名角色的情况下,通过一道关卡.'],
  ];
  const entranceResults = [];
  for (const entrance of ['end_turn', 'end_round']) {
    await startBattle();
    await arrange(`
      units[1].is_alive = false;
      units[1].health = 0;
      current_info.perfect_level_complete = [false, true, true, true, true, true];
    `);
    assert.ok((await snapshot()).interactiveMasks.operations > 0, 'Fixture starts with actionable unit controls');
    await evaluate(entrance + '()');
    const first = await snapshot();
    assert.deepEqual(first.interactiveMasks, {board: 0, operations: 0}, 'Settlement clears actionable battle controls');
    await evaluate('end_turn(); end_round();');
    assert.deepEqual(await snapshot(), first, entrance + ': repeated requests cannot enqueue again');
    const visible = [];
    for (const [title, content] of expectedPopups) {
      const pending = await snapshot();
      assert.equal(pending.title, title, entrance + ': consistent achievement title');
      assert.equal(pending.content, content, entrance + ': consistent achievement description');
      assert.deepEqual([pending.round, pending.current, pending.calls.win, pending.calls.lose, pending.calls.starts],
        [3, 0, 0, 0, 0], entrance + ': battle waits for every confirmation');
      visible.push([pending.title, pending.content]);
      await confirmOnce();
    }
    const finished = await snapshot();
    assert.deepEqual(finished.calls.ids, [7, 0, 3]);
    assert.deepEqual([finished.round, finished.current, finished.calls.win, finished.calls.lose, finished.calls.starts],
      [3, 0, 1, 0, 0], entrance + ': finish once without starting another turn');
    assert.equal(finished.title, '');
    assert.ok(finished.achievements.ach8 && finished.achievements.ach1 && finished.achievements.ach4);
    assert.deepEqual(finished.perfect, [true, true, true, true, true, true]);
    assert.equal(finished.calls.writes.filter(write => write.key === 'current').length, 1);
    const unlockCounts = {ach8: 0, ach1: 0, ach4: 0};
    let previous = {ach8: false, ach1: false, ach4: false};
    for (const write of finished.calls.writes.filter(write => write.key === achievementKey)) {
      const saved = JSON.parse(write.value);
      for (const key of Object.keys(unlockCounts)) if (!previous[key] && saved[key]) unlockCounts[key]++;
      previous = saved;
    }
    assert.deepEqual(unlockCounts, {ach8: 1, ach1: 1, ach4: 1});
    entranceResults.push({visible, ids: finished.calls.ids, perfect: finished.perfect, achievements: finished.achievements});
  }
  assert.deepEqual(entranceResults[0], entranceResults[1]);
  console.log('PASS  both entrances show identical ordered achievements and finish exactly once after real confirmations');

  for (const entrance of ['end_turn', 'end_round']) {
    for (const result of ['win', 'lose']) {
      await startBattle();
      await arrange(result === 'win' ? `
        units[1].is_alive = false;
        achievements.ach8 = achievements.ach4 = true;
        localStorage.setItem(username + 'achievement', JSON.stringify(achievements));
      ` : 'units[0].is_alive = false;');
      await evaluate(entrance + '(); end_turn(); end_round();');
      const state = await snapshot();
      assert.deepEqual([state.round, state.current, state.calls.win, state.calls.lose, state.calls.starts],
        [3, 0, result === 'win' ? 1 : 0, result === 'lose' ? 1 : 0, 0]);
      assert.deepEqual(state.calls.ids, []);
      assert.equal(state.calls.writes.filter(write => write.key === achievementKey).length, 0);
      assert.equal(state.calls.writes.filter(write => write.key === 'current').length, 1);
      assert.equal(state.perfect[0], result === 'win');
    }
  }
  console.log('PASS  defeat and previously unlocked victory stop both entrances without repeat saves or extra actions');

  for (const cause of ['bleeding', 'trap']) {
    await startBattle(1);
    await arrange(`
      current_act_unit = 1;
      achievements.ach4 = true;
      if (${JSON.stringify(cause)} === 'bleeding') {
        units[1].health = 1;
        units[1].blooding = true;
      } else {
        units[0].health = 1;
        const trap = new Trap(2, 1);
        trap.x = units[0].x;
        trap.y = units[0].y;
        items.push(trap);
      }
    `);
    await evaluate('end_turn()');
    const state = await snapshot();
    assert.equal(state.round, 4, cause + ': effects run in the new round once');
    assert.equal(state.calls.starts, 0, cause + ': terminal round effects cannot start another unit');
    assert.equal(state.calls.win, cause === 'bleeding' ? 1 : 0);
    assert.equal(state.calls.lose, cause === 'trap' ? 1 : 0);
    const stable = await snapshot();
    await evaluate('end_turn(); end_round();');
    assert.deepEqual(await snapshot(), stable);
  }
  console.log('PASS  fatal round bleeding and traps settle before the next unit can act');

  for (const victoryAlreadyUnlocked of [false, true]) {
    await startBattle();
    await arrange(`
      units = [new Protagonist(0), new YuanLan(1), new YeDai(2), new Goblin(3)];
      units.forEach((unit, id) => Object.assign(unit, {x: 4, y: id + 1, armor: 0, max_armor: 0}));
      units_count = units.length;
      units.slice(0, 3).forEach(unit => { unit.level = 6; unit.exp = 0; });
      units[0].level = 5;
      units[0].exp = 216;
      units[3].health = 1;
      units[3].exp = 10;
      achievements.ach8 = ${victoryAlreadyUnlocked};
      localStorage.setItem(username + 'achievement', JSON.stringify(achievements));
    `);
    await evaluate('units[3].get_hurt(1, 0); end_turn();');
    assert.equal((await snapshot()).title, '唯我独尊', 'The killing blow achievement remains visible');
    assert.equal((await snapshot()).calls.win, 0);
    await confirmOnce();
    if (!victoryAlreadyUnlocked) {
      assert.equal((await snapshot()).title, '杀人如麻 以杀证道', 'Victory follows the pending damage achievement');
      await confirmOnce();
    }
    const combined = await snapshot();
    assert.deepEqual(combined.calls.ids, victoryAlreadyUnlocked ? [6] : [6, 7]);
    assert.equal(combined.calls.win, 1);
    assert.ok(combined.achievements.ach7 && combined.achievements.ach8);
  }
  console.log('PASS  a killing blow achievement is confirmed before victory, with or without a new victory achievement');

  // Use the real win handler for the final check, including its page transition and saved progress.
  await startBattle();
  await evaluate(`(() => {
    for (const unit of units) if (unit.side === 1) unit.is_alive = false;
    achievements.ach4 = true;
    localStorage.setItem(username + 'achievement', JSON.stringify(achievements));
    end_round();
  })()`);
  assert.equal(await evaluate('document.querySelector(".achievement_title").textContent'), '杀人如麻 以杀证道');
  await click('#achievement_confirm_button_mask');
  await page('game/battle/results/level-1/win.html');
  const saved = await evaluate(`({current: JSON.parse(localStorage.current), achievements: JSON.parse(localStorage.getItem(${JSON.stringify(achievementKey)}))})`);
  assert.equal(saved.current.level, 0);
  assert.equal(saved.current.perfect_level_complete[0], true);
  assert.equal(saved.achievements.ach8, true);
  console.log('PASS  real victory navigation retains the corrected achievement and perfect-clear progress');
}

withBrowser(smoke, {userGesture: false}).catch(error => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
