// Check actual browser playback without granting user activation to observations.
const assert = require('node:assert/strict');
const { setTimeout: delay } = require('node:timers/promises');
const { withBrowser } = require('./smoke-browser.cjs');
const { startGame } = require('./smoke-player-helpers.cjs');
const { dialogueLines, openingToMap } = require('./smoke-story-helpers.cjs');

const mapPage = 'game/map/index.html';
const storyPage = 'game/story/chapter-1/plot.html';

async function smoke({ evaluate, pointerClick: click, page, open, cdp, until }) {
  // Observe from before the HTML is parsed, so even a brief autoplay is caught.
  // Do not replace play(), media data, or the browser's autoplay policy.
  await cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: `
    window.__musicPlaybackEvents = [];
    window.__musicPlaybackTimes = [];
    window.__musicDocumentId = Math.random();
    for (const type of ['play', 'playing', 'pause', 'waiting', 'loadstart', 'emptied', 'seeking']) {
      document.addEventListener(type, event => {
        if (event.target.id === 'audioPlayer') {
          window.__musicPlaybackEvents.push(type);
          window.__musicPlaybackTimes.push({ type, time: event.target.currentTime });
        }
      }, true);
    }
  ` });

  async function toggleMusic() {
    await click('[data-settings-open]');
    await until('open settings', () => evaluate("document.getElementById('game-settings')?.open"));
    await click('[data-channel="music"] [data-volume-toggle]');
    await click('[data-settings-close]');
    // Verify the dialog has closed and the underlying page accepts pointer input.
    await until('settings closed and page interactive', () => evaluate(`(() => {
      const opener = document.querySelector('[data-settings-open]');
      const box = opener.getBoundingClientRect();
      return !document.getElementById('game-settings').open
        && opener.contains(document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2));
    })()`));
  }

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
        events: window.__musicPlaybackEvents.filter(type => ['play', 'playing'].includes(type)),
        enabled: GamePreferences.effectiveVolume('music') > 0,
        volume: audio.volume,
        sound: GamePreferences.get().sound,
      };
    })()`);
    assert.equal(state.enabled, false, label + ': mute preference was lost');
    assert.equal(state.paused, true, label + ': music resumed');
    assert.equal(state.volume, 0, label + ': muted audio still has volume');
    assert.deepEqual(state.sound, { volume: 50, muted: false }, label + ': music changed the sound preference');
    if (neverStarted) {
      assert.deepEqual(state.events, [], label + ': music briefly started before being paused');
      assert.ok(Math.abs(state.time - expectedTime) < 0.1, label + ': paused music position changed');
    }
  }

  await open('game/pages/menu.html');
  await until('landing music loaded', () => evaluate('document.getElementById("audioPlayer").readyState >= 2'));
  await delay(300);
  assert.equal(await evaluate('navigator.userActivation.hasBeenActive'), false,
    'Read-only browser observations must not grant user activation');
  assert.equal(await evaluate('document.getElementById("audioPlayer").paused'), true,
    'Fresh browser should block audible autoplay before interaction');
  await click('.header img');
  await playing('landing page after real click');
  console.log('PASS  blocked autoplay recovers after real user interaction');

  // No account is required; initialize progress through the menu.
  await startGame({ evaluate, click, page, cdp, until });
  await openingToMap({ evaluate, click, page, cdp, until });
  await click('#Level1');
  await page(storyPage);
  // A new file:// document may require its own interaction to allow audio.
  await click('body');
  await playing('story before muting');
  await toggleMusic();
  await silent('story after muting', { neverStarted: false });
  await open(mapPage);
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
    'game/story/chapter-6/true-ending-first.html',
    'game/story/chapter-6/true-ending.html',
  ]) {
    await open(file);
    await silent(file);
  }
  await open('game/story/chapter-5/plota.html');
  await readToEnd();
  await until('ordinary ending music selected', () => evaluate(
    'document.getElementById("audioPlayer").src.endsWith("/015-normal-ending.mp3")'));
  await silent('ordinary ending after muted dialogue');
  console.log('PASS  menu, achievements and ending pages honor the saved mute preference');

  await open(mapPage);
  await silent('map before enabling');
  await toggleMusic();
  await playing('map after enabling');
  assert.equal(await evaluate("GamePreferences.effectiveVolume('music')"), 50);
  await click('#Level1');
  await page(storyPage);
  // Re-entering a file:// page does not always carry over autoplay permission.
  await click('body');
  await playing('next story after enabling');
  assert.deepEqual(await evaluate("GamePreferences.get().sound"), { volume: 50, muted: false });
  console.log('PASS  enabling music restores playback and preserves the separate sound preference');

  // Reset media loading, then toggle on/off without waiting for play() to settle.
  // A subsequent ordinary page click must not revive a stale playback attempt.
  await toggleMusic();
  await evaluate('document.getElementById("audioPlayer").load()');
  await toggleMusic();
  await toggleMusic();
  const pausedTime = await evaluate('document.getElementById("audioPlayer").currentTime');
  await silent('rapid music toggle', { neverStarted: false });
  await click('body');
  await silent('page click after rapid music toggle', { neverStarted: false });
  assert.equal(await evaluate('document.getElementById("audioPlayer").currentTime'), pausedTime,
    'A late playback attempt advanced the muted player');
  console.log('PASS  rapid toggles and later page clicks do not restart disabled music');

  async function readToEnd(nodeId) {
    let lines;
    try {
      lines = await dialogueLines({ evaluate, until }, nodeId);
    } catch (error) {
      const state = await evaluate(`({
        node: document.getElementById('story-player')?.dataset.storyNode,
        transitioning: document.body.dataset.storyTransitioning,
        intro: document.querySelector('[data-story-intro]')?.textContent,
        text: document.querySelector('#story-player .text')?.textContent,
        choices: Array.from(document.querySelectorAll('[data-story-choice]')).map(button => button.dataset.storyChoice),
        award: !!document.querySelector('[data-story-achievement-close]'),
        visibility: document.visibilityState,
        animations: document.getAnimations().map(animation => ({ playState: animation.playState, currentTime: animation.currentTime })),
      })`);
      throw new Error(error.message + ': ' + JSON.stringify(state), { cause: error });
    }
    for (const line of lines) {
      const text = line.text.replaceAll('{player}', 'test');
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
    // seeked can precede the audio clock restarting. Establish actual playback
    // before measuring whether a later choice interrupts that playback.
    await until('music sought and advancing: ' + label, () => evaluate(
      'window.__musicSeeked && !document.getElementById("audioPlayer").paused'
      + ' && document.getElementById("audioPlayer").currentTime > 20'));
  }

  async function continued(label, minimumTime = 20) {
    // A file:// navigation may need interaction before the browser permits play.
    await interactWithBackground();
    await playing(label);
    await until('resumed playback event: ' + label, () => evaluate(
      'window.__musicPlaybackTimes.some(event => event.type === "playing")'));
    const state = await evaluate(`({
      time: document.getElementById('audioPlayer').currentTime,
      events: window.__musicPlaybackTimes.filter(event => ['play', 'playing'].includes(event.type)),
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
      events: window.__musicPlaybackTimes.filter(event => ['play', 'playing'].includes(event.type)),
    })`);
    assert.ok(state.time < 10, label + ': reused a previous scene position');
    assert.ok(state.events.length > 0 && state.events[0].time < 1,
      label + ': fresh music did not begin at the start');
  }

  const prologue = 'game/story/chapter-0/background.html';
  const aftermath = 'game/story/chapter-2/plot-after.html';
  await toggleMusic();
  async function markContinuity() {
    await evaluate(`window.__heldAudio = document.getElementById('audioPlayer');
      window.__heldDocument = document;
      window.__branchPlayback = { time: __heldAudio.currentTime,
        events: __musicPlaybackTimes.length, clock: performance.now() };`);
  }

  async function uninterrupted(label) {
    await delay(200);
    const state = await evaluate(`({
      sameDocument: document === window.__heldDocument,
      sameAudio: document.getElementById('audioPlayer') === window.__heldAudio,
      paused: __heldAudio.paused,
      readyState: __heldAudio.readyState,
      networkState: __heldAudio.networkState,
      ended: __heldAudio.ended,
      error: __heldAudio.error && { code: __heldAudio.error.code, message: __heldAudio.error.message },
      music: GamePreferences.get().music,
      musicSuspended: __heldAudio.dataset.musicSuspended || null,
      time: __heldAudio.currentTime,
      duration: __heldAudio.duration,
      loop: __heldAudio.loop,
      muted: __heldAudio.muted,
      volume: __heldAudio.volume,
      visibility: document.visibilityState,
      node: document.getElementById('story-player')?.dataset.storyNode,
      elapsed: (performance.now() - __branchPlayback.clock) / 1000,
      advanced: __heldAudio.currentTime - __branchPlayback.time,
      events: __musicPlaybackTimes.slice(__branchPlayback.events),
    })`);
    assert.equal(state.sameDocument, true, label + ': document was replaced');
    assert.equal(state.sameAudio, true, label + ': audio element was replaced');
    assert.equal(state.paused, false, label + ': playback stopped: ' + JSON.stringify(state));
    assert.deepEqual(state.events, [], label + ': audio was restarted, reloaded or sought: ' + JSON.stringify(state));
    assert.ok(state.advanced > 0 && Math.abs(state.advanced - state.elapsed) < 0.5,
      label + ': playback did not advance continuously: ' + JSON.stringify(state));
  }

  for (const [source, track] of [
    [prologue, '002-huguo-palace.mp3'],
    [aftermath, '005-kill-nut.mp3'],
  ]) {
    for (const index of [0, 1]) {
      await evaluate(`(() => { localStorage.testflag = '0';
        const achievements = JSON.parse(localStorage.testachievement);
        achievements.ach2 = 0; localStorage.testachievement = JSON.stringify(achievements); })()`);
      await open(source);
      if (source === prologue) await readToEnd('history');
      await readToEnd('main');
      await choices();
      await seekPlaying(source);
      await markContinuity();
      await click('#story-player .button-container .button:nth-child(' + (index + 1) + ')');
      await page(source);
      assert.ok(await evaluate('document.getElementById("audioPlayer").src.endsWith(' + JSON.stringify(track) + ')'));
      await uninterrupted(source + ' choice ' + index);
      if (source === aftermath && index === 0) {
        await until('branch achievement popup', () => evaluate(
          '!!document.querySelector("[data-story-achievement-close]")'));
        await click('[data-story-achievement-close]');
      }
      if (index === 1) {
        await readToEnd(source === prologue ? 'explanation' : 'exclusive');
        if (source === prologue) {
          await choices();
          await click('[data-story-choice=depart]');
        }
        await dialogueLines({ evaluate, until }, source === prologue ? 'departure' : 'common');
        await uninterrupted(source + ' branch rejoin');
      }
    }
  }
  console.log('PASS  both prologue and chapter 2 choices and joins retain the document, audio element and continuous playback');

  // A real track change must not inherit the branch's offset, and entering the
  // same scene later must not reuse an already consumed continuation.
  await readToEnd();
  await page(mapPage);
  assert.ok(await evaluate('!document.getElementById("audioPlayer").src.endsWith("005-kill-nut.mp3")'));
  await fresh('map after chapter 2 branch');
  await open(aftermath);
  await fresh('chapter 2 branch entered independently');

  await open('game/story/chapter-6/plot1.html');
  await seekPlaying('chapter 6 before its music change');
  await evaluate('window.__musicPlaybackTimes = []');
  await readToEnd('confession');
  await until('messenger music selected', () => evaluate(
    'document.getElementById("audioPlayer").src.endsWith("/013-meeting-before-war.mp3")'));
  await fresh('chapter 6 with a different track');
  await dialogueLines({ evaluate, until }, 'messenger');
  await markContinuity();
  await readToEnd('messenger');
  await dialogueLines({ evaluate, until }, 'meeting');
  await uninterrupted('messenger to council with the same track');

  await open(prologue);
  await readToEnd('history');
  await readToEnd('main');
  await choices();
  await seekPlaying('prologue before muted choice');
  await toggleMusic();
  const mutedTime = await evaluate('document.getElementById("audioPlayer").currentTime');
  await click('#story-player .button-container .button:nth-child(1)');
  await page(prologue);
  await silent('muted prologue branch', { neverStarted: false, expectedTime: mutedTime });
  assert.equal(await evaluate('document.getElementById("audioPlayer").currentTime'), mutedTime);
  await click('body');
  await silent('muted prologue branch after interaction', { neverStarted: false, expectedTime: mutedTime });
  assert.equal(await evaluate('document.getElementById("audioPlayer").currentTime'), mutedTime);
  await evaluate('window.__musicPlaybackTimes = []');
  await toggleMusic();
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
