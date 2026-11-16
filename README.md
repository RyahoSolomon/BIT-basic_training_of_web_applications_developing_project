#### 北京理工大学(Beijing Institute of Technology) 互联网应用开发基础训练(实践周/赵丰年)课程设计
# 源神 The Origin Of God
### 开始冒险

拉取项目后，用较新版浏览器打开根目录的 [index.html](index.html)，即可直接进入主菜单，无需注册或登录。仓库包含已打包的剧情播放器，游玩不需要安装 npm 包或启动服务器。

点击主菜单“开始”会打开姓名输入框：输入有效名字后，点击确认或按回车进入游戏；关闭或按 Escape 取消，不会覆盖现有存档。允许汉字、英文字母、数字、普通空格、`_` 和 `-`，最多 14 格，汉字计 2 格；输入框实时显示计数，中文输入法选字时的回车不会提前开始游戏。姓名在输入、存档和读取处校验，并以纯文本显示。

### 文件放在哪里

正式游戏文件统一放在 `game/`。主菜单与成就页面放在 `game/pages/`；剧情、地图、战棋和扫雷分别放在对应模块；跨模块资源放在 `game/assets/`，公共脚本和样式放在 `game/shared/`。完整目录规则和常用入口见 [项目目录说明](docs/project-structure.md)。

需要构建的源码位于 `src/`，构建产物位于 `game/generated/`；第三方库位于 `game/vendor/`。开发工具和美术源稿分别放在 [tools/](tools/README.md) 和 [design/](design/README.md)，与正式游戏内容分开维护。原项目已在独立分支归档，当前分支不再保留未使用的历史代码和样例副本。

### 开发时检查页面依赖

使用 Node.js 22 或更高版本，在项目根目录运行：

```sh
npm run check
npm test
```

`npm run check` 检查 HTML、CSS 和可静态识别的 JavaScript 本地资源与页面路径，并运行检查器自身的测试。路径失效时会报告文件名和行号。检查不扫描美术源稿，也不会推断运行时拼接的任意 URL。

`npm test` 运行上述检查、存档与战斗规则单元测试，以及存档、战斗、移动、终局结算、回合推进、单位显示、开局、剧情、页面导航、音频、剧情显示和背景过渡等浏览器回归检查，覆盖新游戏、继续游戏、JSON 存档导入导出、损坏数据保护、伤害与死亡结算、玩家与 AI 移动、胜负与成就确认、回合等待和重复操作、单位节点保留、战斗入口、剧情分支、页面资源与跳转，以及关闭音乐后的跨页与刷新行为。浏览器检查使用独立的临时档案，不使用日常浏览器中的游戏存档。任一检查失败会返回非零退出码。

这些检查无需安装 npm 包，但浏览器回归需要已安装 Chrome 或 Edge。若浏览器未安装在常见位置，可用环境变量 `BROWSER_PATH` 指定可执行文件。也可分别运行：

```sh
npm run test:progress
npm run test:battle
npm run test:movement
npm run test:settlement
npm run test:turn
npm run test:settings
npm run test:story-skip
npm run test:player-name
node scripts/smoke-game.cjs
node scripts/smoke-story.cjs
node scripts/smoke-story-presentation.cjs
node scripts/smoke-story-transitions.cjs
node scripts/smoke-navigation.cjs
node scripts/smoke-audio.cjs
```

剧情、地图、战斗、菜单与结局的背景音乐由公共音频脚本在页面加载时读取共用设置中的音乐音量与开关状态后启动；关闭音乐后跳转或刷新不会重新播放。这些页面的 `<audio>` 不使用 `autoplay` 属性，以避免短暂出声。首次播放被浏览器阻止时，再等待页面点击重试。音频检查使用真实鼠标输入，并且不会把读取页面状态当作用户交互。

对白播放器跳转到下一段剧情时，会临时记录音乐进度；目标剧情使用同一首音乐时从该位置继续，曲目改变时从头播放。该记录仅供紧接着的目标页使用，不写入游戏存档，也不会影响刷新或重新进入剧情。序章两个选项、第二关战后两个选项及长分支接回后续剧情均保持原曲续播。

新游戏、自动保存、继续游戏与 JSON 存档导入导出统一通过 [公共进度模块](game/shared/scripts/progress.js) 处理，只保留一份本地存档。各页面右上角的设置入口提供音乐、音效和存档操作；两种音量默认均为 50，静音后再次点击图标恢复此前音量，拖动滑块也能开启声音。音效仅预留设置，等待后续接入。下载文件名为 `save_{主角名字}.json`，导入后返回地图。空档或损坏数据不会覆盖当前进度。存档格式见 [存档格式](docs/save-format.md)。

主菜单的设置不显示角色姓名和改名按钮，无论是否已有存档；进入游戏后，设置中显示当前姓名并允许修改。未输入姓名时不预设显示名字，点击“开始”后由玩家填写。

