(function () {
    'use strict';
    const dialog = document.getElementById('player-name-dialog');
    const form = document.getElementById('player-name-form');
    const input = document.getElementById('player-name');
    const counter = document.getElementById('player-name-count');
    const errorMessage = document.getElementById('player-name-error');
    const confirm = dialog.querySelector('[data-name-confirm]');
    let composing = false;
    let starting = false;

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
        open() {
            if (dialog.open || starting) return;
            form.reset();
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
        // The Enter that selects an IME candidate must not also start the game.
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
            GameProgress.newGame(result.name);
            window.location.href = '../story/chapter-0/background.html';
        } catch (error) {
            starting = false;
            render(false);
            errorMessage.textContent = error.message || '无法开始游戏，请重试。';
        }
    });
})();
