(function () {
    'use strict';

    const chapterNames = ['第一关', '第二关', '第三关', '第四关', '第五关', '第六关'];
    const saveTime = new Intl.DateTimeFormat('zh-CN', { dateStyle: 'medium', timeStyle: 'short' });

    function updateMenu() {
        const backgrounds = window.menuBackgrounds;
        let save;
        let message = '';
        try { save = GameProgress.readAuto(); }
        catch (error) {
            message = error.code === 'EMPTY_SAVE' ? '暂无存档，可开始新游戏或在设置中导入。' : error.message;
        }

        let image = backgrounds.newGame;
        if (save) {
            const levels = save.progress.levels;
            const next = levels.findIndex((status, index) => index === 5 ? status === 114 : status !== 1);
            let progress;
            if (next !== -1) {
                image = backgrounds.chapters[next];
                progress = chapterNames[next];
            } else {
                const complete = levels[5] === 1;
                image = complete ? backgrounds.allComplete : backgrounds.mainComplete;
                progress = complete ? '全部通关' : '主线已通关';
            }
            message = save.playerName + ' · ' + progress;
        }
        const button = document.getElementById('continue-game');
        if (button) {
            button.disabled = !save;
            document.getElementById('continue-summary').textContent = message;
            document.getElementById('continue-saved-at').textContent =
                save ? '上次保存　' + saveTime.format(new Date(save.savedAt)) : '';
            document.getElementById('continue-error').textContent = '';
        }
        const url = new URL(image, document.baseURI).href;
        document.documentElement.style.setProperty('--menu-background', 'url(' + JSON.stringify(url) + ')');
    }

    // Run in the head so the first paint already uses the saved progress.
    updateMenu();
    document.addEventListener('DOMContentLoaded', updateMenu, { once: true });
    window.addEventListener('pageshow', updateMenu);
    window.addEventListener('game:save-changed', updateMenu);
    window.addEventListener('storage', event => {
        if (event.key === 'game.save' || event.key === null) updateMenu();
    });
})();
