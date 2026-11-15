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
    window.__musicPlaybackTimes = [];
    window.__musicDocumentId = Math.random();
    for (const type of ['play', 'playing']) {
      document.addEventListener(type, event => {
        if (event.target.id === 'audioPlayer') {
          window.__musicPlaybackEvents.push(type);
          window.__musicPlaybackTimes.push({ type, time: event.target.currentTime });
        }
      }, true);
    }
  ` });

  async function playing(label) {
    await until('music playing: ' + label, () => evaluate(`(() => {
      const audio = document.getElementById('audioPlayer');
      return audio && !audio.paused && !audio.muted && audio.currentTime > 0;
    })()`));
  }

  async function silent(label, { neverStarted = true, expectedTime = 0 } = {}) {
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
      assert.ok(Math.abs(state.time - expectedTime) < 0.1, label + ': paused music position changed');
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
  await click('a[href="../story/chapter-0/background.html"]');
  await page('game/story/chapter-0/background.html');
  await click('.button-save');
  await page(mapPage);
  await click('#Level1');
  await page(storyPage);
  // A new file:// document may require its own interaction to allow audio.
  await click('body');
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
  // Re-entering a file:// page does not always carry over autoplay permission.
  await click('body');
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

  async function readToEnd() {
    const lines = await evaluate('window.storyScene.lines');
    for (const line of lines) {
      const text = line.text.replaceAll('{player}', 'audio-smoke-player');
      await until('audio branch dialogue: ' + text.slice(0, 30), () => evaluate(`
        document.querySelector('#story-player .text')?.textContent === ${JSON.stringify(text)}
        && getComputedStyle(document.querySelector('#story-player .image-container')).visibility === 'visible'
        && document.body.dataset.storyTransitioning !== 'true'
      `));
      await click('#story-player .image-container');
    }
  }

  async function choices() {
    await until('audio branch choices', () => evaluate(
      'document.querySelectorAll("#story-player .button-container .button").length === 2'));
  }

  async function interactWithBackground() {
    // Clicking the body's center can hit a dialogue box once its intro settles.
    // Use the empty corner so granting activation never advances the story.
    assert.ok(await evaluate(`!document.elementFromPoint(1, 1)?.closest(
      '#story-player, .button-group, #achievement_popup, button, a')`));
    await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', button: 'left', clickCount: 1, x: 1, y: 1 });
    await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', button: 'left', clickCount: 1, x: 1, y: 1 });
  }

  async function seekPlaying(label) {
    await interactWithBackground();
    await playing(label);
    await until('seekable music: ' + label, () => evaluate(
      'document.getElementById("audioPlayer").readyState >= 2'));
    await evaluate(`(() => {
      const audio = document.getElementById('audioPlayer');
      window.__musicSeeked = false;
      audio.addEventListener('seeked', () => { window.__musicSeeked = true; }, { once: true });
      audio.currentTime = 20;
    })()`);
    await until('music sought: ' + label, () => evaluate(
      'window.__musicSeeked && document.getElementById("audioPlayer").currentTime >= 20'));
  }

  async function continued(label, minimumTime = 20) {
    // A file:// navigation may need interaction before the browser permits play.
    await interactWithBackground();
    await playing(label);
    await until('resumed playback event: ' + label, () => evaluate(
      'window.__musicPlaybackTimes.some(event => event.type === "playing")'));
    const state = await evaluate(`({
      time: document.getElementById('audioPlayer').currentTime,
      events: window.__musicPlaybackTimes,
    })`);
    assert.ok(state.time >= minimumTime - 0.1, label + ': music restarted from the beginning');
    assert.ok(state.events.some(event => event.type === 'playing'), label + ': no actual playback observed');
    assert.ok(state.events.every(event => event.time >= minimumTime - 0.1),
      label + ': music briefly played from the beginning before seeking: ' + JSON.stringify(state.events));
  }

  async function fresh(label) {
    await interactWithBackground();
    await playing(label);
    const state = await evaluate(`({
      time: document.getElementById('audioPlayer').currentTime,
      events: window.__musicPlaybackTimes,
    })`);
    assert.ok(state.time < 10, label + ': reused a previous scene position');
    assert.ok(state.events.length > 0 && state.events[0].time < 1,
      label + ': fresh music did not begin at the start');
  }

  const prologue = 'game/story/chapter-0/plot.html';
  const aftermath = 'game/story/chapter-2/plot-after.html';
  await click('.button-music img');
  for (const [source, destinations, track] of [
    [prologue, ['plot-b.html', 'plot-a.html'], '002-huguo-palace.mp3'],
    [aftermath, ['branch-short.html', 'branch-long.html'], '005-kill-nut.mp3'],
  ]) {
    for (const [index, destination] of destinations.entries()) {
      await open(source);
      await readToEnd();
      await choices();
      await seekPlaying(source);
      await click('#story-player .button-container .button:nth-child(' + (index + 1) + ')');
      const branch = source.replace(/[^/]+$/, destination);
      await page(branch);
      assert.ok(await evaluate('document.getElementById("audioPlayer").src.endsWith(' + JSON.stringify(track) + ')'));
      await continued(branch);
      if (destination === 'branch-short.html') {
        await until('branch achievement popup', () => evaluate(
          'getComputedStyle(document.getElementById("achievement_popup")).display !== "none"'));
        await click('#achievement_popup [onclick="Shutoff()"]');
      }
      if (destination === 'branch-long.html') {
        await readToEnd();
        await page('game/story/chapter-2/branch-short.html');
        await continued('chapter 2 long branch rejoins short branch');
      }
    }
  }
  console.log('PASS  both prologue and chapter 2 choices, including long-branch rejoin, retain music position from first playback');

  // A real track change must not inherit the branch's offset, and entering the
  // same scene later must not reuse an already consumed continuation.
  await click('.button-save');
  await page(mapPage);
  assert.ok(await evaluate('!document.getElementById("audioPlayer").src.endsWith("005-kill-nut.mp3")'));
  await fresh('map after chapter 2 branch');
  await open('game/story/chapter-2/branch-long.html');
  await fresh('chapter 2 branch entered independently');

  await open('game/story/chapter-6/plot1.html');
  await seekPlaying('chapter 6 before its music change');
  await readToEnd();
  await page('game/story/chapter-6/plot2.html');
  assert.ok(await evaluate('document.getElementById("audioPlayer").src.endsWith("013-meeting-before-war.mp3")'));
  await fresh('chapter 6 with a different track');

  await open(prologue);
  await readToEnd();
  await choices();
  await seekPlaying('prologue before muted choice');
  await click('.button-music img');
  const mutedTime = await evaluate('document.getElementById("audioPlayer").currentTime');
  await click('#story-player .button-container .button:nth-child(1)');
  await page('game/story/chapter-0/plot-b.html');
  await silent('muted prologue branch', { expectedTime: mutedTime });
  await click('body');
  await silent('muted prologue branch after interaction', { expectedTime: mutedTime });
  await click('.button-music img');
  await continued('prologue branch enabled after muted navigation', mutedTime);
  console.log('PASS  a muted branch stays silent and retains its position when music is enabled');

  const branchDocument = await evaluate('window.__musicDocumentId');
  await cdp.send('Page.reload');
  await until('branch document after reload', async () => {
    try { return await evaluate('window.__musicDocumentId !== ' + branchDocument + ' && document.readyState === "complete"'); }
    catch (error) {
      if (/context was destroyed|Cannot find context/.test(error.message)) return false;
      throw error;
    }
  });
  await fresh('reloaded prologue branch');
  console.log('PASS  different tracks, independent scene visits and reloads do not reuse branch continuation');
}

withBrowser(smoke, { userGesture: false }).then(() => console.log('PASS  saved music preference')).catch(error => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
