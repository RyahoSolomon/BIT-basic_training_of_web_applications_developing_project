// Exercise dialogue shortcuts with native browser key events, without bypassing player state.
const assert = require('node:assert/strict');
const { setTimeout: delay } = require('node:timers/promises');
const { withBrowser } = require('./smoke-browser.cjs');
const { replaceName } = require('./smoke-player-helpers.cjs');

const linearPage = 'game/story/chapter-1/plot.html';
const graphPage = 'game/story/chapter-2/plot-after.html';
const openingPage = 'game/story/chapter-0/background.html';
const line = text => ({ speaker: '[测试]', text });
const linear = {
  intro: { selector: '#keyboard-test-no-intro' },
  lines: Array.from({length: 10}, (_, index) => line('普通对白 ' + index)),
  inlineChoice: { speaker: '[测试]', label: '明确选择后离开', to: '../../map/index.html' },
};
const graph = {
  id: 'keyboard-fixture', start: 'intro',
  nodes: {
    intro: { type: 'intro', text: '等待介绍结束', duration: 700, next: 'main' },
    main: { type: 'dialogue', lines: [line('节点对白 0'), line('节点对白 1')], next: 'choice' },
    choice: { type: 'choice', choices: [
      { id: 'plain', label: '进入补充对白', to: 'plain' },
      { id: 'award', label: '接受成就选项', to: 'awarded', effects: [
        { type: 'achievement', id: 'ach2', title: '键盘测试成就', description: '确认后继续对白' },
      ] },
    ] },
    plain: { type: 'dialogue', lines: [line('选项后第一句'), line('选项后第二句')], next: 'choice' },
    awarded: { type: 'dialogue', lines: [line('成就后第一句'), line('成就后第二句')], next: 'exit' },
    exit: { type: 'exit', to: '../../map/index.html' },
  },
};

