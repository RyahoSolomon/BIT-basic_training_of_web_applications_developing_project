(function () {
    'use strict';

    function updateBackground() {
        const backgrounds = window.menuBackgrounds;
        let save;
        try { save = GameProgress.readAuto(); }
        catch { /* An absent or unreadable save uses the new-game artwork. */ }

        let image = backgrounds.newGame;
        if (save) {
            const levels = save.progress.levels;
            const next = levels.slice(0, 5).findIndex(status => status !== 1);
            if (next !== -1) image = backgrounds.chapters[next];
            else if (levels[5] === 114) image = backgrounds.chapters[5];
            else image = levels[5] === 1 ? backgrounds.allComplete : backgrounds.mainComplete;
        }
        const url = new URL(image, document.baseURI).href;
        document.documentElement.style.setProperty('--menu-background', 'url(' + JSON.stringify(url) + ')');
    }

    // Run in the head so the first paint already uses the saved progress.
    updateBackground();
    window.addEventListener('pageshow', updateBackground);
})();
