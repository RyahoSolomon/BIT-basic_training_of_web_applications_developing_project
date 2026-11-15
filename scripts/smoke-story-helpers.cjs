// Read via the real dialogue controls when a test needs to leave the opening.
async function readScene({ evaluate, pointerClick, click = pointerClick, cdp, until }) {
  await cdp.send('Page.bringToFront');
  const lines = await evaluate('window.storyScene.lines');
  for (const line of lines) {
    await until('dialogue ready', () => evaluate(`
      document.querySelector('#story-player .text')?.textContent === ${JSON.stringify(line.text.replaceAll('{player}', 'test'))}
      && (document.querySelector('#story-player .centered-text1')?.textContent || '') === ${JSON.stringify((line.caption || '').replaceAll('{player}', 'test'))}
      && getComputedStyle(document.querySelector('#story-player .image-container')).visibility === 'visible'
      && document.body.dataset.storyTransitioning !== 'true'
    `));
    await click('#story-player .image-container');
  }
}

async function openingToMap(browser) {
  const { evaluate, pointerClick, click = pointerClick, page, until } = browser;
  const lines = await evaluate('backgrounds');
  for (const line of lines) {
    await until('opening ready', () => evaluate(`
      document.querySelector('#overlayText')?.textContent === ${JSON.stringify(line.text)}
      && getComputedStyle(document.querySelector('.image-container')).visibility === 'visible'
      && document.body.dataset.storyTransitioning !== 'true'
    `));
    await click('.image-container');
  }
  await page('game/story/chapter-0/plot.html');
  await readScene(browser);
  await until('prologue choices', () => evaluate('!!document.querySelector("#story-player .button-container .button")'));
  await click('#story-player .button-container .button');
  await page('game/story/chapter-0/plot-b.html');
  await readScene(browser);
  await page('game/map/index.html');
}

module.exports = { readScene, openingToMap };
