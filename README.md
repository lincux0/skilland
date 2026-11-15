# Skill Shelf

Agent Skills 发现、探索与安装平台。当前是 **Phase 2：真实采集与静态扫描**。

> 当前数据来自 10 个公开 GitHub 仓库，共 112 个 Skills。全部条目都是
> `draft` / `unreviewed`；`scan.status` 表示自动扫描覆盖范围，不代表安全认证。

## Stack

- Astro 7（static output）
- React 19 islands（安装命令复制）
- Tailwind CSS 4
- Zod 4（数据契约）
- `tar` + `yaml`（Phase 2 采集）
- Pagefind / OpenCode catalog / 人工复核：尚未接入

## Commands

```bash
npm install
npm run dev        # 本地开发
npm run check      # Astro + TypeScript 检查
npm run validate   # 校验 data/repos 下的 JSON
npm run test:scan  # 扫描规则回归测试
npm run sync       # tarball 采集 + 静态扫描 + 写入 data/repos
npm run build      # validate + 静态构建到 dist/
npm run preview    # 预览静态产物
```

同步单个仓库：

```bash
npm run sync -- --repo=vercel-labs/skills
```

需要更高 GitHub API 配额时，先设置 `GITHUB_TOKEN`（不要提交到仓库）。

## What is implemented

- `scripts/sync.ts`：repo metadata → tree → tarball → 安全解压 → 文件清单 → 扫描。
  - 支持 `mode: "api"`（大仓库，如 `shadcn-ui/ui`）。
  - 解压拒绝路径穿越、符号链接、硬链接、设备文件；限制归档/解压/文件数。
- `scripts/lib/scan.ts`：15 条静态规则、证据行、覆盖范围、脚本/二进制/压缩包分类。
- `scripts/lib/frontmatter.ts`：YAML frontmatter、许可证归一化、topic/scene/shelf 推断。
- `data/repos/<owner>/<repo>.json`：10 个仓库、112 个真实 Skills。
- `data/sync-report.json`：本次同步的 repo/commit/mode/skills/错误汇总。
- `/`：首页货架（今日五件、场景、专题、官方、小而易读）。
- `/explore`：全部条目 + 客户端字符串过滤（不是 Pagefind）。
- `/skill/[...id]`：详情、配料表、扫描状态、版本表、安装命令、来源信息。
- 浅色/深色 CSS variables；移动端无横向溢出。

## Scan semantics

- `scan.status: "complete"`：所有可读文本文件都在预算内扫描。
- `scan.status: "partial"`：有文件因二进制/压缩包/体积/抓取失败未扫描；详情页会列出限制。
- `scan.flags`：静态规则命中，带文件、行号、片段；不是安全结论。
- 脚本只读取文本，**从未执行**。
- 二进制、压缩包、符号链接、子模块不会解析；不会声称“扫描完整”。

## What is intentionally missing

- 人工复核流程、reviewed bundle、复核徽章。
- Pagefind 全文搜索、中文分词、分面过滤。
- 中英双语路由（当前 UI 中文，部分条目保留中文导读）。
- OpenCode HTTP catalog、提交入口、收录标准/安全页。
- 任何账号、数据库、AI API、运行时后端。

## Data policy

- 只使用公开仓库的元数据、frontmatter 描述与文件内容做扫描；没有把 skill 文件镜像到站点。
- `licenseSpdx: null` 表示 GitHub 未检测到许可证，不代表可以再分发。
- 所有条目保持 `draft`，因为没有人工复核；不要据此做发布决定。
- 接入全文展示或 Catalog 前，先读 `PROJECT_RESEARCH_AND_PLAN_v1.1.md` 的 L0–L4 版权策略。

## Next

Phase 3：Pagefind 中文全文搜索、分面过滤、详情页检索体验。