[本地档案初始化](game/shared/scripts/profile.js) 在各页面的其他游戏脚本之前运行，提供姓名校验与安全读取，仅在缺失时补齐八项成就和结局标记。显示姓名保存在 `playerName`；内部存储 ID 仍为 `test`，更换名字不会创建多个账户或丢失累计成就。它不会生成游戏进度；从主菜单开始新游戏或导入存档后再进入地图与战斗。页面依次加载 `profile.js`、`preferences.js`、`progress.js`、`settings.js`，并使用共用 `settings.css`。

伤害、死亡计数和经验由 [战斗规则模块](game/battle/scripts/battle-rules.js) 计算，页面再应用结果、显示公告与成就。同一个单位死亡只结算一次；接口与验证方式见 [伤害与死亡结算](docs/battle-rules.md)。

玩家高亮和 AI 候选位置共用 [移动规则模块](game/battle/scripts/movement-rules.js)。AI 决策与行动显示也已分离，保留原有地形、占位、射程和随机选择规则；接口与验证方式见 [移动范围与 AI 决策](docs/movement-rules.md)。

行动结束和整轮结束共用胜负与成就结算，终局停止推进战斗，成就逐个确认后再进入结果页。同一次击杀触发的满级成就与通关成就也会按序保留；规则、入口与检查方法见 [胜负与通关结算](docs/battle-settlement.md)。

回合推进由 [turn-flow.js](game/battle/scripts/turn-flow.js) 管理，约 300 毫秒的行动间隔使用异步计时器，期间页面仍可响应。电脑行动只执行一次，确认后才进入下一单位；单位刷新保留现有显示节点，详见 [回合推进与单位显示](docs/turn-flow.md)。

### 编辑章节对话

第 0–6 章的 24 个对话页面共用 React 播放器。章节页面与场景配置放在 `game/story/chapter-0/` 至 `game/story/chapter-6/`；例如 [第一章页面](game/story/chapter-1/plot.html) 对应 [第一章场景配置](game/story/chapter-1/plot.js)。

场景 JS 定义 `window.storyScene`。在 `lines` 中按顺序填写 `speaker` 和 `text`，`{player}` 会替换为玩家姓名。`caption` 是与该句一起显示的中央字幕。`choices` 定义分支选项，`inlineChoice` 定义对话框内的最后一个按钮，`next` 定义读完后的目标。添加或删除一句时，将说话人与台词作为同一条记录编辑。

剧情页的设置按钮下方提供 `skip_dialogue.png` 跳过按钮，执行场景的 `skip` 目标；未配置时使用 `next`。开场背景介绍跳过后返回地图。跳过会取消正在进行的背景转场，不触发被略过的选项效果。

例如，插入下面一条记录即可增加一句对白，保存并重新打开页面后生效，无需重新构建播放器。

```js
{ speaker: "[鸢阑]", text: "我们继续出发吧。" },
```

开场介绍和第 0–6 章的对白统一直接显示，文字与文本框一起出现；点击区域禁止选择文字，默认字体统一为楷体（依次回退到 KaiTi、楷体、STKaiti 和系统衬线字体）。共用显示规则位于 `game/story/styles/player.css`，默认字体定义位于 `game/shared/styles/story-fonts.css`。

需要某句使用特殊字体时，在该条记录中加 `fontFamily`；下一句没有配置就恢复默认。也可在 `window.storyScene.fontFamily` 设置整个场景的字体，单句配置优先。分支选项和 `inlineChoice` 同样支持 `fontFamily`。开场介绍可在 `background.js` 的对应 `backgrounds` 条目设置同名字段。字体必须已安装或通过页面的 `@font-face` 加载。

```js
{ speaker: "[法海]", text: "此事非同小可。", fontFamily: '"华文新魏", serif' },
```

每句可用 `background` 指定背景图片，用 `transition` 指定进入该句时的背景过渡；开场 `background.js` 的条目继续用 `image` 指定图片，同样支持 `transition`。

| `transition` 值 | 效果 |
| --- | --- |
| `"black"`（默认） | 旧背景渐入黑场，在全黑时切图，再从黑场显示新背景 |
| `"white"` | 旧背景渐入白场，在全白时切图，再从白场显示新背景 |
| `"crossfade"` | 保留旧背景，将新背景从透明逐渐叠加至不透明 |

```js
// 普通章节：省略 transition 时，换背景默认使用黑场。
{ speaker: "[鸢阑]", text: "我们到了。", background: "../../assets/images/background/003.png" },
{ speaker: "[法海]", text: "眼前忽然一亮。", background: "../../assets/images/background/004.png", transition: "white" },
{ speaker: "{player}", text: "远处的景象逐渐清晰。", background: "../../assets/images/background/005.png", transition: "crossfade" },

// 开场介绍：在 backgrounds 中给对应条目加 transition。
{ image: "../../assets/images/background/002.png", text: "女娲创造了人族……", transition: "crossfade" },
```

