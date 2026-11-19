window.storyScene = {
    id: "chapter-0",
    start: "history",
    skip: { exit: "../../map/index.html", label: "跳过序章，进入地图" },
    nodes: {
        history: {
            type: "dialogue",
            boxImage: "../../assets/images/ui/text-box-no.png",
            lines: [
                {
                    background: "../../assets/images/background/001.png",
                    text: "很久很久以前，盘古开天辟地，双眼耀日月，四肢化四极，血液成江河，肌肤铸大地。混沌中，诞生了盘古大陆—我们生存的世界。盘古的后代—团聚在继承盘古部分能力的长老身边组成了神族。",
                },
                {
                    background: "../../assets/images/background/002.png",
                    text: "女娲，用泥巴创造了我们人族，人族在神族的领导下，探索世界，开荒垦地，我们凭借超高的创造力和强大的繁殖能力，成为了大陆的主要种族。",
                },
                {
                    background: "../../assets/images/background/003.png",
                    text: "然而，大陆并非是完全和平的，妖族侵占了我们的土地，掠夺我们的资源，我们为了保家卫国与之开战。杀死妖族取得的内丹也是人族核心技术—炼丹的原材料，因祸得福，我们获得了更强大的力量。",
                },
                {
                    background: "../../assets/images/background/003.png",
                    transition: "black",
                    text: "经过与妖族千余年的残酷战争，如今，妖族盘踞在东方龙鳞森林深处，靠着地利将战斗拖入了僵持期。",
                },
                {
                    background: "../../assets/images/background/004.png",
                    text: "除了妖族的威胁，还有一些未开启灵智的怪物诞生于污秽之中，不断袭击着人类。",
                },
                {
                    background: "../../assets/images/background/005.png",
                    text: "好在千年前人族通过蓬勃发展的炼丹和结阵技术，创造了人族最强兵器—四圣兽。 四圣兽分别在四个方位设下四大祭坛，结下结界并镇守祭坛，保护着人族领土，涤净污秽，大幅度减少了怪物的生成。",
                },
                {
                    background: "../../assets/images/background/005.png",
                    transition: "black",
                    text: "以上，就是我们人族史书中记载的，我们坚信的历史。",
                },
            ],
            next: "intro",
        },
        intro: {
            type: "intro",
            text: "某日上午 京城 人族皇宫 玄阳殿",
            duration: 2000,
            transition: "blackout",
            music: "../../assets/audio/002-huguo-palace.mp3",
            background: "../../assets/images/background/005-huguo-palace.png",
            next: "main",
        },
        main: {
            type: "dialogue",
            lines: [
                { speaker: "{player}", text: "（我是直属于轩辕皇室执行机密任务的特别小队的一名队长，颇受信任，今天突然收到护国法师密令面谈要事，发布任务）" },
                { speaker: "{player}", text: "（与护国法师相关，密级如此之高，究竟出什么大事了？我不禁冒了冷汗）" },
                { speaker: "{player}", text: "参见宗师殿下。" },
                { speaker: "法海", text: "不必多礼，收到密令，想必你也清楚此次任务的重要性。我就直接说吧，我感到四圣兽所立下结界松动了。" },
                { speaker: "法海", text: "产生这种现象的唯一解释就是，四圣兽离开祭坛有一段时间了。如果不能及时处理，接下来我们面临的问题恐怕就是怪物和妖族趁虚反扑。" },
                { speaker: "法海", text: "目前宫廷仍决定将此消息保密，以防恐慌混乱，你的任务就是迅速赶往龙鳞森林深处，从青龙祭坛处取得那里从前供奉的青龙鳞片，以便我通过灵气定位青龙所在。" },
                { speaker: "法海", text: "龙鳞森林已是结界之外，那里有怪物和妖族，恐怕不会一帆风顺，但以你们的实力，应该应付他们不成问题，听明白了吗？" },
            ],
            next: "decision",
        },
        decision: {
            type: "choice",
            choices: [
                { id: "depart", kind: "advance", label: "属下明白,我们立刻集结出发", to: "departure" },
                { id: "ask", kind: "advance", label: "回宗师殿下,为何非龙鳞森林不可?毕竟那附近有妖族领地...", to: "explanation" },
            ],
        },
        explanation: {
            type: "dialogue",
            lines: [
                { speaker: "法海", text: "此事越快越好，玄武祭坛在北海，白虎祭坛位于西方虎爪山脉，朱雀祭坛虽然不远，但覆于火山之下，恐是无法到达。" },
                { speaker: "{player}", text: "回宗师殿下,请问四圣兽是否可以替代重铸?" },
                { speaker: "法海", text: "四圣兽乃是用补天之石才可铸成,如今世界上恐再无此等法宝了..." },
                { speaker: "法海", text: "想当年是当今人族帝王的祖先,初代轩辕和神农合力所铸,他们是我人族技艺的巅峰,可惜最后他们为了铸就圣兽元神,献出了自己的生命,技艺也都失传了..." },
            ],
            next: "departure",
        },
        departure: {
            type: "dialogue",
            lines: [
                { speaker: "{player}", text: "(离开玄阳殿后,心中不由得感到震颤,四圣兽是人族的守护者,是我们的信仰,如今结界松动,往坏处想,恐怕已经陨落...)" },
                { speaker: "{player}", text: "(不敢再想下去了,还是快些行动吧)" },
            ],
            next: "exit",
        },
        exit: { type: "exit", to: "../../map/index.html" },
    },
};
