(function () {
    'use strict';
    if (window.GameNameEntry) return;
    const base = new URL('../../', document.currentScript.src);
    const asset = name => new URL('assets/images/' + name, base).href;
    const dialog = document.createElement('dialog');
    dialog.id = 'player-name-dialog';
    dialog.innerHTML = `
        <form id="player-name-form" novalidate>
            <div class="player-name-frame">
                <div class="player-name-row">
                    <input id="player-name" name="playerName" type="text" maxlength="64" required
                        autocomplete="off" spellcheck="false" autocapitalize="off"
                        placeholder="请输入主角名字..." aria-label="主角名字" aria-describedby="player-name-error" autofocus>
                    <output id="player-name-count" for="player-name" aria-live="polite">0/14</output>
                    <button type="button" data-name-close title="取消" aria-label="取消输入名字">
                        <img src="${asset('close.png')}" alt="" draggable="false">
                    </button>
                    <button type="submit" data-name-confirm title="确认" disabled>
                        <img src="${asset('confirm.png')}" alt="" draggable="false">
                    </button>
                </div>
            </div>
            <p id="player-name-error" role="status" aria-live="polite"></p>
        </form>`;
    document.body.append(dialog);
    const form = document.getElementById('player-name-form');
    const input = document.getElementById('player-name');
    const counter = document.getElementById('player-name-count');
    const errorMessage = document.getElementById('player-name-error');
    const confirm = dialog.querySelector('[data-name-confirm]');
    let composing = false;
    let starting = false;
    let renaming = false;

    function render(showError = true) {
        const result = GameProfile.validateName(input.value);
        counter.textContent = result.count + '/14';
        counter.classList.toggle('over-limit', result.count > 14);
        confirm.disabled = !result.valid || composing || starting;
        input.setAttribute('aria-invalid', String(showError && !composing && !result.valid));
        errorMessage.textContent = showError && !composing && !result.valid ? result.message : '';
        return result;
    }

    window.GameNameEntry = {
        open({ mode = 'new-game' } = {}) {
            if (dialog.open || starting) return;
            renaming = mode === 'rename';
            form.reset();
            input.value = renaming ? GameProfile.getName() : '';
            dialog.setAttribute('aria-label', renaming ? '修改主角名字' : '输入主角名字');
            confirm.setAttribute('aria-label', renaming ? '确认修改名字' : '确认名字并开始游戏');
            composing = false;
            render(false);
            dialog.showModal();
            input.focus();
            window.initial_music?.();
        },
    };

    dialog.querySelector('[data-name-close]').addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', event => event.stopPropagation());
    input.addEventListener('input', () => render());
    input.addEventListener('compositionstart', () => { composing = true; render(false); });
    input.addEventListener('compositionend', () => { composing = false; render(); });
    input.addEventListener('keydown', event => {
        if (event.key !== 'Enter') return;
        // Selecting an IME candidate must not also confirm the name.
        event.preventDefault();
        if (composing || event.isComposing || event.keyCode === 229) return;
        form.requestSubmit();
    });
    form.addEventListener('submit', event => {
        event.preventDefault();
        if (composing || starting) return;
        const result = render();
        if (!result.valid) {
            input.focus();
            return;
        }
        starting = true;
        confirm.disabled = true;
        try {
            // Validation and all save writes are atomic in the progress module.
            if (renaming) {
                GameProgress.renamePlayer(result.name);
                starting = false;
                dialog.close();
            } else {
                GameProgress.newGame(result.name);
                window.location.href = new URL('story/chapter-0/background.html', base).href;
            }
        } catch (error) {
            starting = false;
            render(false);
            errorMessage.textContent = error.message || (renaming ? '无法修改名字，请重试。' : '无法开始游戏，请重试。');
        }
    });
})();
