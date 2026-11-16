// Shared keyboard input for the opening narration and both dialogue players.
window.StoryAdvanceInput = {
    bind(advance) {
        const held = new Set();
        let composing = false;
        let suspended = false;
        const reset = () => { held.clear(); composing = false; };
        const compositionStart = () => { composing = true; };
        const compositionEnd = () => { composing = false; };
        const pageHide = () => { suspended = true; reset(); };
        const pageShow = () => { suspended = false; reset(); };
        const keyUp = event => held.delete(event.key);
        function keyDown(event) {
            if (event.key !== ' ' && event.key !== 'Enter') return;
            const repeated = event.repeat || held.has(event.key);
            held.add(event.key);
            // Name confirmation may close its dialog before this event bubbles here.
            // Preserve native typing, focused-button activation and browser shortcuts.
            if (event.defaultPrevented || composing || event.isComposing || event.keyCode === 229 ||
                event.ctrlKey || event.altKey || event.metaKey || event.shiftKey) return;
            const target = event.target;
            if (target instanceof Element && (target.isContentEditable || target.closest(
                'input, textarea, select, button, a[href], [role="button"], [role="link"], [role="textbox"]'))) return;
            event.preventDefault();
            if (repeated || suspended || document.hidden || document.querySelector(
                'dialog[open], [aria-modal="true"]')) return;
            // A keyboard-only first visit must also unlock blocked autoplay.
            // Leave playing tracks, mute preferences and authored silence untouched.
            const audio = document.getElementById('audioPlayer');
            if (audio?.paused && window.get_music_state?.() && audio.dataset.musicSuspended !== 'true') {
                window.initial_music?.();
            }
            advance(event);
        }
        const listeners = [
            [document, 'keydown', keyDown], [document, 'keyup', keyUp],
            [document, 'compositionstart', compositionStart], [document, 'compositionend', compositionEnd],
            [window, 'blur', reset], [window, 'pagehide', pageHide], [window, 'pageshow', pageShow],
        ];
        for (const [target, type, handler] of listeners) target.addEventListener(type, handler);
        return () => {
            for (const [target, type, handler] of listeners) target.removeEventListener(type, handler);
        };
    },
};
