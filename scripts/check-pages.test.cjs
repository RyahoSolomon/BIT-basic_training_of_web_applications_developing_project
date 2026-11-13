const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { test } = require('node:test');
const { checkProject } = require('./check-pages.cjs');

function fixture(files, verify) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'game-path-check-'));
  try {
    for (const [file, contents] of Object.entries(files)) {
      const destination = path.join(root, file);
      fs.mkdirSync(path.dirname(destination), {recursive: true});
      fs.writeFileSync(destination, contents);
    }
    const errors = [];
    verify(checkProject(root, message => errors.push(message)), errors);
  } finally {
    fs.rmSync(root, {recursive: true, force: true});
  }
}

test('CSS URLs use the stylesheet location; script URLs use the loading page', () => {
  fixture({
    'pages/index.html': '<link href="../styles/page.css"><script src="../scripts/page.js"></script>',
    'styles/page.css': '@import "theme.css"; body { background: url(../images/background.png); }',
    'styles/theme.css': '@font-face { src: url(../fonts/test.ttf); }',
    'scripts/page.js': 'image.src = "../images/background.png"; location.href = "next.html";',
    'pages/next.html': '',
    'images/background.png': '',
    'fonts/test.ttf': '',
  }, (result, errors) => {
    assert.deepEqual(errors, []);
    assert.equal(result.failures, 0);
    assert.equal(result.references, 7);
  });
});

test('a shared script is checked in every loading page context', () => {
  fixture({
    'index.html': '<script src="scripts/shared.js"></script>',
    'nested/index.html': '<script src="../scripts/shared.js"></script>',
    'scripts/shared.js': 'image.src = "images/icon.png";',
    'images/icon.png': '',
  }, (result, errors) => {
    assert.equal(result.scripts, 2);
    assert.deepEqual(errors, ['scripts/shared.js:1: missing images/icon.png (loaded by nested/index.html)']);
  });
});

test('checks inline scripts, events, CSS and static image URLs inside assembled HTML', () => {
  fixture({
    'index.html': [
      '<body style="background:url(missing-background.png)">',
      '<button onclick="location.href=\'missing-next.html\'">Next</button>',
      '<script>',
      'const matcher = /["\']/;',
      'image.src = "missing-icon.png";',
      'container.innerHTML = \'<img src="missing-fragment.png" id="item_\' + id + \'">\';',
      'location.href = "levels/" + level + "/win.html";',
      'image.src = new URL(enabled ? "unmute.jpg" : "mute.jpg", image.src).href;',
      'image.src = `images/${name}.png`;',
      '</script>',
    ].join('\n'),
  }, (result, errors) => {
    assert.equal(result.failures, 4);
    assert.deepEqual(errors, [
      'index.html:1: missing missing-background.png',
      'index.html:2: missing missing-next.html',
      'index.html:5: missing missing-icon.png',
      'index.html:6: missing missing-fragment.png',
    ]);
  });
});

test('ignores comments, external/data URLs, textarea examples and design sources', () => {
  fixture({
    'index.html': [
      '<!-- <img src="old.png"> -->',
      '<textarea><img src="example.png"></textarea>',
      '<script>',
      '// image.src = "comment.png";',
      '/* location.href = "old.html"; */',
      'image.src = "https://example.test/image.png";',
      '</script>',
      '<style>/* url(old.png) */ .icon {background:url(data:image/png;base64,AAAA)}</style>',
    ].join('\n'),
    'design/example.html': '<img src="missing.png">',
    'design/example.css': 'body {background:url(missing.png)}',
  }, (result, errors) => {
    assert.deepEqual(errors, []);
    assert.equal(result.pages, 1);
    assert.equal(result.styles, 0);
  });
});

test('checks generated/vendor script existence without interpreting their internals', () => {
  fixture({
    'index.html': '<script src="generated/player.js"></script><script src="vendor/library.js"></script><script src="generated/missing.js"></script>',
    'generated/player.js': 'const text = "not-a-path.png";',
    'vendor/library.js': 'const text = "not-a-path.html";',
  }, (result, errors) => {
    assert.equal(result.scripts, 0);
    assert.deepEqual(errors, ['index.html:1: missing generated/missing.js']);
  });
});

test('reports CSS line numbers and handles queries, spaces and case-sensitive filenames', () => {
  fixture({
    'index.html': '<img src="images/a%20b.png?v=1#preview">',
    'images/a b.png': '',
    'images/icon.png': '',
    'styles/page.css': '/* ignored url(old.png) */\n@import "missing.css";\n.icon {background:url(../images/Icon.png)}',
  }, (result, errors) => {
    assert.deepEqual(errors, [
      'styles/page.css:2: missing missing.css',
      'styles/page.css:3: missing ../images/Icon.png',
    ]);
    assert.equal(result.failures, 2);
  });
});
