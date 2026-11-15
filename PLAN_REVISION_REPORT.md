# PLAN_REVISION_REPORT

> 审查对象：`PROJECT_RESEARCH_AND_PLAN.md`（v1.0）  
> 产出：`PROJECT_RESEARCH_AND_PLAN_v1.1.md`  
> 审查日期：2026-11-15  
> 审查范围：产品定位、OpenCode Catalog、版本一致性、安全扫描、MVP 范围、CLI 安装、Vercel 限制、版权治理、架构一致性  
> 执行边界：仅研究、核实与文档修订；未编写业务代码、未初始化项目、未安装依赖、未执行第三方 Skill、未部署。

---

## 1. 审查结论

**v1.0 的整体方向是正确的，不需要推倒重来。** 其核心判断——精选而非全量、静态优先、复用 `skills` CLI、以透明信息建立信任——在本轮复核后仍然成立。

但 v1.0 存在 **4 个 P0 级问题**，如果不修正，会直接导致实施错误：

1. **OpenCode Catalog 配置写错**：`skills` 数组应填基础目录，不是 `index.json`。
2. **版本一致性缺失**：网站复核的版本、用户安装的版本、Catalog 分发的版本没有形成可验证的对应关系。
3. **安全扫描能力与采集内容不匹配**：v1.0 声称扫描 `scripts/`，但采集流程只取 `SKILL.md`。
4. **Catalog 的缓存、更新、删除、冲突、离线行为未定义**：容易让用户以为“订阅即可靠”，实际存在缓存不刷新、移除不清理、index 失败不加载等边界。

此外有 8 个 P1 级问题（安装目录、`skills use` 文案、commit 固定、无脚本误导、MVP 过大、Vercel 只按带宽估算、版权策略过粗、数据模型缺字段），以及 6 个 P2 级问题。

**结论：v1.1 可以作为 Phase 1（工程骨架）的实施基线，但不应直接进入公开测试。** 需要先确认 12.2 的关键决策，并完成“待实施阶段验证”清单中的 OpenCode Catalog、CLI 固定安装、Pagefind 规模、Vercel 请求预算、许可证审阅。

---

## 2. v1.0 已确认的问题及严重程度

> 严重度：**P0** = 会导致实施错误/数据不一致，必须修；**P1** = 会误导用户或显著增加返工；**P2** = 影响质量/效率，可排期。

| ID | 严重度 | 问题 | 证据 | 影响 | v1.1 修复 |
|---|---|---|---|---|---|
| P0-1 | **P0** | OpenCode `skills` 配置写成 `https://.../index.json` | 官方文档：`skills` 数组填 base URL；源码 `new URL("index.json", source)` [S6][S23] | 用户配置后 404，Catalog 不可用 | 改为 **base URL**，明确固定读取 `index.json` |
| P0-2 | **P0** | 缺少“复核版本 = 安装版本 = Catalog 版本”的机制 | v1.0 只有 `commit`、`contentHash`、`reviewedCommit`，语义不完整 | 网站说“已复核”，用户装到的是另一个 commit | 六层版本 + `bundleHash` + `review.reviewed.bundleHash` + 构建断言 |
| P0-3 | **P0** | 声称扫描 `scripts/`，但采集只取 `SKILL.md` | v1.0 数据流第 4 步只读 `SKILL.md` | 扫描结论覆盖不到真正的可执行代码 | 改用 **tarball** 获取完整 skill 目录；扫描所有文本文件并记录覆盖 |
| P0-4 | **P0** | Catalog 缓存/更新/删除/冲突/离线行为未定义 | OpenCode 源码：版本变化才原子替换；移除不删缓存；index 失败返回空；同名覆盖 [S23][S24] | 用户以为“订阅=持续可靠”，实际可能旧版/缺失/冲突 | 新增 Catalog 专节，明确限制与适用边界 |
| P1-1 | **P1** | OpenCode 安装目录写成 `.opencode/skills` | `skills` CLI agents 文档：OpenCode 项目目录是 `.agents/skills/` [S26] | 用户在 `.opencode/skills` 找不到文件，以为安装失败 | 区分“原生目录”与“CLI 安装目录” |
| P1-2 | **P1** | `skills use` 被描述得像“安全试用” | 源码：写临时目录、打印提示词、`--agent` 启动真实 agent；不是沙箱 [S27] | 用户误以为无风险 | 改为“临时使用（无需安装）”，明确风险 |
| P1-3 | **P1** | 安装命令没有固定 commit | `skills add owner/repo@<40位SHA> --skill <name>` 可用 [S25] | 用户装到最新版，与复核版不一致 | 默认固定到 `review.reviewed.commit`，另给“最新但可能未复核”选项 |
| P1-4 | **P1** | “无脚本 = 不访问网络/不操作文件” | 提示词可要求 agent 使用读写/联网/命令工具 | 误导用户，低估风险 | 文案明确“无脚本≠不联网/不读写” |
| P1-5 | **P1** | MVP 500/150/8/5/3 过大 | 人工审核、中文导读、专题策展是瓶颈 | 延期、质量下降、审核走过场 | 120/40/5/3/1；6 周 |
| P1-6 | **P1** | Vercel 只按带宽估算容量 | Hobby 还有 **1M CDN 请求/月**；每页 6–10 请求 [S16][S18] | 低估请求瓶颈，100k PV 就可能超限 | 三情景：请求、传输、构建 |
| P1-7 | **P1** | 版权策略过粗（“摘要 ≤1,500 字符”） | 无许可证默认版权；公开仓库≠可再分发 [S29] | 可能侵权；Catalog 风险更高 | L0–L4 五级；未知只做 L0/L1 |
| P1-8 | **P1** | 数据模型缺 `scan.coverage`、`review.reviewed.bundleHash`、`repoId`、`aliases` | v1.0 只有 `contentHash`/`reviewedCommit` | 无法表达“扫描不完整”“复核失效”“repo 重命名” | v1.1 数据模型补齐 |
| P2-1 | P2 | 视觉风格锁定青柠强调色 | v1.0 直接定 token | 设计阶段失去探索空间 | 保留原则，给 3 个方向 |
| P2-2 | P2 | OpenCode Catalog 被当作核心差异化 | v1.0 “OpenCode 原生订阅” | 过度依赖实验能力 | 降级为可选实验，1 个 pack |
| P2-3 | P2 | 首次 500 个 skill “10 分钟完成”过于乐观 | 初始回填需拉取/解压/扫描；API 1,000/hr [S14][S15] | 排期失真 | 增量 <10 分钟；首次回填 <2 小时 |
| P2-4 | P2 | Pagefind 索引体积未建模 | 5k 页面索引可能 12–20 MB [S19] | 首屏/搜索体验风险 | 规模表 + 懒加载/分片 |
| P2-5 | P2 | 未说明 GitHub 定时工作流 60 天停用 | 公开仓库 60 天无活动自动禁用 [S20] | 数据悄悄停止更新 | 每月 keepalive/手动启用 |
| P2-6 | P2 | Catalog 文件缓存头未定义 | 文件 URL 固定，内容随 version 变化 | CDN 缓存旧内容，version 失效 | `no-cache`/`must-revalidate` |

