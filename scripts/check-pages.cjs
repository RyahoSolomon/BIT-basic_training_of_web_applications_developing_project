// Check static src/href references in the game's HTML without starting a server.
// Run from any directory with: node path/to/scripts/check-pages.cjs
const fs = require('node:fs');
const path = require('node:path');
const { fileURLToPath, pathToFileURL } = require('node:url');

const root = path.resolve(__dirname, '..');
const files = new Set();
const pages = [];

function collect(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      if (!entry.name.startsWith('.') && entry.name !== 'node_modules') collect(fullPath);
    } else if (entry.isFile()) {
      const relative = path.relative(root, fullPath).split(path.sep).join('/');
      files.add(relative);
      if (/\.html?$/i.test(entry.name)) pages.push(relative);
    }
  }
}

const attributes = {
  a: ['href'], area: ['href'], link: ['href'],
  script: ['src'], img: ['src'], audio: ['src'], video: ['src', 'poster'],
  source: ['src'], track: ['src'], iframe: ['src'], input: ['src'],
};

function* references(html) {
  // Quotes can contain '>'. Raw text inside scripts/styles is not HTML.
  const tags = /<!--[\s\S]*?(?:-->|$)|<([a-z][\w:-]*)\b((?:[^"'<>]|"[^"]*"|'[^']*')*)>/gi;
  for (let tag; (tag = tags.exec(html));) {
    if (!tag[1]) continue;
    const name = tag[1].toLowerCase();
    const attrs = /([^\s"'=<>/]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
    for (const attr of tag[2].matchAll(attrs)) {
      const value = attr[2] ?? attr[3] ?? attr[4];
      if (value && attributes[name]?.includes(attr[1].toLowerCase())) {
        yield { value, line: html.slice(0, tag.index).split('\n').length };
      }
    }
    if (['script', 'style', 'textarea', 'title'].includes(name)) {
      const closingTag = new RegExp(`</${name}\\s*>`, 'ig');
      closingTag.lastIndex = tags.lastIndex;
      if (!closingTag.exec(html)) break;
      tags.lastIndex = closingTag.lastIndex;
    }
  }
}

collect(root);
let count = 0;
let failures = 0;
for (const page of pages.sort()) {
  const html = fs.readFileSync(path.join(root, page), 'utf8');
  const base = pathToFileURL(path.join(root, page));
  for (const { value, line } of references(html)) {
    const url = value.trim().replaceAll('&amp;', '&');
    if (!url || /^(?:[a-z][\w+.-]*:|\/\/|#|\?)/i.test(url)) continue;
    count++;
    let target;
    try {
      target = path.relative(root, fileURLToPath(new URL(url, base))).split(path.sep).join('/');
    } catch {
      console.error(`${page}:${line}: invalid local URL ${value}`);
      failures++;
      continue;
    }
    if (!files.has(target)) {
      console.error(`${page}:${line}: missing ${value}`);
      failures++;
    }
  }
}
console.log(`Checked ${pages.length} HTML pages, ${count} local references, ${failures} errors.`);
process.exitCode = failures ? 1 : 0;
