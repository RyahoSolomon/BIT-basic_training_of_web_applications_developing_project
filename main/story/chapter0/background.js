let currentBackground = 0;
let isReady = false;

const backgrounds = [
    {
        image: '../../img/background/001.png',
        text: '很久很久以前，盘古开天辟地，双眼耀日月，四肢化四极，血液成江河，肌肤铸大地。混沌中，诞生了盘古大陆—我们生存的世界。盘古的后代—团聚在继承盘古部分能力的长老身边组成了神族。'
    },
    {
        image: '../../img/background/002.png',
        text: '女娲，用泥巴创造了我们人族，人族在神族的领导下，探索世界，开荒垦地，我们凭借超高的创造力和强大的繁殖能力，成为了大陆的主要种族。'
    },
    {
        image: '../../img/background/003.png',
        text: '然而，大陆并非是完全和平的，妖族侵占了我们的土地，掠夺我们的资源，我们为了保家卫国与之开战。杀死妖族取得的内丹也是人族核心技术—炼丹的原材料，因祸得福，我们获得了更强大的力量。'
    },
    {
        image: '../../img/background/003.png',
        text: '经过与妖族千余年的残酷战争，如今，妖族盘踞在东方龙鳞森林深处，靠着地利将战斗拖入了僵持期。'
    },
    {
        image: '../../img/background/004.png',
        text: '除了妖族的威胁，还有一些未开启灵智的怪物诞生于污秽之中，不断袭击着人类。'
    },
    {
        image: '../../img/background/005.png',
        text: '好在千年前人族通过蓬勃发展的炼丹和结阵技术，创造了人族最强兵器—四圣兽。 四圣兽分别在四个方位设下四大祭坛，结下结界并镇守祭坛，保护着人族领土，涤净污秽，大幅度减少了怪物的生成。'
    },
    {
        image: '../../img/background/005.png',
        text: '以上，就是我们人族史书中记载的，我们坚信的历史。'
    }
];

function nextBackground(event) {
    if (!isReady || event.detail > 1) return;
    if (currentBackground < backgrounds.length - 1) {
        currentBackground++;
        loadBackground(currentBackground);
    }else{
        window.location.href = "plot.html";
    }
}

document.addEventListener('DOMContentLoaded', function() {
    const image = document.getElementById('slideImage');
    const container = document.querySelector('.image-container');

    // 加载初始背景
    loadBackground(currentBackground);

    // 框图加载后，整组文字和框同时出现。
    function showDialogue() {
        container.style.visibility = 'visible';
        isReady = true;
    }
    if (image.complete && image.naturalWidth) showDialogue();
    else image.addEventListener('load', showDialogue, { once: true });
    container.addEventListener('click', nextBackground);
});

function loadBackground(index) {
    const overlayText = document.getElementById('overlayText');
    document.body.style.backgroundImage = `url(${backgrounds[index].image})`;
    overlayText.textContent = backgrounds[index].text;
    overlayText.style.setProperty('--story-font-family', backgrounds[index].fontFamily || '');
}
