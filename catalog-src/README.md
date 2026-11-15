# Catalog source

Phase 2 仍不生成 OpenCode catalog；先完成人工复核与许可证确认。

Phase 4 只会在这里放入**允许再分发**且**已人工复核**的 skill 快照，并附带：

- `LICENSE`
- `NOTICE`
- `catalog.lock.json`（来源、commit、bundleHash、license、review）

构建时会重新计算快照的 bundleHash，必须等于 `review.reviewed.bundleHash`，否则阻止发布。
不要在许可证未确认时把第三方文件放进这个目录。
