// One volume preference for each audio channel, shared by every game page.
(function () {
    'use strict';
    const key = 'game.settings';
    const channels = ['music', 'sound'];
    const defaults = () => ({ music: { volume: 50, muted: false }, sound: { volume: 50, muted: false } });

    function get() {
        try {
            const value = JSON.parse(localStorage.getItem(key));
            if (channels.every(channel => value?.[channel] &&
                Number.isInteger(value[channel].volume) && value[channel].volume >= 1 &&
                value[channel].volume <= 100 && typeof value[channel].muted === 'boolean')) return value;
        } catch { /* An unavailable or invalid preference falls back to the defaults. */ }
        return defaults();
    }

    function update(channel, change) {
        if (!channels.includes(channel)) throw new Error('未知的音量类型。');
        const settings = get();
        change(settings[channel]);
        localStorage.setItem(key, JSON.stringify(settings));
        window.dispatchEvent(new CustomEvent('game-settings-change', { detail: settings }));
        return settings;
    }

    window.GamePreferences = {
        get,
        effectiveVolume(channel) {
            const setting = get()[channel];
            return setting.muted ? 0 : setting.volume;
        },
        setVolume(channel, volume) {
            if (!Number.isInteger(volume) || volume < 0 || volume > 100) throw new Error('音量应在 0–100 之间。');
            return update(channel, setting => {
                setting.muted = volume === 0;
                if (volume > 0) setting.volume = volume;
            });
        },
        toggle(channel) {
            return update(channel, setting => { setting.muted = !setting.muted; });
        },
    };
    window.addEventListener('storage', event => {
        if (event.key === key || event.key === null) {
            window.dispatchEvent(new CustomEvent('game-settings-change', { detail: get() }));
        }
    });
})();
