# 生活质量改进清单

更新日期：2026-11-18。

原清单已全部完成，本清单替换旧内容，收录本轮体验检查提出的全部 36 项。编号 01–30 对应检查建议，31–36 对应末尾的六个细节项。完成并验证后再勾选。

优先修复操作结果不符合预期的问题，再减少重复点击、补足信息反馈。明确缺陷与可选体验建议分开记录；涉及技能规则、跳过范围等设计取舍时，先确定期望行为。当前仍为未发布的 dev 版本，不保留无用的兼容代码。

## 优先处理：已确认的问题

- [ ] **01 · 修复强化技能留下永久属性加成**

  “昆仑护体”尚未结束时再次施放，会再次增加攻击和速度，但最终只扣回一次。已复现强化状态消失后仍保留攻击、速度各 `+1`。明确采用“刷新持续时间”还是“允许叠层”，确保持续时间、属性增减和到期结算对应。

  相关位置：[技能执行](../game/battle/scripts/block-click.js)、[轮末效果](../game/battle/scripts/control.js)。

- [ ] **02 · 统一技能说明、范围提示和实际效果**

  已确认：“向死则生”写清除一半护甲，实际清零；“昆仑护体”写更远的施法范围和强化三回合，实际范围较短、增加五层；举盾说明会降低攻击，实际没有。先确定正确规则，再统一按钮说明、范围预览和结算，避免玩家依照错误说明安排策略。

  相关位置：[技能说明](../game/battle/scripts/class-commander.js)、[范围与操作](../game/battle/scripts/operation.js)、[技能执行](../game/battle/scripts/block-click.js)。

- [ ] **03 · 弹层打开时统一阻止底层战斗操作**

  已实际复现：先选择移动，再打开任务书，点击任务书旁边的可走格，角色仍会移动。角色切换已有弹层检查，原有移动、攻击尚未统一限制。任务、剧情和成就弹层应共用一致的战场输入限制，避免读提示时误操作。

  相关位置：[行动权限](../game/battle/scripts/turn-flow.js)、[格子操作](../game/battle/scripts/block-click.js)、[任务弹层](../game/battle/scripts/mission-objective.js)。

- [ ] **04 · 修复键盘选关可能进入错误战斗**

  已复现：Tab 聚焦第二关后按 Enter，会进入第二章剧情，但战斗编号仍可能是第一关。关卡准备逻辑只绑在图片上，链接自身没有执行。统一鼠标和键盘的选关入口，确保剧情与实际战斗关卡一致。

  相关位置：[地图入口](../game/map/index.html)。

- [ ] **05 · 修复小窗口下的裁切与布局溢出**

  已确认：1024px 宽时战棋需要横向滚动；800×600 时成就页底部卡片被裁掉且不能正常滚动查看；600px 宽时剧情选项仍宽 850px，两侧出界。先适配普通笔记本和缩小后的窗口：战棋与交互层同步适配，成就列表可滚动，选项随宽度收缩并允许长句换行。

  相关位置：[棋盘尺寸](../game/battle/styles/blocks.css)、[战斗界面](../game/battle/styles/ui.css)、[成就页](../game/pages/achievements.html)、[序章选项](../game/story/chapter-0/plot.css)、[第二关选项](../game/story/chapter-2/plot-after.css)。

- [ ] **06 · 避免设置按钮遮住棋盘格子**

  在 1366×650 的可视区域实测，右上角格子的中心会点到设置按钮。给战斗设置入口预留位置，与棋盘缩放一起处理，确保边缘格子也能完整查看和点击。

  相关位置：[设置按钮位置](../game/shared/styles/settings.css)、[战斗页面](../game/battle/index.html)。

- [ ] **07 · 修复首次真结局页刷新后重复解锁成就**

  该页先把已解锁标记清零，再重新解锁。主要影响首次结局页刷新、重新进入；普通再次通关已有另外的页面分流。仅在首次获得时弹成就提示，并让后续结局演出与是否弹成就分离。

  相关位置：[首次真结局](../game/story/chapter-6/true-ending-first.html)、[结局分流](../game/battle/results/level-extra/win.html)。

