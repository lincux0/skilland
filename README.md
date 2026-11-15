# Skill Shelf

Agent Skills 发现、探索与安装平台。当前是 **Phase 4：版本一致性、人工复核记录与实验性 OpenCode catalog**。

**线上演示**：<https://skill-shelf-psi.vercel.app>（Vercel Hobby，非商业演示）

**仓库**：<https://github.com/lincux0/skilland>

部署方式：推送到 `main` 后由 Vercel 自动构建并发布到生产域名。
`.github/workflows/sync.yml` 每天 03:17 UTC 增量同步数据并提交到 `main`，从而触发一次新的部署；也可在 Actions 页手动触发。

> 数据来自 10 个公开 GitHub 仓库，共 112 个 Skills。全部条目都是
> `draft` / `unreviewed`；`scan.status` 表示自动扫描覆盖范围，不代表安全认证。

## Stack

- Astro 7（static output）
- React 19 islands（搜索、命令面板、安装命令）
- Tailwind CSS 4
- Zod 4（数据契约）
- Pagefind 1.6（Extended / zh-cn 全文索引）
- `tar` + `yaml`（Phase 2 采集）

## Commands

```bash
npm install
npm run dev        # 本地开发；Pagefind 索引不存在，会回退元数据过滤
npm run check      # Astro + TypeScript 检查
npm run validate   # 校验 data/repos 下的 JSON
npm run test:scan  # 扫描规则回归测试
npm run sync       # tarball 采集 + 静态扫描 + 写入 data/repos
npm run review     # 查看/写入人工复核记录（data/reviews.json）
npm run validate:invariants  # 版本一致性不变量（构建时强制执行）
npm run catalog:vendor       # 从 GitHub 拉取 pack 文件并生成 catalog.lock.json
npm run catalog:build        # 校验指纹并输出 public/catalog/
npm run index      # 单独运行 Pagefind（需要先 astro build）
npm run build      # test:scan + validate + astro build + Pagefind
npm run preview    # 预览带搜索索引的静态产物
vercel --prod      # 手动发布到 Vercel 生产环境
```

**测试全文搜索请用 `npm run build` + `npm run preview`**；`npm run dev` 没有构建后的 Pagefind 索引。

## What is implemented

- `scripts/sync.ts`：repo metadata → tree → tarball → 安全解压 → 文件清单 → 扫描。
  - 支持 `mode: "api"`（大仓库，如 `shadcn-ui/ui`）。
  - 解压拒绝路径穿越、符号链接、硬链接、设备文件；限制归档/解压/文件数。
- `scripts/lib/scan.ts`：15 条静态规则、证据行、覆盖范围、脚本/二进制/压缩包分类。
- `data/repos/<owner>/<repo>.json`：10 个仓库、112 个真实 Skills。
- `data/sync-report.json`：同步 repo/commit/mode/skills/错误汇总。
- `/`：首页货架（今日五件、场景、专题、官方、小而易读）。
- `/explore`：Pagefind 全文搜索 + 客户端/扫描/风险/许可证/场景/专题分面。
  - 搜索词、筛选状态写入 URL；
  - 结果摘要带命中高亮；
  - 移动端筛选抽屉。
- `⌘K` / `Ctrl+K`：全局命令面板，搜索详情页并直接跳转。
- `/skill/[...id]`：详情、配料表、扫描状态、版本一致性面板、复核记录、安装命令、来源信息；
  - 从搜索结果进入时显示“搜索：…”与返回链接，并高亮正文首处命中。
- `/catalog`：实验性 OpenCode HTTP catalog，展示 pack、版本、复核信息与限制说明。
- 浅色/深色 CSS variables；移动端无横向溢出。

## Review records

人工复核记录存放在 `data/reviews.json`，与 `data/repos/` 分离，`npm run sync` 不会覆盖。

```bash
npm run review -- --list
npm run review -- --skill obra/superpowers/test-driven-development \
  --reviewer "your-name" --notes "读了描述、文件清单与扫描证据"
npm run review -- --skill <publicId> --reviewer "your-name" --reject --notes "原因"
npm run review -- --skill <publicId> --remove
```

