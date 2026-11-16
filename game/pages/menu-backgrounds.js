// 图片路径相对于 menu.html；只加载当前进度对应的一张图片。
window.menuBackgrounds = {
    // 无存档或存档不可读时，默认使用第一关开场背景。
    newGame: "../assets/images/background/007-outside-altar.png",
    // 第一至第六关：默认取各关战前剧情的首张对话背景。
    chapters: [
        "../assets/images/background/007-outside-altar.png",
        "../assets/images/background/008-forest-periphery.png",
        "../assets/images/background/010-zhuolu-city-faraway.png",
        "../assets/images/background/014-penglai-north.png",
        "../assets/images/background/017-holly-moutain.png",
        "../assets/images/background/021-rest.png",
    ],
    // 主线通关但未解锁隐藏关、全部通关后的背景可分别配置。
    mainComplete: "../assets/images/background/017-holly-moutain.png",
    allComplete: "../assets/images/background/021-rest.png",
};
