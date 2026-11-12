const lastHope = {
  "speaker": "{player}",
  "text": "可恶...即使是未完全出世,元神暴露的盘古,我们恐怕也只能到这个地步了...希望其他人能有所防备!"
};

const elderSpell = {
  "speaker": "[神族长老]",
  "text": "三昧真火!出!"
};

const elderAccusation = {
  "speaker": "[神族长老]",
  "text": "你这冒牌货,还敢在神族眼皮子下现身?!"
};

window.storyScene = {
  lines: [
    {
      "speaker": "{player}",
      "text": "该死!它的肉体太强大了,如果不毁灭他的肉体,他恐怕还是会出世..."
    },
    {
      "speaker": "[鸢阑]",
      "text": "可我们已经...."
    },
    lastHope,
    { ...lastHope, caption: "霎那间,火焰与闪电腾飞,眼前的盘古被不知何处而来的法术给攻击了" },
    elderSpell,
    { ...elderSpell, caption: "在炸裂的法术轰鸣过后,盘古的身体崩解了..." },
    elderAccusation,
    { ...elderAccusation, caption: "神族长老冷冷地撇了地上的三人一眼,便御风离开了." },
    {
      "speaker": "{player}",
      "text": "接着,我们回到皇城,我们如实向法海他们禀告了这一切.法海居然像朋友一样,向我诉出了他的苦恼."
    },
    {
      "speaker": "[法海]",
      "text": "轩辕引以为傲的计划居然在神族长老面前如此不堪一击...听你们说的, 像是盘古方出世就被他感知到了,趁其实力未觉醒,赶来将假盘古杀死了."
    },
    {
      "speaker": "[法海]",
      "text": "看到轩辕的笔记时,我和陛下竟真有一丝能推翻神族统治的想法.如今, 幻想破灭事小,如果神族长老追究起来,我们恐怕难承其罪."
    },
    {
      "speaker": "[法海]",
      "text": "不过所幸,神族长老目前还没有要追究我们的意思,如此,我们便更需要担心结界消失以后,怪物会卷土重来的问题了...我们人族虽然千年没有经历与怪物的大规模战争,但也不是一点长进都没有的!"
    },
    {
      "speaker": "[法海]",
      "text": "不过有一点很奇怪,按照造神计划所述,假盘古也只是会模仿真盘古的行为而已...为什么会攻击你们呢..."
    }
  ],
  "next": "./he.html",
  "skip": "../map/map.html",
  "boxImage": "../../img/ui/text_box.png"
};
