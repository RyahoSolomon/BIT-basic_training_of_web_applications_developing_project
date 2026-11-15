# 美术源稿

本目录保存可继续编辑的美术源文件，不作为浏览器运行资源加载。

当前 [battle/dialogue-option-mask.aseprite](battle/dialogue-option-mask.aseprite) 是战棋对话选项遮罩的 Aseprite 源稿。对应的运行图片位于 [game/battle/assets/images/mask/dialogue-option-mask.png](../game/battle/assets/images/mask/dialogue-option-mask.png)。

新增源稿按功能模块归类；编辑后将导出的 PNG 等文件放入对应模块的 `assets/`，跨模块共用的导出资源放入 `game/assets/`。页面只引用导出资源。更改导出文件名或位置后，同步更新引用并运行检查。

静态页面依赖检查不扫描源稿目录。完整规则见 [项目目录说明](../docs/project-structure.md)。
