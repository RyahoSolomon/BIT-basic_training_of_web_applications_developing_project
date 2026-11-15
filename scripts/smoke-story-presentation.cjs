const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { withBrowser } = require('./smoke-browser.cjs');

const root = path.resolve(__dirname, '..');
const background = 'game/story/chapter-0/background.html';
const prologue = 'game/story/chapter-0/plot.html';

async function storyPages(directory = path.join(root, 'game/story')) {
  const pages = [];
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) pages.push(...await storyPages(file));
    else if (entry.name.endsWith('.html') && /src\s*=\s*["'][^"']*story-player\.js["']/.test(await fs.readFile(file, 'utf8'))) {
      pages.push(path.relative(root, file).replaceAll('\\', '/'));
    }
  }
  return pages.sort();
}

// Observe every painted frame, including the interval before the first line is
// ready. An assertion after an animation finishes cannot catch a scrollbar or
// text appearing before its box during entry.
function observePresentation() {
  document.addEventListener('DOMContentLoaded', () => {
    if (!document.querySelector('#story-player, #overlayText')) return;
    const state = window.presentationSmoke = { frames: 0, visibleFrames: 0, failures: [] };
    const fail = message => {
      if (!state.failures.includes(message)) state.failures.push(message);
    };
    const visible = element => {
      if (!element || !element.getBoundingClientRect().height) return false;
      for (let node = element; node instanceof Element; node = node.parentElement) {
        const style = getComputedStyle(node);
        if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) return false;
      }
      return true;
    };
    window.presentationVisible = visible;
    let firstBox;
    function sample() {
      state.frames++;
      const documentBox = document.documentElement;
      if (documentBox.clientWidth !== innerWidth || documentBox.clientHeight !== innerHeight) {
        fail('A page scrollbar appeared');
      }
      if (scrollX !== 0 || scrollY !== 0) fail('The page moved away from the viewport');
      const text = document.querySelector('#story-player .text, #overlayText');
      const image = document.getElementById('slideImage');
      const textVisible = visible(text);
      const imageVisible = visible(image);
      if (textVisible !== imageVisible) fail('Narration and its box appeared at different times');
      if (textVisible) {
        state.visibleFrames++;
        if (!image.complete || !image.naturalWidth) fail('Narration appeared before its box image loaded');
        const box = image.getBoundingClientRect();
        if (box.top < -1 || box.bottom > innerHeight + 1) fail('The dialogue box moved outside the viewport');
        if (!firstBox) firstBox = { top: box.top, bottom: box.bottom };
        else if (Math.abs(firstBox.top - box.top) > 1 || Math.abs(firstBox.bottom - box.bottom) > 1) {
          fail('The dialogue box moved between frames');
        }
      }
      if (!state.stop) requestAnimationFrame(sample);
    }
    requestAnimationFrame(sample);
  }, { once: true });
}

