# 架构问题清单

每项可独立跟踪。复选框在对应验收条件通过后勾选。优先保证现有玩法、存档和页面跳转能够复验。

目录与命名规则见 [项目目录说明](project-structure.md)。公共音频、存档、源码、构建产物和开发材料已分开存放；伤害、经验、移动、AI 决策与胜负规则已从页面中拆出，以下未勾选的架构问题继续保留。

## 高优先级

- [x] **01 · 页面依赖缺少回归检查**
  - 已修复两个入口失效的 Bootstrap 引用、剧情页对未引入的 jQuery 的调用、地图第六关状态变量错误，以及静态检查发现的图标和音乐路径。[第一章初始化](../game/story/chapter-1/plot.html) · [地图初始化](../game/map/index.html)
  - 已验收：静态检查覆盖 HTML 页面的本地引用。浏览器直接打开根入口，经注册、登录和新游戏进入地图，校验自动存档后进入第一场战斗，通过跳过按钮到达胜利页，沿途无未捕获的脚本异常。[运行方法](../README.md#开发时检查页面依赖) · [静态检查](../scripts/check-pages.cjs) · [浏览器检查](../scripts/smoke-game.cjs)
  - 当前静态检查还覆盖 CSS 资源和可静态识别的 JavaScript 路径，并有 [检查器自测](../scripts/check-pages.test.cjs)。目录迁移后的页面与资源由 [导航回归](../scripts/smoke-navigation.cjs) 检查，统一执行 `npm test`。

- [x] **02 · 剧情文本与播放顺序由不同文件维护**
  - 第 0–6 章的 24 个对话场景现由同一个 React 播放器读取。每句数据同时记录说话人、文本和中央字幕，选项、读完后的目标和跳过目标由场景配置指定。第一章进入战斗的按钮在读完台词后出现。[播放器源码](../src/story/player.jsx) · [第一章场景](../game/story/chapter-1/plot.js) · [序章分支](../game/story/chapter-0/plot.js)
  - 已验收：在浏览器中逐句播放全部 24 个场景，验证序章与第二章的分支、选项写入的标记、第四章两条线索分支和黑屏转战斗、第五章交错字幕及第六章背景切换。剧情检查还会临时增删第一章台词，确认说话人和战斗入口正确。首句出现后的第一次点击会推进到第二句。[剧情检查](../scripts/smoke-story.cjs) · [编辑与构建方法](../README.md#编辑章节对话)

- [x] **03 · 跨页面进度缺少统一的存档格式和读写入口**
  - 新游戏、自动保存、手动保存和两种恢复入口已统一到 [progress.js](../game/shared/scripts/progress.js)，默认值、校验和版本 1 存档结构由同一份进度定义维护。页面不再枚举存档字段，[saves.js](../game/shared/scripts/saves.js) 仅负责存读档页交互。原版档案通过兼容转换恢复，账号累计成就不随读档回退。字段与兼容规则见 [存档格式](save-format.md)。
  - 已验收：使用归档原版实际保存函数生成的 [旧档样本](../scripts/fixtures/legacy-progress.json)，验证继续游戏和手动读档恢复相同的角色等级、关卡解锁、隐藏线索、音乐开关与完美完成记录；空档、损坏数据和未知版本不会覆盖现有进度。另覆盖账号与槽位隔离、存储写入失败，以及保存失败时不再误报成功。[存储单元测试](../scripts/progress.test.cjs) · [浏览器存档回归](../scripts/smoke-progress.cjs)，统一运行 `npm run test:progress` 或 `npm test`。

- [x] **04 · 战斗规则依赖页面全局变量，结算副作用混在单位方法里**
  - 伤害、首次死亡、精魂击杀数、经验与等级由 [battle-rules.js](../game/battle/scripts/battle-rules.js) 根据传入状态计算，不修改输入，也不访问页面或存储。[battle-state.js](../game/battle/scripts/battle-state.js) 应用结果、显示死亡公告与成就并负责持久化，`Unit.get_hurt()` 仅转发调用。回合末跳过死者，并在某项伤害致死后停止剩余效果；重击自损和地形伤害统一通过绕甲选项结算。接口见 [伤害与死亡结算](battle-rules.md)。
  - 已验收：纯规则测试覆盖生命、护甲、经验、等级、计数与成就事件；浏览器中验证初始及召唤单位、同轮与后续回合持续伤害、死亡公告与成就存储。同一精魂死亡后重复受伤不增加计数，前七具死亡不判胜，第八具死亡才达到第五关目标。原有经验分配与升级阈值保持不变。[规则测试](../scripts/battle-rules.test.cjs) · [浏览器战斗回归](../scripts/smoke-battle.cjs)，统一运行 `npm run test:battle` 或 `npm test`。胜负结算见第六项，回合推进的后续工作见第七项。

## 中优先级

- [x] **05 · 玩家与 AI 各自实现移动范围搜索**
  - 玩家高亮、点击校验与 AI 候选位置已统一使用 [movement-rules.js](../game/battle/scripts/movement-rules.js)。[ai-rules.js](../game/battle/scripts/ai-rules.js) 独立评估候选和选择动作，[ai.js](../game/battle/scripts/ai.js) 仅执行动作与显示标记；删除了重复搜索、旧队列、无引用的距离类与注释掉的旧实现。保留现有地形、占位、射程及随机选择顺序，详见 [移动范围与 AI 决策](movement-rules.md)。
  - 已验收：11 项移动规则测试和 9 项 AI 策略测试覆盖速度边界、绕路距离、不可通行地形、友军可穿过但不可停留、敌军阻挡、死亡单位及平局顺序。浏览器遍历六张实际地图、55 个双方活单位，确认高亮与 AI 可达位置及顺序一致，并验证移动后攻击、不可重复移动、过期点击和电脑确认流程。另用旧实现对比 1,000 组棋盘和 3,000 次固定随机动作，正常行为一致。[移动测试](../scripts/movement-rules.test.cjs) · [AI 测试](../scripts/ai-rules.test.cjs) · [浏览器回归](../scripts/smoke-movement.cjs)，统一运行 `npm run test:movement` 或 `npm test`。

- [x] **06 · 行动结束与整轮结束重复处理胜负和成就**
  - 两个入口共用 [battle-outcome-rules.js](../game/battle/scripts/battle-outcome-rules.js) 的纯规则和 [battle-settlement.js](../game/battle/scripts/battle-settlement.js) 的终局流程。保留原有胜负条件与成就顺序，`ach8` 统一显示编号 7 的“杀人如麻 以杀证道”；[成就弹窗](../game/battle/scripts/achievements-popup.js) 排队显示，每次确认只消费一次，最后一击触发的成就也不会被通关覆盖。终局停止推进，轮末效果后再次检查，详见 [胜负与通关结算](battle-settlement.md)。
  - 已验收：17 项 [纯规则测试](../scripts/battle-outcome-rules.test.cjs) 覆盖六关条件、失败优先、完美通关、成就顺序与输入不变性。[浏览器回归](../scripts/smoke-settlement.cjs) 验证两个入口的提示一致、重复确认与存储、轮末致死、最后一击成就和真实胜利跳转，统一运行 `npm run test:settlement` 或 `npm test`。

- [ ] **07 · 回合推进阻塞浏览器，单位刷新销毁现有节点**
  - 现象：AI 直接写入终点坐标并结算伤害，之后刷新单位层；刷新函数会清空并重建该层，再逐元素写入位置。回合推进还用循环同步等待约 300 毫秒，期间浏览器无法处理输入和绘制。[AI 行动](../game/battle/scripts/ai.js) · [单位刷新](../game/battle/scripts/units-update.js) · [等待实现](../game/battle/scripts/control.js) · [回合调用处](../game/battle/scripts/control.js)
  - 验收：回合等待期间界面仍可响应；同一存活单位从行动前到行动后保留其显示节点。一次敌方行动只结算一次，玩家确认后才交给下一单位。
