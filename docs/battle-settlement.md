# 胜负与通关结算

[battle-outcome-rules.js](../game/battle/scripts/battle-outcome-rules.js) 判断战斗结果与通关成就，[battle-settlement.js](../game/battle/scripts/battle-settlement.js) 应用完美通关记录、保存成就、等待确认并进入结果页。[control.js](../game/battle/scripts/control.js) 的 `end_turn()` 和 `end_round()` 共用这一个流程。

## 纯规则接口

`BattleOutcomeRules.evaluate(state)` 接收 `{ level, round, units, spiritCount, achievements, perfectLevels }`，返回 `{ outcome, perfectLevels, achievementKeys }`。`outcome` 为 `ongoing`、`win` 或 `lose`；`perfectLevels` 是新数组，`achievementKeys` 仅列出本次应解锁的成就。规则不修改输入，不访问 DOM、存储或页面全局变量，也可以由 Node 直接加载。

保留原有关卡条件，先判失败，再判胜利。下表使用内部关卡编号：

| 关卡 | 失败条件 | 胜利条件 |
| --- | --- | --- |
| 0 | 玩家角色全部阵亡 | 敌人全部阵亡，或存活的友方单位到达 `(3,19)`、`(4,19)`、`(5,19)` |
| 1、2 | 玩家角色全部阵亡 | 敌人全部阵亡 |
| 3 | 玩家角色全部阵亡，或友方梓决缺席、阵亡 | 敌人全部阵亡 |
| 4 | 玩家角色全部阵亡 | 消灭至少八个精魂 |
| 5（额外关） | 友方阵法死士缺席、阵亡 | 回合数至少为 20 |

胜利时，全部玩家角色存活便记为当前关完美通关，之前取得的完美记录不会因本次有人阵亡而丢失。通关成就依次为 `ach8`（第一关清除全部敌人）、`ach1`（六关均已有完美记录）、`ach4`（只剩一名玩家角色存活）；已解锁的成就不会再次发放。当前关的完美记录先更新，再判断 `ach1`。

## 页面流程与确认

`settle_battle()` 在战斗仍进行时返回 `false`，终局已接管时返回 `true`。两种回合入口都在推进前调用它，轮末效果结束后也再次检查。终局会停止后续单位行动、回合推进和重复结算，移除战场操作入口；`end_turn()` 收到 `end_round()` 的停止结果后也直接返回。

[achievements-popup.js](../game/battle/scripts/achievements-popup.js) 集中维护成就键与展示编号，`ach8` 对应编号 7 的“杀人如麻 以杀证道”。弹窗排队显示，确认先关闭当前提示，再展示下一条；旧按钮或回调再次触发不会消费下一条。伤害和升级产生的成就也加入同一队列，因此最后一击获得的“唯我独尊”等提示不会被通关成就覆盖。

终局流程只保存新解锁的成就一次，并等所有提示确认后执行一次胜利或失败跳转。`check_game()` 保留原来的数值查询接口：进行中为 0，胜利为 1，失败为 2；查询本身不会保存或显示提示。

本次调整的是终局结算。原有回合效果顺序保持不变，同步等待和单位节点刷新仍属于 [TODO 第七项](TODO.md)。

## 验证

运行 `npm run test:settlement`，或随 `npm test` 一并运行：

- [17 项规则测试](../scripts/battle-outcome-rules.test.cjs) 覆盖六关胜负边界、失败优先、完美记录、成就顺序、已有解锁与输入不变性。
- [浏览器回归](../scripts/smoke-settlement.cjs) 对比两个入口的成就编号、标题与内容，使用真实鼠标逐个确认，并检查重复回调、重复保存、轮末流血及陷阱致死、最后一击成就排队和胜利页跳转。