## 战棋操作与反馈

- [ ] **08 · 增加明确的取消选目标方式**

  支持 Esc、右键、再次点击当前技能取消选目标，并清除相关范围提示。现在选了攻击后想切换附近队友，点击可能直接变成友伤；应同时显示“正在选择攻击目标”等明确状态。

  相关位置：[操作选择](../game/battle/scripts/operation.js)、[战斗页面](../game/battle/index.html)。

- [ ] **09 · 增加伤害预览和友伤警示**

  悬浮目标时显示预计减少的护甲和生命；范围技能标出受影响的友军；自伤技能提示自身损血和可能死亡。保留友伤机制，同时让操作后果清楚可见。

  相关位置：[目标范围](../game/battle/scripts/operation.js)、[悬浮预览](../game/battle/scripts/hover-events.js)、[伤害规则](../game/battle/scripts/battle-rules.js)。

- [ ] **10 · 为敌方阶段增加自动继续或加速**

  当前每个电脑单位，包括原地等待者，都要单独确认，后期援军增多后点击量很大。保留逐个确认模式，同时提供自动播放或加速，重要事件再暂停。

  相关位置：[电脑行动](../game/battle/scripts/ai.js)、[行动确认](../game/battle/scripts/turn-flow.js)。

- [ ] **11 · 补足受击反馈与可回看的战斗记录**

  当前伤害主要表现为数字直接变化，公告仅保留最后五条。增加短暂的伤害数字、护盾变化提示，以及可展开的战斗记录，说明谁攻击了谁、损失多少、为何死亡；避免用冗长动画拖慢战斗。

  相关位置：[电脑行动显示](../game/battle/scripts/ai.js)、[战斗事件](../game/battle/scripts/battle-state.js)、[公告](../game/battle/scripts/announcement.js)。

- [ ] **12 · 细化角色行动状态提示**

  在现有头像置灰基础上补充“未移动／已移动、仍可攻击／已结束行动”，显示当前角色姓名。灰色之外增加小标记，让行动状态更容易辨认。

  相关位置：[单位显示](../game/battle/scripts/units-update.js)、[回合状态](../game/battle/scripts/turn-flow.js)。

- [ ] **13 · 增加易读的单位详情区**

  当前生命数字只有 8px，很多属性藏在浏览器悬浮提示里。在信息区展示角色属性、状态剩余回合和技能冷却；敌人也能查看详情，进一步可提供威胁范围。

  相关位置：[单位显示与提示](../game/battle/scripts/units-update.js)、[界面布局](../game/battle/styles/ui.css)。

- [ ] **14 · 常驻显示任务进度**

  显示“真灵 3/8”“守护 12/20 回合”“剩余敌人 4”等进度，以及关键 NPC 是否安全。避免只给静态胜利条件，让玩家反复打开任务书或自己记数。

  相关位置：[任务目标](../game/battle/scripts/mission-objective.js)、[胜负规则](../game/battle/scripts/battle-outcome-rules.js)。

- [ ] **15 · 失败后支持直接重试，胜利后展示简短结算**

  失败页提供“重新挑战／返回地图”，并说明失败原因；胜利页显示所用回合、角色升级和新增线索，再进入剧情。替换当前基本只有结果和“确定”的流程。

  相关位置：[战斗结果页](../game/battle/results/)、[胜负结算](../game/battle/scripts/battle-settlement.js)。

- [ ] **16 · 将直接胜利按钮收进开发入口**

  当前跳关按钮直接获得胜利，且与常用功能相邻，容易误触。保留开发功能，但与正常游玩按钮分开；普通移动、攻击不必因此增加确认步骤。

  相关位置：[战斗按钮](../game/battle/index.html)。

- [ ] **17 · 评估有限范围内的移动撤回**

  仅在尚未攻击、触发事件或结算时，允许撤回刚才那次移动。先定义撤销边界，避免回滚奖励或事件；投入高于取消选目标，排在第 08 项之后。

  相关位置：[移动执行](../game/battle/scripts/block-click.js)、[回合状态](../game/battle/scripts/turn-flow.js)、[机关与事件](../game/battle/scripts/class-items.js)。

