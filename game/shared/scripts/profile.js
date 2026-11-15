(function (root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) {
        module.exports = api;
        return;
    }
    root.GameProfile = {
        ...api,
        getName() {
            try {
                const result = api.validateName(root.localStorage.getItem('playerName'));
                return result.valid ? result.name : 'test';
            } catch { return 'test'; }
        },
    };

    // This ID only owns shared achievements; it is never the display name.
    const storage = root.localStorage;
    storage.setItem('username', 'test');
    if (storage.getItem('testachievement') === null) {
        storage.setItem('testachievement', JSON.stringify({
            ach1: 0, ach2: 0, ach3: 0, ach4: 0,
            ach5: 0, ach6: 0, ach7: 0, ach8: 0,
        }));
    }
    if (storage.getItem('testflag') === null) storage.setItem('testflag', '0');
})(typeof window === 'undefined' ? globalThis : window, function () {
    'use strict';

    const ideograph = /[\p{Unified_Ideograph}〇]/u;
    const disallowed = /[^\p{Unified_Ideograph}〇A-Za-z0-9 _-]/u;

    function countName(raw) {
        if (typeof raw !== 'string') return 0;
        return Array.from(raw).reduce((count, character) => count + (ideograph.test(character) ? 2 : 1), 0);
    }

    function validateName(raw) {
        const count = countName(raw);
        if (typeof raw !== 'string' || disallowed.test(raw)) {
            return { valid: false, name: '', count, message: '名字只能包含汉字、英文字母、数字、空格、下划线或连字符。' };
        }
        // Validate the original input before trimming; hidden characters are
        // rejected, and leading/trailing ASCII spaces still count toward 14.
        const name = raw.replace(/^ +| +$/g, '');
        if (!name) return { valid: false, name: '', count, message: '请输入名字。' };
        if (count > 14) return { valid: false, name, count, message: '名字最多 14 个字符，汉字计 2 个。' };
        return { valid: true, name, count, message: '' };
    }

    return { countName, validateName };
});
