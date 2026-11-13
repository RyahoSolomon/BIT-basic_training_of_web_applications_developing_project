const arrival = {
  "speaker": "{player}",
  "text": "..."
};

const unease = {
  "speaker": "[鸢阑]",
  "text": "不对劲..."
};

const panguAppears = {
  "speaker": "[叶岱]",
  "text": "是盘古!"
};

window.storyScene = {
  lines: [
    { ...arrival, caption: "三人来到圣山,眼前的景象缺十分奇怪" },
    { ...arrival, caption: "四圣兽化作四颗巨蛋,分散在圣山谷地四周" },
    unease,
    { ...unease, caption: "忽然间,山体开始崩裂四颗巨蛋破裂,凝聚,在中间形成了一颗巨大的暗色的蛋" },
    { ...unease, caption: "蛋壳破裂,从里面伸出来一直大手...随后是胳膊,然后整个人形的上半身都出现了..." },
    panguAppears,
    { ...panguAppears, caption: "还没等到众人反应些什么,盘古突然开始咆哮,随后混沌向三人袭来,天崩地裂!" }
  ],
  "skip": "../../battle/index.html",
  "boxImage": "../../assets/images/ui/text-box.png",
  "inlineChoice": {
    "label": "【该死!准备战斗!】",
    "to": "../../battle/index.html",
    "speaker": "{player}"
  }
};
