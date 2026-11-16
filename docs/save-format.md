# 进度与存档

[progress.js](../game/shared/scripts/progress.js) 是新游戏、自动保存、继续游戏和 JSON 导入导出的公共入口。游戏只使用一个 `localStorage['game.save']` 存档，不使用账号、槽位或旧格式转换。

## 当前格式

```json
{
  "format": "the-origin-of-god",
  "version": 1,
  "savedAt": "2026-11-15T04:05:06.000Z",
  "playerName": "test",
  "progress": {
    "current": {
      "level": 0,
      "hidden_clue_god": false,
      "hidden_clue_poison": false,
      "yuanlan_level": { "level": 1, "exp": 0 },
      "user_level": { "level": 1, "exp": 0 },
      "yedai_level": { "level": 1, "exp": 0 },
      "perfect_level_complete": [false, false, false, false, false, false]
    },
    "levels": [0, 0, 0, 0, 0, 0],
    "chapterName": "序章",
    "isFirstPlay": true
  },
  "achievements": { "ach1": 0, "ach2": 0, "ach3": 0, "ach4": 0, "ach6": 0, "ach7": 0, "ach8": 0 },
  "endingFlag": 0,
  "settings": {
    "music": { "volume": 50, "muted": false },
    "sound": { "volume": 50, "muted": false }
  }
}
```

`format` 和 `version` 必须为上述固定值。`playerName` 是玩家确认的显示名字，示例中的 `test` 也可以是其他合法名字。`savedAt` 为 `Date.toISOString()` 生成的 UTC 时间；不支持其他版本或缺少字段的存档。

| 字段 | 含义与合法值 |
| --- | --- |
| `playerName` | 非空显示名字，仅允许汉字、ASCII 英文字母/数字/空格、下划线和连字符，存档内不得有首尾空格；加权长度最多 14 |
| `progress.current.level` | 当前战斗编号，整数 0–5 |
| `progress.current.user_level`、`yuanlan_level`、`yedai_level` | 角色等级 `level`（整数 1–6）与经验 `exp`（非负安全整数） |
| `progress.current.hidden_clue_god`、`hidden_clue_poison` | 两条隐藏线索，布尔值 |
| `progress.current.perfect_level_complete` | 六关的完美完成记录，六个布尔值 |
| `progress.levels` | 六关地图状态，0 为未完成，1 为已完成；第六项另允许 114，表示隐藏关已解锁 |
| `progress.chapterName` | 非空章节名称 |
| `progress.isFirstPlay` | 是否需要首次战斗教程，布尔值 |
| `achievements` 中的 `ach1`、`ach2`、`ach3`、`ach4`、`ach6`、`ach7`、`ach8` | 成就状态，只接受数字 0 或 1 |
| `endingFlag` | 第二章选择放掉妖族监国的分支标记，数字 0 或 1 |
| `settings.music`、`settings.sound` | 各自包含整数音量 `volume`（1–100）和布尔静音开关 `muted` |

`endingFlag` 对应第二章的成就提示条件，现有剧情只写入字符串 `1` 并判断是否等于 1；未设定时视为 0。开始新游戏会重置这个分支标记，已取得的成就保留。

## 运行状态与独立设置

剧情和战斗继续使用 `current`、`level1`–`level6`、`MSYgamename`、`IsFirstPlay` 更新运行进度。显示名字独立存在 `playerName`，`username` 固定为内部 ID `test`，成就运行键为 `testachievement`，分支标记运行键为 `testflag`。更换显示名字不会建立新账号或清空累计成就。公共模块统一转换这些键，保存时读取最新值。`current` 中不再保存音乐开关。

[profile.js](../game/shared/scripts/profile.js) 集中定义姓名规则。`GameProfile.countName(raw)` 按 Unicode 码点计数：统一表意文字（`Unified_Ideograph`）和 `〇` 计 2，其余码点计 1。`validateName(raw)` 返回 `{valid, name, count, message}`：先检查原串只包含允许字符，再去掉首尾 ASCII 空格，要求结果非空，且原串加权长度不超过 14。因此控制符、换行、零宽字符、双向格式符、HTML 符号和引号均不会因去空白而被放行。不按关键词过滤，名字始终作为数据处理。

浏览器中的 `GameProfile.getName()` 验证 `playerName` 后返回安全名字；缺失、非法或无法读取时返回空字符串，不预设显示名字，也不把未验证的存储内容交给界面。保存时的 `capture()` 更严格：名字必须存在、合法且无首尾空格，否则拒绝覆盖好档。导入也要求名字已经是规范形式，不会自动修剪文件中的名字。Node 可直接使用 `profile.js` 导出的纯函数 `countName`、`validateName`。