async function smoke(browser) {
  const { evaluate, pointerClick: click, open, page, cdp, until } = browser;
  async function keyEvent(type, key, extra = {}) {
    const space = key === ' ';
    await cdp.send('Input.dispatchKeyEvent', {
      type, key, code: space ? 'Space' : 'Enter', windowsVirtualKeyCode: space ? 32 : 13,
      ...(type === 'keyDown' ? { text: space ? ' ' : '\r' } : {}), ...extra,
    });
  }
  async function key(key, extra = {}) {
    await keyEvent('keyDown', key, extra);
    await keyEvent('keyUp', key, extra);
  }
  async function blur() {
    await evaluate('document.activeElement?.blur()');
  }
  async function text() {
    return evaluate('document.querySelector("#story-player .text, #overlayText")?.textContent');
  }
  async function ready(expected) {
    await until('readable dialogue ' + expected, () => evaluate(`
      document.querySelector('#story-player .text, #overlayText')?.textContent === ${JSON.stringify(expected)}
      && getComputedStyle(document.querySelector('.image-container')).visibility === 'visible'
      && document.body.dataset.storyTransitioning !== 'true'
    `));
  }
  async function loadFixture(file, scene, extra = '') {
    const { identifier } = await cdp.send('Page.addScriptToEvaluateOnNewDocument', {
      source: `${extra}\ndocument.addEventListener('DOMContentLoaded', () => {
        document.getElementById('text1')?.remove();
        window.storyScene = ${JSON.stringify(scene)};
      }, {once: true});`,
    });
    try { await open(file); }
    finally { await cdp.send('Page.removeScriptToEvaluateOnNewDocument', {identifier}); }
  }
  async function node(id) {
    await until('graph node ' + id, () => evaluate(
      'document.getElementById("story-player")?.dataset.storyNode === ' + JSON.stringify(id)));
  }

  await open('game/pages/menu.html');
  await evaluate('GameProgress.newGame("测试旅人"); GamePreferences.setVolume("music", 0)');
  await loadFixture(linearPage, linear);
  await ready('普通对白 0');
  await key(' ');
  await ready('普通对白 1');
  await key('Enter');
  await ready('普通对白 2');
  await keyEvent('keyDown', 'Enter');
  await ready('普通对白 3');
  for (let repeat = 0; repeat < 5; repeat++) await keyEvent('keyDown', 'Enter', {autoRepeat: true});
  assert.equal(await text(), '普通对白 3', 'Holding a key must not skip several lines');
  await keyEvent('keyUp', 'Enter');
  for (const modifiers of [1, 2, 4, 8]) await key('Enter', {modifiers});
  assert.equal(await text(), '普通对白 3', 'Modified shortcuts must not advance dialogue');
  await evaluate(`document.dispatchEvent(new KeyboardEvent('keydown', {key:'Enter', bubbles:true, isComposing:true}));
    document.dispatchEvent(new KeyboardEvent('keydown', {key:'Enter', bubbles:true, keyCode:229}));
    document.addEventListener('keydown', event => event.preventDefault(), {capture:true, once:true});`);
  await key('Enter');
  assert.equal(await text(), '普通对白 3', 'IME or already-handled keys must not advance dialogue');
  await key(' ');
  await ready('普通对白 4');
  console.log('PASS  Space/Enter advance exactly once; held, modified, composing and consumed keys do not skip dialogue');

  await evaluate('document.querySelector("[data-settings-open]").focus()');
  await key('Enter');
  assert.equal(await evaluate('document.getElementById("game-settings").open'), true);
  await evaluate('document.getElementById("settings-music").focus()');
  await key(' ');
  assert.equal(await text(), '普通对白 4');
  await click('[data-name-edit]');
  await until('name entry open', () => evaluate('document.getElementById("player-name-dialog")?.open'));
  await replaceName(browser, 'A');
  await key(' ');
  await cdp.send('Input.insertText', {text:'B'});
  assert.equal(await evaluate('document.getElementById("player-name").value'), 'A B');
  await evaluate(`window.keyboardNameComposing = false;
    document.getElementById('player-name').addEventListener('compositionstart', () => keyboardNameComposing = true);
    document.getElementById('player-name').addEventListener('compositionend', () => keyboardNameComposing = false);`);
  await cdp.send('Input.imeSetComposition', {text:'新', selectionStart:1, selectionEnd:1});
  await key('Enter');
  assert.equal(await evaluate('document.getElementById("player-name-dialog").open'), true,
    'IME confirmation must not submit the name');
  if (await evaluate('keyboardNameComposing')) await cdp.send('Input.insertText', {text:'新'});
  await replaceName(browser, '新名字');
  await key('Enter');
  await until('rename confirmed', () => evaluate('!document.getElementById("player-name-dialog").open'));
  assert.equal(await evaluate('GameProfile.getName()'), '新名字');
  assert.equal(await text(), '普通对白 4', 'Rename Enter must not advance the background dialogue');
  await evaluate('document.querySelector("[data-settings-close]").focus()');
  await key('Enter');
  assert.equal(await evaluate('document.getElementById("game-settings").open'), false);
  assert.equal(await text(), '普通对白 4', 'Closing a modal by Enter must not also advance');
  await blur();
  await key('Enter');
  await ready('普通对白 5');
  console.log('PASS  native settings buttons, text spaces, IME and rename confirmation do not advance the story');

  for (let index = 6; index < 10; index++) {
    await key(index % 2 ? ' ' : 'Enter');
    await ready('普通对白 ' + index);
  }
  await key('Enter');
  await until('inline choice', () => evaluate('!!document.querySelector("#button1")'));
  await key(' ');
  await key('Enter');
  await page(linearPage);
  assert.ok(await evaluate('!!document.querySelector("#button1")'), 'Bare shortcuts must not choose an inline option');
  await evaluate('document.getElementById("button1").focus()');
  await key('Enter');
  await page('game/map/index.html');
  console.log('PASS  inline choices require explicit focus or pointer activation');

  await loadFixture(graphPage, graph);
  await node('intro');
  await key(' ');
  await key('Enter');
  await node('intro');
  await ready('节点对白 0');
  await key(' ');
  await ready('节点对白 1');
  await key('Enter');
  await node('choice');
  await key(' ');
  await key('Enter');
  await node('choice');
  await evaluate('document.querySelector("[data-story-choice=plain]").focus()');
  await key('Enter');
  await ready('选项后第一句');
  assert.equal(await text(), '选项后第一句', 'A native choice click must not also consume its first dialogue');
  await blur();
  await key(' ');
  await ready('选项后第二句');
  await key('Enter');
  await node('choice');
  await evaluate('document.querySelector("[data-story-choice=award]").focus()');
  await key(' ');
  await until('achievement popup', () => evaluate('!!document.querySelector("[data-story-achievement-close]")'));
  await blur();
  await key(' ');
  await key('Enter');
  assert.ok(await evaluate('!!document.querySelector("[data-story-achievement-close]")'));
  await evaluate('document.querySelector("[data-story-achievement-close]").focus()');
  await key('Enter');
  await ready('成就后第一句');
  assert.equal(await text(), '成就后第一句', 'Achievement confirmation must not consume the next dialogue');
  console.log('PASS  graph introductions, choices and awards stay separate from dialogue shortcuts and native button activation');

  const transition = {
    intro: {selector:'#keyboard-test-no-intro'},
    lines: [
      {...line('转场前'), background:'../../assets/images/background/001.png'},
      {...line('转场后第一句'), background:'../../assets/images/background/002.png'},
      line('转场后第二句'),
    ],
    inlineChoice: linear.inlineChoice,
  };
  await loadFixture(linearPage, transition, `
    const keyboardDecode = HTMLImageElement.prototype.decode;
    HTMLImageElement.prototype.decode = function () {
      const decoded = keyboardDecode.call(this);
      if (!this.src.endsWith('/002.png')) return decoded;
      return decoded.then(() => new Promise(resolve => {
        window.keyboardDecodePending = true;
        window.keyboardReleaseDecode = resolve;
      }));
    };`);
  await ready('转场前');
  await until('next image decode held', () => evaluate('window.keyboardDecodePending'));
  await key(' ');
  assert.equal(await evaluate('document.body.dataset.storyTransitioning'), 'true');
  await key('Enter');
  await key(' ');
  assert.equal(await text(), '转场前');
  await evaluate('keyboardReleaseDecode()');
  await ready('转场后第一句');
  await key('Enter');
  await ready('转场后第二句');
  console.log('PASS  keys pressed while loading a transition are ignored instead of queued');

  await open(openingPage);
  const openingLines = await evaluate('backgrounds.map(line => line.text)');
  await ready(openingLines[0]);
  await key(' ');
  await ready(openingLines[1]);
  await key('Enter');
  await ready(openingLines[2]);
  console.log('PASS  the standalone opening narration shares Space/Enter controls');
}

