const assert = require('node:assert/strict');
const { withBrowser } = require('./smoke-browser.cjs');

async function smoke({ evaluate, click, page, open }) {
  const username = 'smoke-player';
  const password = 'smoke-only';
  async function submitCredentials(form, register = false) {
    const values = {username, password};
    if (register) values['confirm-password'] = password;
    for (const [id, value] of Object.entries(values)) {
      await evaluate('document.getElementById(' + JSON.stringify(id) + ').value = ' + JSON.stringify(value));
    }
    await click(form + ' button[type="submit"]');
  }
  await open('index.html');
  await click('a[href="game/pages/register.html"]');
  await page('game/pages/register.html');
  await submitCredentials('#registerForm', true);
  await page('game/pages/login.html');
  await submitCredentials('#loginForm');
  await page('game/pages/menu.html');
  assert.equal(await evaluate('localStorage.username'), username);
  await click('a[href="../story/chapter-0/background.html"]');
  await page('game/story/chapter-0/background.html');
  await click('.button-save');
  await page('game/map/index.html');
  const save = await evaluate('JSON.parse(localStorage.getItem(localStorage.username + "autosave"))');
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
  await click('.button-save');
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
