# Editorial data

Phase 2 的货架/场景定义暂时在 `src/lib/content.ts`。

后续会迁移到这里：

- `shelves/*.yml`：专题标题、论点、策展人、复核日期。
- `scenes/*.yml`：场景说明、适用/不适用、推荐工作流。
- `translations/*.yml`：中文导读与校对状态。

约束：编辑内容与上游事实分离；上游更新不能覆盖人工导读。