async function smokeKeyboardAudio({ evaluate, open, cdp, until }) {
  async function key(value) {
    const code = value === ' ' ? 'Space' : 'Enter';
    const windowsVirtualKeyCode = value === ' ' ? 32 : 13;
    await cdp.send('Input.dispatchKeyEvent', {
      type: 'keyDown', key: value, code, windowsVirtualKeyCode, text: value === ' ' ? ' ' : '\r',
    });
    await cdp.send('Input.dispatchKeyEvent', {type: 'keyUp', key: value, code, windowsVirtualKeyCode});
  }
  async function ready(expected) {
    await until('audio fixture dialogue ' + expected, () => evaluate(`
      document.querySelector('#story-player .text')?.textContent === ${JSON.stringify(expected)}
      && getComputedStyle(document.querySelector('.image-container')).visibility === 'visible'
      && document.body.dataset.storyTransitioning !== 'true'
    `));
  }
  async function fixture(file, scene) {
    const {identifier} = await cdp.send('Page.addScriptToEvaluateOnNewDocument', {source: `
      document.addEventListener('DOMContentLoaded', () => {
        document.getElementById('text1')?.remove();
        window.storyScene = ${JSON.stringify(scene)};
      }, {once: true});
    `});
    try { await open(file); }
    finally { await cdp.send('Page.removeScriptToEvaluateOnNewDocument', {identifier}); }
  }
  async function snapshot() {
    return evaluate(`(() => {
      const audio = document.getElementById('audioPlayer');
      return {paused: audio.paused, time: audio.currentTime, events: keyboardMusicEvents,
        enabled: get_music_state(), suspended: audio.dataset.musicSuspended === 'true'};
    })()`);
  }
  await cdp.send('Page.addScriptToEvaluateOnNewDocument', {source: `
    window.keyboardMusicEvents = [];
    for (const type of ['play', 'playing', 'pause', 'loadstart', 'emptied', 'seeking']) {
      document.addEventListener(type, event => {
        if (event.target.id === 'audioPlayer') keyboardMusicEvents.push(type);
      }, true);
    }
  `});
  await fixture(linearPage, linear);
  await ready('普通对白 0');
  await until('blocked autoplay loaded', () => evaluate('document.getElementById("audioPlayer").readyState >= 2'));
  assert.equal(await evaluate('navigator.userActivation.hasBeenActive'), false,
    'Audio observations must not supply browser user activation');
  const blocked = await snapshot();
  assert.equal(blocked.enabled, true);
  assert.equal(blocked.paused, true, 'A fresh browser must block audible autoplay before interaction');
  await key(' ');
  await ready('普通对白 1');
  await until('keyboard unlocks blocked music', () => evaluate(`(() => {
    const audio = document.getElementById('audioPlayer');
    return !audio.paused && audio.currentTime > 0.25;
  })()`));
  await evaluate('keyboardMusicEvents = []');
  const before = await snapshot();
  await key('Enter');
  await ready('普通对白 2');
  await until('music continues after Enter', () => evaluate(
    'document.getElementById("audioPlayer").currentTime > ' + (before.time + 0.1)));
  const after = await snapshot();
  assert.equal(after.paused, false);
  assert.ok(after.time >= before.time, 'Later dialogue keys must preserve music playback position');
  assert.deepEqual(after.events, [], 'Later dialogue keys must not restart, pause, reload or seek playing music');
  console.log('PASS  a real first keyboard press unlocks blocked autoplay; later keys preserve uninterrupted music');

  await evaluate('GamePreferences.setVolume("music", 0)');
  await delay(200);
  await evaluate('keyboardMusicEvents = []');
  const muted = await snapshot();
  assert.equal(muted.enabled, false);
  assert.equal(muted.paused, true);
  await key(' ');
  await ready('普通对白 3');
  await delay(200);
  const stillMuted = await snapshot();
  assert.equal(stillMuted.paused, true, 'A dialogue key must respect the saved music mute setting');
  assert.equal(stillMuted.time, muted.time);
  assert.deepEqual(stillMuted.events, []);

  await evaluate('GamePreferences.setVolume("music", 50)');
  await fixture(graphPage, {id: 'keyboard-silence', start: 'quiet', nodes: {
    quiet: {type: 'dialogue', music: null, lines: [line('作者留白第一句'), line('作者留白第二句')], next: 'exit'},
    exit: {type: 'exit', to: '../../map/index.html'},
  }});
  await ready('作者留白第一句');
  await delay(200);
  await evaluate('keyboardMusicEvents = []');
  const quiet = await snapshot();
  assert.equal(quiet.enabled, true);
  assert.equal(quiet.suspended, true, 'The authored music:null node must suspend playback');
  assert.equal(quiet.paused, true);
  await key('Enter');
  await ready('作者留白第二句');
  await delay(200);
  const stillQuiet = await snapshot();
  assert.equal(stillQuiet.paused, true, 'A dialogue key must preserve authored silence');
  assert.equal(stillQuiet.suspended, true);
  assert.equal(stillQuiet.time, quiet.time);
  assert.deepEqual(stillQuiet.events, []);
  console.log('PASS  dialogue keyboard input preserves muted music and authored silence');
}

(async () => {
  await withBrowser(smoke);
  await withBrowser(smokeKeyboardAudio, {userGesture: false});
})().catch(error => { console.error(error.stack || error.message); process.exitCode = 1; });
