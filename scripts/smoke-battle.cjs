// Exercise damage rules through real battle units, round effects, UI and storage.
const assert = require('node:assert/strict');
const { withBrowser } = require('./smoke-browser.cjs');

const battlePage = 'game/battle/index.html';

async function smoke({ evaluate, click, page, open }) {
  await open('game/pages/menu.html');

  async function startBattle(level = 4) {
    await evaluate(`(() => {
      localStorage.clear();
      localStorage.setItem('username', 'battle-smoke-player');
      localStorage.setItem('battle-smoke-playerachievement', JSON.stringify({
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
    assert.equal(await evaluate('level'), level);
  }

  await startBattle();
  const spirits = await evaluate(`(() => {
    const heroId = units.findIndex(unit => unit.name === 'user');
    const firstSpirit = units.find(unit => unit.name === 'spirit' && unit.is_alive);
    if (!firstSpirit) throw new Error('Missing summoned spirit');
    // The current summon path omits uuid; object identity must still locate its target.
    const missingUuid = firstSpirit.uuid === undefined;
    firstSpirit.armor = firstSpirit.max_armor = 0;
    firstSpirit.health = 1;
    firstSpirit.blooding = true;
    firstSpirit.poison = 4;
    map[firstSpirit.x][firstSpirit.y] = 12;
    for (const unit of units) {
      if (unit.commander_type === 'player') map[unit.x][unit.y] = 0;
    }
    const firstDeath = firstSpirit.get_hurt(1, heroId);
    const experienceAfterDeath = units.filter(unit => unit.commander_type === 'player').map(unit => unit.exp);
    const repeated = [firstSpirit.get_hurt(2, heroId), firstSpirit.get_hurt(4, heroId)];
    const experienceAfterRepeated = units.filter(unit => unit.commander_type === 'player').map(unit => unit.exp);
    const countAfterRepeated = spirit_count;

    // Keep actual end_round effects and spirit spawning, excluding unrelated random boss attacks.
    const bossSkill = fake_pangu_skill_execute;
    try {
      fake_pangu_skill_execute = () => {};
      for (let iteration = 0; iteration < 3; iteration++) {
        end_round();
        for (const unit of units) {
          if (unit.name === 'spirit' && unit.is_alive) {
            unit.health = 100;
            unit.armor = unit.max_armor = 100;
          }
        }
      }
    } finally {
      fake_pangu_skill_execute = bossSkill;
    }
    const afterRounds = {count: spirit_count, result: check_game(), health: firstSpirit.health,
      poison: firstSpirit.poison, round};
    const deaths = [{count: spirit_count, result: check_game()}];
    for (let death = 2; death <= 8; death++) {
      summon_pangu_spirit();
      const next = units.find(unit => unit.name === 'spirit' && unit.is_alive);
      if (!next) throw new Error('Missing next summoned spirit');
      next.get_hurt(next.health + next.armor);
      deaths.push({count: spirit_count, result: check_game()});
    }
    return {missingUuid, firstDeath, repeated, experienceAfterDeath, experienceAfterRepeated,
      countAfterRepeated, afterRounds, deaths,
      preservesUnitMethods: units.every(unit => unit instanceof Unit && typeof unit.get_hurt === 'function'),
      preservesCommander: units[heroId].commander instanceof Player};
  })()`);
  assert.equal(spirits.missingUuid, true, 'This case must exercise the summoned-unit identity path');
  assert.equal(spirits.firstDeath, true);
  assert.deepEqual(spirits.repeated, [false, false]);
  assert.deepEqual(spirits.experienceAfterDeath, [10, 2, 2]);
  assert.deepEqual(spirits.experienceAfterRepeated, spirits.experienceAfterDeath);
  assert.equal(spirits.countAfterRepeated, 1);
  assert.deepEqual(spirits.afterRounds, {count: 1, result: 0, health: 0, poison: 4, round: 3});
  assert.deepEqual(spirits.deaths.map(death => death.count), [1, 2, 3, 4, 5, 6, 7, 8]);
  assert.deepEqual(spirits.deaths.map(death => death.result), [0, 0, 0, 0, 0, 0, 0, 1]);
  assert.equal(spirits.preservesUnitMethods, true);
  assert.equal(spirits.preservesCommander, true);
  await page(battlePage);
  console.log('PASS  repeated damage and three real round endings cannot count one spirit more than once');

  await startBattle();
  const sameRoundDeath = await evaluate(`(() => {
    const spirit = units.find(unit => unit.name === 'spirit' && unit.is_alive);
    spirit.health = 1;
    spirit.armor = spirit.max_armor = 0;
    spirit.blooding = true;
    spirit.poison = 4;
    map[spirit.x][spirit.y] = 12;
    const bossSkill = fake_pangu_skill_execute;
    try {
      fake_pangu_skill_execute = () => {};
      end_round();
      return {health: spirit.health, alive: spirit.is_alive, poison: spirit.poison,
        count: spirit_count, result: check_game(), round};
    } finally {
      fake_pangu_skill_execute = bossSkill;
    }
  })()`);
  assert.deepEqual(sameRoundDeath, {health: 0, alive: false, poison: 4, count: 1, result: 0, round: 1});
  await page(battlePage);
  console.log('PASS  fatal bleeding stops later poison and terrain damage within the same round');

  await startBattle();
  const friendlyDeath = await evaluate(`(() => {
    const heroId = units.findIndex(unit => unit.name === 'user');
    const targetId = units.findIndex(unit => unit.name === 'yedai');
    const target = units[targetId];
    const originalPopup = achievement_popup;
    const originalSetItem = Storage.prototype.setItem;
    const popups = [];
    const writes = [];
    try {
      achievement_popup = (id, callback) => { popups.push(id); return originalPopup(id, callback); };
      Storage.prototype.setItem = function(key, value) {
        writes.push(String(key));
        return originalSetItem.call(this, key, value);
      };
      const first = target.get_hurt(target.health + target.armor, heroId);
      const again = target.get_hurt(100, heroId);
      units_display_update();
      return {first, again, health: target.health, alive: target.is_alive, popups, writes,
        achievement: JSON.parse(localStorage.getItem(username + 'achievement')).ach3,
        announcements: announcement_list.filter(text => text.includes(target.name_cn + '在战场上陨落了')),
        visibleAnnouncement: document.getElementById('announcement').textContent,
        visibleAchievement: document.getElementById('achievement_popup').textContent,
        removedFromBoard: !document.getElementById('unit_' + targetId)};
    } finally {
      achievement_popup = originalPopup;
      Storage.prototype.setItem = originalSetItem;
    }
  })()`);
  assert.equal(friendlyDeath.first, true);
  assert.equal(friendlyDeath.again, false);
  assert.equal(friendlyDeath.health, 0);
  assert.equal(friendlyDeath.alive, false);
  assert.deepEqual(friendlyDeath.popups, [2]);
  assert.deepEqual(friendlyDeath.writes, ['battle-smoke-playerachievement']);
  assert.equal(friendlyDeath.achievement, true);
  assert.equal(friendlyDeath.announcements.length, 1);
  assert.match(friendlyDeath.visibleAnnouncement, /叶岱在战场上陨落了/);
  assert.match(friendlyDeath.visibleAchievement, /铲除神族/);
  assert.equal(friendlyDeath.removedFromBoard, true);
  console.log('PASS  friendly death announces, unlocks and persists its achievement exactly once');

  await startBattle();
  const maximumLevel = await evaluate(`(() => {
    const players = units.filter(unit => unit.commander_type === 'player');
    for (const unit of players) { unit.level = 6; unit.exp = 0; }
    const heroId = units.findIndex(unit => unit.name === 'user');
    units[heroId].level = 5;
    units[heroId].exp = 216;
    const spirit = units.find(unit => unit.name === 'spirit' && unit.is_alive);
    const originalPopup = achievement_popup;
    const originalSetItem = Storage.prototype.setItem;
    const popups = [];
    const writes = [];
    try {
      achievement_popup = (id, callback) => { popups.push(id); return originalPopup(id, callback); };
      Storage.prototype.setItem = function(key, value) {
        writes.push(String(key));
        return originalSetItem.call(this, key, value);
      };
      spirit.get_hurt(spirit.health + spirit.armor, heroId);
      spirit.get_hurt(100, heroId);
      level_up(heroId);
      return {popups, writes, players: players.map(unit => ({level: unit.level, exp: unit.exp})),
        current: JSON.parse(localStorage.current),
        achievement: JSON.parse(localStorage.getItem(username + 'achievement')).ach7};
    } finally {
      achievement_popup = originalPopup;
      Storage.prototype.setItem = originalSetItem;
    }
  })()`);
  assert.deepEqual(maximumLevel.players, [{level: 6, exp: 10}, {level: 6, exp: 2}, {level: 6, exp: 2}]);
  assert.deepEqual(maximumLevel.popups, [6]);
  assert.deepEqual(maximumLevel.writes, ['battle-smoke-playerachievement', 'current']);
  assert.equal(maximumLevel.achievement, true);
  for (const [index, key] of ['user_level', 'yuanlan_level', 'yedai_level'].entries()) {
    assert.deepEqual(maximumLevel.current[key], maximumLevel.players[index]);
  }
  console.log('PASS  experience and level results are applied before the achievement and progress are saved');

  await startBattle();
  const terrain = await evaluate(`(() => {
    const hero = units.find(unit => unit.name === 'user');
    hero.health = 5;
    hero.armor = 7;
    map[hero.x][hero.y] = 12;
    apply_end_round_effects();
    const first = {health: hero.health, armor: hero.armor, alive: hero.is_alive};
    hero.health = 1;
    apply_end_round_effects();
    const fatal = {health: hero.health, armor: hero.armor, alive: hero.is_alive};
    apply_end_round_effects();
    return {first, fatal, repeated: {health: hero.health, armor: hero.armor, alive: hero.is_alive}};
  })()`);
  assert.deepEqual(terrain.first, {health: 3, armor: 7, alive: true});
  assert.deepEqual(terrain.fatal, {health: 0, armor: 7, alive: false});
  assert.deepEqual(terrain.repeated, terrain.fatal);

  await startBattle();
  const whackResult = await evaluate(`(() => {
    const heroId = units.findIndex(unit => unit.name === 'user');
    const hero = units[heroId];
    const target = units.find(unit => unit.name === 'spirit' && unit.is_alive);
    hero.health = 2;
    hero.armor = 7;
    target.health = 5;
    target.armor = 4;
    current_act_unit = heroId;
    whack(target.x, target.y, 3);
    return {hero: {health: hero.health, armor: hero.armor, alive: hero.is_alive},
      target: {health: target.health, armor: target.armor, alive: target.is_alive, blooding: target.blooding},
      deaths: announcement_list.filter(text => text.includes(hero.name_cn + '在战场上陨落了')).length};
  })()`);
  assert.deepEqual(whackResult.hero, {health: 0, armor: 7, alive: false});
  assert.deepEqual(whackResult.target, {health: 2, armor: 0, alive: true, blooding: true});
  assert.equal(whackResult.deaths, 1);
  await page(battlePage);
  console.log('PASS  terrain and whack self-damage bypass armor and settle death once');
}

withBrowser(smoke).catch(error => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
