# Skill Shelf

Agent Skills 发现、探索与安装平台。当前是 **Phase 1：基础骨架**。

> 这是方案验证用的骨架，不是可上线产品。20 条数据明确标记为
> `draft` / `unreviewed` / `not-scanned`，没有真实扫描、人工复核或安全结论。

## Stack

- Astro 7（static output）
- React 19 islands（安装命令复制）
- Tailwind CSS 4
- Zod 4（数据契约）
- GitHub Actions / Pagefind / OpenCode catalog 尚未接入

## Commands

```bash
npm install
npm run dev        # 本地开发
npm run check      # Astro + TypeScript 检查
npm run validate   # 校验 data/repos 下的 JSON
npm run build      # 静态构建到 dist/
npm run preview    # 预览静态产物
```

## What is implemented

- `src/lib/schema.ts`：`RepoFile` / `SkillSeed` 数据契约。
- `data/repos/<owner>/<repo>.json`：10 个仓库、20 条真实来源样例。
- `/`：首页货架（今日五件、场景、专题、官方、小而易读）。
- `/explore`：全部条目 + 客户端字符串过滤（不是 Pagefind）。
- `/skill/[...id]`：详情、配料表、版本表、安装命令、来源信息。
- 浅色/深色 CSS variables；移动端无横向溢出。
- `scripts/generate-sample-data.mjs`：样例数据生成器（元数据已人工核对）。
- `scripts/validate-data.ts`：schema + 唯一 ID 校验。

## What is intentionally missing

- tarball 采集、真实安全扫描、人工复核流程。
- Pagefind 全文搜索、中文分词、分面过滤。
- 中英双语路由（当前 UI 中文，数据含中文导读）。
- OpenCode HTTP catalog、提交入口、收录标准/安全页。
- 任何账号、数据库、AI API、运行时后端。

## Sample data policy

- 样例只使用公开仓库的**元数据 + 我们自己写的短描述**。
- 没有复制 `SKILL.md` 正文，没有镜像任何 skill 文件。
- `licenseSpdx: null` 表示 GitHub 未检测到许可证，不代表可以再分发。
- `scan.status: "not-scanned"` 与 `review.status: "unreviewed"` 是事实，不是占位符。
- 接入真实数据前，先读 `PROJECT_RESEARCH_AND_PLAN_v1.1.md` 的版本一致性与版权章节。

## Next

Phase 2：tarball 采集、静态扫描覆盖、真实 commit/hash、120 条候选数据。