战斗规则在运行时使用布尔成就标记，剧情使用数字标记；读取运行状态时统一转换为数字 0/1。导入文件仍严格要求数字 0/1，不接受布尔成就字段。

音量和静音开关独立保存在 `game.settings`，形状与存档的 `settings` 相同，缺省音乐和音效均为音量 50、不静音。普通继续游戏只恢复进度、成就和分支标记，不把存档中较旧的音量写回 `game.settings`；因此在菜单刚调整的音量不会被继续游戏覆盖。导入文件是完整恢复，会把文件中的设置也写入 `game.settings`。导入成功后，由界面刷新音频和设置控件。

地图载入、页面离开以及设置中的返回与导出操作会保存当前进度。存档恢复后回到地图；存档不包含正在进行的战斗棋盘、单位行动现场或对话句序。

## API

浏览器通过 `GameProgress` 调用以下同步方法；Node 测试使用导出的 `createStore(storage, now)` 注入存储和时钟。

| 方法 | 返回值与作用 |
| --- | --- |
| `createNewProgress()` | 返回独立的默认 `progress` 对象，不读写存储 |
| `newGame(name)` | 必须显式传入合法名字；首尾 ASCII 空格修剪后，与重置的进度和分支标记一起原子写入，保留成就与全局设置，立即保存 `game.save`；返回完整快照 |
| `capture()` | 返回包含当前名字、进度、成就、标记和全局设置的完整快照，不写入存储 |
| `hasSave()` | 完整校验 `game.save`，存在可读存档时返回 `true`，空档或坏档返回 `false`；存储访问失败仍抛异常 |
| `readAuto()` | 只读取并校验 `game.save`，返回存档快照；不恢复运行状态、不改写存储，供主菜单按已保存的通关进度选择背景 |
| `saveAuto()` | 保存当前完整快照到唯一的 `game.save`，返回快照 |
| `restoreAuto()` | 校验并恢复 `game.save` 的名字、进度、成就和标记，返回文件中的快照；不写 `game.settings` 或改写原存档 |
| `exportSave()` | 先保存当前完整快照，再返回含缩进的 JSON 字符串，界面可将其下载为文件 |
| `importSave(text)` | 完整校验 JSON 字符串，再恢复全部运行状态、设置及唯一存档，返回恢复的快照 |

第一次开始游戏前，`capture()`、`saveAuto()` 和 `exportSave()` 抛出 `NO_PROGRESS`，不会生成空白存档；界面可据此提示先开始游戏，或在无进度时直接离开。新游戏完成写入后即有可继续的存档，不需要先到达地图。

主菜单点击开始只打开姓名输入窗口，确认或按 Enter 才调用 `newGame(name)`。关闭、取消或校验失败不会修改当前名字、运行进度和存档；写入失败时名字也参与回滚。

## 错误与原子恢复

异常的 `name` 为 `ProgressError`，并包含适合界面显示的 `message` 和以下 `code`：

- `NO_PROGRESS`：没有运行进度。
- `INVALID_NAME`：新游戏未提供名字，或输入不满足姓名规则。
- `EMPTY_SAVE`：尚无本地存档。
- `INVALID_PROGRESS`：运行名字、进度、成就、标记或设置损坏，拒绝覆盖好档。
- `INVALID_SAVE`：导入内容或本地档案不完整、字段类型或范围非法、格式标识不匹配。
- `UNSUPPORTED_VERSION`：版本不匹配。
- `STORAGE_ERROR`：浏览器拒绝读取或写入存储。

导入先完成全部校验，再准备所有写入项及其旧值。新游戏、导入和恢复过程中如果某项写入失败，会尽力回滚之前写入的所有键，包括原本不存在的键；某次回滚失败不会阻止其他键继续回滚。浏览器不提供跨键事务，因此持续拒绝存储写入时无法承诺完整回滚。校验失败完全不写入数据。

## 验证

运行 `npm run test:progress`，执行单元测试与独立浏览器回归；也包含在 `npm test` 中。姓名规则可单独运行 `node --test scripts/profile.test.cjs`。测试覆盖姓名计数边界、非法字符与恶意姓名、确认前不改档、换名保留成就、续档姓名、立即保存、全字段导入导出往返、继续保留新音量、新游戏分支重置、无进度、损坏/错误版本、写入失败和尽力回滚。[样本](../scripts/fixtures/progress.json) 包含非初始角色等级、两条线索、隐藏关解锁、成就与不同音量设置。
