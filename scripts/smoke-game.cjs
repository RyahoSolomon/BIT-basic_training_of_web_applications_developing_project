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
  await click('a[href="main/register.html"]');
  await page('main/register.html');
  await submitCredentials('#registerForm', true);
  await page('main/login.html');
  await submitCredentials('#loginForm');
  await page('main/_INDEX.html');
  assert.equal(await evaluate('localStorage.username'), username);
  await click('a[href="story/chapter0/background.html"]');
  await page('main/story/chapter0/background.html');
  await click('.button-save');
  await page('main/story/map/map.html');
  const save = await evaluate('JSON.parse(localStorage.getItem(localStorage.username + "autosave"))');
  assert.equal(save.saveurl, 0);
  assert.equal(save.MSYgamename, '序章');
  for (let i = 1; i <= 6; i++) assert.equal(save['level' + i], '0');
  const current = JSON.parse(save.current);
  assert.equal(current.level, 0);
  assert.equal(current.user_level.level, 1);
  assert.deepEqual(current.perfect_level_complete, Array(6).fill(false));
  await click('#Level1');
  await page('main/story/chapter1/plot.html');
  await click('.button-save');
  // Keep controlling the game tab if the first-play tutorial opens in a new tab.
  await page('main/story/war_chess/war_chess.html');
  assert.equal(await evaluate('level'), 0);
  await click('#mission_confirm_mask');
  assert.ok(await evaluate('document.querySelector("#unit_0") && !!document.querySelector("#operation_button_0")'));
  await click('#skip_game_hover_initial_mask');
  await page('main/story/war_chess/result/level_1/win.html');
  assert.match(await evaluate('document.querySelector(".result_inform").textContent'), /胜利/);
}

withBrowser(smoke).then(() => console.log('PASS  first battle victory via skip')).catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
