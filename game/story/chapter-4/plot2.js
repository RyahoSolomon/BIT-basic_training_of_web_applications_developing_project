window.storyScene = {
  "lines": [
    {
      "speaker": "{player}",
      "text": "(来到岛上,只见一群神秘黑衣人在袭击蓬莱岛民)"
    },
    {
      "speaker": "[鸢阑]",
      "text": "可恶,你们为何要进攻蓬莱!"
    }
  ],
  "skip": "../../battle/index.html",
  "boxImage": "../../assets/images/ui/text-box.png"
};

window.storyScene.next = () => {
  document.getElementById("story-player").style.display = "none";
  document.body.style.backgroundColor = "black";
  document.body.style.backgroundImage = "none";
  document.getElementById("text2").style.opacity = "1";
  window.setTimeout(() => {
    window.location.href = "../../battle/index.html";
  }, 3000);
};