---

## 3. 本轮核实的官方技术事实与来源

| # | 事实 | 来源 | 对方案的影响 |
|---|---|---|---|
| 1 | Agent Skills 规范：`name` 1–64、必须匹配目录；`description` 1–1024；可选 `license/compatibility/metadata/allowed-tools`；渐进披露 | [S1] | 校验规则、描述质量、客户端差异 |
| 2 | `.agents/skills/` 是跨客户端约定；OpenCode/Codex/Cursor 等会扫描 | [S2][S26] | 安装目录统一说明 |
| 3 | Claude Code 支持 `context: fork`、hooks、paths、`allowed-tools` 等扩展 | [S3][S21] | 可移植性标注 |
| 4 | Codex 文档建议 `description` ≤500 字符 | [S4] | 比规范更严，需提示作者 |
| 5 | Cursor 使用 `.cursor/skills`，也支持 `.agents/skills` | [S5][S26] | 多客户端兼容 |
| 6 | OpenCode `skills` 配置填 **base URL**；固定请求 `index.json`；字段仅 `name/version/files`；同源/安全路径；版本变化才刷新 | [S6][S23][S24] | **修正 v1.0 的 P0-1** |
| 7 | OpenCode Catalog 缓存：版本不变只补缺失文件；版本变化原子替换并删旧文件；index 失败返回空；移除不删缓存；同名覆盖 | [S23][S24] | Catalog 边界与文案 |
| 8 | `skills` CLI 1.8.1：支持 80 客户端；`add/use/update/remove`；`@tag`/`@40位SHA` 固定；OpenCode 装到 `.agents/skills/` | [S7][S25][S26][S30] | **修正 P1-1/P1-3** |
| 9 | `skills use`：写临时目录、打印提示词；`--agent` 仅 claude-code/codex/sarvam-code；不是沙箱 | [S27] | **修正 P1-2** |
| 10 | `skills check` 有更新/本地改动时退出码 1；`skills update` 会把 commit 向前移动 | [S25] | CI 与固定版本策略 |
| 11 | GitHub `tarball/{ref}` 一次获取完整归档；`ref` 可用 commit | [S28] | **修正 P0-3**：完整目录扫描 |
| 12 | GitHub API：未认证 60/hr；PAT 5,000/hr；`GITHUB_TOKEN` 1,000/hr；代码搜索 10/min；304 不计入主限额 | [S14][S15] | 采集预算 |
| 13 | 公开仓库定时工作流 60 天无活动自动禁用 | [S20] | 运维 keepalive |
| 14 | Vercel Hobby：100 GB、**1M CDN 请求**、1M 函数调用、4 CPU-hr、100 部署/天、45 分钟构建、1 并发构建；仅非商业 | [S16][S17][S18] | **修正 P1-6** |
| 15 | Hobby 可将内容用于 AI/ML 训练 | [S17] | 用户提交内容的隐私提示 |
| 16 | Pagefind 支持 CJK 分词（`pagefind_extended`），静态索引、分块加载 | [S19] | 中文搜索保留 |
| 17 | 无许可证时默认版权法适用；公开仓库只授予查看/fork，不等于再分发 | [S29] | **修正 P1-7** |
| 18 | Snyk 扫描 3,984 个 skill：13.4% CRITICAL、36.82% 任意问题、76 恶意 payload | [S12] | 扫描覆盖与免责声明 |