## 剧情阅读与流程

- [x] **18 · 支持键盘推进对白**

  开场背景介绍、普通对白和节点剧情已支持 Space、Enter 单次推进。长按不会连续跳句，转场期间的输入不会积压；设置、姓名输入、输入法选字、分支选项和成就弹窗均避免误推进。继续提示暂不显示，待位置确定后再加入。

  相关位置：[共享键盘输入](../game/story/scripts/advance-input.js)、[普通播放器](../src/story/player.jsx)、[节点播放器](../src/story/graph-player.jsx)、[开场背景介绍](../game/story/chapter-0/plot.js)。验证：`npm run test:story-keyboard`。

- [ ] **19 · 增加只读的对白回看记录**

  点快漏读后允许回看本段已出现的台词，保留说话人。先做只读记录，不回滚选择、成就或其他奖励。

  相关位置：[普通播放器](../src/story/player.jsx)、[节点播放器](../src/story/graph-player.jsx)。

- [ ] **20 · 明确跳过剧情的范围与去向**

  悬停或用 Tab 聚焦跳过按钮时，提示说明会略过的内容和去向。第二关战后对白可跳至“是否放走妖族监国”的选择，玩家作出决定后才可跳回地图。第五关普通好结局明确提示会一并略过对白和结局尾声。已验证场景配置与第二关分支流程，待在浏览器中核对提示显示后勾选。

  相关位置：[跳过按钮](../src/story/skip-button.jsx)、[第二关选项](../game/story/chapter-2/plot-after.js)、[第五关配置](../game/story/chapter-5/plota.js)。浏览器验证：`npm run test:story-skip`。

- [ ] **21 · 将剩余连续剧情迁移到同一页面**

  已完成六段同页迁移：序章背景介绍接宫廷对白、第三关战前与战后两段、第四关战前、第六关战前，以及第五关普通好结局战后对白接文字尾声。原换页处直接切换。待作者实机核对各处衔接效果后勾选。

  相关位置：[序章](../game/story/chapter-0/background.html)、[第三关战前](../game/story/chapter-3/plot.html)、[第三关战后](../game/story/chapter-3/plot-after.html)、[第四关战前](../game/story/chapter-4/plot1.html)、[第六关战前](../game/story/chapter-6/plot1.html)、[第五关普通好结局](../game/story/chapter-5/plota.html)。

- [ ] **22 · 统一结局的阅读节奏与出口**

  有些结局段落定时出现；首次真结局在固定时间弹成就，确认后很快隐藏正文。允许玩家主动继续，打开设置时暂停演出；结尾统一提供返回地图、主菜单、重看等明确出口，演职员视频也提供跳过或返回入口。

  相关位置：[结局演出](../game/story/scripts/ending.js)、[普通好结局](../game/story/chapter-5/plota.html)、[首次真结局](../game/story/chapter-6/true-ending-first.html)、[重复真结局](../game/story/chapter-6/true-ending.html)。

- [ ] **23 · 为未来可重复询问的选项区分用途**

  用不同的小图标或标签区分“补充了解”和“推进剧情”，问过的内容标“已询问”，避免仅靠变灰让人误以为不能再点。这是后续对话模式的准备项，不是现有分支缺陷。

  相关位置：[节点播放器](../src/story/graph-player.jsx)、[选项样式](../game/story/styles/player.css)。

## 菜单、地图、存档与教学

- [ ] **24 · 继续按钮显示存档状态与摘要**

  无存档时置灰并说明原因；有存档时显示角色名、下一关或通关进度、保存时间。避免点下去才知道能否继续，可使用现有只读存档接口获取信息。

  相关位置：[主菜单](../game/pages/menu.html)、[存档接口](../game/shared/scripts/progress.js)。

- [ ] **25 · 新游戏和导入存档前显示覆盖对象**

  当前确认新名字就会覆盖唯一进度，导入选中文件后也会立即覆盖。提前展示角色、章节和保存时间，让玩家辨认是否选错；必要时保留上一份存档供恢复。取消操作应保持原档。

  相关位置：[新游戏确认](../game/shared/scripts/player-name-entry.js)、[存档导入](../game/shared/scripts/settings.js)、[存档读写](../game/shared/scripts/progress.js)。

