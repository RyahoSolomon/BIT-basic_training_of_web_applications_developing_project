// Keep living unit nodes across updates while checking the original board layout and labels.
const assert = require('node:assert/strict');
const { withBrowser } = require('./smoke-browser.cjs');

const battlePage = 'game/battle/index.html';

async function smoke({ evaluate, click, open, page }) {
  await open('game/pages/menu.html');
  async function startBattle(level = 1) {
    await evaluate(`(() => {
      localStorage.clear();
      localStorage.setItem('username', 'rendering-smoke-player');
      localStorage.setItem('rendering-smoke-playerachievement', JSON.stringify({
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

  let inspectedUnits = 0;
  for (let level = 0; level < 6; level++) {
    await startBattle(level);
    const result = await evaluate(`(() => {
      const before = Array.from(document.getElementById('units').children);
      const textNodes = before.filter(node => node.tagName === 'A').map(node => node.firstChild);
      units_display_update();
      units_display_update();
      const after = Array.from(document.getElementById('units').children);
      return {
        sameNodes: before.length === after.length && before.every((node, i) => node === after[i]),
        sameText: textNodes.every((node, i) => node === after.filter(node => node.tagName === 'A')[i].firstChild),
        units: units.flatMap((unit, id) => {
          if (!unit.is_alive) return [];
          const image = document.getElementById('unit_' + id);
          const health = document.getElementById('health_text_' + id);
          const armor = document.getElementById('armor_text_' + id);
          return [{id, x: unit.x, y: unit.y, source: image.getAttribute('src'), expectedSource: unit.icon,
            position: image.style.position, left: image.style.left, top: image.style.top,
            health: health.textContent, expectedHealth: unit.health + '/' + unit.max_health,
            armor: armor.textContent, expectedArmor: unit.armor + '/' + unit.max_armor,
            fontSize: health.style.fontSize, color: health.style.color,
            hover: document.getElementById('hover_initial_mask_' + unit.x + '_' + unit.y).title,
            name: unit.name_cn, side: unit.side,
            expVisible: !document.getElementById('exp_info_' + id).hidden,
            player: unit.commander_type === 'player'}];
        }),
        duplicateIds: after.length !== new Set(after.map(node => node.id)).size,
      };
    })()`);
    assert.equal(result.sameNodes, true, 'Map ' + level + ': a refresh must keep every unit node');
    assert.equal(result.sameText, true, 'Map ' + level + ': unchanged text keeps its text node');
    assert.equal(result.duplicateIds, false);
    for (const unit of result.units) {
      assert.equal(unit.source, unit.expectedSource);
      assert.deepEqual([unit.position, unit.left, unit.top], ['absolute', unit.y * 64 + 'px', unit.x * 64 - 720 + 'px']);
      assert.deepEqual([unit.health, unit.armor, unit.fontSize, unit.color], [unit.expectedHealth, unit.expectedArmor, '8px', 'white']);
      assert.ok(unit.hover.includes(unit.name));
      assert.ok(unit.hover.includes('阵营:' + (unit.side === 1 ? '敌方' : '友方')));
      assert.equal(unit.expVisible, unit.player);
      inspectedUnits++;
    }
  }
  console.log('PASS  six actual maps preserve all nodes and original labels/positions for ' + inspectedUnits + ' living units');

  await startBattle();
  const movement = await evaluate(`(() => {
    const hero = units[0];
    const oldCell = [hero.x, hero.y];
    const oldImage = document.getElementById('unit_0');
    const oldHealth = document.getElementById('health_text_0');
    const destination = MovementRules.findReachableCells(read_battle_state(), 0)[0];
    if (!destination) throw new Error('Missing legal hero destination');
    move_selected_unit(destination.x, destination.y);
    return {moved: have_moved, position: [hero.x, hero.y], expected: [destination.x, destination.y],
      sameImage: document.getElementById('unit_0') === oldImage,
      sameHealth: document.getElementById('health_text_0') === oldHealth,
      left: oldImage.style.left, top: oldImage.style.top,
      oldHover: document.getElementById('hover_initial_mask_' + oldCell.join('_')).title,
      newHover: document.getElementById('hover_initial_mask_' + hero.x + '_' + hero.y).title,
      name: hero.name_cn};
  })()`);
  assert.equal(movement.moved, true);
  assert.deepEqual(movement.position, movement.expected);
  assert.ok(movement.sameImage && movement.sameHealth);
  assert.equal(movement.left, movement.position[1] * 64 + 'px');
  assert.equal(movement.top, movement.position[0] * 64 - 720 + 'px');
  assert.ok(!movement.oldHover.includes(movement.name), 'Moving clears the unit from its old tooltip');
  assert.ok(movement.newHover.includes(movement.name));
  console.log('PASS  a real player move keeps image and text nodes and moves its tooltip');

  const updates = await evaluate(`(() => {
    const hero = units[0];
    const names = ['unit', 'health_text', 'armor_text', 'defending', 'blooding', 'poison', 'poison_info',
      'reinforce', 'reinforce_info', 'exp_icon', 'level_info', 'exp_info'];
    const original = Object.fromEntries(names.map(name => [name, document.getElementById(name + '_0')]));
    Object.assign(hero, {health: 3, armor: 2, defending: true, blooding: true, poison: 4, reinforce: 3, level: 5, exp: 7});
    units_display_update();
    const shown = {
      health: original.health_text.textContent, armor: original.armor_text.textContent,
      poison: original.poison_info.textContent, reinforce: original.reinforce_info.textContent,
      level: original.level_info.textContent, exp: original.exp_info.textContent,
      statusVisible: ['defending', 'blooding', 'poison', 'poison_info', 'reinforce', 'reinforce_info']
        .every(name => !original[name].hidden && getComputedStyle(original[name]).display !== 'none'),
      statusOffsets: ['defending', 'blooding', 'poison', 'poison_info', 'reinforce', 'reinforce_info'].map(name => [
        parseFloat(original[name].style.left) - hero.y * 64,
        parseFloat(original[name].style.top) - (hero.x * 64 - 720)]),
      hover: document.getElementById('hover_initial_mask_' + hero.x + '_' + hero.y).title,
    };
    Object.assign(hero, {defending: false, blooding: false, poison: 0, reinforce: 0, level: 6});
    units_display_update();
    const hidden = ['defending', 'blooding', 'poison', 'poison_info', 'reinforce', 'reinforce_info']
      .every(name => original[name].hidden && getComputedStyle(original[name]).display === 'none');
    hero.poison = 2;
    units_display_update();
    return {shown, hidden,
      sameNodes: names.every(name => original[name] === document.getElementById(name + '_0')),
      poison: original.poison_info.textContent, poisonVisible: !original.poison.hidden,
      maxLevel: original.exp_info.textContent, maxHealth: hero.max_health, maxArmor: hero.max_armor};
  })()`);
  assert.ok(updates.sameNodes && updates.hidden && updates.poisonVisible && updates.shown.statusVisible);
  assert.deepEqual([updates.shown.health, updates.shown.armor], ['3/' + updates.maxHealth, '2/' + updates.maxArmor]);
  assert.deepEqual([updates.shown.poison, updates.shown.reinforce, updates.shown.level, updates.shown.exp], ['4', '3', 'level:5', 'exp:7/216']);
  assert.deepEqual(updates.shown.statusOffsets, [[0,16], [0,32], [48,16], [54,18], [48,32], [54,34]]);
  assert.ok(updates.shown.hover.includes('举盾:是 流血:是\n中毒层数:4 昆仑护体仙术层数:3'));
  assert.equal(updates.poison, '2');
  assert.equal(updates.maxLevel, 'exp:已满级');
  console.log('PASS  health, armor, status badges, tooltips and maximum-level text update without replacing nodes');

  const lifecycle = await evaluate(`(() => {
    const heroImage = document.getElementById('unit_0');
    const enemyId = units.findIndex(unit => unit.side === 1 && unit.is_alive);
    const enemy = units[enemyId];
    const enemyImage = document.getElementById('unit_' + enemyId);
    enemy.get_hurt(enemy.health + enemy.armor + 1);
    units_display_update();
    const deadRemoved = !enemyImage.isConnected && !document.getElementById('unit_' + enemyId);
    const summonedId = units_count;
    summon_unit(enemy.x, enemy.y, 'spirit');
    const summoned = units[summonedId];
    units_display_update();
    const summonedImage = document.getElementById('unit_' + summonedId);
    units_display_update();
    const summonedStable = summonedImage === document.getElementById('unit_' + summonedId);

    // Reusing an array position must not transfer the old object's node to its replacement.
    const replacement = new Goblin();
    Object.assign(replacement, {x: summoned.x, y: summoned.y});
    units[summonedId] = replacement;
    units_display_update();
    const replacementImage = document.getElementById('unit_' + summonedId);
    const nodes = Array.from(document.getElementById('units').children);
    return {deadRemoved, noUuid: summoned.uuid === undefined, summonedStable,
      replacementNew: replacementImage !== summonedImage && !summonedImage.isConnected,
      source: replacementImage.getAttribute('src'), expectedSource: replacement.icon,
      heroStable: heroImage === document.getElementById('unit_0'),
      duplicateIds: nodes.length !== new Set(nodes.map(node => node.id)).size};
  })()`);
  assert.ok(lifecycle.deadRemoved && lifecycle.noUuid && lifecycle.summonedStable && lifecycle.replacementNew && lifecycle.heroStable);
  assert.equal(lifecycle.source, lifecycle.expectedSource);
  assert.equal(lifecycle.duplicateIds, false);
  await page(battlePage);
  console.log('PASS  death removes old nodes, summons without uuid keep theirs, and replacement objects receive new nodes');
}

withBrowser(smoke).catch(error => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