---

## 4. 具体修订内容与理由

### 4.1 产品定位：从“OpenCode 原生”回到“多客户端发现平台”

**修订：**

- 标题改为“Agent Skills 发现、探索与安装平台”。
- 明确支持 OpenCode、Codex、Claude Code、Cursor，不绑定单一工具。
- 差异化优先级改为：发现体验 > 精选/场景 > 中英双语 > 安装清晰 > 来源/版本/风险透明。
- 安全从“核心卖点”降为“基础保障”；详情页首屏不放大段风险报告。
- OpenCode Catalog 降为“可选实验功能”，只做 1 个 pack。

**理由：**

- 原审查意见指出“不要因为强调安全而做成审计平台”，这是正确的。v1.0 的差异化表把“风险清单”放得很重，容易让产品失去“逛”的乐趣。
- OpenCode Catalog 虽然有特色，但存在缓存、移除、同名冲突、无签名等限制；把它当核心架构会放大风险。
- 多客户端支持符合 Agent Skills 标准与 `skills` CLI 的能力，也避免被单一生态绑定。

### 4.2 OpenCode Catalog：修正配置与边界

**修订：**

- `opencode.json` 示例改为：
  ```jsonc
  { "skills": ["https://example.com/catalog/design-foundations/"] }
  ```
- 明确：OpenCode 固定请求 `<base>/index.json`；不能填 `.../index.json`。
- 明确 `index.json` 字段只有 `name/version/files`；`files` 必须包含 `SKILL.md` 或 `<name>.md`。
- 明确缓存/更新/删除/冲突/离线行为（见 v1.1 §6.5、§7.8）。
- 明确 Catalog 文件必须同源、公开、无鉴权；不能带 query/hash。
- 明确 `version` 必填且每次内容变化必须 bump；否则客户端不刷新。
- 明确从 index 移除不会删除本地缓存；安全撤回只能“停止新加载 + 公告 + 清理指引”。
- 明确同名 skill 按 source 顺序覆盖；pack 之间避免重名。
- 明确 CDN 缓存头必须 `no-cache`/`must-revalidate`，否则 version 失效。
- 明确 `catalog-src` 快照的 bundleHash 必须等于 `catalog.lock.json` 记录的 `review.reviewed.bundleHash`，构建时断言。

**理由：**

- 源码行为与 v1.0 假设差异很大；如果不写清楚，用户会以为 Catalog 是“可撤回的可靠分发”，实际不是。
- 只做 1 个 pack，可以把许可证、快照、版本、缓存、安全边界都验证一遍，再决定是否扩大。

### 4.3 版本一致性：六层版本 + 状态机

**修订：**

- 新增 `bundleHash`（文件清单 + 内容）、`skillMdHash`。
- 新增 `scan.scannedBundleHash`、`review.reviewed.bundleHash`。
- 新增 `upstream.latestCommit`、`snapshot.commit`、`catalog.publishedBundleHash`。
- 新增 `review.status`：`unreviewed/machine-scanned/human-approved/human-rejected/stale`。
- 新增 `review.reviewed` 对象：保留最近一次人工通过的 commit、bundleHash、扫描结果、许可证。
- 新增 `scan.status`：`complete/partial/failed/not-scanned`。
- 新增构建断言：当前扫描/已复核快照/Catalog 三者的 hash 关系必须成立。
- **默认安装命令固定 `review.reviewed.commit`**，而不是 `snapshot.commit`；最新未复核版本只作为显式选项。
- 上游变化时：复核变 `stale`；默认安装仍指向已复核 commit；Catalog 保持旧已复核快照，不自动跟随。

**理由：**

- v1.0 的 `reviewedCommit` 无法表达“扫描覆盖不完整”“复核后文件变了”“Catalog 发布的是旧快照”。
- 用户最关心的问题不是“有没有风险”，而是“我装的这个版本，和网站说的那个版本，是不是同一个”。
- 用 hash 而不是仅 commit，可以防止同 commit 下的构建/文件差异（虽然 Git 内容不可变，但 bundleHash 更直接、可跨源校验）。

### 4.4 安全扫描：tarball + 覆盖声明

**修订：**

- 采集从“只读 `SKILL.md`”改为“tarball 获取完整 skill 目录”。
- 安全解压：拒绝路径穿越、符号链接、硬链接、设备文件；限制归档/解压/文件数。
- 扫描范围：`SKILL.md` + `scripts/` + `references/` + 其他文本文件；二进制/压缩包/超限文件跳过并记录。
- 新增 `scan.coverage`：扫描/跳过文件数、字节数、限制说明。
- 新增 `scan.status`：`complete/partial/failed/not-scanned`。
- 规则从 12 条扩展到 15 条（新增 memory write、dependency install、external instruction fetch）。
- 明确“无脚本≠不联网/不读写”，修正产品文案。
- 明确“扫描未发现≠安全”，不做认证。

