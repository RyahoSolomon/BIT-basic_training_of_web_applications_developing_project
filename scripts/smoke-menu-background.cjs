// Verify progress-driven menu artwork without changing the saved checkpoint.
const assert = require('node:assert/strict');
const { withBrowser } = require('./smoke-browser.cjs');
const fixture = require('./fixtures/progress.json');

const menu = 'game/pages/menu.html';
const backgrounds = [
  '007-outside-altar.png',
  '008-forest-periphery.png',
  '010-zhuolu-city-faraway.png',
  '014-penglai-north.png',
  '017-holly-moutain.png',
  '021-rest.png',
];

function saveFor(levels) {
  const save = structuredClone(fixture);
  save.progress.levels = levels;
  // Replaying the first battle must not roll back the menu's progress artwork.
  save.progress.current.level = 0;
  return save;
}

async function smoke({ evaluate, open, cdp, until }) {
  const storage = () => evaluate('Object.fromEntries(Object.entries(localStorage))');
  const summary = () => evaluate("document.getElementById('continue-summary').textContent");

  async function background(filename) {
    const url = await evaluate('new URL(' + JSON.stringify('../assets/images/background/' + filename) + ', location.href).href');
    await until('menu background ' + filename, () => evaluate(
      'getComputedStyle(document.body).backgroundImage === ' + JSON.stringify('url("' + url + '")')));
    const { result, exceptionDetails } = await cdp.send('Runtime.evaluate', {
      expression: `new Promise(resolve => {
        const image = new Image();
        image.onload = () => resolve(image.naturalWidth > 0 && image.naturalHeight > 0);
        image.onerror = () => resolve(false);
        image.src = ${JSON.stringify(url)};
      })`,
      awaitPromise: true,
      returnByValue: true,
    });
    assert.equal(exceptionDetails, undefined);
    assert.equal(result.value, true, 'The selected background image must load: ' + filename);
  }

  async function reshow(filename) {
    const before = await storage();
    await evaluate('window.dispatchEvent(new PageTransitionEvent("pageshow", {persisted: true}))');
    await background(filename);
    assert.deepEqual(await storage(), before, 'Refreshing menu artwork changed the saved or active game state');
  }

  async function importSave(levels) {
    await evaluate('GameProgress.importSave(' + JSON.stringify(JSON.stringify(saveFor(levels))) + ')');
  }

  await open(menu);
  await background(backgrounds[0]);
  assert.equal(await evaluate('localStorage.getItem("game.save")'), null);
  assert.equal(await evaluate('localStorage.getItem("current")'), null);
  await reshow(backgrounds[0]);
  assert.match(await summary(), /暂无存档/);
  assert.equal(await evaluate("getComputedStyle(document.getElementById('continue-hint')).visibility"), 'hidden');
  console.log('PASS  a fresh menu uses first-chapter artwork without creating a game');

  const stages = [
    [0, 0, 0, 0, 0, 0],
    [1, 0, 0, 0, 0, 0],
    [1, 1, 0, 0, 0, 0],
    [1, 1, 1, 0, 0, 0],
    [1, 1, 1, 1, 0, 0],
    [1, 1, 1, 1, 1, 114],
  ];
  for (let index = 0; index < stages.length; index++) {
    await importSave(stages[index]);
    await open(menu);
    await background(backgrounds[index]);
    await reshow(backgrounds[index]);
    assert.equal(await summary(), fixture.playerName + ' · 第' + '一二三四五六'[index] + '关');
  }
  await importSave([1, 1, 1, 1, 1, 0]);
  await reshow(backgrounds[4]);
  assert.equal(await summary(), fixture.playerName + ' · 主线已通关');
  await importSave([1, 1, 1, 1, 1, 1]);
  await reshow(backgrounds[5]);
  assert.equal(await summary(), fixture.playerName + ' · 全部通关');
  await importSave([1, 0, 1, 1, 1, 114]);
  await reshow(backgrounds[1]);
  console.log('PASS  all six upcoming chapters, replayed battles, locked hidden chapter and completed endings');

  // Active state is intentionally newer than the stored checkpoint. Reading the
  // background must neither use the active state nor restore/overwrite either.
  await importSave([1, 1, 1, 1, 1, 1]);
  const checkpoint = saveFor(stages[1]);
  await evaluate('localStorage.setItem("game.save", ' + JSON.stringify(JSON.stringify(checkpoint)) + ')');
  await reshow(backgrounds[1]);
  assert.deepEqual(await evaluate('JSON.parse(localStorage.getItem("game.save"))'), checkpoint);
  assert.equal(await evaluate('localStorage.getItem("level6")'), '1');
  for (const invalid of [null, '{broken', JSON.stringify({ ...checkpoint, version: 999 })]) {
    await evaluate(invalid === null ? 'localStorage.removeItem("game.save")'
      : 'localStorage.setItem("game.save", ' + JSON.stringify(invalid) + ')');
    await reshow(backgrounds[0]);
  }
  console.log('PASS  saved checkpoints take precedence, missing/bad saves fall back, and menu reads preserve storage');

  await evaluate(`Object.assign(window.menuBackgrounds, {
    newGame: '../assets/images/background/005-huguo-palace.png',
    mainComplete: '../assets/images/background/019-happyending-talk-with-fahai.png',
    allComplete: '../assets/images/background/023-ban-pangu.png',
  });
  window.menuBackgrounds.chapters[1] = '../assets/images/background/009-plain-out-of-forest.png';`);
  await reshow('005-huguo-palace.png');
  await importSave(stages[1]);
  await reshow('009-plain-out-of-forest.png');
  await importSave([1, 1, 1, 1, 1, 0]);
  await reshow('019-happyending-talk-with-fahai.png');
  await importSave([1, 1, 1, 1, 1, 1]);
  await reshow('023-ban-pangu.png');
  console.log('PASS  configured new-game, chapter and ending artwork refresh on pageshow');
}

withBrowser(smoke).catch(error => { console.error(error); process.exitCode = 1; });
