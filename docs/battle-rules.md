# 伤害与死亡结算

伤害和经验规则放在 [battle-rules.js](../game/battle/scripts/battle-rules.js)，页面接入放在 [battle-state.js](../game/battle/scripts/battle-state.js)。规则模块可以由 Node 直接加载，不依赖 DOM、`localStorage` 或战斗页面的全局变量。

## 状态与结果

规则接收显式状态 `{ units, spiritCount, achievements }`。`units` 使用当前单位属性：生命、护甲、存活状态、阵营、操作者、经验与等级等；目标和来源使用单位在数组中的位置。

- `BattleRules.resolveDamage(state, { targetId, amount, sourceId, ignoreArmor })` 返回 `{ state, events, died }`。不提供来源时视为环境伤害；`ignoreArmor: true` 表示绕过护甲。
- `BattleRules.gainExperience(state, unitId, amount)` 返回 `{ state, events }`，统一处理经验增加、等级变化和满级成就。
- 输入状态不被修改；结果中的 `unit-died` 与 `achievement-unlocked` 事件只描述发生的事情，不执行提示或存储。

普通伤害先消耗护甲，再扣除生命；生命最低为零。绕甲伤害直接扣生命，保留护甲。只有存活单位变为死亡时才返回 `died: true`，并结算一次精魂击杀数、经验及死亡事件；对已死单位再次调用没有效果。新召唤的精魂是新的单位，可以分别计数。

保留原有经验规则：敌方单位被敌对玩家角色击杀，来源获得全额经验，其他存活玩家角色获得向下取整的四分之一。死亡角色留下的陷阱仍可为其获得击杀经验；环境伤害、电脑角色击杀及友伤没有这项奖励。经验严格超过阈值时升一级，每次结算最多升一级，六级封顶；本次没有调整这些数值规则。

## 页面接入

`Unit.get_hurt()` 只转发到页面适配层。适配层提供战局状态，把结果属性写回原有单位实例，保留单位方法，然后显示友方死亡公告、成就弹窗并保存成就。满级成就仍会保存角色进度。适配层通过对象在数组中的位置定位单位，因此初始单位及未带 `uuid` 的后续召唤单位都能结算。

`control.js` 中的 `apply_end_round_effects()` 保持流血、中毒、强化、地形、冷却的原处理顺序，跳过已死单位；本轮某项伤害致死后，不再执行该单位后续效果。重击自损和地形 12 的伤害都通过绕甲选项进入相同结算入口。

移动搜索已提取为玩家与 AI 共用的规则，见 [移动范围与 AI 决策](movement-rules.md)。回合推进和胜负结算仍由现有控制脚本负责，对应 [TODO 第六、七项](TODO.md)。新增伤害入口应调用统一结算，不先直接减生命再用零伤害补做死亡判断。

## 验证

`npm run test:battle` 运行纯规则测试和浏览器战斗回归，也包含在 `npm test` 中。规则测试覆盖护甲、绕甲、重复死亡、八个不同精魂、经验与等级、成就事件及输入不变性；浏览器检查覆盖真实单位实例、回合末持续伤害、击杀目标、公告、弹窗和持久化。
