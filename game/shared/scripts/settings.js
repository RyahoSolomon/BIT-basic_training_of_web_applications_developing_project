(function () {
    'use strict';
    const base = new URL('../../', document.currentScript.src);
    const asset = name => new URL('assets/images/' + name, base).href;

    // Some touch browsers do not maintain :active. Track the artwork state
    // without capturing the pointer or changing native click/scroll behavior.
    const buttonSelector = '[data-settings-open], [data-story-skip], #game-settings button, #player-name-dialog button, .index-button';
    let pointerPress = null;
    function clearPointerPress() {
        pointerPress?.button.removeAttribute('data-pointer-pressed');
        pointerPress = null;
    }
    window.addEventListener('pointerdown', event => {
        if (event.pointerType === 'mouse' || !event.isPrimary || event.button !== 0) return;
        const button = event.target instanceof Element ? event.target.closest(buttonSelector) : null;
        if (!button || button.matches(':disabled')) return;
        clearPointerPress();
        pointerPress = { button, id: event.pointerId };
        button.setAttribute('data-pointer-pressed', '');
    }, { capture: true, passive: true });
    window.addEventListener('pointermove', event => {
        if (!pointerPress || pointerPress.id !== event.pointerId) return;
        const button = pointerPress.button;
        const box = button.getBoundingClientRect();
        button.toggleAttribute('data-pointer-pressed', button.isConnected && !button.matches(':disabled') &&
            event.clientX >= box.left && event.clientX <= box.right &&
            event.clientY >= box.top && event.clientY <= box.bottom);
    }, { capture: true, passive: true });
    for (const type of ['pointerup', 'pointercancel']) {
        window.addEventListener(type, event => {
            if (pointerPress?.id === event.pointerId) clearPointerPress();
        }, { capture: true, passive: true });
    }
    window.addEventListener('blur', clearPointerPress);
    window.addEventListener('pagehide', clearPointerPress);
    document.addEventListener('close', clearPointerPress, true);

    function mount() {
        const host = document.querySelector('[data-settings-host]');
        if (!host) return;
        host.innerHTML = `<button type="button" data-settings-open title="设置" aria-label="设置"><img src="${asset('settings.png')}" alt="" draggable="false"></button>`;
        const dialog = document.createElement('dialog');
        dialog.id = 'game-settings';
        dialog.setAttribute('aria-labelledby', 'settings-title');
        dialog.innerHTML = `
            <button type="button" data-settings-close title="关闭设置" aria-label="关闭设置"><img src="${asset('close.png')}" alt="" draggable="false"></button>
            <h2 id="settings-title">SETTINGS</h2>
            <div class="settings-volumes">
                ${[['sound', '音效'], ['music', '音乐']].map(([channel, label]) => `
                    <div class="settings-volume" data-channel="${channel}">
                        <button type="button" data-volume-toggle aria-label="关闭${label}"><img alt="" draggable="false"></button>
                        <label for="settings-${channel}">${label}</label>
                        <input id="settings-${channel}" type="range" min="0" max="100" step="1" value="50" aria-label="${label}音量">
                        <output for="settings-${channel}">50</output>
                    </div>`).join('')}
            </div>
            <p class="settings-status" role="status" aria-live="polite"></p>
            <div class="settings-actions">
                <button type="button" data-save-upload title="导入存档" aria-label="导入存档"><img src="${asset('upload.png')}" alt="" draggable="false"><span>导入</span></button>
                <button type="button" data-menu-leave title="保存并返回主菜单" aria-label="保存并返回主菜单"><img src="${asset('leave.png')}" alt="" draggable="false"><span>返回</span></button>
                <button type="button" data-save-download title="导出存档" aria-label="导出存档"><img src="${asset('download.png')}" alt="" draggable="false"><span>导出</span></button>
            </div>
            <input type="file" data-save-file accept=".json,application/json" hidden>`;
        document.body.append(dialog);
        const status = dialog.querySelector('.settings-status');
        const report = error => { status.textContent = error.message || '操作失败，请重试。'; };
        function render() {
            for (const channel of ['sound', 'music']) {
                const value = GamePreferences.effectiveVolume(channel);
                const row = dialog.querySelector(`[data-channel="${channel}"]`);
                const toggle = row.querySelector('[data-volume-toggle]');
                const label = channel === 'sound' ? '音效' : '音乐';
                row.querySelector('input').value = value;
                row.querySelector('output').value = value;
                toggle.setAttribute('aria-label', (value ? '关闭' : '开启') + label);
                toggle.setAttribute('aria-pressed', String(value > 0));
                toggle.title = (value ? '关闭' : '开启') + label;
                toggle.querySelector('img').src = asset(channel === 'music'
                    ? (value ? 'music_on.png' : 'muisc_off.png')
                    : (value ? 'sound_on.png' : 'sound_off.png'));
            }
        }
        host.querySelector('button').addEventListener('click', event => {
            event.stopPropagation();
            status.textContent = '';
            render();
            dialog.showModal();
            window.initial_music?.();
        });
        // A modal traps focus and blocks background pointer input, including dialogue clicks.
        dialog.addEventListener('click', event => event.stopPropagation());
        dialog.querySelector('[data-settings-close]').addEventListener('click', () => dialog.close());
        window.addEventListener('game-settings-change', render);
        for (const channel of ['sound', 'music']) {
            const row = dialog.querySelector(`[data-channel="${channel}"]`);
            row.querySelector('[data-volume-toggle]').addEventListener('click', () => {
                try { GamePreferences.toggle(channel); status.textContent = ''; } catch (error) { report(error); }
            });
            row.querySelector('input').addEventListener('input', event => {
                try { GamePreferences.setVolume(channel, Number(event.target.value)); status.textContent = ''; }
                catch (error) { render(); report(error); }
            });
        }
        dialog.querySelector('[data-menu-leave]').addEventListener('click', () => {
            try {
                try { GameProgress.saveAuto(); } catch (error) { if (error.code !== 'NO_PROGRESS') throw error; }
                window.location.href = new URL('pages/menu.html', base).href;
            } catch (error) { report(error); }
        });
        const fileInput = dialog.querySelector('[data-save-file]');
        dialog.querySelector('[data-save-upload]').addEventListener('click', () => {
            fileInput.value = '';
            fileInput.click();
        });
        fileInput.addEventListener('change', async () => {
            const file = fileInput.files[0];
            if (!file) return;
            try {
                if (file.size > 1024 * 1024) throw new Error('存档文件过大，请选择有效的游戏存档。');
                GameProgress.importSave(await file.text());
                window.location.href = new URL('map/index.html', base).href;
            } catch (error) { report(error); }
        });
        let downloading = false;
        dialog.querySelector('[data-save-download]').addEventListener('click', async () => {
            if (downloading) return;
            downloading = true;
            try {
                const text = GameProgress.exportSave();
                const name = 'save_' + JSON.parse(text).playerName + '.json';
                if (typeof window.showSaveFilePicker === 'function') {
                    const file = await window.showSaveFilePicker({ suggestedName: name,
                        types: [{ description: '游戏存档', accept: { 'application/json': ['.json'] } }] });
                    const writable = await file.createWritable();
                    await writable.write(text);
                    await writable.close();
                } else {
                    const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = name;
                    document.body.append(link);
                    link.click();
                    link.remove();
                    setTimeout(() => URL.revokeObjectURL(url), 60000);
                }
                status.textContent = '存档已导出。';
            } catch (error) { if (error.name !== 'AbortError') report(error); }
            finally { downloading = false; }
        });
        render();
        window.addEventListener('pagehide', () => {
            try { GameProgress.saveAuto(); }
            catch (error) { if (error.code !== 'NO_PROGRESS') console.warn('自动保存失败', error); }
        });
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, { once: true });
    else mount();
})();
