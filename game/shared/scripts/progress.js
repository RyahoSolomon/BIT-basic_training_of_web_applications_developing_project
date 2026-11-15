// Versioned saves and the adapter for the active keys used by story/battle pages.
(function (root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    else root.GameProgress = api.createStore(root.localStorage);
})(typeof window === 'undefined' ? globalThis : window, function () {
    'use strict';

    const VERSION = 1;
    const SLOT_COUNT = 9;
    const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
    const isBoolean = value => typeof value === 'boolean';
    const isInteger = value => Number.isSafeInteger(value) && value >= 0;
    const field = (initial, valid) => ({ initial, valid });
    const character = () => ({
        level: field(1, value => isInteger(value) && value >= 1 && value <= 6),
        exp: field(0, isInteger),
    });
    // Defaults and validation share this definition. Both save types use it.
    const definition = {
        current: {
            level: field(0, value => isInteger(value) && value <= 5),
            is_plot_music_on: field(true, isBoolean),
            is_inwar_music_on: field(true, isBoolean),
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
            if (!schema.valid(value)) fail(code, '进度数据不完整或已损坏。');
            return copy(value);
        }
        if (!isObject(value)) fail(code, '进度数据不完整或已损坏。');
        return Object.fromEntries(Object.entries(schema).map(([key, child]) =>
            [key, validate(value[key], child, code)]));
    }

    function parse(text, code) {
        try { return JSON.parse(text); }
        catch { fail(code, '进度数据无法读取。'); }
    }

    function levelStatus(value) {
        // Only original storage strings are accepted; null/empty strings are not zero.
        return ['0', '1', '114'].includes(value) ? Number(value) : value;
    }

    function decodeSave(value) {
        if (value == null) fail('EMPTY_SAVE', '这个位置还没有存档。');
        if (typeof value === 'string') value = parse(value, 'INVALID_SAVE');
        if (value == null) fail('EMPTY_SAVE', '这个位置还没有存档。');
        if (!isObject(value)) fail('INVALID_SAVE', '存档数据已损坏。');
        if (Object.hasOwn(value, 'version')) {
            if (value.version !== VERSION) fail('UNSUPPORTED_VERSION', '暂不支持这个版本的存档。');
            if (value.savedAt !== null && (typeof value.savedAt !== 'string' || !value.savedAt.trim())) {
                fail('INVALID_SAVE', '存档时间数据已损坏。');
            }
            return {
                version: VERSION,
                savedAt: value.savedAt,
                progress: validate(value.progress, definition, 'INVALID_SAVE'),
            };
        }
        // 兼容未带版本号的原版存档：识别空档，并将有效旧数据转换为当前进度格式。
        if (value.current === 0 && value.MSYgamename === 0) {
            fail('EMPTY_SAVE', '这个位置还没有存档。');
        }
        const current = typeof value.current === 'string'
            ? parse(value.current, 'INVALID_SAVE') : value.current;
        return {
            version: VERSION,
            savedAt: typeof value.currentDateTime === 'string' && value.currentDateTime.trim()
                ? value.currentDateTime : null,
            progress: validate({
                current,
                levels: Array.from({ length: 6 }, (_, i) => levelStatus(value['level' + (i + 1)])),
                chapterName: value.MSYgamename,
                // Old saves never recorded the tutorial flag; do not reopen it on restore.
                isFirstPlay: false,
            }, definition, 'INVALID_SAVE'),
        };
    }

    function createNewProgress() { return defaults(definition); }

    function createStore(storage, now = () => new Date()) {
        const levelKeys = Array.from({ length: 6 }, (_, i) => 'level' + (i + 1));
        // These are the only translations between the snapshot and active page storage.
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
                read: ([value]) => value === null ? false : value === 'true' ? true : value === 'false' ? false : value,
                write: value => [String(value)],
            },
        };

        function userKey(suffix) {
            const username = storage.getItem('username');
            if (!username) fail('NO_USER', '请先登录账号。');
            return username + suffix;
        }

        function slotIndex(index) {
            if (!Number.isInteger(index) || index < 0 || index >= SLOT_COUNT) {
                fail('INVALID_SLOT', '存档位置不存在。');
            }
        }

        function snapshot(progress) {
            return { version: VERSION, savedAt: now().toISOString(), progress: validate(progress, definition, 'INVALID_PROGRESS') };
        }

        function capture() {
            const progress = Object.fromEntries(Object.entries(activeFields).map(([key, adapter]) =>
                [key, adapter.read(adapter.keys.map(key => storage.getItem(key)))]));
            return snapshot(progress);
        }

        function apply(save) {
            // Validate everything before the first write. Roll back if storage rejects a write.
            const progress = validate(save.progress, definition, 'INVALID_SAVE');
            const entries = Object.entries(activeFields).flatMap(([field, adapter]) => {
                const values = adapter.write(progress[field]);
                return adapter.keys.map((key, i) => [key, values[i]]);
            });
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
                    if (value === null) storage.removeItem(key);
                    else storage.setItem(key, value);
                }
                throw error;
            }
            return save;
        }

        function readSlots() {
            const raw = storage.getItem(userKey('savearea'));
            if (raw === null) return [];
            const slots = parse(raw, 'INVALID_SAVE');
            if (!Array.isArray(slots)) fail('INVALID_SAVE', '存档列表已损坏，无法读取或覆盖。');
            return slots;
        }

        function describe(value) {
            try { return { status: 'ready', snapshot: decodeSave(value) }; }
            catch (error) {
                return { status: error.code === 'EMPTY_SAVE' ? 'empty' : 'invalid', message: error.message };
            }
        }

        // All I/O failures have a user-facing message; pages never enumerate save fields.
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
            newGame: guarded(() => apply(snapshot(createNewProgress()))),
            capture: guarded(capture),
            saveAuto: guarded(() => {
                const key = userKey('autosave');
                const save = capture();
                storage.setItem(key, JSON.stringify(save));
                return save;
            }),
            saveSlot: guarded(index => {
                slotIndex(index);
                const slots = readSlots();
                const save = capture();
                slots[index] = save;
                storage.setItem(userKey('savearea'), JSON.stringify(slots));
                return save;
            }),
            restoreAuto: guarded(() => apply(decodeSave(storage.getItem(userKey('autosave'))))),
            restoreSlot: guarded(index => {
                slotIndex(index);
                return apply(decodeSave(readSlots()[index]));
            }),
            listSlots: guarded(() => {
                let slots;
                try { slots = readSlots(); }
                catch (error) {
                    if (error.code !== 'INVALID_SAVE') throw error;
                    return Array.from({ length: SLOT_COUNT }, () => ({ status: 'invalid', message: error.message }));
                }
                return Array.from({ length: SLOT_COUNT }, (_, index) => describe(slots[index]));
            }),
        };
    }

    return { VERSION, createNewProgress, createStore };
});