**理由：**

- v1.0 的扫描结论没有数据基础；如果不改，属于“安全 theater”。
- tarball 比逐文件 API 更省配额，也能拿到完整目录；代价是要做安全解压与大小限制。
- 覆盖声明让用户知道“我们看了什么、没看什么”，比一个虚假的安全分更有用。

### 4.5 MVP 缩减：120 / 40 / 5 / 3 / 1

**修订：**

- 发布 120 个精选 skill（100–150 区间）。
- 40 个中文导读（30–50 区间）。
- 5 个场景（4–6 区间）。
- 3 个专题。
- 1 个 OpenCode catalog 实验 pack（8–10 个 skill）。
- 工期 6 周；工作量 37–55 人日，开发/内容/审核分开估算。

**理由：**

- 原审查意见指出 500/150/8/5/3 低估了内容审核与维护成本，这是正确的。
- 120 个足以形成“货架感”，也能让 1 名维护者在 1–2 周内完成首轮复核。
- 40 个中文导读可以覆盖首页/专题/场景的核心条目，其余保留英文原文 + 标记。
- 6 周比 4–5 周更现实；AI Coding 加速工程，但不加速人工阅读、判断、翻译。

### 4.6 安装：固定 commit + 正确目录 + 真实 `use` 文案

**修订：**

- 默认命令：`npx skills add <owner>/<repo>@<review.reviewed.commit> --skill "<name>" -a <agent>`。
- 备选：`@<snapshot.commit>` 安装最新同步版本，但明确标注“可能未复核”。
- 临时使用：`npx skills use <owner>/<repo>@<40位SHA> --skill "<name>"`。
- 明确 `use --agent` 仅支持 claude-code / codex / sarvam-code（CLI 1.8.1），不支持 OpenCode/Cursor。
- 明确 `use` 写临时目录、不是沙箱、临时文件可能残留。
- 明确 CLI 安装目录：
  - OpenCode `.agents/skills/`（不是 `.opencode/skills/`）
  - Claude Code `.claude/skills/`
  - Codex `.agents/skills/`
  - Cursor `.agents/skills/`
- 明确卸载只删除 lock 跟踪的 skill；`skills update` 会移动 commit。

**理由：**

- 版本一致性必须从安装命令落地，否则数据模型再完整也没用。
- 目录错误会让用户以为安装失败；`use` 文案错误会让用户低估风险。

### 4.7 Vercel：从“带宽”改为“请求 + 带宽 + 构建”三情景

**修订：**

- 新增 CDN 请求数模型：每页 6–10 请求；100k PV 约 800k 请求；150k PV 超 1M。
- 结论：**请求数是 Hobby 的绑定约束，不是带宽**。
- 新增 100/500/2,000/5,000 skills 的构建/索引/页面数表。
- 新增缓存头策略（HTML、JSON、Pagefind、Catalog）。
- 新增构建频率：每日 1 次 + PR 预览 + 手动；1 并发构建会排队。
- 新增迁移方案：静态 `dist/` 可迁 Cloudflare Pages/GitHub Pages/自托管。

**理由：**

- v1.0 的带宽测算会让团队误以为 40 万 PV 才超限；实际 10–12 万 PV 就可能用完 CDN 请求。
- 5,000 skills 的构建/索引规模需要提前建模，避免上线后才发现 45 分钟限制。
- Catalog 的缓存头如果不写，version 机制会失效；这是 v1.0 完全遗漏的部署细节。

### 4.8 版权：L0–L4 五级

**修订：**

- L0：来源链接 + 事实元数据（总是允许）。
- L1：网站原创简介/中文导读（总是允许）。
- L2：短引用原文（≤300 字符，需许可/合理使用评估）。
- L3：完整 `SKILL.md`（需许可）。
- L4：完整镜像/Catalog 再分发（需明确再分发许可 + LICENSE/NOTICE）。
- 未知许可证：只做 L0/L1；不展示全文、不镜像。
- 冲突：按更严格者；不展示全文、不镜像。
- 禁止再分发：L0/L1；不进 Catalog。
- 下架：7 天内移除 L2–L4；作者要求全量移除则连 L0/L1 一起移除。

**理由：**

- “限制复制字数”不等于符合著作权/许可证；无许可证默认版权 [S29]。
- Catalog 是“二次分发”，风险高于网站展示；必须单独设门槛。
- 公开 GitHub 仓库只授予查看/fork，不等于普通 reuse 权 [S29]。

### 4.9 数据与架构：按 repo 存 JSON + 稳定 ID + 别名

**修订：**

- 数据从“每 skill 一个 JSON”改为“每 repo 一个 JSON（含 skills[]）”。
- 新增 `source.repoId`（GitHub 数字 ID）抗重命名。
- 新增 `aliases` / `previousFullNames`。
- 新增 `duplicateOf` / canonical 选择。
- 新增 `snapshot` / `scan` / `review` / `catalog` 四组字段。
- 新增构建时断言，防止不一致数据发布。

**理由：**

