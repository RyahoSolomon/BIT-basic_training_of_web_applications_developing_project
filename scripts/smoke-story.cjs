const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { withBrowser } = require('./smoke-browser.cjs');
const { dialogueLines } = require('./smoke-story-helpers.cjs');
const { startGame } = require('./smoke-player-helpers.cjs');

async function smoke({ evaluate, pointerClick: click, page, open, cdp, until }) {
  const username = 'test';
  const prologue = 'game/story/chapter-0/background.html';
  const chapter1 = 'game/story/chapter-1/plot.html';
  const battle = 'game/battle/index.html';
  const map = 'game/map/index.html';
  const screenshots = process.argv.includes('--screenshots')
    ? await fs.mkdtemp(path.join(os.tmpdir(), 'bit-story-preview-'))
    : null;

  async function screenshot(name, textSelector = '#story-player .text') {
    if (!screenshots) return;
    // The first-battle guide can open a new tab, which suspends this tab's painting.
    await cdp.send('Page.bringToFront');
    await until('dialogue fade-in', () => evaluate('Number(getComputedStyle(document.querySelector(' + JSON.stringify(textSelector) + ')).opacity) === 1'));
    const { data } = await cdp.send('Page.captureScreenshot', { format: 'png' });
    const file = path.join(screenshots, name + '.png');
    await fs.writeFile(file, Buffer.from(data, 'base64'));
    console.log('SCREENSHOT  ' + file);
  }

  async function readLines(nodeId) {
    // The first-battle guide opens another tab; resume painting before reading.
    await cdp.send('Page.bringToFront');
    await until('first dialogue', () => evaluate('!!document.querySelector("#story-player .text")'));
    return dialogueLines({ evaluate, until }, nodeId);
  }

  async function expectLine(line) {
    const text = line.text.replaceAll('{player}', username);
    const speaker = (line.speaker || '').replaceAll('{player}', username);
    const caption = (line.caption || '').replaceAll('{player}', username);
    await until('dialogue: ' + text.slice(0, 35), () => evaluate(`
      document.querySelector("#story-player .text")?.textContent.trim() === ${JSON.stringify(text)}
      && (document.querySelector("#story-player .topLeftText")?.textContent.trim() || "") === ${JSON.stringify(speaker)}
      && getComputedStyle(document.querySelector("#story-player .image-container")).visibility === "visible"
      && getComputedStyle(document.querySelector("#story-player .text")).opacity === "1"
      && document.body.dataset.storyTransitioning !== "true"
      && (document.querySelector("#story-player .centered-text1")?.textContent.trim() || "") === ${JSON.stringify(caption)}
    `));
    assert.equal(await evaluate('document.querySelectorAll("#story-player .text").length'), 1);
  }

  async function readToEnd(nodeId) {
    const lines = await readLines(nodeId);
    for (let index = 0; index < lines.length; index++) {
      await expectLine(lines[index]);
      assert.equal(await evaluate('!!document.querySelector("#story-player #button1")'), false,
        'Battle button appeared before the last dialogue was read');
      await click('#story-player .image-container');
    }
    return lines;
  }

  async function waitChoices() {
    await until('branch choices', () => evaluate('document.querySelectorAll("#story-player .button-container .button").length === 2'));
  }

  async function checkAwardLayout(width, height) {
    await cdp.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
    await cdp.send('Runtime.evaluate', { expression: 'document.fonts.ready.then(() => true)', awaitPromise: true });
    const layout = await evaluate(`(() => {
      const dialog = document.querySelector('[role=dialog][aria-label="解锁成就"]');
      const frame = dialog.getBoundingClientRect();
      const button = dialog.querySelector('[data-story-achievement-close]');
      const rows = [];
      const walker = document.createTreeWalker(dialog, NodeFilter.SHOW_TEXT);
      while (walker.nextNode()) {
        const node = walker.currentNode;
        if (!node.textContent.trim() || button.contains(node)) continue;
        const range = document.createRange();
        range.selectNodeContents(node);
        rows.push(range.getBoundingClientRect().toJSON());
      }
      const confirm = button.getBoundingClientRect();
      rows.push(confirm.toJSON());
      return { frame: frame.toJSON(), rows,
        clickable: button.contains(document.elementFromPoint(confirm.x + confirm.width / 2, confirm.y + confirm.height / 2)) };
    })()`);
    const { frame, rows, clickable } = layout;
    const size = width + '×' + height;
    assert.ok(frame.left >= 0 && frame.right <= width && frame.top >= 0 && frame.bottom <= height, 'Award offscreen at ' + size);
    assert.equal(rows.length, 4, 'Expected announcement, award name, description and confirm button');
    for (const [index, row] of rows.entries()) {
      // The painted inner border is about 9% from either side and 13% from either end.
      assert.ok(row.width > 0 && row.height > 0 && row.left >= frame.left + frame.width * .085 &&
        row.right <= frame.right - frame.width * .085 && row.top >= frame.top + frame.height * .125 &&
        row.bottom <= frame.bottom - frame.height * .125, 'Award row ' + index + ' crosses the frame at ' + size);
      if (index) assert.ok(row.top >= rows[index - 1].bottom + 3, 'Award rows touch at ' + size);
    }
    assert.ok(clickable, 'Award confirmation is covered at ' + size);
  }

  async function enterBattle() {
    await until('battle button', () => evaluate('!!document.querySelector("#story-player #button1")'));
    await click('#button1');
    await page(battle);
    assert.equal(await evaluate('level'), 0);
  }

  async function readBackgroundToEnd(takeScreenshots = false) {
    const slides = await readLines('history');
    assert.equal(slides.length, 7, 'The opening history should contain all seven slides');
    assert.ok(await evaluate('document.getElementById("slideImage").src.endsWith("/text-box-no.png")'));
    await evaluate('window.historyDocument = document; window.historyAudio = document.getElementById("audioPlayer")');
    for (const [index, slide] of slides.entries()) {
      await expectLine(slide);
      assert.equal(await evaluate('getComputedStyle(document.body).backgroundImage.includes(' +
        JSON.stringify(slide.background.replace('../..', '/game')) + ')'), true);
      if (takeScreenshots && [2, 3, 5].includes(index)) await screenshot('opening-slide-' + (index + 1));
      await click('#story-player .image-container');
    }
    await dialogueLines({ evaluate, until }, 'main');
    assert.ok(await evaluate('window.historyDocument === document && window.historyAudio === document.getElementById("audioPlayer")'),
      'The history and the palace dialogue must share the same document and audio player');
    assert.ok(await evaluate('historyAudio.src.endsWith("/002-huguo-palace.mp3")'));
    assert.ok(await evaluate('document.getElementById("slideImage").src.endsWith("/text-box.png")'));
  }

  await open('game/pages/menu.html');
  await startGame({ evaluate, click, page, cdp, until });
  for (const index of [0, 1]) {
    if (index === 1) {
      await open(prologue);
      // The opening must also remain readable without image transition events.
      await evaluate(`const style = document.createElement("style");
        style.textContent = "#slideImage { transition: none !important; }"; document.head.appendChild(style);`);
    }
    await readBackgroundToEnd(index === 0);
    await readToEnd('main');
    await waitChoices();
    if (index === 0) await screenshot('prologue-choices');
    await click('#story-player .button-container .button:nth-child(' + (index + 1) + ')');
    await page(prologue);
    if (index === 1) assert.equal((await readToEnd('explanation')).length, 4);
    assert.equal((await readToEnd('departure')).length, 2);
    await page(map);
  }
  console.log('PASS  prologue branches, first-click advance, speakers and return to map');

  await open(chapter1);
  await readToEnd();
  await enterBattle();
  console.log('PASS  chapter 1 natural battle entry');

  // Inject scene edits before the production DOMContentLoaded listener mounts React.
  // This models editing only scene data and reloading the same HTML/player.
  for (const mutation of [
    'window.storyScene.lines.splice(2, 0, {speaker: "[新增讲者]", text: "新增对白回归夹具"});',
    'window.storyScene.lines.splice(2, 1);',
  ]) {
    const { identifier } = await cdp.send('Page.addScriptToEvaluateOnNewDocument', {
      source: `document.addEventListener("DOMContentLoaded", () => {
        if (location.pathname.endsWith("/game/story/chapter-1/plot.html")) {
          ${mutation}
        }
      }, { once: true });`,
    });
    try {
      await open(chapter1);
      const lines = await readToEnd();
      assert.equal(lines.length, mutation.includes('新增讲者') ? 14 : 12);
      await enterBattle();
    } finally {
      await cdp.send('Page.removeScriptToEvaluateOnNewDocument', { identifier });
    }
  }
  console.log('PASS  inserted/deleted dialogue preserves speakers and battle endpoint');

  for (const index of [0, 1]) {
    await evaluate(`(() => { localStorage.testflag = '0';
      const achievements = JSON.parse(localStorage.testachievement);
      achievements.ach2 = 0; localStorage.testachievement = JSON.stringify(achievements); })()`);
    await open('game/story/chapter-2/plot-after.html');
    await readToEnd();
    await waitChoices();
    await click('#story-player .button-container .button:nth-child(' + (index + 1) + ')');
    await page('game/story/chapter-2/plot-after.html');
    assert.equal(await evaluate('localStorage.getItem(' + JSON.stringify(username + 'flag') + ')'), index === 0 ? '1' : '0');
    if (index === 0) {
      await until('achievement popup', () => evaluate('!!document.querySelector("[data-story-achievement-close]")'));
      for (const [width, height] of [[1440, 900], [320, 568], [568, 320]]) {
        await checkAwardLayout(width, height);
        await screenshot('chapter2-award-' + width, '[data-story-achievement-close]');
      }
      await click('[data-story-achievement-close]');
      await cdp.send('Emulation.clearDeviceMetricsOverride');
    }
    if (index === 1) assert.equal((await readToEnd('exclusive')).length, 7);
    assert.equal((await readToEnd('common')).length, 15);
    await page(map);
    assert.equal(await evaluate('Number(JSON.parse(localStorage.testachievement).ach2)'), index === 0 ? 1 : 0);
    assert.equal(await evaluate('JSON.parse(localStorage.getItem("game.save")).achievements.ach2'), index === 0 ? 1 : 0);
  }
  console.log('PASS  chapter 2 branches, player-name substitution and choice side effect');

  await open('game/story/chapter-5/plot1.html');
  const lines = await readLines();
  await expectLine(lines[0]);
  await screenshot('chapter5-caption');
  await click('#story-player .image-container');
  await expectLine(lines[1]);
  await click('#story-player .image-container');
  await expectLine(lines[2]);
  console.log('PASS  chapter 5 caption transitions');
}

withBrowser(smoke).then(() => console.log('PASS  shared story player')).catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
