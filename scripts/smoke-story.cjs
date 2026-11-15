const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { withBrowser } = require('./smoke-browser.cjs');

async function smoke({ evaluate, pointerClick: click, page, open, cdp, until }) {
  const username = 'test';
  const background = 'game/story/chapter-0/background.html';
  const prologue = 'game/story/chapter-0/plot.html';
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

  async function readLines() {
    // The first-battle guide opens another tab; resume painting before reading.
    await cdp.send('Page.bringToFront');
    await until('first dialogue', () => evaluate('!!document.querySelector("#story-player .text")'));
    return evaluate('window.storyScene.lines');
  }

  async function expectLine(line) {
    const text = line.text.replaceAll('{player}', username);
    const speaker = line.speaker.replaceAll('{player}', username);
    const caption = (line.caption || '').replaceAll('{player}', username);
    await until('dialogue: ' + text.slice(0, 35), () => evaluate(`
      document.querySelector("#story-player .text")?.textContent.trim() === ${JSON.stringify(text)}
      && document.querySelector("#story-player .topLeftText")?.textContent.trim() === ${JSON.stringify(speaker)}
      && getComputedStyle(document.querySelector("#story-player .image-container")).visibility === "visible"
      && getComputedStyle(document.querySelector("#story-player .text")).opacity === "1"
      && document.body.dataset.storyTransitioning !== "true"
      && (document.querySelector("#story-player .centered-text1")?.textContent.trim() || "") === ${JSON.stringify(caption)}
    `));
    assert.equal(await evaluate('document.querySelectorAll("#story-player .text").length'), 1);
  }

  async function readToEnd() {
    const lines = await readLines();
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

  async function enterBattle() {
    await until('battle button', () => evaluate('!!document.querySelector("#story-player #button1")'));
    await click('#button1');
    await page(battle);
    assert.equal(await evaluate('level'), 0);
  }

  async function readBackgroundToEnd(takeScreenshots = false) {
    const slides = await evaluate('backgrounds');
    assert.equal(slides.length, 7, 'The opening history should contain all seven slides');
    for (let index = 0; index < slides.length; index++) {
      await until('visible opening slide ' + (index + 1), () => evaluate(`(() => {
        const text = document.getElementById("overlayText");
        const style = getComputedStyle(text);
        return text.textContent === ${JSON.stringify(slides[index].text)}
          && document.body.dataset.storyTransitioning !== "true"
          && style.visibility === "visible" && Number(style.opacity) === 1
          && style.display !== "none" && text.getBoundingClientRect().height > 0;
      })()`));
      assert.equal(await evaluate('currentBackground'), index,
        'Opening slides must stay in order');
      assert.equal(await evaluate('getComputedStyle(document.body).backgroundImage.includes(' +
        JSON.stringify(slides[index].image.replace('../..', '/game')) + ')'), true);
      if (takeScreenshots && [2, 3, 5].includes(index)) {
        await screenshot('opening-slide-' + (index + 1), '#overlayText');
      }
      await click('#overlayText');
    }
    await page(prologue);
  }

  // The normal new-game action initializes progress and the fixed player.
  await open('game/pages/menu.html');
  await click('a[href="../story/chapter-0/background.html"]');
  await page(background);
  await readBackgroundToEnd(true);
  console.log('PASS  all seven opening slides and repeated backgrounds');

  // Missing transitionend used to leave narration hidden indefinitely. Disable
  // the image transition before the page starts to reproduce that case reliably.
  const { identifier: noTransition } = await cdp.send('Page.addScriptToEvaluateOnNewDocument', {
    source: `document.addEventListener("DOMContentLoaded", () => {
      if (location.pathname.endsWith("/game/story/chapter-0/background.html")) {
        const style = document.createElement("style");
        style.textContent = "#slideImage { transition: none !important; }";
        document.head.appendChild(style);
      }
    }, { once: true });`,
  });
  try {
    await open(background);
    await readBackgroundToEnd();
  } finally {
    await cdp.send('Page.removeScriptToEvaluateOnNewDocument', { identifier: noTransition });
  }
  console.log('PASS  opening narration without image transition events');


  for (const [index, destination] of ['plot-b.html', 'plot-a.html'].entries()) {
    await open(prologue);
    await readToEnd();
    await waitChoices();
    if (index === 0) await screenshot('prologue-choices');
    await click('#story-player .button-container .button:nth-child(' + (index + 1) + ')');
    await page('game/story/chapter-0/' + destination);
    await readToEnd();
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

  for (const [index, destination] of ['branch-short.html', 'branch-long.html'].entries()) {
    await evaluate('localStorage.setItem(' + JSON.stringify(username + 'flag') + ', "0")');
    await open('game/story/chapter-2/plot-after.html');
    await readToEnd();
    await waitChoices();
    await click('#story-player .button-container .button:nth-child(' + (index + 1) + ')');
    await page('game/story/chapter-2/' + destination);
    assert.equal(await evaluate('localStorage.getItem(' + JSON.stringify(username + 'flag') + ')'), index === 0 ? '1' : '0');
    if (index === 0) {
      await until('achievement popup', () => evaluate('getComputedStyle(document.getElementById("achievement_popup")).display !== "none"'));
      await click('#achievement_popup [onclick="Shutoff()"]');
    }
    await readToEnd();
    if (index === 1) {
      await page('game/story/chapter-2/branch-short.html');
      await readToEnd();
    }
    await page(map);
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
