# 项目目录说明

根目录的 [index.html](../index.html) 是游戏入口。所有正式运行文件集中在 `game/`，仍可直接用浏览器打开，无需服务器。目录按功能模块组织；共享内容、构建源码、开发工具和美术源稿分别维护。原项目已在独立分支归档，当前分支不再保留未使用的历史代码和样例副本。

```text
index.html                         游戏入口
game/
  pages/                           主菜单与成就页面
  story/
    chapter-0/ ... chapter-6/       各章页面、场景数据和专用样式
    scripts/                       剧情模块共用脚本
    styles/                        剧情模块共用样式
  map/                             地图入口、样式和专用资源
  battle/                          战棋入口、脚本、样式、资源和结果页
  assets/                          跨模块图片、字体、音乐和视频
  shared/                          页面共用脚本和样式
  vendor/                          第三方库及其随附内容
  generated/                       构建生成的剧情播放器和许可证
src/story/                         需要构建的播放器源码
scripts/                           依赖检查与浏览器回归检查
docs/                              项目说明、待办、游戏指南和示意图
tools/                             仅供开发使用的工具页面
design/                            可编辑的美术源稿
```

## 常用入口

| 内容 | 位置 |
| --- | --- |
| 游戏起点 | [index.html](../index.html) |
| 主菜单 | [menu.html](../game/pages/menu.html) |
| 共用设置与存档导入导出 | [settings.js](../game/shared/scripts/settings.js)、[settings.css](../game/shared/styles/settings.css) |
| 地图 | [game/map/index.html](../game/map/index.html) |
| 战棋 | [game/battle/index.html](../game/battle/index.html) |
| 伤害与经验规则 | [battle-rules.js](../game/battle/scripts/battle-rules.js) |
| 伤害与经验结果的页面接入 | [battle-state.js](../game/battle/scripts/battle-state.js) |
| 胜负与通关成就规则 | [battle-outcome-rules.js](../game/battle/scripts/battle-outcome-rules.js) |
| 终局提示、保存与跳转 | [battle-settlement.js](../game/battle/scripts/battle-settlement.js) |
| 行动阶段、电脑确认与异步等待 | [turn-flow.js](../game/battle/scripts/turn-flow.js) |
| 单位显示节点与数值刷新 | [units-update.js](../game/battle/scripts/units-update.js) |
| 玩家与 AI 共用移动规则 | [movement-rules.js](../game/battle/scripts/movement-rules.js) |
| AI 候选评估与决策 | [ai-rules.js](../game/battle/scripts/ai-rules.js) |
| 第一章场景 | [game/story/chapter-1/plot.js](../game/story/chapter-1/plot.js) |
| 剧情播放器源码 | [src/story/player.jsx](../src/story/player.jsx) |
| 公共音频控制 | [game/shared/scripts/audio.js](../game/shared/scripts/audio.js) |
| 进度定义与存档读写 | [game/shared/scripts/progress.js](../game/shared/scripts/progress.js) |
| 本地档案初始化 | [game/shared/scripts/profile.js](../game/shared/scripts/profile.js) |
| 音乐与音效偏好 | [game/shared/scripts/preferences.js](../game/shared/scripts/preferences.js) |
| 游戏指南 | [game-guide.pdf](game-guide.pdf) |

地图、剧情和战棋依赖游戏进度。日常游玩请从根入口直接进入主菜单，再开始、继续游戏或在设置中导入存档。开始新游戏时输入姓名，没有账号与多槽存档页面。

## 新文件的存放规则

1. **先确定归属模块。** 只服务于地图或战棋的脚本、样式、资源放在各自模块的 `scripts/`、`styles/`、`assets/` 下；战棋结算页放在 `game/battle/results/level-*/`。
2. **章节内容就近放置。** 章节 HTML、同名场景 JS 和专用 CSS 放在同一个 `chapter-*` 目录。场景 JS 保存 `window.storyScene` 数据，不复制播放器实现。多章共用的样式放在 `game/story/styles/`，共用剧情脚本放在 `game/story/scripts/`。
3. **共享内容只有一份。** 跨模块使用的图片、字体、音频、视频分别放在 `game/assets/images/`、`fonts/`、`audio/`、`video/`。公共页面逻辑与样式放在 `game/shared/scripts/`、`styles/`。不要为调整相对路径复制整份脚本或素材。
4. **区分源码与产物。** 播放器源码维护在 `src/story/player.jsx`，通过 `npm run build:story` 输出到 `game/generated/`。直接引用已生成脚本的页面不需要改为加载 JSX；生成文件和许可证随仓库提交，以支持直接打开游戏。
5. **区分开发材料与运行内容。** 工具页面放在 `tools/`，Aseprite 等美术源稿放在 `design/`。第三方库集中放在 `game/vendor/`，保留原有版权与许可证信息。确认不再使用的历史实现和实验样例直接删除，需要查阅原项目时使用归档分支。

