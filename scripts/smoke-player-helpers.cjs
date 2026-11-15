async function replaceName(browser, name) {
  const { cdp } = browser;
  const click = browser.pointerClick || browser.click;
  await click('#player-name');
  await cdp.send('Input.dispatchKeyEvent', {
    type: 'keyDown', key: 'a', code: 'KeyA', windowsVirtualKeyCode: 65, modifiers: 2,
  });
  await cdp.send('Input.dispatchKeyEvent', {
    type: 'keyUp', key: 'a', code: 'KeyA', windowsVirtualKeyCode: 65, modifiers: 2,
  });
  await cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Backspace', code: 'Backspace', windowsVirtualKeyCode: 8 });
  await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Backspace', code: 'Backspace', windowsVirtualKeyCode: 8 });
  if (name) await cdp.send('Input.insertText', { text: name });
}

async function startGame(browser, name = 'test') {
  const { evaluate, page, until } = browser;
  const click = browser.pointerClick || browser.click;
  await click('a[href="../story/chapter-0/background.html"]');
  await until('player name dialog', () => evaluate('document.getElementById("player-name-dialog").open'));
  await replaceName(browser, name);
  await click('[data-name-confirm]');
  await page('game/story/chapter-0/background.html');
}

module.exports = { startGame, replaceName };
