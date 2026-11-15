# 开发工具

本目录存放仅供开发和测试使用的页面，不属于正式游戏导航。

| 工具 | 实际操作 |
| --- | --- |
| [storage/reset-current.html](storage/reset-current.html) | 删除浏览器存储中的 `current`，重置当前游戏进度 |
| [storage/reset-test.html](storage/reset-test.html) | 删除 `current` 和测试账号对应的 `TESTachievement` |

这两个旧工具页面打开即执行删除操作，没有确认按钮。只在专门的测试浏览器环境中按需使用，不要通过正式游戏页面链接它们。它们不会替代正常的“开始新游戏”流程，也不负责清理所有账号与存档。

自动回归脚本位于根目录的 `scripts/`，通过 `npm test` 运行；浏览器回归使用独立临时档案。目录归属规则见 [项目目录说明](../docs/project-structure.md)。
