// One local save, plus adapters for the active state used by story/battle pages.
(function (root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    else root.GameProgress = api.createStore(root.localStorage);
})(typeof window === 'undefined' ? globalThis : window, function () {
    'use strict';

    const FORMAT = 'the-origin-of-god';
    const VERSION = 1;
    const SAVE_KEY = 'game.save';
    const SETTINGS_KEY = 'game.settings';
    const PLAYER_NAME = 'test';
    const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
    const isBoolean = value => typeof value === 'boolean';
    const isInteger = value => Number.isSafeInteger(value) && value >= 0;
    const isFlag = value => value === 0 || value === 1;
    const field = (initial, valid) => ({ initial, valid });
    const character = () => ({
        level: field(1, value => isInteger(value) && value >= 1 && value <= 6),
        exp: field(0, isInteger),
    });
    const definition = {
        current: {
            level: field(0, value => isInteger(value) && value <= 5),
            hidden_clue_god: field(false, isBoolean),
            hidden_clue_poison: field(false, isBoolean),
            yuanlan_level: character(),
            user_level: character(),
            yedai_level: character(),
            perfect_level_complete: field(Array(6).fill(false), value =>
                Array.isArray(value) && value.length === 6 && value.every(isBoolean)),
        },
        levels: field(Array(6).fill(0), value => Array.isArray(value) && value.length === 6 &&
            value.every((status, index) => status === 0 || status === 1 || (index === 5 && status === 114))),
        chapterName: field('序章', value => typeof value === 'string' && value.trim().length > 0),
        isFirstPlay: field(true, isBoolean),
    };
    const achievementsDefinition = Object.fromEntries(
        Array.from({ length: 8 }, (_, index) => ['ach' + (index + 1), field(0, isFlag)]));
    const audioSetting = () => ({
        volume: field(50, value => Number.isInteger(value) && value >= 1 && value <= 100),
        muted: field(false, isBoolean),
    });
    const settingsDefinition = { music: audioSetting(), sound: audioSetting() };

    function fail(code, message) {
        const error = new Error(message);
        error.name = 'ProgressError';
        error.code = code;
        throw error;
    }

    function copy(value) { return JSON.parse(JSON.stringify(value)); }

    function defaults(schema) {
        if (schema.valid) return copy(schema.initial);
        return Object.fromEntries(Object.entries(schema).map(([key, child]) => [key, defaults(child)]));
    }

    function validate(value, schema, code) {
        if (schema.valid) {
            if (!schema.valid(value)) fail(code, '进度或设置数据不完整或已损坏。');
            return copy(value);
        }
        if (!isObject(value)) fail(code, '进度或设置数据不完整或已损坏。');
        return Object.fromEntries(Object.entries(schema).map(([key, child]) =>
            [key, validate(value[key], child, code)]));
    }

    function parse(text, code) {
        try { return JSON.parse(text); }
        catch { fail(code, '存档数据无法读取。'); }
    }

    function levelStatus(value) {
        return ['0', '1', '114'].includes(value) ? Number(value) : value;
    }

    function decodeSave(text) {
        if (text === null) fail('EMPTY_SAVE', '还没有存档，请先开始游戏。');
        const value = parse(text, 'INVALID_SAVE');
        if (!isObject(value) || value.format !== FORMAT) fail('INVALID_SAVE', '这不是有效的源神存档。');
        if (value.version !== VERSION) fail('UNSUPPORTED_VERSION', '不支持这个版本的存档。');
        if (value.playerName !== PLAYER_NAME || typeof value.savedAt !== 'string' ||
            !Number.isFinite(Date.parse(value.savedAt)) ||
            new Date(value.savedAt).toISOString() !== value.savedAt || !isFlag(value.endingFlag)) {
            fail('INVALID_SAVE', '存档信息不完整或已损坏。');
        }
        return {
            format: FORMAT,
            version: VERSION,
            savedAt: value.savedAt,
            playerName: PLAYER_NAME,
            progress: validate(value.progress, definition, 'INVALID_SAVE'),
            achievements: validate(value.achievements, achievementsDefinition, 'INVALID_SAVE'),
            endingFlag: value.endingFlag,
            settings: validate(value.settings, settingsDefinition, 'INVALID_SAVE'),
        };
    }

    function createNewProgress() { return defaults(definition); }

    function createStore(storage, now = () => new Date()) {
        const levelKeys = Array.from({ length: 6 }, (_, i) => 'level' + (i + 1));
        const activeFields = {
            current: {
                keys: ['current'],
                read: ([value]) => parse(value, 'INVALID_PROGRESS'),
                write: value => [JSON.stringify(value)],
            },
            levels: { keys: levelKeys, read: values => values.map(levelStatus), write: value => value.map(String) },
            chapterName: { keys: ['MSYgamename'], read: ([value]) => value, write: value => [value] },
            isFirstPlay: {
                keys: ['IsFirstPlay'],
                read: ([value]) => value === 'true' ? true : value === 'false' ? false : value,
                write: value => [String(value)],
            },
        };

        function readObject(key, schema) {
            const raw = storage.getItem(key);
            return raw === null ? defaults(schema) : validate(parse(raw, 'INVALID_PROGRESS'), schema, 'INVALID_PROGRESS');
        }

        function readAchievements() {
            const raw = storage.getItem('testachievement');
            if (raw === null) return defaults(achievementsDefinition);
            const value = parse(raw, 'INVALID_PROGRESS');
            // Battle rules use booleans, while story pages use numeric flags.
            // Only the runtime adapter converts them; imported files stay strict.
            const normalized = isObject(value) ? Object.fromEntries(Object.entries(value).map(([key, flag]) =>
                [key, typeof flag === 'boolean' ? Number(flag) : flag])) : value;
            return validate(normalized, achievementsDefinition, 'INVALID_PROGRESS');
        }

        function snapshot(progress, endingFlag) {
            return {
                format: FORMAT,
                version: VERSION,
                savedAt: now().toISOString(),
                playerName: PLAYER_NAME,
                progress: validate(progress, definition, 'INVALID_PROGRESS'),
                achievements: readAchievements(),
                endingFlag,
                settings: readObject(SETTINGS_KEY, settingsDefinition),
            };
        }

        function capture() {
            if (storage.getItem('current') === null) fail('NO_PROGRESS', '还没有游戏进度，请先开始游戏。');
            const progress = Object.fromEntries(Object.entries(activeFields).map(([key, adapter]) =>
                [key, adapter.read(adapter.keys.map(key => storage.getItem(key)))]));
            const rawFlag = storage.getItem('testflag');
            if (rawFlag !== null && rawFlag !== '0' && rawFlag !== '1') {
                fail('INVALID_PROGRESS', '剧情标记数据已损坏。');
            }
            return snapshot(progress, rawFlag === '1' ? 1 : 0);
        }

        function writeAtomically(entries) {
            // Prepare every value before writing. Each Web Storage write is atomic;
            // if one fails, attempt every earlier rollback, even if a rollback fails.
            const previous = entries.map(([key]) => [key, storage.getItem(key)]);
            let written = 0;
            try {
                for (const [key, value] of entries) {
                    storage.setItem(key, value);
                    written++;
                }
            } catch (error) {
                for (let i = written - 1; i >= 0; i--) {
                    const [key, value] = previous[i];
                    try {
                        if (value === null) storage.removeItem(key);
                        else storage.setItem(key, value);
                    } catch { /* Keep trying to restore the remaining keys. */ }
                }
                throw error;
            }
        }

        function apply(save, { settings = false, persist = false } = {}) {
            const entries = Object.entries(activeFields).flatMap(([field, adapter]) => {
                const values = adapter.write(save.progress[field]);
                return adapter.keys.map((key, i) => [key, values[i]]);
            });
            entries.push(['username', PLAYER_NAME], ['testachievement', JSON.stringify(save.achievements)],
                ['testflag', String(save.endingFlag)]);
            if (settings) entries.push([SETTINGS_KEY, JSON.stringify(save.settings)]);
            if (persist) entries.push([SAVE_KEY, JSON.stringify(save)]);
            writeAtomically(entries);
            return save;
        }

        function saveAuto() {
            const save = capture();
            writeAtomically([[SAVE_KEY, JSON.stringify(save)]]);
            return save;
        }

        function guarded(action) {
            return (...args) => {
                try { return action(...args); }
                catch (error) {
                    if (error.name === 'ProgressError') throw error;
                    fail('STORAGE_ERROR', '无法写入或读取存档，请检查浏览器的存储空间与设置。');
                }
            };
        }

        return {
            createNewProgress,
            newGame: guarded(() => apply(snapshot(createNewProgress(), 0), { settings: true, persist: true })),
            capture: guarded(capture),
            saveAuto: guarded(saveAuto),
            hasSave: guarded(() => {
                try { decodeSave(storage.getItem(SAVE_KEY)); return true; }
                catch (error) {
                    if (error.name === 'ProgressError') return false;
                    throw error;
                }
            }),
            restoreAuto: guarded(() => apply(decodeSave(storage.getItem(SAVE_KEY)))),
            exportSave: guarded(() => JSON.stringify(saveAuto(), null, 2)),
            importSave: guarded(text => {
                if (typeof text !== 'string') fail('INVALID_SAVE', '请选择 JSON 存档文件。');
                return apply(decodeSave(text), { settings: true, persist: true });
            }),
        };
    }

    return { FORMAT, VERSION, SAVE_KEY, SETTINGS_KEY, createNewProgress, createStore };
});
