// Check local HTML/CSS references and statically identifiable JavaScript URLs.
// Dynamic URL construction still needs the browser smoke checks.
// Run from any directory with: node path/to/scripts/check-pages.cjs [project-root]
const fs = require('node:fs');
const { createRequire } = require('node:module');
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
        start, end: i, before, after,
        dynamic: (quote === '`' && raw.includes('${')) || before.endsWith('+') || after.startsWith('+'),
        explicitBase: parens.some(context => context.explicitBase),
        calls: parens.map(context => context.call),
        commonJS: /(?:^|[^\w$.])require\s*\(\s*$/.test(before) && after.startsWith(')'),
      };
    } else if (text[i] === '(') {
      const before = text.slice(0, i);
      parens.push({ explicitBase: /\bnew\s+URL\s*$/.test(before),
        call: /([\w$]+)\s*$/.exec(before)?.[1] });
      i++;
    } else if (text[i] === ')') {
      parens.pop();
      i++;
    } else {
      i++;
    }
  }
}

function* javascriptReferences(js, scriptURL) {
  const literals = [...javascriptStrings(js)];
  const codeUnits = js.split('');
  for (const literal of literals) {
    for (let index = literal.start; index < literal.end; index++) {
      if (codeUnits[index] !== '\n') codeUnits[index] = ' ';
    }
  }
  const code = blankComments(codeUnits.join('')).replace(/\/\/[^\n]*/g, '');
  const bases = new Map();
  const helpers = new Map();
  // Recognize only static URL bases and simple one-argument URL helpers. This
  // is not evaluation: unresolved bases/expressions retain the conservative
  // behavior above and remain covered by browser resource checks.
  if (scriptURL) bases.set('document.currentScript.src', scriptURL);
  for (const literal of literals) {
    const declaration = /\b(?:const|let|var)\s+([\w$]+)\s*=\s*new\s+URL\(\s*$/.exec(literal.before);
    const base = /^,\s*(document\.currentScript\.src|[\w$]+)\s*\)/.exec(literal.after);
    if (declaration && base && bases.has(base[1]) && !literal.dynamic) {
      try { bases.set(declaration[1], new URL(literal.value, bases.get(base[1])).href); } catch { /* Dynamic/invalid base. */ }
    }
    const helper = /\b(?:const|let|var)\s+([\w$]+)\s*=\s*\(?\s*([\w$]+)\s*\)?\s*=>\s*new\s+URL\(\s*$/.exec(literal.before);
    const argument = /^\+\s*([\w$]+)\s*,\s*([\w$]+)\s*\)\.href/.exec(literal.after);
    if (helper && argument && helper[2] === argument[1]) {
      helpers.set(helper[1], { prefix: literal.value, baseURL: bases.get(argument[2]) });
    }
  }
  function isOutput(literal) {
    if (literal.calls.includes('showSaveFilePicker') || /\.download\s*=\s*$/.test(literal.before)) return true;
    const declaration = /\b(?:const|let|var)\s+([\w$]+)\s*=\s*$/.exec(literal.before);
    if (!declaration) return false;
    const name = declaration[1].replace(/[$]/g, '\\$');
    const output = new RegExp('(?:\\.download\\s*=|suggestedName\\s*:)\\s*' + name + '\\b');
    const input = new RegExp('(?:\\.(?:src|href|poster)\\s*=|\\b(?:fetch|importScripts|require|URL|assign|replace)\\s*\\()\\s*' + name + '\\b');
    return output.test(code) && !input.test(code);
  }
  for (const literal of literals) {
    const {value, line, dynamic, explicitBase, commonJS} = literal;
    if (commonJS) {
      // Relative CommonJS imports belong to the script, not its loading page.
      // Package/built-in names are not local page URLs.
      if (!dynamic && /^\.\.?\//.test(value)) yield {value, line, module: true};
      continue;
    }
    const helper = literal.calls.map(name => helpers.get(name)).find(Boolean);
    const base = /^,\s*(document\.currentScript\.src|[\w$]+)\s*\)/.exec(literal.after);
    if (!dynamic && helper && isResource(value)) {
      if (helper.baseURL) yield {value: helper.prefix + value, line, baseURL: helper.baseURL};
    } else if (!dynamic && explicitBase && base && bases.has(base[1]) && isResource(value)) {
      yield {value, line, baseURL: bases.get(base[1])};
    } else if (!dynamic && !explicitBase && isResource(value) && !isOutput(literal)) {
      yield {value, line};
    }
    // A complete helper call inside a template interpolation is also static,
    // even though the surrounding HTML template is not a plain string.
    if (value.includes('${')) {
      for (const [name, resolver] of helpers) {
        if (!resolver.baseURL) continue;
        const call = new RegExp('\\$\\{\\s*' + name.replace(/[$]/g, '\\$') + '\\(\\s*(["\'])([^"\'\\r\\n]+)\\1\\s*\\)\\s*\\}', 'g');
        for (const match of value.matchAll(call)) {
          if (isResource(match[2])) yield {value: resolver.prefix + match[2],
            line: line + lineAt(value, match.index) - 1, baseURL: resolver.baseURL};
        }
      }
    }
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
  const moduleRoot = fs.realpathSync(root); // Node resolves module paths through directory symlinks.
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
    if (reference.baseURL && new URL(value, reference.baseURL).protocol !== 'file:') return null;
    count++;
    let target;
    if (reference.module) {
      // Resolve without executing the module; this also handles .js/.json
      // extension lookup and directory imports according to CommonJS rules.
      try {
        target = path.relative(moduleRoot, createRequire(path.join(root, source)).resolve(value)).split(path.sep).join('/');
      } catch {
        report(`${source}:${reference.line}: missing module ${value}`);
        failures++;
        return null;
      }
      if (!files.has(target)) {
        report(`${source}:${reference.line}: missing module ${value}`);
        failures++;
        return null;
      }
      return target;
    }
    try {
      target = path.relative(root, fileURLToPath(new URL(value,
        reference.baseURL || pathToFileURL(path.join(root, baseFile))))).split(path.sep).join('/');
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
      for (const dependency of javascriptReferences(js, pathToFileURL(path.join(root, target)).href)) check(dependency, target, page);
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
