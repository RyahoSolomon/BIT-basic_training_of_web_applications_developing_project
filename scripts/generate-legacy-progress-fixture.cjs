// Regenerate the compatibility fixture using the archived game's actual save functions.
// The archived commit must be available locally; ordinary tests only read the JSON fixture.
const { execFileSync } = require('node:child_process');
const { mkdirSync, writeFileSync } = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const commit = 'c1d9d4231b70bc0ae4893278157dbeed0b623be5';
const readOriginal = (file) => execFileSync('git', ['show', `${commit}:${file}`], {
  cwd: root, encoding: 'utf8',
});
const menu = readOriginal('main/_INDEX.html');
const map = readOriginal('main/story/map/map.html');
const controls = readOriginal('main/js/controll.js');
const construct = menu.slice(menu.indexOf('function construct()'), menu.indexOf('function load()'));
const autoSave = map.match(/<script>\s*(function save\(\)[\s\S]*?)<\/script>/)[1];
const manualSave = controls.slice(controls.indexOf('function getCurrentDateTime()'), controls.indexOf('function Load('));

const storage = Object.create(null);
Object.defineProperties(storage, {
  getItem: { value(key) { return Object.hasOwn(this, key) ? this[key] : null; } },
  setItem: { value(key, value) { this[key] = String(value); } },
});
const context = vm.createContext({
  window: { localStorage: storage },
  localStorage: storage,
  document: {
    referrer: 'file:///legacy-install/main/story/chapter5/plot1.html',
    getElementById() { return {}; },
  },
  console: { debug() {} },
  alert() {},
  Date: class extends Date {
    constructor() { super(2023, 5, 20, 12, 34); }
  },
});

vm.runInContext(`${construct}\nconstruct();`, context);
const username = 'legacy-progress-test';
storage.setItem('username', username);
// Simulate a run after chapter five; serialization itself is entirely the original code.
const current = JSON.parse(storage.getItem('current'));
Object.assign(current, {
  level: 4,
  is_plot_music_on: false,
  is_inwar_music_on: true,
  hidden_clue_god: true,
  hidden_clue_poison: true,
  yuanlan_level: { level: 4, exp: 17 },
  user_level: { level: 5, exp: 23 },
  yedai_level: { level: 3, exp: 9 },
  perfect_level_complete: [true, false, true, true, false, false],
});
storage.setItem('current', JSON.stringify(current));
for (let level = 1; level <= 5; level++) storage.setItem(`level${level}`, 1);
storage.setItem('level6', 114);
storage.setItem('MSYgamename', '第五章');
storage.setItem('IsFirstPlay', false);
storage.setItem(`${username}flag`, 1);

const activeStorage = { ...storage };
vm.runInContext(`${autoSave}\nsave();`, context);
vm.runInContext(`${manualSave}\nSave(2);`, context);
const fixture = {
  source: {
    commit,
    branch: 'origin/archive/pre-agent',
    initializer: 'main/_INDEX.html: construct()',
    autoSave: 'main/story/map/map.html: save()',
    manualSave: 'main/js/controll.js: Save(2)',
    note: 'Original functions executed in a VM with in-memory localStorage and a fixed date. Progress values were set to a non-initial run before saving; the original serializers produced both snapshots.',
  },
  username,
  manualSlot: 2,
  activeStorage,
  autosave: JSON.parse(storage.getItem(`${username}autosave`)),
  manualSlots: JSON.parse(storage.getItem(`${username}savearea`)),
};
const destination = path.join(__dirname, 'fixtures', 'legacy-progress.json');
mkdirSync(path.dirname(destination), { recursive: true });
writeFileSync(destination, `${JSON.stringify(fixture, null, 2)}\n`);
console.log('Generated scripts/fixtures/legacy-progress.json from archived save functions.');
