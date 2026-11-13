# 移动范围与 AI 决策

玩家移动和 AI 候选位置共用 [movement-rules.js](../game/battle/scripts/movement-rules.js)。移动规则只接收棋盘和单位，不生成高亮、不改变位置，也不读取页面或浏览器存储。

## 移动规则

`MovementRules.findReachableCells(state, unitId)` 接收 `{ map, units }` 与单位在数组中的位置，返回有序的 `{ x, y, distance }` 数组。沿用现有坐标约定：`x` 是行，`y` 是列；`distance` 是实际最短路径的步数。

- 上下左右移动，每格花费一步，最大步数由单位 `speed` 决定；绕路也计入步数。
- 地形编号 `4、11、16、17、18` 不可通行，其他现有地形维持原规则。
- 同阵营存活单位可以穿过，不能作为落脚点；敌军既不能穿过，也不能落脚。死亡单位不占位。
- 结果不包含起点；没有移动能力或已经死亡的单位返回空数组。
- 邻格按 `x+1、x-1、y+1、y-1` 的固定顺序搜索，保持原有候选顺序，避免影响 AI 平局时的随机选择。

搜索通过队首索引遍历数组，不再使用会反复删除数组首项的旧 `Queue` 类。占位表按格子预先建立，避免每搜索一个格子都扫描全部单位。通行规则只有一份；`getWalkableNeighbors()` 也供 AI 的目标距离评估使用。

## 页面与决策职责

| 模块 | 职责 |
| --- | --- |
| [movement-rules.js](../game/battle/scripts/movement-rules.js) | 计算两方共用的可达位置和步数 |
| [operation.js](../game/battle/scripts/operation.js) | 将可达位置转换成玩家高亮遮罩 |
| [block-click.js](../game/battle/scripts/block-click.js) | 点击时重新核对可达位置，执行移动并刷新操作按钮 |
| [ai-rules.js](../game/battle/scripts/ai-rules.js) | 从共用可达位置评估目标并选择动作，返回普通数据 |
| [ai.js](../game/battle/scripts/ai.js) | 执行动作、调用统一伤害入口、绘制行动标记，并等待确认 |

`AiRules.getCandidates(state, unitId)` 返回 `reachableCells`、`attackMoves` 和 `moveMoves`。`chooseAction(state, unitId, random)` 返回 `attack`、`move` 或 `wait` 动作；测试可以传入固定随机函数，复验目标和位置。

保留原有 AI 策略：仅考虑移动结果中的位置，不新增原地攻击；可攻击位置等权随机，仅移动位置优先选择离敌人路径距离最近的一组。目标评估沿可通行地形搜索，遇敌后不从该格继续扩展，再按曼哈顿距离核对攻击射程；不能简单替换成对所有敌人直接计算直线距离。等待型 AI 保持原地等待，所有电脑行动仍需玩家确认后才推进。

玩家移动不会直接结束行动，仍可继续攻击；一轮行动内不能重复移动。点击目的地也使用共用范围校验，因此过期高亮、被新单位占据的格子和越过障碍的直接调用不会执行移动。

## 验证

运行 `npm run test:movement` 执行移动规则与 AI 策略测试，以及浏览器中的地图、高亮、点击和电脑确认流程；它也包含在 `npm test` 中。规则测试覆盖速度边界、绕路、地形、阵营与占位、候选顺序、攻击射程及随机平局策略。浏览器检查遍历六张实际战斗地图，核对双方单位的共享范围、玩家高亮和 AI 候选位置一致。
