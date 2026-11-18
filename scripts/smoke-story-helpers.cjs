// Both the original linear scenes and graph scenes use the real dialogue controls.
async function dialogueLines({ evaluate, until }, nodeId) {
  await until('active dialogue' + (nodeId ? ': ' + nodeId : ''), () => evaluate(`(() => {
    if (!window.storyScene) return false;
    if (!storyScene.nodes) return true;
    const active = document.getElementById('story-player')?.dataset.storyNode;
    return storyScene.nodes[active]?.type === 'dialogue'
      && (${JSON.stringify(nodeId || null)} === null || active === ${JSON.stringify(nodeId || null)});
  })()`));
  return evaluate(`storyScene.nodes
    ? storyScene.nodes[document.getElementById('story-player').dataset.storyNode].lines
    : storyScene.lines`);
}

async function readScene({ evaluate, pointerClick, click = pointerClick, cdp, until }, nodeId) {
  await cdp.send('Page.bringToFront');
  const lines = await dialogueLines({ evaluate, until }, nodeId);
  const name = await evaluate('GameProfile.getName()');
  for (const line of lines) {
    await until('dialogue ready', () => evaluate(`
      document.querySelector('#story-player .text')?.textContent === ${JSON.stringify(line.text.replaceAll('{player}', name))}
      && (document.querySelector('#story-player .centered-text1')?.textContent || '') === ${JSON.stringify((line.caption || '').replaceAll('{player}', name))}
      && getComputedStyle(document.querySelector('#story-player .image-container')).visibility === 'visible'
      && document.body.dataset.storyTransitioning !== 'true'
    `));
    await click('#story-player .image-container');
  }
}

async function openingToMap(browser) {
  const { evaluate, pointerClick, click = pointerClick, page, until } = browser;
  await readScene(browser, 'history');
  await readScene(browser, 'main');
  await until('prologue choices', () => evaluate('!!document.querySelector("#story-player .button-container .button")'));
  await click('#story-player .button-container .button');
  await readScene(browser, 'departure');
  await page('game/map/index.html');
}

module.exports = { dialogueLines, readScene, openingToMap };