- tarball 按 repo 获取，按 repo 存更自然；PR diff 更连贯，文件数更少。
- repo 重命名/路径移动是常见事件；没有 `repoId`/aliases 会产生死链和重复条目。
- 版本状态必须进入数据模型，而不是只写在文档里。

### 4.10 视觉：保留原则，不锁死配色

**修订：**

- 保留近黑背景、1px 边框、等宽命令、克制动效。
- 提供青柠/琥珀/冷蓝三个方向，设计阶段选一个。
- 明确“首屏是发现，不是安全报告”。

**理由：**

- v1.0 直接锁定青柠色，过早；设计阶段应有多方案比较。
- 但设计原则（克制、可读、键盘优先）是合理的，保留。

---

## 5. 审查后决定保留的设计

| 设计 | 保留理由 |
|---|---|
| **Astro + React 岛屿 + Tailwind** | 内容型站点零 JS 默认、构建快、部署无关；React 岛屿足够搜索/筛选/命令面板 |
| **Pagefind 中文全文搜索** | 纯静态、CJK 分词、过滤、分块加载；无需服务端 [S19] |
| **GitHub Actions 自动收录** | 公开仓库免费、同仓、可审计；配合 tarball 降低 API 调用 |
| **提交式 JSON/YAML（Git）** | 可 diff、可 review、可回滚；无数据库；适合早期开源协作 |
| **`skills` CLI 复用** | 80 客户端、MIT、支持固定版本/lockfile；自建 CLI 不划算 [S7][S25] |
| **超市式浏览：今日五件、随机、货架、场景** | 这是产品最重要的差异化，保留并强化 |
| **3 个专题 / 5 个场景** | 足够形成“逛”的结构，又不会压垮内容运营 |
| **风险/来源/版本透明** | 基础保障；保留，但不做成审计平台 |
| **无账号、无数据库、无 AI API** | 降低成本、隐私风险与维护复杂度 |
| **5,000 条硬上限** | 构建/搜索/审核的现实边界；超过再升级架构 |
| **多客户端支持** | 符合标准与用户实际；不绑定 OpenCode |
| **静态可迁移** | Vercel Hobby 政策不确定；迁移能力是底线 |

**明确保留、不因审查意见而改变的部分：**

- 不做全量 400 万索引。
- 不做 AI 语义搜索（MVP）。
- 不做用户评分/评论。
- 不做安全认证。
- 不做自建安装器。
- 不把 OpenCode catalog 作为核心依赖。

---

## 6. MVP 范围调整对比

| 项目 | v1.0 | v1.1 | 调整理由 |
|---|---|---|---|
| 精选 Skills | 500 | **120**（100–150） | 人工复核/内容运营是瓶颈；120 足以形成货架感 |
| 中文精品导读 | 150 | **40**（30–50） | 人工写作/校对成本高；先覆盖核心条目 |
| 使用场景 | 8 | **5**（4–6） | 场景需要真实内容，不是空页面 |
| 专题合集 | 5 | **3** | 每个专题要 6–10 个 skill + 策展说明 |
| OpenCode Catalog | 3 packs | **1 个实验 pack**（8–10 skills） | 缓存/移除/冲突/无签名限制；先验证再扩大 |
| 界面语言 | 中英 | 中英 | 保留 |
| 搜索/详情/安装 | 有 | 有 | 保留核心 |
| 风险/来源展示 | 有 | 有（核心能力） | 保留，但降为详情页 tab |
| 用户系统/数据库/AI API | 不做 | 不做 | 保留 |
| 工期 | 4–5 周 | **6 周** | 开发/内容/审核分开估算 |
| 工作量 | 未拆分 | **37–55 人日** | 工程 19–27；内容 13–19；审核 5–9 |

**工作量拆分（与 v1.1 §4.5 一致）：**

- 工程：19–27 人日（骨架、管道、页面、版本/Catalog、QA）。
- 内容：13–19 人日（120 个选品、40 篇中文导读、3 专题 + 5 场景、法务文案）。
- 审核/QA：5–9 人日（扫描证据复核、4 客户端安装测试、可访问性/SEO）。
- 日历：全职 1 人 + 兼职内容/设计约 **6 周**；只有 1 人兼职约 **8–10 周**。
- **AI Coding 只加速工程，不加速人工审核/翻译。**

**被移到 P1 的功能：**

- 购物篮/一键装一组
- 版本 diff/变更提醒
- 拼音搜索
- 团队/组织收藏
- 作者认领
- RSS/邮件订阅
- OG 图片自动生成
- 安装意图分析

**不在 MVP 但保留设计：**

- 3 个专题之外的更多策展
- 更多 Catalog packs
- 版本 diff UI
- 社区评分（仍不建议）

---

## 7. 仍存在的不确定性及验证方法

> 标记为“待实施阶段验证”的项，本轮不通过实际执行确认；进入开发后按下列方法验证。