自有文件和目录使用小写英文与连字符（kebab-case），例如 `chapter-1`、`initial-board.js`、`true-ending-first.html`。不使用空格、含糊的备份后缀或仅大小写不同的名称。`README.md`、`TODO.md` 等约定文档名，以及第三方文件和许可证文件可保留原名。文件重命名不要求同时改动 JavaScript 函数名或存档字段。

第六章的 [true-ending-first.html](../game/story/chapter-6/true-ending-first.html) 与 [true-ending.html](../game/story/chapter-6/true-ending.html) 分别用于首次达成真结局和再次观看，两者均为正式页面。

## 引用与检查

本项目使用相对 URL，路径分隔符统一为 `/`。HTML 的资源和跳转路径相对于该 HTML；外部 CSS 的 `url(...)` 相对于 CSS 文件；脚本中写入页面的图片地址和跳转地址通常相对于引用它的 HTML，而非脚本自身。因此移动脚本或共用 CSS 时，需要按实际使用位置核对引用。

修改路径后运行 `npm run check`，再运行 `npm test`。前者检查 HTML、CSS、可静态识别的 JavaScript 路径和检查器自身；后者继续执行存档与战斗规则单元测试，以及存档、战斗、移动、终局结算、回合推进、单位显示、开局、剧情、页面导航、音频、剧情显示和背景过渡等浏览器回归。动态生成的图片与跳转仍需要浏览器检查。修改播放器源码时，先运行 `npm ci` 和 `npm run build:story`。详细要求见 [开发说明](../README.md#开发时检查页面依赖)。

## 已合并的共用内容

- 三组重复字体与两组重复音乐合并后，减少约 39.7 MiB 的重复内容；同一音乐可以被多个章节引用，文件编号不要求与每个引用章节一一对应。
- 开始页、主菜单与剧情页的三份通用音乐脚本合并为 `game/shared/scripts/audio.js`。战棋使用自身的音乐列表与控制逻辑，保留在 `game/battle/scripts/audio.js`。
- 第一至第三章相同的剧情样式统一为 `game/story/styles/dialogue.css`；各章有差异的样式继续就近维护。
- 开场介绍与各章对白共用 `game/story/styles/player.css` 的显示规则；战斗对白、章节与结局正文共用 `game/shared/styles/story-fonts.css` 的默认字体。
- 第五关普通好结局的文字尾声位于 [战后对白页](../game/story/chapter-5/plota.html)，它与第六关两版真结局共用 [ending.js](../game/story/scripts/ending.js) 按时显示字幕。
- 新游戏、自动保存、继续游戏与 JSON 导入导出共用 `game/shared/scripts/progress.js` 的版本化进度定义，使用一份本地存档；`settings.js` 负责统一设置交互，详见 [存档格式](save-format.md)。
- 所有运行页面在 head 中依次加载 `profile.js`、`preferences.js`、`progress.js`、`settings.js`，通过 `data-settings-host` 挂载唯一设置入口。`profile.js` 提供姓名计数、校验及安全读取，并补齐缺失的 `testachievement` 与 `testflag`，不会初始化当前进度；显示姓名单独保存在 `playerName`，内部 ID 仍为 `test`。
- 主菜单与成就页使用已有静态背景；开场循环背景视频已经移除，真结局的 `cast.mp4` 保留。

战棋伤害、经验和死亡计数已提取为可独立运行的规则，页面通过适配层处理显示与存储，见 [伤害与死亡结算](battle-rules.md)。玩家与 AI 共用移动范围计算，AI 决策也与页面执行分离，见 [移动范围与 AI 决策](movement-rules.md)。行动结束和整轮结束共用 [胜负与通关结算](battle-settlement.md)，成就编号与确认流程集中维护。回合阶段、异步等待和稳定的单位显示节点见 [回合推进与单位显示](turn-flow.md)；后续体验改进见 [生活质量改进清单](TODO.md)。