- 记录包含 `commit`、`bundleHash`、复核人、时间、范围（description / file-tree / scan-evidence / license / install-command）、当时的扫描快照与许可证状态。
- `review.status` 由记录与当前快照实时派生：无记录 → `machine-scanned`；指纹相同 → `human-approved`；指纹不同 → `stale`。
- 复核过期后默认安装仍指向**已复核**的 commit，不自动跟随未复核更新。
- CLI 拒绝在扫描失败、未扫描、许可证 `unknown`/`conflict` 时写入“通过”。
- 状态是“人看过”，不是安全认证；页面上不会出现“已认证/安全”这类承诺。

## Version consistency

详情页的版本面板展示六个版本：上游最新、本站同步、自动扫描、人工复核、默认安装、Catalog。
`scripts/validate-invariants.ts` 在构建时强制检查计划文档 §6.4 的不变量（复核指纹自洽、
完整扫描对应当前同步、已发布必须已复核、critical 必须隔离、stale 必须安装复核版本等），
任何一条不满足就阻止构建。

## OpenCode catalog（实验性）

`/catalog` 是唯一入口，不属于常规安装路径。

- `catalog-src/<pack>/pack.json`：pack 成员（`publicId` 列表）。
- `npm run catalog:vendor`：按 `snapshot.commit` 从 GitHub 拉取每个 skill 目录与 LICENSE，
  重算 bundle 指纹，必须等于 `snapshot.bundleHash` 与 `review.reviewed.bundleHash`，否则中止。
- `catalog-src/<pack>/catalog.lock.json`：来源 commit、指纹、许可证、复核人/时间/范围。
- `npm run catalog:build`：再次校验 `catalog-src` 指纹与当前复核记录，输出
  `public/catalog/<pack>/index.json` + 文件副本；不是“已复核版本”就拒绝发布。
- `vercel.json` 为 `/catalog/(.*)` 设置 `Cache-Control: public, max-age=0, must-revalidate`，
  避免 CDN 缓存导致 version 变化后仍拿到旧文件。

当前 pack：`code-quality`，8 个 skill，全部 MIT、完整扫描、无 high/critical、纯文本。
`index.json` 只给 OpenCode 读（`name` / `version` / `files`）；来源与复核信息在
`catalog.lock.json`。移除 skill 不会清理客户端本地缓存，`/catalog` 页面上有说明。

## Scan semantics

- `scan.status: "complete"`：所有可读文本文件都在预算内扫描。
- `scan.status: "partial"`：有文件因二进制/压缩包/体积/抓取失败未扫描；详情页会列出限制。
- `scan.flags`：静态规则命中，带文件、行号、片段；不是安全结论。
- 脚本只读取文本，**从未执行**。
- 二进制、压缩包、符号链接、子模块不会解析；不会声称“扫描完整”。

## What is intentionally missing

- 112 条中只有 8 条经过人工复核，且复核范围是许可证与扫描证据，不是逐行审计。
- 中英双语路由（当前 UI 中文，部分条目保留中文导读）。
- 提交入口、收录标准/安全页、下架流程页。
- 定时增量同步（当前手动 `npm run sync`）。
- 任何账号、数据库、AI API、运行时后端。

## Search design

- Pagefind 只索引带 `data-pagefind-body` 的详情页（112 页，zh-cn）。
- 首页、Explore、404 不进入索引。
- 场景卡、相关推荐、版本表、安装侧栏被 `data-pagefind-ignore` 排除，避免通用文案污染摘要。
- 标题、描述、标签、文件清单、扫描证据参与索引。
- filter 由详情页的 `data-pagefind-filter` 生成；`type:skill` 用于限定只搜详情页。

## Data policy

- 只使用公开仓库的元数据、frontmatter 描述与文件内容做扫描；没有把 skill 文件镜像到站点。
- `licenseSpdx: null` 表示 GitHub 未检测到许可证，不代表可以再分发。
- 所有条目保持 `draft`，因为没有人工复核；不要据此做发布决定。
- 接入全文展示或 Catalog 前，先读 `PROJECT_RESEARCH_AND_PLAN_v1.1.md` 的 L0–L4 版权策略。

## Next

Phase 4：版本一致性、人工复核记录、1 个实验性 OpenCode catalog。
