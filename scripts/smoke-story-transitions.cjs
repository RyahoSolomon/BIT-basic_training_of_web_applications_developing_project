const assert = require('node:assert/strict');
const { setTimeout: delay } = require('node:timers/promises');
const { withBrowser } = require('./smoke-browser.cjs');

const background = 'game/story/chapter-0/background.html';
const prologue = 'game/story/chapter-0/plot.html';
const images = [1, 2, 3].map(index => '../../assets/images/background/00' + index + '.png');

// Hold a real, locally decoded image at the decode boundary. This models slow
// decoding without HTTP, cache timing, or a sleep that could miss the condition.
function installFixture(config) {
  const state = window.transitionSmoke = { frames: [], record: false, pending: false, decodeCalls: 0 };
  const decode = HTMLImageElement.prototype.decode;
  HTMLImageElement.prototype.decode = function () {
    const result = decode.call(this);
    if (!config.gate || !this.src.endsWith('/002.png')) return result;
    state.decodeCalls++;
    return result.then(() => new Promise((resolve, reject) => {
      state.pending = true;
      state.release = () => { state.pending = false; resolve(); };
      state.reject = () => { state.pending = false; reject(new Error('Simulated image decode failure')); };
    }));
  };
  document.addEventListener('DOMContentLoaded', () => {
    if (config.opening) {
      backgrounds.splice(0, backgrounds.length, ...config.lines.map(line => ({
        ...line, image: line.background,
      })));
    } else {
      window.storyScene = {
        intro: { selector: '#no-transition-test-intro' },
        lines: config.lines,
        next: () => { state.finished = true; },
      };
      document.getElementById('text1')?.remove();
    }
    const sample = () => {
      if (state.record) {
        const layer = document.querySelector('.story-transition-layer');
        const style = layer && getComputedStyle(layer);
        const container = document.querySelector('.image-container');
        state.frames.push({
          background: getComputedStyle(document.body).backgroundImage,
          bodyColor: getComputedStyle(document.body).backgroundColor,
          text: document.querySelector('#overlayText, #story-player .text')?.textContent,
          busy: document.body.dataset.storyTransitioning === 'true',
          visible: container && getComputedStyle(container).visibility === 'visible',
          layer: layer && { type: layer.dataset.transition, opacity: Number(style.opacity),
            color: style.backgroundColor, image: style.backgroundImage, position: style.position,
            pointerEvents: style.pointerEvents },
          scrollbar: document.documentElement.clientWidth !== innerWidth
            || document.documentElement.clientHeight !== innerHeight,
        });
      }
      requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  }, { once: true });
}

async function smoke({ evaluate, pointerClick: click, open, cdp, until }) {
  const textSelector = '#overlayText, #story-player .text';

  async function load(config) {
    const { identifier } = await cdp.send('Page.addScriptToEvaluateOnNewDocument', {
      source: '(' + installFixture.toString() + ')(' + JSON.stringify(config) + ');',
    });
    try {
      await open(config.opening ? background : prologue);
    } finally {
      await cdp.send('Page.removeScriptToEvaluateOnNewDocument', { identifier });
    }
    await ready(config.lines[0].text);
  }

  async function ready(text, timeout) {
    await until('transition settled on ' + text, () => evaluate(`
      document.body.dataset.storyTransitioning !== 'true'
      && document.querySelector(${JSON.stringify(textSelector)})?.textContent === ${JSON.stringify(text)}
      && getComputedStyle(document.querySelector('.image-container')).visibility === 'visible'
      && document.querySelectorAll('.story-transition-layer').length === 0
    `), timeout);
  }

  async function start() {
    await evaluate('transitionSmoke.frames = []; transitionSmoke.record = true;');
    await click('.image-container');
  }

  async function extraClicks() {
    await evaluate(`for (let index = 0; index < 5; index++) {
      document.querySelector('.image-container').dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 }));
    }`);
  }

  async function frames() {
    return evaluate('transitionSmoke.record = false; transitionSmoke.frames');
  }

  function assertTrace(trace, type, oldText, newText) {
    assert.ok(trace.length, 'No painted frames were sampled');
    assert.ok(trace.every(frame => !frame.scrollbar), 'A transition introduced a scrollbar');
    const visibleLayers = trace.filter(frame => frame.layer && frame.layer.opacity > 0.02 && frame.layer.opacity < 0.98);
    assert.ok(visibleLayers.length, type + ' never painted an intermediate state');
    for (const frame of visibleLayers) {
      assert.equal(frame.layer.type, type);
      assert.equal(frame.layer.position, 'fixed');
      assert.equal(frame.layer.pointerEvents, 'none');
      if (type === 'crossfade') {
        assert.ok(frame.layer.image.includes('/002.png'), 'Crossfade must show the new image above the old one');
        assert.ok(frame.background.includes('/001.png'), 'Crossfade must retain the old background until completion');
        assert.equal(frame.text, oldText, 'Crossfade advanced text before completion');
      } else {
        assert.equal(frame.layer.color, type === 'white' ? 'rgb(255, 255, 255)' : 'rgb(0, 0, 0)');
      }
    }
    for (const frame of trace) {
      if (frame.background.includes('/001.png')) assert.equal(frame.text, oldText, 'Text advanced ahead of its background');
      else if (frame.background.includes('/002.png')) assert.equal(frame.text, newText, 'Background advanced ahead of its text');
      else assert.fail('An unexpected/empty background was painted: ' + frame.background);
    }
  }

  // Default black and both explicit alternatives must behave identically in the
  // standalone opening and the React chapter player.
  for (const opening of [true, false]) {
    for (const transition of [undefined, 'white', 'crossfade']) {
      const type = transition || 'black';
      const oldText = '旧场景 · ' + type;
      const newText = '新场景 · ' + type;
      await load({ opening, gate: true, lines: [
        { speaker: '[测试]', text: oldText, background: images[0] },
        { speaker: '[测试]', text: newText, background: images[1], transition, fontFamily: 'monospace' },
        { speaker: '[测试]', text: '下一句', background: images[2] },
      ] });
      await start();
      await until('new image waiting for decode', () => evaluate('transitionSmoke.pending'));
      await extraClicks();
      await delay(120);
      const waiting = await evaluate(`({
        busy: document.body.dataset.storyTransitioning,
        background: getComputedStyle(document.body).backgroundImage,
        text: document.querySelector(${JSON.stringify(textSelector)}).textContent,
        layers: document.querySelectorAll('.story-transition-layer').length,
      })`);
      assert.equal(waiting.busy, 'true', 'Input must lock before waiting for the image');
      assert.ok(waiting.background.includes('/001.png'), 'Old image disappeared during decode');
      assert.equal(waiting.text, oldText, 'Text changed while the next image was still loading');
      assert.equal(waiting.layers, 0, 'A fade started before its image was decoded');
      await evaluate('transitionSmoke.release()');
      await until('visible transition layer', () => evaluate('!!document.querySelector(".story-transition-layer")'));
      await extraClicks();
      await ready(newText);
      const trace = await frames();
      assertTrace(trace, type, oldText, newText);
      assert.equal(await evaluate('getComputedStyle(document.querySelector(' + JSON.stringify(textSelector) + ')).fontFamily'),
        'monospace', 'The transition lost the line font');
      console.log('PASS  ' + (opening ? 'opening' : 'chapter') + ' ' + type + ': decoded image, intermediate frames, text sync and input lock');
    }
  }

  for (const opening of [true, false]) {
    await load({ opening, gate: true, lines: [
      { speaker: '[测试]', text: '加载失败前', background: images[0] },
      { speaker: '[测试]', text: '坏图台词仍可读', background: images[1], transition: 'crossfade' },
      { speaker: '[测试]', text: '坏图后仍能继续', background: images[2] },
      { speaker: '[测试]', text: '失败图片重试成功', background: images[1] },
    ] });
    await start();
    await until('failed image waiting for decode', () => evaluate('transitionSmoke.pending'));
    await evaluate('transitionSmoke.reject()');
    await ready('坏图台词仍可读');
    assert.ok(await evaluate('getComputedStyle(document.body).backgroundImage.includes("/001.png")'),
      'A failed image replaced the previous background');
    assert.ok((await frames()).every(frame => !frame.layer), 'A failed image started a fade');
    await click('.image-container');
    await ready('坏图后仍能继续');
    assert.ok(await evaluate('getComputedStyle(document.body).backgroundImage.includes("/003.png")'));
    await click('.image-container');
    await until('failed image decoded again', () => evaluate('transitionSmoke.pending && transitionSmoke.decodeCalls === 2'));
    await evaluate('transitionSmoke.release()');
    await ready('失败图片重试成功');
    console.log('PASS  ' + (opening ? 'opening' : 'chapter') + ' failed decode preserves the image, unlocks input and permits retry');
  }

  // Missing/empty/null backgrounds inherit the current image; ordinary dialogue
  // is immediate. Explicit effects still run for an unchanged image.
  await load({ opening: false, lines: [
    { speaker: '[测试]', text: '继承起点', background: images[0] },
    { speaker: '[测试]', text: '未配置背景' },
    { speaker: '[测试]', text: '空背景', background: '' },
    { speaker: '[测试]', text: '空值背景', background: null },
    { speaker: '[测试]', text: '同图显式白闪', background: images[0], transition: 'white' },
    { speaker: '[测试]', text: '继承图显式黑闪', transition: 'black' },
  ] });
  for (const expected of ['未配置背景', '空背景', '空值背景']) {
    await start();
    await ready(expected);
    assert.ok(await evaluate('getComputedStyle(document.body).backgroundImage.includes("/001.png")'));
    assert.ok((await frames()).every(frame => !frame.layer), 'Inherited background triggered an unwanted transition');
  }
  for (const [expected, type] of [['同图显式白闪', 'white'], ['继承图显式黑闪', 'black']]) {
    await start();
    await ready(expected);
    assert.ok((await frames()).some(frame => frame.layer?.type === type && frame.layer.opacity > 0.05),
      'Explicit ' + type + ' was skipped for an unchanged image');
    assert.ok(await evaluate('getComputedStyle(document.body).backgroundImage.includes("/001.png")'));
  }

  await load({ opening: true, lines: [
    { text: '重复背景前', background: images[0] },
    { text: '重复背景后', background: images[0] },
  ] });
  await start();
  await ready('重复背景后');
  assert.ok((await frames()).some(frame => frame.layer?.type === 'black' && frame.layer.opacity > 0.05),
    'Opening slides must use the default black transition even when the image repeats');
  console.log('PASS  inherited/empty backgrounds, explicit unchanged-image effects and repeated opening images');

  // Cancellation while decode or animation is pending must settle the caller
  // without committing late, even if the image subsequently finishes decoding.
  await load({ opening: false, gate: true, lines: [
    { speaker: '[测试]', text: '取消转场保留此句', background: images[0] },
  ] });
  await evaluate(`
    window.cancelTransition = new StoryBackgroundTransition();
    window.cancelCommits = 0;
    window.cancelResult = 'pending';
    cancelTransition.show(${JSON.stringify(images[1])}, {
      onCommit: () => { window.cancelCommits++; },
    }).then(result => { window.cancelResult = result; });
  `);
  await until('cancel fixture image pending', () => evaluate('transitionSmoke.pending'));
  await evaluate('cancelTransition.cancel()');
  await until('cancelled decode settled', () => evaluate('cancelResult === false'));
  await evaluate('transitionSmoke.release()');
  await delay(100);
  assert.equal(await evaluate('cancelCommits'), 0);
  await ready('取消转场保留此句');
  await evaluate(`
    window.cancelResult = 'pending';
    cancelTransition.show(${JSON.stringify(images[1])}, {
      transition: 'white', onCommit: () => { window.cancelCommits++; },
    }).then(result => { window.cancelResult = result; });
  `);
  await until('cancel fixture animation started', () => evaluate('!!document.querySelector(".story-transition-layer")'));
  await evaluate('cancelTransition.cancel()');
  await until('cancelled animation settled', () => evaluate('cancelResult === false'));
  assert.equal(await evaluate('cancelCommits'), 0);
  assert.ok(await evaluate('getComputedStyle(document.body).backgroundImage.includes("/001.png")'));
  await evaluate('cancelTransition.destroy()');
  console.log('PASS  cancellation during decode/animation never commits a stale background or line');

  // Exercise the production timeout, not a shortened test-only timer. A decoder
  // that never settles must not block every subsequent click indefinitely.
  await load({ opening: false, gate: true, lines: [
    { speaker: '[测试]', text: '超时前', background: images[0] },
    { speaker: '[测试]', text: '超时后仍可读', background: images[1] },
    { speaker: '[测试]', text: '超时后仍能继续', background: images[2] },
  ] });
  await click('.image-container');
  await until('timeout fixture image pending', () => evaluate('transitionSmoke.pending'));
  await ready('超时后仍可读', 20000);
  assert.ok(await evaluate('getComputedStyle(document.body).backgroundImage.includes("/001.png")'));
  await evaluate('transitionSmoke.release()');
  await delay(100);
  await ready('超时后仍可读');
  assert.ok(await evaluate('getComputedStyle(document.body).backgroundImage.includes("/001.png")'));
  await click('.image-container');
  await ready('超时后仍能继续');
  console.log('PASS  stalled decode times out, ignores late completion and unlocks the next line');
}

withBrowser(smoke).then(() => console.log('PASS  story background transitions')).catch(error => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