- [ ] **26 · 准确说明保存范围，并评估断点续玩**

  当前不保存棋盘现场和对白句序，继续后回到地图。离开战斗时明确告知本场需要重打，并说明本场未结算内容的保留范围。真正的战斗中途存档、剧情断点恢复作为投入较大的后续步骤评估；恢复时不能重复发放选择奖励。

  相关位置：[保存并返回](../game/shared/scripts/settings.js)、[战斗返回入口](../game/battle/index.html)、[现有存档范围](save-format.md)、[剧情播放器](../src/story/player.jsx)。

- [ ] **27 · 自动保存成功改为短暂小提示**

  当前每次回地图都会弹浏览器的“已自动保存”，需要额外关闭。成功使用短暂、非阻断提示，失败再明确提醒。

  相关位置：[地图保存提示](../game/map/index.html)。

- [ ] **28 · 地图标明下一关、章节名与完美通关状态**

  当前主要靠图标区分通过与否。突出下一关，显示关卡名称，重打时明确标注“重新挑战”；展示已有的完美通关记录，保持隐藏关原有解锁要求。

  相关位置：[地图](../game/map/index.html)、[进度数据](../game/shared/scripts/progress.js)。

- [ ] **29 · 成就详情支持点击查看，并显示可公开进度**

  当前主要依赖悬浮翻牌。支持点击和键盘查看；例如“全关无人阵亡”显示完成几关、还差哪关。隐藏成就继续保持隐藏。

  相关位置：[成就页](../game/pages/achievements.html)、[完美通关记录](../game/shared/scripts/progress.js)。

- [ ] **30 · 将首次教学改为游戏内短引导**

  当前第一次战斗会打开 PDF，再弹浏览器提示，还可能被拦截。改为可跳过的三步提示，解释选角色、移动、攻击或结束行动；完整手册仍放在帮助入口。

  相关位置：[首次战斗引导](../game/battle/scripts/bootstrap.js)、[帮助入口](../game/battle/index.html)。

## 可顺手整理的细节

- [ ] **31 · 为成就页增加直接返回按钮**

  避免先打开设置才能离开成就页。

  相关位置：[成就页](../game/pages/achievements.html)。

- [ ] **32 · 游戏外的成就页设置也隐藏姓名行**

  从主菜单进入成就页时，沿用主菜单隐藏姓名行的规则。目前无存档进入成就页，设置里仍会出现空姓名和改名入口。

  相关位置：[成就页设置入口](../game/pages/achievements.html)、[设置上下文](../game/shared/scripts/settings.js)。

- [ ] **33 · 隐藏主菜单设置里的返回主菜单按钮**

  主菜单自身不显示这个只会重载当前页的操作，按页面上下文展示有意义的设置动作。

  相关位置：[设置动作](../game/shared/scripts/settings.js)。

- [ ] **34 · 明确音效滑块状态或接入基础音效**

  音效滑块目前尚未接入实际音效。可以先明确其状态，或者优先补充点击、移动、受击等基础反馈，避免玩家误以为声音功能失效。

  相关位置：[声音设置](../game/shared/scripts/settings.js)、[音量偏好](../game/shared/scripts/preferences.js)。

- [ ] **35 · 核对外部字体与重复资源引用**

  移除无效字体请求与重复引用，按实际需要本地化资源，让离线和慢网络情况下的启动更稳定。

  相关位置：[战斗字体引用](../game/battle/index.html)、[结局字体引用](../game/story/chapter-5/plota.html)、[共用剧情样式](../game/story/styles/player.css)。

- [ ] **36 · 统一按钮点击区域与键盘焦点**

  让文字、图标和边框共用完整点击区域，补齐键盘焦点和激活行为，减少此前“点文字没反应”这一类问题。

  相关位置：[战斗按钮](../game/battle/index.html)、[结果页](../game/battle/results/)、[共用按钮反馈](../game/shared/styles/button-feedback.css)。
