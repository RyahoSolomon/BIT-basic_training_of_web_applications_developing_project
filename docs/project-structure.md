# 项目目录说明

根目录的 [index.html](../index.html) 是游戏入口。所有正式运行文件集中在 `game/`，仍可直接用浏览器打开，无需服务器。目录按功能模块组织；共享内容、构建源码、开发工具和美术源稿分别维护。原项目已在独立分支归档，当前分支不再保留未使用的历史代码和样例副本。

```text
index.html                         游戏入口
game/
  pages/                           登录、注册、主菜单、成就、存档页面
  story/
    chapter-0/ ... chapter-6/       各章页面、场景数据和专用样式
    scripts/                       剧情模块共用脚本
    styles/                        剧情模块共用样式
  map/                             地图入口、样式和专用资源
  battle/                          战棋入口、脚本、样式、资源和结果页
  minesweeper/                     扫雷入口、脚本、样式和专用资源
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
| 登录与主菜单 | [login.html](../game/pages/login.html)、[menu.html](../game/pages/menu.html) |
| 存档与读档 | [save.html](../game/pages/save.html)、[load.html](../game/pages/load.html) |
| 地图 | [game/map/index.html](../game/map/index.html) |
| 战棋 | [game/battle/index.html](../game/battle/index.html) |
| 扫雷 | [game/minesweeper/index.html](../game/minesweeper/index.html) |
| 第一章场景 | [game/story/chapter-1/plot.js](../game/story/chapter-1/plot.js) |
| 剧情播放器源码 | [src/story/player.jsx](../src/story/player.jsx) |
| 公共音频控制 | [game/shared/scripts/audio.js](../game/shared/scripts/audio.js) |
| 手动存读档 | [game/shared/scripts/saves.js](../game/shared/scripts/saves.js) |
| 游戏指南 | [game-guide.pdf](game-guide.pdf) |

地图、剧情和战棋依赖游戏进度。日常游玩请从根入口注册或登录，再开始游戏。

## 新文件的存放规则

1. **先确定归属模块。** 只服务于地图、战棋或扫雷的脚本、样式、资源放在各自模块的 `scripts/`、`styles/`、`assets/` 下；战棋结算页放在 `game/battle/results/level-*/`。
2. **章节内容就近放置。** 章节 HTML、同名场景 JS 和专用 CSS 放在同一个 `chapter-*` 目录。场景 JS 保存 `window.storyScene` 数据，不复制播放器实现。多章共用的样式放在 `game/story/styles/`，共用剧情脚本放在 `game/story/scripts/`。
3. **共享内容只有一份。** 跨模块使用的图片、字体、音频、视频分别放在 `game/assets/images/`、`fonts/`、`audio/`、`video/`。公共页面逻辑与样式放在 `game/shared/scripts/`、`styles/`。不要为调整相对路径复制整份脚本或素材。
4. **区分源码与产物。** 播放器源码维护在 `src/story/player.jsx`，通过 `npm run build:story` 输出到 `game/generated/`。直接引用已生成脚本的页面不需要改为加载 JSX；生成文件和许可证随仓库提交，以支持直接打开游戏。
5. **区分开发材料与运行内容。** 工具页面放在 `tools/`，Aseprite 等美术源稿放在 `design/`。第三方库集中放在 `game/vendor/`，保留原有版权与许可证信息。确认不再使用的历史实现和实验样例直接删除，需要查阅原项目时使用归档分支。

自有文件和目录使用小写英文与连字符（kebab-case），例如 `chapter-1`、`initial-board.js`、`true-ending-first.html`。不使用空格、含糊的备份后缀或仅大小写不同的名称。`README.md`、`TODO.md` 等约定文档名，以及第三方文件和许可证文件可保留原名。文件重命名不要求同时改动 JavaScript 函数名或存档字段。

第六章的 [true-ending-first.html](../game/story/chapter-6/true-ending-first.html) 与 [true-ending.html](../game/story/chapter-6/true-ending.html) 分别用于首次达成真结局和再次观看，两者均为正式页面。

## 引用与检查

本项目使用相对 URL，路径分隔符统一为 `/`。HTML 的资源和跳转路径相对于该 HTML；外部 CSS 的 `url(...)` 相对于 CSS 文件；脚本中写入页面的图片地址和跳转地址通常相对于引用它的 HTML，而非脚本自身。因此移动脚本或共用 CSS 时，需要按实际使用位置核对引用。

修改路径后运行 `npm run check`，再运行 `npm test`。前者检查 HTML、CSS、可静态识别的 JavaScript 路径和检查器自身；后者继续执行开局、剧情、页面导航和音频四个浏览器回归。动态生成的图片与跳转仍需要浏览器检查。修改播放器源码时，先运行 `npm ci` 和 `npm run build:story`。详细要求见 [开发说明](../README.md#开发时检查页面依赖)。

## 已合并的共用内容

- 三组重复字体与两组重复音乐合并后，减少约 39.7 MiB 的重复内容；同一音乐可以被多个章节引用，文件编号不要求与每个引用章节一一对应。
- 开始页、主菜单与剧情页的三份通用音乐脚本合并为 `game/shared/scripts/audio.js`。战棋使用自身的音乐列表与控制逻辑，保留在 `game/battle/scripts/audio.js`。
- 第一至第三章相同的剧情样式统一为 `game/story/styles/dialogue.css`；各章有差异的样式继续就近维护。
- 三份结局字幕脚本共用 `game/story/scripts/ending.js`。
- 手动存读档从旧剧情控制文件提取到 `game/shared/scripts/saves.js`，原存档字段和键名保持不变。

战棋目前完成了路径整理和文件拼写修正，其全局状态、回合结算与规则实现仍有后续拆分工作。存档格式统一等未完成事项见 [架构问题清单](TODO.md)。
