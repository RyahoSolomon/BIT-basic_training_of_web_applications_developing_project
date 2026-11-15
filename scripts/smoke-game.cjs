const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { withBrowser } = require('./smoke-browser.cjs');
const { openingToMap, readScene } = require('./smoke-story-helpers.cjs');

async function smoke(browser) {
  const { evaluate, click, page, cdp, until } = browser;
  await cdp.send('Page.navigate', { url: pathToFileURL(path.resolve(__dirname, '../index.html')).href });
  await page('game/pages/menu.html');
  await click('a[href="../story/chapter-0/background.html"]');
  await page('game/story/chapter-0/background.html');
  assert.equal(await evaluate('localStorage.username'), 'test');
  await openingToMap(browser);
  const save = await evaluate('JSON.parse(localStorage.getItem("game.save"))');
  assert.equal(save.version, 1);
  assert.ok(Number.isFinite(Date.parse(save.savedAt)));
  assert.equal(save.progress.chapterName, '序章');
  assert.deepEqual(save.progress.levels, Array(6).fill(0));
  assert.equal(save.progress.isFirstPlay, true);
  const current = save.progress.current;
  assert.equal(current.level, 0);
  assert.equal(current.user_level.level, 1);
  assert.deepEqual(current.perfect_level_complete, Array(6).fill(false));
  await click('#Level1');
  await page('game/story/chapter-1/plot.html');
  await readScene(browser);
  await until('battle choice', () => evaluate('!!document.querySelector("#button1")'));
  await click('#button1');
  // Keep controlling the game tab if the first-play tutorial opens in a new tab.
  await page('game/battle/index.html');
  assert.equal(await evaluate('level'), 0);
  await click('#mission_confirm_mask');
  assert.ok(await evaluate('document.querySelector("#unit_0") && !!document.querySelector("#operation_button_0")'));
  await click('#skip_game_hover_initial_mask');
  await page('game/battle/results/level-1/win.html');
  assert.match(await evaluate('document.querySelector(".result_inform").textContent'), /胜利/);
}

withBrowser(smoke).then(() => console.log('PASS  first battle victory via skip')).catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
