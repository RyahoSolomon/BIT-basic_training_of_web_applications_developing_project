// Check actual browser playback without granting user activation to observations.
const assert = require('node:assert/strict');
const { setTimeout: delay } = require('node:timers/promises');
const { withBrowser } = require('./smoke-browser.cjs');

const mapPage = 'game/map/index.html';
const storyPage = 'game/story/chapter-1/plot.html';

async function smoke({ evaluate, pointerClick: click, page, open, cdp, until }) {
  // Observe from before the HTML is parsed, so even a brief autoplay is caught.
  // Do not replace play(), media data, or the browser's autoplay policy.
  await cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: `
    window.__musicPlaybackEvents = [];
    window.__musicDocumentId = Math.random();
    for (const type of ['play', 'playing']) {
      document.addEventListener(type, event => {
        if (event.target.id === 'audioPlayer') window.__musicPlaybackEvents.push(type);
      }, true);
    }
  ` });

  async function playing(label) {
    await until('music playing: ' + label, () => evaluate(`(() => {
      const audio = document.getElementById('audioPlayer');
      return audio && !audio.paused && !audio.muted && audio.currentTime > 0;
    })()`));
  }

  async function silent(label, { neverStarted = true } = {}) {
    await until('music loaded: ' + label, () => evaluate('document.getElementById("audioPlayer").readyState >= 2'));
    await delay(500);
    const state = await evaluate(`(() => {
      const audio = document.getElementById('audioPlayer');
      return {
        paused: audio.paused,
        time: audio.currentTime,
        events: window.__musicPlaybackEvents,
        enabled: JSON.parse(localStorage.current).is_plot_music_on,
        icon: document.querySelector('.button-music img').src,
        battleEnabled: JSON.parse(localStorage.current).is_inwar_music_on,
      };
    })()`);
    assert.equal(state.enabled, false, label + ': mute preference was lost');
    assert.equal(state.paused, true, label + ': music resumed');
    assert.match(state.icon, /\/mute\.jpg$/, label + ': wrong music icon');
    assert.equal(state.battleEnabled, true, label + ': story mute changed battle preference');
    if (neverStarted) {
      assert.deepEqual(state.events, [], label + ': music briefly started before being paused');
      assert.equal(state.time, 0, label + ': music advanced while disabled');
    }
  }

  await open('index.html');
  await until('landing music loaded', () => evaluate('document.getElementById("audioPlayer").readyState >= 2'));
  await delay(300);
  assert.equal(await evaluate('navigator.userActivation.hasBeenActive'), false,
    'Read-only browser observations must not grant user activation');
  assert.equal(await evaluate('document.getElementById("audioPlayer").paused'), true,
    'Fresh browser should block audible autoplay before interaction');
  await click('.header img');
  await playing('landing page after real click');
  console.log('PASS  blocked autoplay recovers after real user interaction');

  // Create progress using the real registration, login and new-game flows.
  await click('a[href="game/pages/register.html"]');
  await page('game/pages/register.html');
  await evaluate(`
    document.getElementById('username').value = 'audio-smoke-player';
    document.getElementById('password').value = 'audio-smoke';
    document.getElementById('confirm-password').value = 'audio-smoke';
  `);
  await click('#registerForm button[type="submit"]');
  await page('game/pages/login.html');
  await evaluate(`
    document.getElementById('username').value = 'audio-smoke-player';
    document.getElementById('password').value = 'audio-smoke';
  `);
  await click('#loginForm button[type="submit"]');
  await page('game/pages/menu.html');
  await click('a[onclick="construct()"]');
  await page('game/story/chapter-0/background.html');
  await click('.button-save');
  await page(mapPage);
  await click('#Level1');
  await page(storyPage);
  await playing('story before muting');
  await click('.button-music img');
  await silent('story after muting', { neverStarted: false });
  await click('.button-return');
  await page(mapPage);
  await silent('map after muted story');
  await click('#Level1');
  await page(storyPage);
  await silent('story after muted map');

  const previousDocument = await evaluate('window.__musicDocumentId');
  await cdp.send('Page.reload');
  await until('new document after reload', async () => {
    try { return await evaluate('window.__musicDocumentId !== ' + previousDocument + ' && document.readyState === "complete"'); }
    catch (error) {
      if (/context was destroyed|Cannot find context/.test(error.message)) return false;
      throw error;
    }
  });
  await silent('reloaded muted story');
  console.log('PASS  story mute survives map navigation, story return and reload without brief playback');

  for (const file of [
    'game/pages/menu.html',
    'game/pages/achievements.html',
    'game/story/chapter-5/good-ending.html',
    'game/story/chapter-6/true-ending-first.html',
    'game/story/chapter-6/true-ending.html',
  ]) {
    await open(file);
    await silent(file);
  }
  console.log('PASS  menu, achievements and ending pages honor the saved mute preference');

  await open(mapPage);
  await silent('map before enabling');
  await click('.button-music img');
  await playing('map after enabling');
  assert.equal(await evaluate('JSON.parse(localStorage.current).is_plot_music_on'), true);
  await click('#Level1');
  await page(storyPage);
  await playing('next story after enabling');
  assert.equal(await evaluate('JSON.parse(localStorage.current).is_inwar_music_on'), true);
  console.log('PASS  enabling music restores playback and preserves the separate battle preference');

  // Reset media loading, then toggle on/off without waiting for play() to settle.
  // A subsequent ordinary page click must not revive a stale playback attempt.
  await click('.button-music img');
  await evaluate('document.getElementById("audioPlayer").load()');
  await click('.button-music img');
  await click('.button-music img');
  const pausedTime = await evaluate('document.getElementById("audioPlayer").currentTime');
  await silent('rapid music toggle', { neverStarted: false });
  await click('body');
  await silent('page click after rapid music toggle', { neverStarted: false });
  assert.equal(await evaluate('document.getElementById("audioPlayer").currentTime'), pausedTime,
    'A late playback attempt advanced the muted player');
  console.log('PASS  rapid toggles and later page clicks do not restart disabled music');
}

withBrowser(smoke, { userGesture: false }).then(() => console.log('PASS  saved music preference')).catch(error => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
