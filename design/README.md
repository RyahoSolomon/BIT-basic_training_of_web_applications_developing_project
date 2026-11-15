# 美术源稿

本目录保存可继续编辑的美术源文件，不作为浏览器运行资源加载。

当前 [battle/dialogue-option-mask.aseprite](battle/dialogue-option-mask.aseprite) 是战棋对话选项遮罩的 Aseprite 源稿。对应的运行图片位于 [game/battle/assets/images/mask/dialogue-option-mask.png](../game/battle/assets/images/mask/dialogue-option-mask.png)。

[story/ui-concept-v1.png](story/ui-concept-v1.png) 保存了基于原有素材生成的 1536×1024 剧情 UI 设计稿。目前应用其中顶部的对白框：从 `(54, 28)` 裁出 `1430×318` 区域，以最近邻采样缩小为 `320×68`，将透明度按 128 分界转为全透明或不透明，再导出为不抖动的 16 色 PNG。姓名栏占顶部 16 像素；裁去这 16 行后，用右上边框的镜像补齐左上方 `108×6` 的衔接区域，得到 `320×52` 的独立无姓名栏版本。运行资源分别是 [text-box.png](../game/assets/images/ui/text-box.png) 和 [text-box-no.png](../game/assets/images/ui/text-box-no.png)，由共享剧情样式以 `image-rendering: pixelated` 放大显示。

新增源稿按功能模块归类；编辑后将导出的 PNG 等文件放入对应模块的 `assets/`，跨模块共用的导出资源放入 `game/assets/`。页面只引用导出资源。更改导出文件名或位置后，同步更新引用并运行检查。

静态页面依赖检查不扫描源稿目录。完整规则见 [项目目录说明](../docs/project-structure.md)。
