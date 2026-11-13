// Check local HTML/CSS references and statically identifiable JavaScript URLs.
// Dynamic URL construction still needs the browser smoke checks.
// Run from any directory with: node path/to/scripts/check-pages.cjs [project-root]
const fs = require('node:fs');
const path = require('node:path');
const { fileURLToPath, pathToFileURL } = require('node:url');

const attributes = {
  a: ['href'], area: ['href'], link: ['href'],
  script: ['src'], img: ['src'], audio: ['src'], video: ['src', 'poster'],
  source: ['src'], track: ['src'], iframe: ['src'], input: ['src'],
};
const excludedDirectories = new Set(['node_modules', 'design']);
const lineAt = (text, index) => text.slice(0, index).split('\n').length;
const decodeHtml = value => value.replace(/&(?:amp|quot|apos|lt|gt|#39);/g, entity =>
  ({'&amp;': '&', '&quot;': '"', '&apos;': "'", '&lt;': '<', '&gt;': '>', '&#39;': "'"})[entity]);
const isLocal = value => value && !/^(?:[a-z][\w+.-]*:|\/\/|#|\?)/i.test(value);
const isResource = value => /^[^<>"'`\r\n]*\.(?:html?|css|m?js|json|png|jpe?g|gif|svg|webp|ico|mp3|ogg|wav|mp4|webm|ttf|otf|woff2?|pdf)(?:[?#][^<>"'`\r\n]*)?$/i.test(value);
const blankComments = text => text.replace(/\/\*[\s\S]*?\*\//g, match => match.replace(/[^\n]/g, ' '));

function* cssReferences(css) {
  const text = blankComments(css);
  const expressions = /\burl\(\s*(?:"([^"\r\n]*)"|'([^'\r\n]*)'|([^\s)'";]+))\s*\)|@import\s+(?:"([^"\r\n]*)"|'([^'\r\n]*)')/gi;
  for (const match of text.matchAll(expressions)) {
    yield { value: match[1] ?? match[2] ?? match[3] ?? match[4] ?? match[5], line: lineAt(text, match.index) };
  }
}

function decodeString(value) {
  return value.replace(/\\(?:u([\da-f]{4})|x([\da-f]{2})|(\r?\n)|(.))/gi, (_, unicode, hex, newline, char) => {
    if (unicode || hex) return String.fromCharCode(parseInt(unicode || hex, 16));
    if (newline) return '';
    return ({n: '\n', r: '\r', t: '\t', b: '\b', f: '\f', v: '\v', 0: '\0'})[char] ?? char;
  });
}