过渡约 600 毫秒，只作用于背景，文字和文本框保持固定。新图加载并解码完成后才开始过渡，期间忽略重复翻页。仅换台词且没有配置 `background` 或 `transition` 时直接更新文字；空背景继承当前图片，显式指定 `transition` 可给同一背景加转场。开场条目均配置了 `image`，所以每段默认都有黑场过渡。开场字幕后的 `intro.background` 也使用同一逻辑，可用 `intro.transition` 指定效果，首句的设置优先。

图片加载失败或超过 15 秒时保留旧背景并继续显示台词；系统开启减少动态效果时直接切换到已加载的背景。共用实现位于 `game/story/scripts/background-transition.js`，修改后需要重新构建剧情播放器。

共用播放逻辑位于 [src/story/player.jsx](src/story/player.jsx)。修改播放器或背景过渡实现后，在根目录执行以下命令，并将重新生成的 `game/generated/story-player.js` 及其许可证文件一起提交：

```sh
npm ci
npm run build:story
npm test
```

第一至第三章的相同剧情样式已合并到 [game/story/styles/dialogue.css](game/story/styles/dialogue.css)；场景专用样式仍与章节页面就近存放。剧情检查会逐句核对覆盖场景的说话人，走过序章与第二章分支、第一章战斗入口及第五章字幕切换，并临时增删第一章台词，确认后续说话人和按钮仍然正确。剧情显示检查另外逐帧验证开场和全部对白页的文字与框同步、视口稳定、禁止选择及字体覆盖与回退。页面导航检查另外遍历全部运行页面，核对初始资源加载及各战斗结果页的跳转。

### 项目基本介绍
该项目为基于前端三件套(html，CSS，JavaScript)开发的简单的战棋类策略游戏，玩法改编自Worldwalker Games LLC开发的游戏**Wildermyth**，剧情改编自由Minecraft游戏中由水狼阳介企划，MTW和红石口袋联手制作的大型东方幻想RPG地图(社区内容)**盘灵古域**。
当前在保留原有玩法的基础上整理目录、修复问题并完善回归检查。尚未完成的架构改进见 [问题清单](docs/TODO.md)。

### 后记
其实目前来看，剧情上还是有很多瑕疵，在当时编剧时没有考虑。种族之间的冲突没有铺垫的很深，尤其是神族的霸权统治。其次某昆仑修士的隐藏身份的伏笔和铺垫都不够充分和明显导致最终揭露身份的剧情时戏剧冲突没那么大。最后就是台词有点中二。谨以此作品致敬《盘灵古域》，虽然它已经是这一项目九年前的作品了。

2026-11-03
随着 Agent 进一步发展，可以用较小的时间成本来完成高效的工作。因此有了利用 Agent 将本作的一些瑕疵修复及当年制作时想过但未实现的一些设想加入到本作中的想法。此分支用来归档最初的、LLM 辅助，人工完成的版本，以作留念。

### 项目组成员
*按首字母排序*
* Akashi

  地图关卡选择与架构，登录与成就界面 等
* Lennon

    项目文档，登陆界面，课程其他小组作业 等
* Patrisam

    组长，剧情模块开发与实装 等
* Ryaho·Escall·Solomon

    制作人，战棋开发，编剧(实际上只是改编，原作的剧情就已经足够震撼)，项目文档 等
* 🌈🏔🌇

    扫雷开发，课程其他小组作业，项目文档 等


### 引用
#### 非原创图片素材来源：
* 棋盘地图方格素材：黑山大叔 护眼大补丸 个人主页：https://space.bilibili.com/19428259?spm_id_from=333.337.0.0
* 操作按钮图标：《我的世界》原版材质包
* 对话背景图：红石口袋、MayorTW 开发的《我的世界》社区内容 《盘灵古域》
* 角色图标：部分来自上述《盘灵古域》 其余部分均来自 LittleSkin 皮肤站
* 字体：汉仪等;
* 任务日志弹窗：《我的世界》原版材质包：书页面


#### 非原创音乐素材来源：
* 《尼尔：机械纪元》
* 《尼尔：人工生命》
* 《奥日与黑暗森林》
* 《奥日与萤火意志》
* 《巫师 3：狂猎》
* 《死亡细胞》
* 《上古卷轴 III：晨风》
* 《上古卷轴 V：天际》
* 《磁带妖怪》

#### 其它
* 《盘灵古域》 剧情与背景图
* 《Wildermyth》 玩法设计

上述素材一切素材版权皆归属于版权方

*部分上述素材经过本人的二次修改，但本人不认为本人存在上述素材的版权，也并非图片的作者，我也不会将包含相关素材内容用作商业用途，仅作北京理工大学实践周互联网应用开发基础与实践课程小组作业唯一用途。如果本人关于二次修改的图片存在可能的版权，那我自愿放弃相关版权。*

# 神所创造的世界 并非完美
