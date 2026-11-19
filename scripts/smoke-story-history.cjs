const assert = require('node:assert/strict');
const { withBrowser } = require('./smoke-browser.cjs');

async function smoke({ open, evaluate, pointerClick, cdp, until }) {
  async function ready() {
    await until('history button ready', () => evaluate(`
      !!document.querySelector('.story-history-open') && !document.body.dataset.storyTransitioning
    `));
  }
  async function readHistory() {
    await ready();
    await pointerClick('.story-history-open');
    await until('modal history', () => evaluate("!!document.querySelector('.story-history:modal')"));
    return evaluate(`Array.from(document.querySelectorAll('.story-history li'), li => ({
      speaker: li.querySelector('strong').textContent, text: li.querySelector('p').textContent
    }))`);
  }
  async function close() {
    await pointerClick('.story-history-close');
    await until('history closed', () => evaluate("!document.querySelector('.story-history')"));
  }
  await open('game/pages/menu.html');
  await evaluate('GameProgress.newGame("旅人")');
  await open('game/story/chapter-1/plot.html');
  const expected = await evaluate(`storyScene.lines.map(line => ({
    speaker: line.speaker.replaceAll('{player}', GameProfile.getName()), text: line.text
  }))`);
  assert.deepEqual(await readHistory(), expected.slice(0, 1));
  await close();
  for (let i = 1; i < expected.length; i++) await pointerClick('.image-container');
  assert.deepEqual(await readHistory(), expected);
  assert.ok(await evaluate(`(() => {
    const list = document.querySelector('.story-history ol');
    if (list.scrollTop <= 0) return false;
    list.scrollTop = 0;
    return list.scrollTop === 0 && document.activeElement === list;
  })()`), 'Long histories should open at the newest line and scroll back to the oldest');
  for (const type of ['keyDown', 'keyUp']) {
    await cdp.send('Input.dispatchKeyEvent', { type, key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
  }
  await close();
  assert.equal(await evaluate("document.querySelector('#story-player .text').textContent"), expected.at(-1).text);

  await open('game/story/chapter-2/plot-after.html');
  await ready();
  await pointerClick('[data-story-skip]');
  const decision = await evaluate(`[
    { speaker: '旅人', text: storyScene.nodes.main.lines[0].text },
    { speaker: storyScene.nodes.decision.prompt.speaker, text: storyScene.nodes.decision.prompt.text.replace('{player}', '旅人') }
  ]`);
  assert.deepEqual(await readHistory(), decision);
  await close();
  await pointerClick('[data-story-choice="spare"]');
  await pointerClick('[data-story-achievement-close]');
  const progress = await evaluate('JSON.stringify(localStorage)');
  const branch = await evaluate(`[
    { speaker: '旅人', text: storyScene.nodes.decision.choices[0].label },
    storyScene.nodes.common.lines[0]
  ]`);
  assert.deepEqual(await readHistory(), [...decision, ...branch]);
  await close();
  assert.equal(await evaluate('JSON.stringify(localStorage)'), progress);
  console.log('PASS  scene-local dialogue, scrolling, modal input, skip and selected branch history');
}

withBrowser(smoke).catch(error => { console.error(error); process.exitCode = 1; });