// Deliberately conservative: no eval, no guessing the values of variables or
// template substitutions, and no page-relative assumption inside new URL().
function* javascriptStrings(text) {
  const parens = [];
  for (let i = 0; i < text.length;) {
    if (text.startsWith('//', i)) {
      const end = text.indexOf('\n', i + 2);
      i = end < 0 ? text.length : end;
    } else if (text.startsWith('/*', i)) {
      const end = text.indexOf('*/', i + 2);
      i = end < 0 ? text.length : end + 2;
    } else if (text[i] === '/' && /(?:^|[=(:,\[!&|?{};]|\breturn)\s*$/.test(text.slice(0, i))) {
      // A regexp may contain quote characters and parentheses; do not let
      // those masquerade as strings or change the new URL() context stack.
      let characterClass = false;
      for (i++; i < text.length; i++) {
        if (text[i] === '\\') i++;
        else if (text[i] === '[') characterClass = true;
        else if (text[i] === ']') characterClass = false;
        else if (text[i] === '/' && !characterClass) { i++; break; }
        else if (text[i] === '\n') break;
      }
    } else if ('"\'`'.includes(text[i])) {
      const start = i, quote = text[i++];
      while (i < text.length && text[i] !== quote) {
        if (text[i] === '\\') i++;
        i++;
      }
      const raw = text.slice(start + 1, i++);
      const before = text.slice(0, start).trimEnd();
      const after = text.slice(i).trimStart();
      yield {
        value: decodeString(raw), line: lineAt(text, start),
        dynamic: (quote === '`' && raw.includes('${')) || before.endsWith('+') || after.startsWith('+'),
        explicitBase: parens.some(Boolean),
      };
    } else if (text[i] === '(') {
      parens.push(/\bnew\s+URL\s*$/.test(text.slice(0, i)));
      i++;
    } else if (text[i] === ')') {
      parens.pop();
      i++;
    } else {
      i++;
    }
  }
}

function* javascriptReferences(js) {
  for (const literal of javascriptStrings(js)) {
    const {value, line, dynamic, explicitBase} = literal;
    if (!dynamic && !explicitBase && isResource(value)) yield {value, line};
    // Complete URLs embedded in HTML fragments remain checkable even when
    // the surrounding HTML is assembled by concatenating multiple strings.
    if (/<[a-z]|\b(?:src|href|poster)\s*=/i.test(value)) {
      const attrs = /\b(?:src|href|poster)\s*=\s*(?:"([^"\r\n]*)"|'([^'\r\n]*)'|([^\s"'<>]+))/gi;
      for (const match of value.matchAll(attrs)) {
        const url = match[1] ?? match[2] ?? match[3];
        if (isResource(url) && !url.includes('${')) yield {value: decodeHtml(url), line};
      }
    }
    for (const reference of cssReferences(value)) {
      if (isResource(reference.value) && !reference.value.includes('${')) {
        yield {value: reference.value, line};
      }
    }
  }
}

function* htmlReferences(html) {
  // Quotes can contain '>'. Raw text inside scripts/styles is not HTML.
  const tags = /<!--[\s\S]*?(?:-->|$)|<([a-z][\w:-]*)\b((?:[^"'<>]|"[^"]*"|'[^']*')*)>/gi;
  for (let tag; (tag = tags.exec(html));) {
    if (!tag[1]) continue;
    const name = tag[1].toLowerCase();
    const line = lineAt(html, tag.index);
    const attrs = /([^\s"'=<>/]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
    let externalScript = false;
    for (const attr of tag[2].matchAll(attrs)) {
      const value = decodeHtml(attr[2] ?? attr[3] ?? attr[4] ?? '');
      const key = attr[1].toLowerCase();
      if (value && attributes[name]?.includes(key)) {
        const script = name === 'script' && key === 'src';
        externalScript ||= script;
        yield {value, line, script};
      }
      if (key === 'style') {
        for (const reference of cssReferences(value)) yield {...reference, line};
      } else if (key.startsWith('on')) {
        for (const reference of javascriptReferences(value)) yield {...reference, line};
      }
    }
    if (['script', 'style', 'textarea', 'title'].includes(name)) {
      const contentStart = tags.lastIndex;
      const closingTag = new RegExp(`</${name}\\s*>`, 'ig');
      closingTag.lastIndex = contentStart;
      const closing = closingTag.exec(html);
      if (!closing) break;
      const content = html.slice(contentStart, closing.index);
      const contentLine = lineAt(html, contentStart) - 1;
      const references = name === 'style' ? cssReferences(content)
        : name === 'script' && !externalScript ? javascriptReferences(content) : [];
      for (const reference of references) yield {...reference, line: contentLine + reference.line};
      tags.lastIndex = closingTag.lastIndex;
    }
  }
}

function checkProject(root, report = console.error) {
  root = path.resolve(root);
  const files = new Set(), pages = [], styles = [];
  function collect(directory) {
    for (const entry of fs.readdirSync(directory, {withFileTypes: true})) {
      const fullPath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        if (!entry.name.startsWith('.') && !excludedDirectories.has(entry.name)) collect(fullPath);
      } else if (entry.isFile()) {
        const relative = path.relative(root, fullPath).split(path.sep).join('/');
        files.add(relative);
        if (/\.html?$/i.test(entry.name)) pages.push(relative);
        if (/\.css$/i.test(entry.name)) styles.push(relative);
      }
    }
  }
  collect(root);
  let count = 0, failures = 0;
  const scriptContexts = new Set();
  function check(reference, source, baseFile = source) {
    const value = reference.value.trim();
    if (!isLocal(value)) return null;
    count++;
    let target;
    try {
      target = path.relative(root, fileURLToPath(new URL(value, pathToFileURL(path.join(root, baseFile))))).split(path.sep).join('/');
    } catch {
      report(`${source}:${reference.line}: invalid local URL ${value}`);
      failures++;
      return null;
    }
    if (!files.has(target)) {
      const context = source === baseFile ? '' : ` (loaded by ${baseFile})`;
      report(`${source}:${reference.line}: missing ${value}${context}`);
      failures++;
      return null;
    }
    return target;
  }
  for (const page of pages.sort()) {
    const html = fs.readFileSync(path.join(root, page), 'utf8');
    for (const reference of htmlReferences(html)) {
      const target = check(reference, page);
      if (!target || !reference.script || !/\.[cm]?js$/i.test(target)) continue;
      // Bundled/vendor internals are not page URL declarations. Their src is
      // still checked above; authoring sources are covered by their build.
      if (/(?:^|\/)(?:vendor|generated)\//.test(target) || /(?:\.min\.js|story-player\.js)$/.test(target)) continue;
      const context = page + '\0' + target;
      if (scriptContexts.has(context)) continue;
      scriptContexts.add(context);
      const js = fs.readFileSync(path.join(root, target), 'utf8');
      for (const dependency of javascriptReferences(js)) check(dependency, target, page);
    }
  }
  for (const file of styles.sort()) {
    for (const reference of cssReferences(fs.readFileSync(path.join(root, file), 'utf8'))) check(reference, file);
  }
  return {pages: pages.length, styles: styles.length, scripts: scriptContexts.size, references: count, failures};
}

if (require.main === module) {
  const result = checkProject(process.argv[2] || path.resolve(__dirname, '..'));
  console.log(`Checked ${result.pages} HTML pages, ${result.styles} CSS files, ${result.scripts} script contexts, ${result.references} local references, ${result.failures} errors.`);
  process.exitCode = result.failures ? 1 : 0;
}
module.exports = {checkProject};