| # | 不确定性 | 为什么不确定 | 验证方法 | 阶段 | 通过标准 |
|---|---|---|---|---|---|
| 1 | OpenCode Catalog 在真实客户端中的完整行为 | 本轮读源码与文档，未安装 OpenCode 实测 | 本地静态服务器 + OpenCode；测试 version 不变/变化、文件缺失、移除、同名冲突、index 失败 | Phase 1/4 | 版本变化刷新；缺失回退旧版；移除不加载；文档记录缓存残留 |
| 2 | Catalog 文件在 Vercel/CDN 的缓存行为 | 源码只负责 HTTP 请求，CDN 可能缓存 | 部署 preview；改 version 后观察客户端是否拿到新文件 | Phase 4/6 | `no-cache`/`must-revalidate` 生效；version 必刷新 |
| 3 | Pagefind 在 5,000 页面/中英双语的索引体积与搜索延迟 | 本轮只有估算 | 生成 5,000 条合成数据；构建并测首屏/搜索 p95 | Phase 3 | 搜索 p95 <150ms；首屏不加载全量索引 |
| 4 | Astro 在 5,000 skills（~10k 页面）的构建时间 | 本轮估算 8–15 分钟 | 合成数据构建；记录冷/热缓存 | Phase 2/3 | <20 分钟；低于 45 分钟限制 |
| 5 | Vercel CDN 请求计数口径 | 官方额度明确，但实际每页请求数取决于实现 | 部署 preview；用 Analytics/日志统计每页请求 | Phase 6 | 100k PV 场景 <1M 请求；有告警 |
| 6 | `skills add @<SHA>` 在 4 个客户端的行为 | 文档/源码支持，但未逐客户端实测 | 临时目录安装 10 条命令；检查目录/内容/lock | Phase 4 | 4 个客户端目录正确；commit 一致 |
| 7 | `skills use` 的临时文件清理 | 源码未显示清理 | 实测后检查系统临时目录 | Phase 4 | 文档如实说明；必要时提示清理 |
| 8 | GitHub tarball 在大 repo/异常仓库的边界 | 未实测超大仓库/子模块/符号链接 | 抽样 50 个 repo；记录大小/失败/解压安全 | Phase 2 | 95% 成功；失败有隔离；无路径穿越 |
| 9 | 许可证解释与 L3/L4 合规 | 非法律意见 | 法律审阅；重点看全文展示、Catalog 再分发 | Phase 0/6 | 法律顾问确认或改为仅 L0/L1 |
| 10 | 中文导读质量 | 人工/半人工 | 抽检 10 条；读者反馈 | Phase 5 | 无明显机翻腔；场景准确 |
| 11 | GitHub Actions 60 天停用 | 官方规则明确 | 每月 keepalive commit 或手动 enable | 运营 | 连续 90 天同步不断 |
| 12 | OpenCode/CLI 版本升级导致行为变化 | 生态快速变化 | 每季度 smoke test；锁文档版本 | 运营 | 升级前跑回归 |

---

## 8. 对原审查意见的判断

> 原则：不未经核实全部接受；以下逐条说明“接受/部分接受/不接受”。

| 审查意见 | 判断 | 说明 |
|---|---|---|
| 重新核实 OpenCode Catalog 配置/字段/缓存/冲突 | **接受** | 核实后发现 v1.0 配置错误（base vs index.json）及多个未定义边界；已修 |
| 建立完整版本一致性机制 | **接受并扩展** | 从 3 个字段扩展到六层版本 + 状态机 + 构建断言 |
| 安全扫描必须匹配采集内容 | **接受** | 改用 tarball；明确覆盖/限制；不再声称扫描未获取的文件 |
| 缩小 MVP 到 100–150 | **接受** | 定为 120；内容/审核单独估算；工期 6 周 |
| 产品定位改为多客户端发现平台 | **接受** | 标题、价值主张、差异化顺序均调整 |
| 安全透明是基础，发现体验是核心 | **接受** | 详情页首屏改为用途/安装；风险移到 tab |
| 复核 CLI 命令/参数/客户端 | **接受** | 核实 1.8.1；修正目录、`use`、固定版本 |
| Vercel 不能只按带宽估算 | **接受** | 新增 CDN 请求数模型；100k PV 是现实上限 |
| 版权区分 L0–L4 | **接受** | 五级策略；未知只做 L0/L1 |
| 架构一致性审查 | **接受** | 按 repo JSON、tarball、稳定 ID、版本状态机 |
| “不要因为安全把网站做成审计平台” | **接受** | 安全降为基础保障；首屏发现优先 |
| “OpenCode Catalog 作为可选特色” | **接受** | 降为 1 个实验 pack，不做核心依赖 |
| “不要锁死视觉风格” | **接受** | 保留原则，给 3 个方向 |
| “1 个 Catalog pack” | **接受** | 8–10 个 skill；验证后再扩 |
| “4–6 个场景” | **接受** | 定 5 个 |
| “AI 辅助编程 ≠ 人工审核效率” | **接受** | 开发/内容/审核分开估算；6 周 |
| “限制复制字数不能自动合规” | **接受** | L0–L4；法律审阅 |
| “不要引入数据库/AI API” | **保留** | 继续静态 + Git JSON；无后端 |
| “Astro + Pagefind 是否合理” | **保留** | 复核后仍成立；未为了修改量换技术 |
| “500 个 skill 首发” | **不接受** | 内容审核成本被低估；改为 120 |
| “4–5 周完成” | **不接受** | 人工审核/翻译瓶颈；改为 6 周 |
| “安全作为第一差异化” | **部分接受** | 安全是基础保障，不是第一卖点；发现体验第一 |
| “OpenCode Catalog 作为核心架构” | **不接受** | 实验能力限制多；降为可选 |
| “全量索引/更大规模” | **不接受** | 与精选定位冲突；硬上限 5,000 |

