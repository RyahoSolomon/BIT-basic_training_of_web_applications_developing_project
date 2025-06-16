let currentBackground = 0;
let isTransitioning = false; // 引入锁，防止重复切换

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

function nextBackground() {
    if (isTransitioning) return; // 如果正在切换，则直接返回
    if (currentBackground < backgrounds.length - 1) {
        isTransitioning = true; // 设置为正在切换状态
        flashBlackEffect();
        currentBackground++;
        setTimeout(() => {
            loadBackground(currentBackground);
            isTransitioning = false; // 切换完成后重置状态
        }, 500);
    }else{
        window.location.href = "plot.html";
    }
}

document.addEventListener('DOMContentLoaded', function() {
    const image = document.getElementById('slideImage');
    const overlayText = document.getElementById('overlayText');

    // 加载初始背景
    loadBackground(currentBackground);

    // 绑定点击事件
    image.addEventListener('click', nextBackground);
    overlayText.addEventListener('click', nextBackground);

    // 监听图片动画结束时显示文字
    image.addEventListener('transitionend', function() {
        setTimeout(() => {
            showElement(overlayText); // 显示文字
        }, 50);
    });
});

function loadBackground(index) {
    const overlayText = document.getElementById('overlayText');
    document.body.style.backgroundImage = `url(${backgrounds[index].image})`;

    overlayText.innerText = backgrounds[index].text;
    hideElement(overlayText); // 在加载背景时隐藏文字

    const image = document.getElementById('slideImage');
    image.style.bottom = '-100%';
    setTimeout(() => {
        image.style.bottom = '0';
    }, 10);
}

function flashBlackEffect() {
    const flashBlack = document.getElementById('flashBlack');
    flashBlack.classList.add('visible');
    setTimeout(() => {
        flashBlack.classList.remove('visible');
    }, 500);
}

// 用于显示元素
function showElement(element) {
    element.style.opacity = '1';
    element.style.visibility = 'visible';
    element.style.pointerEvents = 'auto'; // 确保元素可以点击
}

// 用于隐藏元素
function hideElement(element) {
    element.style.opacity = '0';
    element.style.visibility = 'hidden';
    element.style.pointerEvents = 'none'; // 防止点击隐藏状态的元素
}