async function smoke({ evaluate, pointerClick: click, page, open, cdp, until }) {
  const screenshots = process.argv.includes('--screenshots')
    ? await fs.mkdtemp(path.join(os.tmpdir(), 'bit-story-presentation-')) : null;
  const { identifier: observer } = await cdp.send('Page.addScriptToEvaluateOnNewDocument', {
    source: '(' + observePresentation.toString() + ')();',
  });

  async function screenshot(name) {
    if (!screenshots) return;
    const { data } = await cdp.send('Page.captureScreenshot', { format: 'png' });
    const file = path.join(screenshots, name + '.png');
    await fs.writeFile(file, Buffer.from(data, 'base64'));
    console.log('SCREENSHOT  ' + file);
  }

  async function ready(selector) {
    await until('visible text and loaded dialogue box', () => evaluate(`
      !!window.presentationVisible?.(document.querySelector(${JSON.stringify(selector)}))
      && document.getElementById('slideImage')?.complete
      && document.getElementById('slideImage')?.naturalWidth > 0
      && window.presentationSmoke?.visibleFrames > 0
      && document.body.dataset.storyTransitioning !== 'true'
    `));
  }

  async function checkPresentation(selector, expectedFont) {
    await ready(selector);
    const result = await evaluate(`(() => {
      const nodes = [...document.querySelectorAll(
        '#slideImage, #story-player .text, #story-player .topLeftText, #story-player .centered-text1, #overlayText'
      )];
      return {
        failures: window.presentationSmoke.failures,
        font: getComputedStyle(document.querySelector(${JSON.stringify(selector)})).fontFamily,
        styles: nodes.map(node => {
          const style = getComputedStyle(node);
          return { selector: node.id || node.className, transition: style.transitionDuration,
            animation: style.animationName, selection: style.userSelect };
        }),
      };
    })()`);
    assert.deepEqual(result.failures, []);
    if (expectedFont) assert.equal(result.font, expectedFont, 'The dialogue font should match this line');
    for (const style of result.styles) {
      assert.ok(style.transition.split(',').every(time => parseFloat(time) === 0),
        style.selector + ' still has a transition');
      assert.equal(style.animation, 'none', style.selector + ' still has an animation');
      assert.equal(style.selection, 'none', style.selector + ' still permits text/image selection');
    }
    return result.font;
  }

  async function font(selector) {
    return evaluate('getComputedStyle(document.querySelector(' + JSON.stringify(selector) + ')).fontFamily');
  }

  async function checkSelection(selector) {
    const point = await evaluate(`(() => {
      window.getSelection().removeAllRanges();
      const rect = document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect();
      return { x: rect.x + 12, y: rect.y + 12 };
    })()`);
    await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', button: 'left', clickCount: 1, ...point });
    await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', button: 'left', buttons: 1,
      x: point.x + 160, y: point.y + 12 });
    await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', button: 'left', clickCount: 1,
      x: point.x + 160, y: point.y + 12 });
    assert.equal(await evaluate('window.getSelection().toString()'), '', 'Dragging narration selected text');
  }

  async function checkDoubleClick(selector) {
    const before = await evaluate('document.querySelector(' + JSON.stringify(selector) + ').textContent');
    await click(selector);
    await until('first click of double-click advances', () => evaluate(
      'document.querySelector(' + JSON.stringify(selector) + ').textContent !== ' + JSON.stringify(before)));
    const afterFirstClick = await evaluate('document.querySelector(' + JSON.stringify(selector) + ').textContent');
    const point = await evaluate(`(() => {
      const rect = document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect();
      return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
    })()`);
    await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', button: 'left', clickCount: 2, ...point });
    await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', button: 'left', clickCount: 2, ...point });
    assert.equal(await evaluate('document.querySelector(' + JSON.stringify(selector) + ').textContent'),
      afterFirstClick, 'The second half of a double-click skipped another line');
    assert.equal(await evaluate('window.getSelection().toString()'), '', 'Double-clicking narration selected text');
  }

  try {
    // Use normal new-game initialization for chapters that update
    // progress or achievements while loading.
    const username = 'test';
    await open('game/pages/menu.html');
    await click('a[href="../story/chapter-0/background.html"]');
    await page(background);
    const defaultFont = await checkPresentation('#overlayText');
    assert.match(defaultFont, /KaiTi|楷体/i, 'The shared default should use the KaiTi font stack');
    const slides = await evaluate('backgrounds');
    for (let index = 0; index < slides.length; index++) {
      await until('opening slide ' + (index + 1), () => evaluate(
        'document.getElementById("overlayText").textContent === ' + JSON.stringify(slides[index].text)));
      await checkPresentation('#overlayText', defaultFont);
      if (index === 2) await screenshot('opening-slide-3');
      if (index + 1 < slides.length) await click('#overlayText');
    }
    console.log('PASS  all opening slides have a fixed box, synchronized text and no scrollbars');

    const pages = await storyPages();
    assert.ok(pages.length >= 24, 'Missing shared-player chapter pages');
    for (const file of pages) {
      await open(file);
      await checkPresentation('#story-player .text', defaultFont);
      assert.equal(await font('#story-player .topLeftText'), defaultFont, file + ': inconsistent speaker font');
      if (await evaluate('window.storyScene.lines.length > 1')) {
        const secondLine = await evaluate('window.storyScene.lines[1]');
        await click('#story-player .image-container');
        await until('second dialogue', () => evaluate(`
          document.querySelector('#story-player .text').textContent === ${JSON.stringify(secondLine.text.replaceAll('{player}', username))}
          && document.querySelector('#story-player .topLeftText').textContent === ${JSON.stringify(secondLine.speaker.replaceAll('{player}', username))}
          && (document.querySelector('#story-player .centered-text1')?.textContent || '') === ${JSON.stringify((secondLine.caption || '').replaceAll('{player}', username))}
        `));
        await checkPresentation('#story-player .text', defaultFont);
      }
      if (file === prologue) await screenshot('prologue-dialogue');
    }
    console.log('PASS  synchronized entry, stable viewport and shared defaults on ' + pages.length + ' dialogue pages');

    // A font applies to the configured line only. Omitted values must restore
    // either the scene default or the shared default on the next click.
    for (const sceneFont of [null, 'sans-serif']) {
      const { identifier: fixture } = await cdp.send('Page.addScriptToEvaluateOnNewDocument', {
        source: `document.addEventListener('DOMContentLoaded', () => {
          if (!location.pathname.endsWith('/game/story/chapter-0/plot.html')) return;
          window.storyScene.fontFamily = ${JSON.stringify(sceneFont)};
          window.storyScene.lines[0].fontFamily = 'monospace';
          window.storyScene.lines[0].caption = 'Custom-font caption';
        }, { once: true });`,
      });
      try {
        await open(prologue);
        await checkPresentation('#story-player .text', 'monospace');
        assert.equal(await font('#story-player .topLeftText'), 'monospace');
        assert.equal(await font('#story-player .centered-text1'), 'monospace');
        await click('#story-player .image-container');
        await checkPresentation('#story-player .text', sceneFont || defaultFont);
        await checkSelection('#story-player .text');
        await checkDoubleClick('#story-player .text');
      } finally {
        await cdp.send('Page.removeScriptToEvaluateOnNewDocument', { identifier: fixture });
      }
    }
    const { identifier: backgroundFixture } = await cdp.send('Page.addScriptToEvaluateOnNewDocument', {
      source: `document.addEventListener('DOMContentLoaded', () => {
        if (location.pathname.endsWith('/game/story/chapter-0/background.html')) {
          backgrounds[0].fontFamily = 'monospace';
        }
      }, { once: true });`,
    });
    try {
      await open(background);
      await checkPresentation('#overlayText', 'monospace');
      await click('#overlayText');
      await checkPresentation('#overlayText', defaultFont);
      await checkSelection('#overlayText');
      await checkDoubleClick('#overlayText');
    } finally {
      await cdp.send('Page.removeScriptToEvaluateOnNewDocument', { identifier: backgroundFixture });
    }
    console.log('PASS  per-line/scene fonts, default restoration and real drag/double-click selection prevention');
  } finally {
    await cdp.send('Page.removeScriptToEvaluateOnNewDocument', { identifier: observer });
  }
}

withBrowser(smoke).then(() => console.log('PASS  story presentation')).catch(error => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
