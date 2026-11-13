window.storyScene = {
    lines: [
        { speaker: "{player}", text: "...这些家伙...可恶,我们得赶紧离开了,大部队马上就要来了...." },
        { speaker: "[叶岱]", text: "...." },
        { speaker: "[叶岱]", text: "杀吗?" },
        { speaker: "[鸢阑]", text: "算了吧...反正这群人也没掌握什么信息,还是不要再激化人妖矛盾了..." },
        { speaker: "[妖族监国]", text: "(捂着伤口躺在地上,咬着牙)" },
        { speaker: "[鸢阑]", text: "{player},你怎么看?" },
    ],
    choices: [
        {
            label: "算了,我们快走吧",
            to: "branch-short.html",
            before() {
                const username = localStorage.getItem("username");
                localStorage.setItem(username + "flag", "1");
            },
        },
        { label: "我与妖族不共戴天!", to: "branch-long.html" },
    ],
    skip: "../../map/index.html",
};
