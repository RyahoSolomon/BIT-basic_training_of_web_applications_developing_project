# 进度与存档

[progress.js](../game/shared/scripts/progress.js) 是新游戏、自动保存、手动保存和恢复进度的公共入口。默认值与字段校验集中在同一份 `definition` 中；页面不再自行拼装或恢复存档字段。[saves.js](../game/shared/scripts/saves.js) 只负责存档页显示、操作提示和成功读档后的跳转。

## 版本 1

自动档和每个手动档都使用 `{ version: 1, savedAt, progress }`。`savedAt` 是新保存时的 ISO 时间字符串；兼容旧档时也允许原显示时间或 `null`（原版自动档没有有效时间）。

| 进度字段 | 含义与合法值 |
| --- | --- |
| `progress.current.level` | 当前战斗编号，0–5 |
| `progress.current.user_level`、`yuanlan_level`、`yedai_level` | 各角色的 `level`（1–6）与 `exp`（非负整数） |
| `progress.current.is_plot_music_on`、`is_inwar_music_on` | 剧情与战斗音乐开关，布尔值 |
| `progress.current.hidden_clue_god`、`hidden_clue_poison` | 两条隐藏线索，布尔值 |
| `progress.current.perfect_level_complete` | 六关的完美完成记录，六个布尔值 |
| `progress.levels` | 六关地图状态，0 表示未完成，1 表示已完成；第六项另允许 114，表示隐藏关已解锁 |
| `progress.chapterName` | 当前章节名称，非空字符串 |
| `progress.isFirstPlay` | 是否还需显示首次战斗教程，布尔值 |

运行中的剧情和战斗仍通过 `current`、`level1`–`level6`、`MSYgamename`、`IsFirstPlay` 更新进度。公共模块的 `activeFields` 统一负责这些键与存档之间的转换，保存时读取最新状态。新增字段时修改公共定义与对应转换，并补充往返测试，无需分别修改各页面的保存和恢复代码。

账号存档键保持为 `<用户名>autosave` 和 `<用户名>savearea`；手动档仍是数组中的九个可见槽位。模块在每次操作时读取当前用户名。账号累计成就与第二章成就提示标记 `<用户名>flag` 不属于单次游戏进度，新游戏和读档不会回退它们。已经没有使用者的 `ismuted`、`keyvalue` 不进入新版存档。

## 页面入口

- 主菜单开始游戏调用 `GameProgress.newGame()`，使用公共默认值重置运行进度；到达地图后生成自动档。
- 地图加载时调用 `GameProgress.saveAuto()`；手动保存调用 `saveSlot(index)`。
- 主菜单继续游戏调用 `restoreAuto()`；读档页调用 `restoreSlot(index)`。两者恢复成功后都进入地图。
- 存读档页调用 `listSlots()` 显示可读、空白或损坏的档位；不会为显示列表而写入存储。
- 战斗页缺少运行数据时使用 `createNewProgress()` 的默认值，避免另维护一套角色初始数据。

保存与恢复失败时抛出带 `code` 的异常，由页面显示提示。恢复先完整校验，再写入运行进度；写入中途失败时尝试恢复已写字段。空档、缺字段、错误类型、非法关卡状态和未知版本均拒绝恢复，不跳转、不覆盖现有进度。无效的运行数据也不能覆盖已有好档。整个手动档列表无法解析时拒绝保存，避免丢掉其他槽位；列表中某个坏槽仍可通过手动保存覆盖。

## 原版兼容

未带 `version` 的原版档案包含 `level1`–`level6`、`MSYgamename` 和字符串形式的 `current`。读取时在内存中转换为版本 1，角色、地图状态、音乐开关、线索与完美完成记录均按原值恢复。原版 `saveurl` 可能指向迁移前的路径，恢复不使用它，统一进入当前地图。

原版没有保存教程状态；恢复旧档时明确设为 `isFirstPlay: false`，避免再次弹出教程。原版自动档的 `currentDateTime: 114514` 视为未知时间，不影响进度有效性。注册及空槽的全零占位视为空档。

读取本身不会改写旧档。成功继续游戏后，地图会自动写入新版自动档；旧手动档保留原内容，直到玩家再次保存该槽位。新注册账号不再创建假占位档，缺少存档即表示尚未保存。

## 验证

运行 `npm run test:progress`，执行存储单元测试和独立浏览器中的真实点击回归；它也包含在 `npm test` 中。检查覆盖新游戏、两种保存和恢复、账号与槽位隔离、损坏/空档/未来版本保护及存储写入失败。

[旧档样本](../scripts/fixtures/legacy-progress.json) 由归档提交 `c1d9d4231b70bc0ae4893278157dbeed0b623be5` 的真实 `construct()`、`save()` 和 `Save()` 函数生成，包含非初始角色等级、两条隐藏线索和已解锁的最终关。普通测试只读取样本；本地保有该归档提交时，可执行 `node scripts/generate-legacy-progress-fixture.cjs` 重新生成。
