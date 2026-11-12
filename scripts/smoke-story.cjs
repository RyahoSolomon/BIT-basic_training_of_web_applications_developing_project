const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { withBrowser } = require('./smoke-browser.cjs');

async function smoke({ evaluate, pointerClick: click, page, open, cdp, until }) {
  const username = 'story-smoke-player';
  const prologue = 'main/story/chapter0/plot.html';
  const chapter1 = 'main/story/chapter1/plot.html';
  const battle = 'main/story/war_chess/war_chess.html';
  const map = 'main/story/map/map.html';
  const screenshots = process.argv.includes('--screenshots')
    ? await fs.mkdtemp(path.join(os.tmpdir(), 'bit-story-preview-'))
    : null;

  async function screenshot(name) {
    if (!screenshots) return;
    // The first-battle guide can open a new tab, which suspends this tab's painting.
    await cdp.send('Page.bringToFront');
    await until('dialogue fade-in', () => evaluate('Number(getComputedStyle(document.querySelector("#story-player .text")).opacity) === 1'));
    const { data } = await cdp.send('Page.captureScreenshot', { format: 'png' });
    const file = path.join(screenshots, name + '.png');
    await fs.writeFile(file, Buffer.from(data, 'base64'));
    console.log('SCREENSHOT  ' + file);
  }

  async function readLines() {
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
      && document.querySelector("#story-player .text")?.style.opacity === "1"
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

  // Registration and the normal new-game action initialize all progress and achievements.
  await open('main/register.html');
  await evaluate(`
    document.getElementById("username").value = ${JSON.stringify(username)};
    document.getElementById("password").value = "story-smoke";
    document.getElementById("confirm-password").value = "story-smoke";
  `);
  await click('#registerForm button[type="submit"]');
  await page('main/login.html');
  await open('main/_INDEX.html');
  await evaluate('localStorage.setItem("username", ' + JSON.stringify(username) + ')');
  await click('a[href="story/chapter0/background.html"]');
  await page('main/story/chapter0/background.html');
  await click('.button-save');
  await page(map);

  for (const [index, destination] of ['plot_b.html', 'plot_a.html'].entries()) {
    await open(prologue);
    await readToEnd();
    await waitChoices();
    if (index === 0) await screenshot('prologue-choices');
    await click('#story-player .button-container .button:nth-child(' + (index + 1) + ')');
    await page('main/story/chapter0/' + destination);
    await readToEnd();
    await page(map);
  }
  console.log('PASS  prologue branches, first-click advance, speakers and return to map');

  await open(chapter1);
  await readToEnd();
  await enterBattle();
  await open(chapter1);
  await readLines();
  await click('.button-save');
  await page(battle);
  assert.equal(await evaluate('level'), 0);
  console.log('PASS  chapter 1 natural battle entry and skip');

  // Inject scene edits before the production DOMContentLoaded listener mounts React.
  // This models editing only scene data and reloading the same HTML/player.
  for (const mutation of [
    'window.storyScene.lines.splice(2, 0, {speaker: "[新增讲者]", text: "新增对白回归夹具"});',
    'window.storyScene.lines.splice(2, 1);',
  ]) {
    const { identifier } = await cdp.send('Page.addScriptToEvaluateOnNewDocument', {
      source: `document.addEventListener("DOMContentLoaded", () => {
        if (location.pathname.endsWith("/main/story/chapter1/plot.html")) {
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

  for (const [index, destination] of ['chapter2_short_difference.html', 'chapter2_long_difference.html'].entries()) {
    await evaluate('localStorage.removeItem(' + JSON.stringify(username + 'flag') + ')');
    await open('main/story/chapter2/plot_after.html');
    await readToEnd();
    await waitChoices();
    await click('#story-player .button-container .button:nth-child(' + (index + 1) + ')');
    await page('main/story/chapter2/' + destination);
    assert.equal(await evaluate('localStorage.getItem(' + JSON.stringify(username + 'flag') + ')'), index === 0 ? '1' : null);
    if (index === 0) {
      await until('achievement popup', () => evaluate('getComputedStyle(document.getElementById("achievement_popup")).display !== "none"'));
      await click('#achievement_popup [onclick="Shutoff()"]');
    }
    await readToEnd();
    if (index === 1) {
      await page('main/story/chapter2/chapter2_short_difference.html');
      await readToEnd();
    }
    await page(map);
  }
  console.log('PASS  chapter 2 branches, player-name substitution and choice side effect');

  await open('main/story/chapter5/plot1.html');
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