---

## 9. 正式开发前需要确认的决策事项

> 与 v1.1 §12.2 一致；这里只列影响实施的决策。

| # | 决策 | 选项 | 推荐 | 不确认的后果 |
|---|---|---|---|---|
| 1 | **是否严格非商业？** | A 纯开源非商业；B 未来广告/赞助/付费；C 不确定 | **A** | Hobby 可能违规/被关闭；需 Pro 或换平台 |
| 2 | **默认语言** | A 中文 `/`；B 英文 `/` | **A** | 影响 SEO、首屏、内容生产 |
| 3 | **首发规模** | 100 / 120 / 150 | **120** | 影响 6 周排期与审核质量 |
| 4 | **全文/镜像策略** | A 只 L0/L1；B L3 许可时；C 加 L4 | **B + 1 个 L4 实验** | 版权风险/内容体验 |
| 5 | **Catalog 是否做** | A 1 个实验；B 不做；C 3 个 | **A** | 差异化/维护成本 |
| 6 | **社区提交是否首发开放** | A 是；B 2 周后 | **A** | 供给/审核负担 |
| 7 | **Analytics** | A Vercel；B Umami；C 不做 | **A** | 数据/隐私 |
| 8 | **项目许可证** | A MIT + CC BY 4.0；B Apache + CC BY-SA；C AGPL | **A** | 社区复用/贡献 |
| 9 | **品牌名/域名** | 待定 | 不与 skills.sh 混淆 | 商标/记忆 |
| 10 | **中文导读生产方式** | A 人工 + 机器辅助；B 全机翻；C 只 UI 翻译 | **A** | 质量/成本 |
| 11 | **同步频率** | A 每日；B 每周 | **A** | 新鲜度/CI |
| 12 | **接受“不做安全认证”的文案** | A 接受；B 要“安全评分” | **A** | 产品可信度/法律责任 |

**最关键的 6 个：1、2、3、4、5、9。** 这 6 个不确定，Phase 1 可以继续做骨架，但 Phase 2 之后会返工。

---

## 10. 是否已满足进入实施阶段的条件

### 10.1 结论

**有条件满足 Phase 1（工程骨架）的启动条件；不满足公开测试/生产发布条件。**

### 10.2 Phase 1 启动门槛（可以开始）

- [x] 产品定位与差异化顺序明确（发现优先、多客户端、安全为基础）
- [x] 技术栈与架构一致（Astro/Pagefind/GitHub Actions/Git JSON）
- [x] 数据模型包含版本/扫描/复核/Catalog 字段
- [x] OpenCode Catalog 配置与边界已核实
- [x] `skills` CLI 命令/目录/固定版本/`use` 行为已核实
- [x] MVP 范围与工期已缩减
- [x] Vercel 请求/带宽/构建三情景已建模
- [x] 版权 L0–L4 策略已定义
- [ ] **待确认：决策 1–5、8、9**
- [ ] **待实施验证：OpenCode Catalog 真实行为、CLI 固定安装、Pagefind/Astro 规模**

> 只要决策 1–5、8、9 确认，Phase 1 可以开始；上述“待实施验证”项在 Phase 2–4 完成即可，不阻塞骨架。

### 10.3 公开测试门槛（不可以现在开始）

- [ ] 120 个 skill 完成采集 + 扫描 + 人工复核
- [ ] 0 个 critical 进入 published
- [ ] 40 个中文导读完成
- [ ] 3 个专题 + 5 个场景完成
- [ ] 4 个客户端安装命令实测通过
- [ ] OpenCode Catalog 实测通过（加载/刷新/移除/缓存）
- [ ] Vercel 100k PV 请求预算验证
- [ ] 版权 L3/L4 法律审阅（至少 L4 Catalog）
- [ ] 免责声明/收录标准/下架流程上线
- [ ] Lighthouse ≥95；构建 <10 分钟
- [ ] 连续 7 天同步成功

### 10.4 不能进入实施的情形

- 决策 1 选 B/C 但仍计划用 Hobby（商业用途违规）。
- 决策 4 选“全部展示全文”但不愿做许可证审阅。
- 决策 5 选“3 个 Catalog packs”但没有人力维护版本/缓存/撤回。
- 团队坚持“500 个首发 + 4 周”，但无法投入内容/审核人力。

---

## 11. 独立自检（对照最终验收 8 条）

