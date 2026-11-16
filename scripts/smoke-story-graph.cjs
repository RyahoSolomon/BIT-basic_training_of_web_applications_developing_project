// Exercise graph-specific behavior through real controls, including repeated topics.
const assert = require('node:assert/strict');
const { setTimeout: delay } = require('node:timers/promises');
const { withBrowser } = require('./smoke-browser.cjs');
const { dialogueLines, readScene } = require('./smoke-story-helpers.cjs');

const aftermath = 'game/story/chapter-2/plot-after.html';
const map = 'game/map/index.html';
const palace = '../../assets/images/background/005-huguo-palace.png';
const firstSong = '../../assets/audio/005-kill-nut.mp3';
const secondSong = '../../assets/audio/013-meeting-before-war.mp3';
const line = text => [{ speaker: '[测试]', text }];
const fixture = {
  id: 'repeat-topics-fixture', start: 'opening', skip: { exit: '../../map/index.html' },
  nodes: {
    opening: { type: 'dialogue', lines: line('开场对白只读一次'), next: 'menu', background: palace, music: firstSong },
    menu: { type: 'choice', choices: [
      { id: 'lore', kind: 'topic', repeat: 'always', label: '反复询问', to: 'lore', effects: [
        { type: 'setFlag', value: 1 },
        { type: 'achievement', id: 'ach2', title: '测试成就', description: '仅第一次接受选项时执行' },
      ] },
      { id: 'once', kind: 'topic', repeat: 'hide', label: '询问后隐藏', to: 'once' },
      { id: 'disabled', kind: 'topic', repeat: 'disable', label: '询问后禁用', to: 'disabled' },
      { id: 'proceed', kind: 'advance', label: '继续剧情', to: 'change' },
    ] },
    lore: { type: 'dialogue', lines: line('补充信息'), next: 'menu', skip: { node: 'menu' }, background: palace, music: firstSong },
    once: { type: 'dialogue', lines: line('只问一次'), next: 'menu' },
    disabled: { type: 'dialogue', lines: line('已问内容'), next: 'menu' },
    change: { type: 'dialogue', lines: line('新曲目'), next: 'inherit', music: secondSong },
    inherit: { type: 'dialogue', lines: line('沿用新曲目'), next: 'same' },
    same: { type: 'dialogue', lines: line('显式同曲目'), next: 'silent', music: secondSong },
    silent: { type: 'dialogue', lines: line('剧情暂时静音'), next: 'resume', music: null },
    resume: { type: 'dialogue', lines: line('恢复原曲目'), next: 'exit', music: firstSong },
    exit: { type: 'exit', to: '../../map/index.html' },
  },
};

