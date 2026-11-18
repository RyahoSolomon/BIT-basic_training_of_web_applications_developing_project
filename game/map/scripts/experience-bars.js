function showMapExperience(current) {
    const atlas = document.getElementById('exp-atlas');

    function draw(canvas, blocks, ratio) {
        canvas.width = 20 * blocks + 2;
        const ctx = canvas.getContext('2d');
        // 先画左端，再重复「接缝 + 内块」，最后画另一道接缝和右端。
        function drawStrip(y) {
            ctx.drawImage(atlas, 0, y, 20, 10, 0, 0, 20, 10);
            for (let i = 1; i < blocks - 1; i++) {
                ctx.drawImage(atlas, 20, y, 20, 10, i * 20, 0, 20, 10);
            }
            ctx.drawImage(atlas, 40, y, 22, 10, (blocks - 1) * 20, 0, 22, 10);
        }
        drawStrip(10);
        if (ratio > 0) {
            ctx.beginPath();
            ctx.rect(0, 0, Math.round(canvas.width * ratio), 10);
            ctx.clip();
            drawStrip(0);
        }
    }

    for (const bar of document.querySelectorAll('.character-exp')) {
        const { level, exp } = current[bar.dataset.character];
        const threshold = GameExperience.thresholds[level - 1];
        const fullLevel = threshold === undefined;
        const ratio = fullLevel ? 1 : Math.min(exp / threshold, 1);
        const value = fullLevel ? '已满级' : exp + '/' + threshold;
        const canvas = bar.querySelector('canvas');
        canvas.title = level + ' 级 · ' + (fullLevel ? value : '经验 ' + value);
        canvas.setAttribute('aria-valuetext', canvas.title);
        canvas.setAttribute('aria-valuemin', 0);
        canvas.setAttribute('aria-valuemax', threshold ?? 1);
        canvas.setAttribute('aria-valuenow', fullLevel ? 1 : Math.min(exp, threshold));

        let lastBlocks = 0;
        function fit(width) {
            const blocks = Math.max(2, Math.min(12, Math.floor((width - 2) / 20)));
            if (blocks === lastBlocks || !atlas.naturalWidth) return;
            draw(canvas, blocks, ratio);
            lastBlocks = blocks;
        }
        fit(bar.getBoundingClientRect().width);
        new ResizeObserver(([entry]) => fit(entry.contentRect.width)).observe(bar);
    }
}