| # | 自检问题 | 结论 | 说明 |
|---|---|---|---|
| 1 | 所有重大技术结论是否有可靠来源？ | **通过** | OpenCode/CLI/Vercel/GitHub/Pagefind/版权均有官方文档或源码；估算项标注“待实测” |
| 2 | 数据模型、安装命令、审核版本是否一致？ | **通过** | 六层版本 + `bundleHash` + 固定 commit 命令 + 构建断言 |
| 3 | 安全扫描能力是否匹配实际采集内容？ | **通过** | tarball 获取完整目录；扫描文本并记录覆盖；二进制/压缩包明确未扫描 |
| 4 | MVP 是否能由单人配合 AI Coding 逐步完成？ | **有条件通过** | 120/40/5/3/1；37–55 人日；6 周；需要兼职内容/设计支持 |
| 5 | 是否保持低成本、静态优先、易迁移？ | **通过** | Astro 静态、无数据库/后端/AI API；`dist/` 可迁移 |
| 6 | 产品是否真正突出 Skill 发现与探索体验？ | **通过** | 差异化顺序、首页结构、今日五件/随机/场景/专题均以发现为核心 |
| 7 | 开发阶段任务是否具备明确依赖关系和验收标准？ | **通过** | Phase 1–6、关键路径、每阶段验收、Go/No-Go 清单 |
| 8 | 是否存在尚未解决但被错误标记为已解决的问题？ | **未发现** | 未决项集中在 §7 与 §9，均标记为待确认/待验证，没有伪装成已解决 |

---

## 12. 最终建议

1. **先确认决策 1–5、8、9**，尤其是商业化意图、默认语言、首发规模、全文/镜像策略、Catalog 是否做、品牌名。
2. **Phase 1 可以开始**（骨架、schema、20 个 seed、设计 tokens），但不要同时开始 120 个内容的正式审核。
3. **Phase 2 先做 20 个 repo 的 tarball 采集/扫描试点**，验证大仓库、子模块、符号链接、压缩包、许可证边界，再扩到 120。
4. **Phase 4 必须用真实 OpenCode 客户端验证 Catalog**；如果行为与源码/文档不符，降级为“只给命令”，不要把 Catalog 当核心卖点。
5. **公开测试前做一次法律审阅**，重点看 L3 全文展示与 L4 Catalog 再分发；如果无法确认，先只做 L0/L1。
6. **保持“发现优先”**：首页、卡片、专题、场景的文案与设计，优先回答“这东西对我有什么用”，而不是“它有多安全”。
7. **不要为了体现修改量引入新技术**：Astro/Pagefind/GitHub Actions/Git JSON 的组合在复核后仍然成立，继续使用。
8. **本轮到此为止**：不初始化项目、不安装依赖、不执行第三方 Skill、不部署。等决策确认后再进入 Phase 1。

---

## 附录：关键来源（本轮新增/重点）

| 来源 | URL | 用途 |
|---|---|---|
| OpenCode Skills 文档 | https://opencode.ai/docs/skills/ | base URL、index.json、version、同源 |
| OpenCode SkillDiscovery 源码 | https://github.com/anomalyco/opencode/blob/dev/packages/core/src/skill/discovery.ts | 缓存/版本/下载/路径安全 |
| OpenCode skill-discovery 测试 | https://github.com/anomalyco/opencode/blob/dev/packages/core/test/skill-discovery.test.ts | 版本刷新、原子更新、旧文件清理 |
| `skills` CLI commands | https://github.com/vercel-labs/skills/blob/main/docs/commands.md | add/use/remove/update、ref 固定 |
| `skills` CLI agents | https://github.com/vercel-labs/skills/blob/main/docs/agents.md | 客户端项目/全局目录 |
| `skills` use 源码 | https://github.com/vercel-labs/skills/blob/main/src/use.ts | 临时目录、支持的 agent、非沙箱 |
| GitHub tarball API | https://docs.github.com/en/rest/repos/contents#download-a-repository-archive-tar | 一次获取完整归档 |
| GitHub 许可证说明 | https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/licensing-a-repository | 无许可证默认版权 |
| Vercel Hobby | https://vercel.com/docs/plans/hobby | 额度 |
| Vercel Terms | https://vercel.com/legal/terms | 非商业条款/内容训练 |
| Pagefind | https://pagefind.app/docs/ | CJK/静态搜索 |
| GitHub Actions 限制 | https://docs.github.com/en/actions/reference/limits | GITHUB_TOKEN 1,000/hr |
| GitHub 定时工作流 | https://docs.github.com/actions/using-workflows/disabling-and-enabling-a-workflow | 60 天停用 |
| Snyk ToxicSkills | https://snyk.io/blog/toxicskills-malicious-ai-agent-skills-clawhub | 安全数据 |
| Agent Skills 规范 | https://agentskills.io/specification | SKILL.md 字段 |

---

## 附：本轮没有做的事（边界确认）

- 没有编写/修改业务代码。
- 没有初始化 Astro/React 项目。
- 没有安装 `skills`、OpenCode 或任何依赖。
- 没有执行第三方 Skill 或安装器。
- 没有部署、购买服务或配置生产环境。
- 没有修改与本次方案修订无关的文件（仅新增 `PROJECT_RESEARCH_AND_PLAN_v1.1.md` 与 `PLAN_REVISION_REPORT.md`）。
- 没有进入开发实施阶段。
