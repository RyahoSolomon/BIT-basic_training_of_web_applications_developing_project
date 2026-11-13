// 原稿末句未播放，原流程在两个分支结束后直接进入护山大阵。
// 前面就是梓决岛主所说的护山大阵了!做好准备吧!我们要找到所有阵眼!
const sharedLines = [
  {
    "speaker": "[叶岱]",
    "text": "那些黑衣人...是神族"
  },
  {
    "speaker": "[鸢阑]",
    "text": "你说什么?神族?!为什么神族要袭击蓬莱?"
  }
];

const shortLines = [
  {
    "speaker": "{player}",
    "text": "恐怕我们永远也不会知道了...圣山就在眼前,我们做好最后的准备吧,希望能够找回四圣兽"
  }
];

const longLines = [
  {
    "speaker": "{player}",
    "text": "恐怕是因为岛主梓决曾经反抗过神族长老,如今被长老得知,神族长老才派人来暗杀梓决的..."
  },
  {
    "speaker": "{player}",
    "text": "毕竟从行为上来看,他们几乎是直奔梓决而去..."
  },
  {
    "speaker": "{player}",
    "text": "那些人都凶悍异常,恐怕在神族也是他们长老的亲信一脉"
  },
  {
    "speaker": "[鸢阑]",
    "text": "神族长老吗...那他不会找我们麻烦吧..."
  },
  {
    "speaker": "{player}",
    "text": "我想应该不会,我们毕竟只是小角色,但是如果长老真如太上老君所述一般,梓决恐怕今后难以善终...."
  },
  {
    "speaker": "{player}",
    "text": "圣山就在眼前,我们做好最后的准备吧,希望能够找回四圣兽"
  }
];

let current;
try {
  current = JSON.parse(localStorage.getItem("current"));
} catch {
  current = null;
}
window.storyScene = {
  lines: [
    ...sharedLines,
    ...(current?.hidden_clue_poison ? shortLines : longLines)
  ],
  "next": "../../minesweeper/index.html",
  "skip": "../../minesweeper/index.html",
  "boxImage": "../../assets/images/ui/text-box.png"
};