async function smoke(browser) {
  const { evaluate, pointerClick: click, open, page, cdp, until } = browser;
  async function node(id) {
    await until('graph node ' + id, () => evaluate(`
      document.getElementById('story-player')?.dataset.storyNode === ${JSON.stringify(id)}
      && document.body.dataset.storyTransitioning !== 'true'
    `));
  }
  async function reset() {
    await evaluate(`(() => { GameProgress.newGame('测试旅人');
      const achievements = JSON.parse(localStorage.testachievement); achievements.ach2 = 0;
      localStorage.testachievement = JSON.stringify(achievements); GameProgress.saveAuto(); })()`);
  }
  async function loadFixture(data = fixture, extra = '') {
    const { identifier } = await cdp.send('Page.addScriptToEvaluateOnNewDocument', {
      source: `${extra}\ndocument.addEventListener('DOMContentLoaded', () => {
        if (location.pathname.endsWith('/${aftermath}')) window.storyScene = ${JSON.stringify(data)};
      }, { once: true });`,
    });
    try { await open(aftermath); }
    finally { await cdp.send('Page.removeScriptToEvaluateOnNewDocument', { identifier }); }
  }
  async function state() {
    return evaluate(`({ flag: Number(localStorage.testflag), achievement: Number(JSON.parse(localStorage.testachievement).ach2),
      saved: JSON.parse(localStorage.getItem('game.save')) })`);
  }
  async function playing() {
    await until('actual graph music playing', () => evaluate(`(() => {
      const audio = document.getElementById('audioPlayer');
      return !audio.paused && audio.currentTime > 0 && audio.readyState >= 2;
    })()`));
  }
  async function markMedia() {
    await evaluate(`window.graphAudio = document.getElementById('audioPlayer');
      window.graphDocument = document; window.graphMediaEvents = []; window.graphStartTime = graphAudio.currentTime;
      for (const type of ['loadstart', 'emptied', 'pause', 'play', 'playing', 'seeking'])
        graphAudio.addEventListener(type, () => graphMediaEvents.push(type));`);
  }
  async function sameMedia() {
    const value = await evaluate(`({ sameDocument: graphDocument === document,
      sameAudio: graphAudio === document.getElementById('audioPlayer'),
      events: graphMediaEvents, advanced: graphAudio.currentTime - graphStartTime })`);
    assert.equal(value.sameDocument, true);
    assert.equal(value.sameAudio, true);
    assert.deepEqual(value.events, [], 'Inherited/identical music was touched');
    assert.ok(value.advanced >= 0, 'Music position moved backwards');
  }

  await open('game/pages/menu.html');
  await reset();
  await loadFixture();
  await dialogueLines(browser, 'opening');
  await click('[data-settings-open]');
  await click('[data-settings-close]');
  await playing();
  await readScene(browser, 'opening');
  await node('menu');
  await markMedia();
  await evaluate(`window.graphApplyEffects = GameProgress.applyStoryEffects; window.graphChoiceAttempts = 0;
    GameProgress.applyStoryEffects = effects => {
      graphChoiceAttempts++;
      if (graphChoiceAttempts === 1) throw new Error('模拟存储失败，请重试');
      return graphApplyEffects(effects);
    };`);
  await click('[data-story-choice="lore"]');
  await until('choice write failure shown', () => evaluate('document.querySelector("[role=alert]")?.textContent.includes("模拟存储失败")'));
  await node('menu');
  assert.equal((await state()).flag, 0);
  assert.equal((await state()).achievement, 0);
  // A retry accepts the same still-available choice once, even if an already
  // dispatched click reaches its old element again immediately.
  await evaluate(`const retryChoice = document.querySelector('[data-story-choice=lore]');
    retryChoice.click(); retryChoice.click();`);
  assert.equal(await evaluate('graphChoiceAttempts'), 2, 'A stale duplicate click applied the successful choice twice');
  await until('first topic award', () => evaluate('!!document.querySelector("[data-story-achievement-close]")'));
  const awarded = await state();
  assert.equal(awarded.flag, 1);
  assert.equal(awarded.achievement, 1);
  assert.equal(awarded.saved.endingFlag, 1, 'Choice was not saved before a page exit');
  assert.equal(awarded.saved.achievements.ach2, 1);
  await click('[data-story-achievement-close]');
  await readScene(browser, 'lore');
  await node('menu');
  assert.equal(await evaluate('document.querySelector("[data-story-choice=lore]").disabled'), false);
  await sameMedia();
  // Alter the flag to distinguish "execute effects once" from simply writing
  // the same value again. Repeating the topic must not replay any choice effects.
  await evaluate('localStorage.testflag = "0"');
  for (let repeat = 0; repeat < 2; repeat++) {
    await click('[data-story-choice="lore"]');
    await node('lore');
    assert.equal(await evaluate('!!document.querySelector("[data-story-achievement-close]")'), false);
    assert.equal((await state()).flag, 0, 'Repeat topic executed its first-selection effects again');
    if (repeat === 0) await readScene(browser, 'lore');
    else await click('[data-story-skip]');
    await node('menu');
  }
  await sameMedia();
  await click('[data-story-choice="once"]');
  await readScene(browser, 'once');
  await node('menu');
  assert.equal(await evaluate('!!document.querySelector("[data-story-choice=once]")'), false);
  await click('[data-story-choice="disabled"]');
  await readScene(browser, 'disabled');
  await node('menu');
  assert.equal(await evaluate('document.querySelector("[data-story-choice=disabled]").disabled'), true);
  console.log('PASS  failed choices can retry; stale duplicate clicks and repeated topics apply effects once; hide/disable stay separate');

  await click('[data-story-choice="proceed"]');
  await node('change');
  await playing();
  assert.ok(await evaluate('document.getElementById("audioPlayer").src.endsWith("013-meeting-before-war.mp3")'));
  assert.ok(await evaluate('document.getElementById("audioPlayer").currentTime < 3'));
  await markMedia();
  await readScene(browser, 'change');
  await node('inherit');
  await readScene(browser, 'inherit');
  await node('same');
  await sameMedia();
  await readScene(browser, 'same');
  await node('silent');
  assert.equal(await evaluate('document.getElementById("audioPlayer").paused'), true);
  await click('[data-settings-open]');
  await click('[data-channel="music"] [data-volume-toggle]');
  await click('[data-channel="music"] [data-volume-toggle]');
  await click('[data-settings-close]');
  assert.equal(await evaluate('document.getElementById("audioPlayer").paused'), true, 'Settings restarted a deliberately silent node');
  await readScene(browser, 'silent');
  await node('resume');
  await playing();
  assert.ok(await evaluate('document.getElementById("audioPlayer").src.endsWith("005-kill-nut.mp3")'));
  await readScene(browser, 'resume');
  await page(map);
  console.log('PASS  explicit music changes, inheritance, same-track reuse and authored silence work within one graph');

  // Cancel an internal transition without unloading the page, then release its
  // real decoder. The cancelled continuation must not replace the safe node.
  const cancellation = JSON.parse(JSON.stringify(fixture));
  cancellation.nodes.menu.skip = { node: 'safe' };
  cancellation.nodes.menu.choices[0].effects = [];
  cancellation.nodes.lore.background = '../../assets/images/background/002.png';
  cancellation.nodes.safe = { type: 'dialogue', lines: line('取消后保留此句'), next: 'menu' };
  await reset();
  await loadFixture(cancellation, `window.graphPendingDecode = false;
    const graphDecode = HTMLImageElement.prototype.decode;
    HTMLImageElement.prototype.decode = function () {
      const decoded = graphDecode.call(this);
      if (!this.src.endsWith('/002.png')) return decoded;
      return decoded.then(() => new Promise(resolve => {
        window.graphPendingDecode = true; window.graphReleaseDecode = resolve;
      }));
    };`);
  await readScene(browser, 'opening');
  await node('menu');
  await until('graph background held at decode', () => evaluate('window.graphPendingDecode'));
  await click('[data-story-choice="lore"]');
  await until('graph transition waiting', () => evaluate('document.body.dataset.storyTransitioning === "true"'));
  await click('[data-story-skip]');
  await node('safe');
  await evaluate('graphReleaseDecode()');
  await delay(150);
  await node('safe');
  assert.ok(await evaluate('getComputedStyle(document.body).backgroundImage.includes("005-huguo-palace.png")'));
  assert.equal(await evaluate('document.querySelector("#story-player .text").textContent'), '取消后保留此句');
  assert.equal((await state()).achievement, 0);

  // Also cancel an authored caption timer by returning to the same menu.
  const caption = JSON.parse(JSON.stringify(fixture));
  caption.nodes.menu.choices[0].effects = [];
  caption.nodes.lore = { type: 'intro', text: '可跳过的补充字幕', duration: 500,
    skip: { node: 'menu' }, next: 'change' };
  await loadFixture(caption);
  await readScene(browser, 'opening');
  await node('menu');
  await click('[data-story-choice="lore"]');
  await node('lore');
  await click('[data-story-skip]');
  await node('menu');
  await delay(650);
  await node('menu');
  assert.ok(await evaluate('document.getElementById("audioPlayer").src.endsWith("005-kill-nut.mp3")'));
  console.log('PASS  same-page skip cancels pending image decode and caption timers without late node or background commits');

  for (const atChoice of [false, true]) {
    await reset();
    await open(aftermath);
    if (atChoice) {
      await readScene(browser, 'main');
      await node('decision');
    }
    await until('skip control', () => evaluate('!!document.querySelector("[data-story-skip]")'));
    await click('[data-story-skip]');
    await page(map);
    assert.equal((await state()).flag, 0);
    assert.equal((await state()).achievement, 0);
  }
  // An in-flight caption cannot take control again after the player leaves.
  await reset();
  await open(aftermath);
  await readScene(browser, 'main');
  await node('decision');
  await click('[data-story-choice="kill"]');
  await node('escape');
  await click('[data-story-skip]');
  await page(map);
  await delay(2200);
  await page(map);
  assert.equal((await state()).achievement, 0);
  console.log('PASS  skipping before a decision or during a branch caption never chooses a result or commits a late transition');
}

withBrowser(smoke, { userGesture: false }).then(() => console.log('PASS  story graph behavior')).catch(error => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
