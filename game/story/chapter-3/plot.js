window.storyScene = {
    id: "chapter-3-approach",
    start: "roadIntro",
    skip: { exit: "../../battle/index.html" },
    nodes: {
        roadIntro: {
            type: "intro",
            text: "当日上午 涿鹿城东 官道",
            next: "road",
        },
        road: {
            type: "dialogue",
            transition: "black",
            lines: [
                { speaker: "{player}", text: "(远远看去涿鹿城附近冒着黑烟)" },
                { speaker: "{player}", text: "怎么回事!涿鹿城是被围攻了吗!昨天上午路过还好好的!" },
                { speaker: "[鸢阑]", text: "我们去看看吧...?" },
                { speaker: "[叶岱]", text: "任务要紧" },
                { speaker: "{player}", text: "没错,不过我们还是看看什么情况吧,如果能帮得上就帮一下吧." },
            ],
            next: "cityIntro",
        },
        cityIntro: {
            type: "intro",
            text: "片刻后,涿鹿城郊",
            background: "../../assets/images/background/011-zhuolu-city-close.png",
            transition: "none",
            next: "city",
        },
        city: {
            type: "dialogue",
            transition: "black",
            lines: [
                { speaker: "{player}", text: "原来是被怪物围攻了,我靠,该死!城墙怎么有那么大个缺口!" },
                { speaker: "[鸢阑]", text: "只剩些残党了,我们帮助清理一下吧,看起来守军也损伤惨重" },
                { speaker: "{player}", text: "好!叶岱你觉得呢?" },
                { speaker: "[叶岱]", text: "(点了点头)" },
            ],
            next: "exit",
        },
        exit: { type: "exit", to: "../../battle/index.html" },
    },
};
