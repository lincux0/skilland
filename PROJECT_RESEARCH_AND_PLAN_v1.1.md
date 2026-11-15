# Agent Skills 开源发现平台 — 调研与方案设计（v1.1）

> 文档版本：v1.1  
> 修订日期：2026-11-15  
> 状态：**方案修订完成，等待关键决策；不进入开发**  
> 适用阶段：正式开发前的实施基线（开发工具为 OpenCode）  
> 基线：v1.0（`PROJECT_RESEARCH_AND_PLAN.md`）  
> 标注约定：**[F] 已验证事实**（附来源）；**[I] 合理推断**；**[R] 建议/决策**  
> 阅读说明：正文中的 `[S1]`–`[S30]` 对应附录 A；未标注的陈述默认为已验证事实，推断与建议会显式标注。  
> 调研限制：未安装/执行第三方 Skill 或安装器；未做真实用户访谈与生产压测；平台额度与政策以 2026-11-15 官方页面为准。

---

## 0. 摘要

### 0.1 一句话结论

这个项目值得做，但正确的位置不是“更大的 Skills 索引”，而是：

> **面向 AI Coding 开发者的、可逛、可信、可安装的 Agent Skills 发现平台；以精选与场景化推荐为核心，以透明来源/版本/风险信息为基础保障，支持 OpenCode、Codex、Claude Code、Cursor 等主流客户端。**

### 0.2 八个关键判断

| # | 判断 | 依据 |
|---|---|---|
| 1 | Agent Skills 已是事实标准，但客户端实现不统一 | `SKILL.md` 规范由 agentskills.io 维护；Claude Code、Codex、Cursor、OpenCode 的目录、严格度、扩展字段不同 [S1–S6] |
| 2 | 规模不是壁垒，筛选与解释才是 | GitHub `filename:SKILL.md` 约 **768 万**条结果；skills.sh 约 **140 万**条；SkillsMP 约 **400 万**条 [S8][S9][S13] |
| 3 | 安全是基础保障，不是产品核心 | Snyk 扫描 3,984 个 skill：**36.82%** 有至少一个安全问题，**13.4%** 有 CRITICAL 级问题 [S12] |
| 4 | 现有平台强在“量/榜单”，弱在“发现体验 + 中文解释 + 可检查版本” | skills.sh 有榜单/主题/官方/审计；SkillsMP 有职业分类；但均缺少“逛”的体验与中文编辑层 [S8][S9] |
| 5 | 安装层应复用 `skills` CLI | CLI 支持 80 个客户端（含 OpenCode），MIT；支持 `add/use/update/remove`、tag/SHA 固定、lockfile [S7][S25][S26] |
| 6 | OpenCode Catalog 是可选特色，不是架构基础 | 官方支持 HTTP catalog，但只读 `index.json`、无鉴权、无签名、移除不自动清缓存；适合小包实验 [S6][S23][S24] |
| 7 | 静态架构足够，且必须可迁移 | Astro 静态页 + Pagefind + Git JSON；无数据库、无后端、无 AI API [S19] |
| 8 | Vercel Hobby 的绑定约束是 CDN 请求数，不只是带宽 | Hobby 100 GB + **100 万 CDN 请求/月**；按每页 8 个请求，约 10–12 万 PV 就接近上限 [S16][S18] |

### 0.3 推荐方案（一句话版）

**Astro 静态站 + Pagefind 搜索 + GitHub Actions 采集 + Git JSON 数据 + `npx skills` 安装 + 1 个实验性 OpenCode catalog**；首发 **120 个精选 Skills**、**40 个中文导读**、**5 个场景**、**3 个专题**；**6 周**完成公开测试版。

### 0.4 与 v1.0 的主要差异

| 主题 | v1.0 | v1.1 |
|---|---|---|
| 产品定位 | 强调“OpenCode 原生订阅”作为差异化 | 多客户端发现平台；OpenCode catalog 降级为**可选实验功能** |
| 差异化顺序 | 信任/安全较靠前 | **发现体验第一**；安全透明是基础保障 |
| 首发规模 | 500 skills / 150 导读 / 8 场景 / 5 专题 / 3 packs | **120 / 40 / 5 / 3 / 1** |
| 工期 | 4–5 周 | **6 周**（开发、内容、审核分别估算） |
| OpenCode 配置 | `skills` 填 `.../index.json` | 填**基础目录**；固定读取 `index.json` |
| 安装目录 | OpenCode 写成 `.opencode/skills` | `skills` CLI 实际装到 **`.agents/skills/`**（OpenCode 会扫描） |
| 版本一致性 | 只有 `commit`/`contentHash`/`reviewedCommit` | 六层版本 + 状态机 + `review.reviewed.bundleHash` |
| 安全扫描 | 声称扫描 scripts，但采集只取 `SKILL.md` | 用 **tarball** 获取完整 skill 目录；明确扫描覆盖与限制 |
| 安装固定 | 未给出 commit 固定命令 | `owner/repo@<40位SHA> --skill <name>` |
| 临时使用 | 近似“安全试用” | 明确为“**无需安装**”，不是沙箱 |
| Vercel | 主要按带宽估算 | **CDN 请求数 + 带宽 + 构建**三情景 |
| 版权 | 摘要 ≤1,500 字符 | **L0–L4 五级展示/分发策略** |
| 视觉 | 锁定青柠强调色 | 保留设计原则，**不锁死配色**，设计阶段再定 |

### 0.5 保留的 v1.0 内容

- 竞品调研与规模数据（skills.sh、SkillsMP、LobeHub、ClawHub、Snyk）。
- 超市式浏览机制（今日五件、随机、货架、场景、专题）。
- 静态优先、无数据库/后端/AI API、复用 `skills` CLI 的原则。
- “不做全量索引、不做账号/评分、不做安全认证、不做自建 CLI”的边界。
- Astro/React/Tailwind/Pagefind/GitHub Actions/Git JSON 技术组合。

---

## 1. 项目定位、目标用户与核心价值

### 1.1 问题定义

Agent Skills 的供给已经过剩，开发者真正缺的是：

1. **知道该装哪个**：搜索结果里大量重复、fork、低质、过时、甚至恶意 skill。
2. **知道装了什么**：skill 会读写文件、执行脚本、访问网络、读取凭据，但多数目录只给一句描述。
3. **知道是否适合自己**：中文开发者需要中文解释与场景；英文开发者需要不牺牲原文的信息。
4. **装得动、退得掉、对得上版本**：安装命令、目标客户端、固定版本、更新与卸载路径要清楚。
5. **逛得下去**：现有目录更像“搜索结果页”，缺少发现感和编辑判断。

### 1.2 目标用户

| 用户 | 典型场景 | 最在意 | 当前痛点 |
|---|---|---|---|
| **AI Coding 重度用户** | 给 agent 加工作流：代码审查、测试、部署、设计稿转代码 | 装完是否真的提升产出 | 目录太多，描述太虚，装完才知道不合适 |
| **中文开发者 / 独立开发者** | 英文文档读得懂但费时；希望有中文解释与案例 | 中文说明、国内工具链、安装排错 | 现有平台中文覆盖浅，分类偏英文技术栈 |
| **技术团队 lead / 平台工程师** | 为团队挑选可共享的 skills，控制风险 | 许可证、脚本、维护状态、可审计 | 缺少“安装前检查清单”和版本对应 |
| **Skill 作者** | 让自己的 skill 被正确的人发现 | 曝光、来源标注、版本更新 | 大平台按安装量排序，新作者难被看见 |
| **好奇的探索者** | 没有明确目标，想看看别人把 agent 玩成什么样 | 有趣、新鲜、场景感 | 目录是列表，不是“货架” |

### 1.3 核心价值主张

**对用户：**

> 在 3 分钟内找到一个**适合你的客户端、你能看懂、你知道装的是哪个版本**的 Skill；并且清楚它会改什么、可能做什么、来自哪里。

**对作者：**

> 一次提交，获得可被搜索、可被引用、可被订阅的长期入口，而不是被榜单淹没。

**对生态：**

> 用“可检查的透明度”替代“虚假的安全认证”；用“精选”替代“全量抓取”。

### 1.4 差异化优先级（按产品重要性）

1. **超市式探索与有趣的发现体验**：货架、今日精选、随机、场景入口。
2. **高质量精选与场景化推荐**：编辑判断 + “为什么是它”。
3. **中英双语介绍及实际用途解释**：不是界面翻译，是使用场景与边界。
4. **清晰的安装流程与客户端适配信息**：命令、目录、固定版本、卸载。
5. **透明、可核查的来源、版本和风险信息**：基础保障，不是审计平台。

> **产品判断 [R]：** 如果访客第一眼看到的是“安全扫描报告”，这个产品就变成了审计工具；如果第一眼看到的是“今天有什么好玩的/好用的”，才是发现平台。

### 1.5 不做什么

| 不做 | 原因 |
|---|---|
| 不做“最大 Skill 索引” | skills.sh / SkillsMP 已在数量上领先；数量不是壁垒 [S8][S9] |
| 不做安装量排行榜 | 没有第一方遥测；复制第三方数字不准确也不道德 |
| 不做“安全认证” | 无法为第三方代码背书；只做“风险可见、版本可锁、来源可查” |
| 不做 AI 语义搜索/推荐（MVP） | 成本、延迟、可解释性不划算；关键词 + 同义词 + 编辑精选足够 |
| 不做用户账号/评论/评分（MVP） | 增加审核、隐私、滥用成本；先用 localStorage |
| 不做自建 CLI | `skills` CLI 已覆盖 80 个客户端 [S7][S26] |
| 不做在线运行 Skill | 安全边界不可控；MVP 只做发现、检查、安装 |
| 不绑定单一客户端 | 支持 OpenCode、Codex、Claude Code、Cursor；OpenCode catalog 只是可选分发 |

### 1.6 成功指标（公开测试版）

| 指标 | 目标 | 说明 |
|---|---|---|
| 月访问 | 1,000–3,000 | 冷启动，靠内容与社区 |
| 搜索 → 详情点击率 | ≥ 30% | 搜索是否有效 |
| 详情 → 复制安装命令率 | ≥ 15% | 安装意图，不冒充安装量 |
| 社区提交 | ≥ 10 个/月 | 供给是否活 |
| 发布 skill 数 | 120（首发）→ 500（3 个月） | 质量优先 |
| 严重安全事故 | 0 | 发现即下架并公开说明 |
| Lighthouse（移动端） | Perf/A11y/SEO ≥ 95 | 静态站应达到 |

---

## 2. Agent Skills 生态及竞品调研

### 2.1 开放标准：`SKILL.md` 规定了什么

**事实 [S1]：**

- 一个 Skill 是一个目录，至少包含 `SKILL.md`；可选 `scripts/`、`references/`、`assets/`。
- `SKILL.md` = YAML frontmatter + Markdown 正文。
- 必填字段：
  - `name`：1–64 字符，仅小写字母、数字、连字符；不能以连字符开头/结尾；不能连续两个连字符；**必须与父目录名一致**。
  - `description`：1–1024 字符，非空；应说明“做什么”和“什么时候用”。
- 可选字段：
  - `license`：许可证名称或指向 LICENSE 文件。
  - `compatibility`：≤500 字符，环境要求。
  - `metadata`：string → string 的任意键值对。
  - `allowed-tools`：空格分隔的预授权工具列表，**实验性**。
- 正文没有格式限制；推荐步骤、示例、边界情况。
- **渐进披露**：启动时只加载 name + description（约 100 tokens）；激活时加载全文（建议 <5,000 tokens / <500 行）；资源按需加载。
- 校验工具：`skills-ref validate ./my-skill`。

**关键含义 [I]：**

1. 规范只定义“目录里有什么”，**不规定装到哪里**；目录差异是生态碎片化的根源。
2. `name` 必须匹配目录名，是跨客户端兼容性的关键约束。
3. `description` 是唯一的“检索/触发元数据”，它的质量决定 skill 是否会被 agent 选中。

### 2.2 客户端支持矩阵：原生目录 vs CLI 安装目录

> **重要修正：** 客户端“原生扫描目录”与 `skills` CLI “实际安装目录”不是一回事。v1.0 把 OpenCode 写成 `.opencode/skills`，但 CLI 实际把 OpenCode skill 装到 `.agents/skills/`（OpenCode 会扫描该兼容目录）。详情页必须分别说明，避免用户找不到文件。

| 客户端 | 原生项目目录 | 原生用户目录 | `skills` CLI 项目目录 | `skills` CLI 全局目录 | 规范严格度/扩展 |
|---|---|---|---|---|---|
| **OpenCode** | `.opencode/skills/` | `~/.config/opencode/skills/` | **`.agents/skills/`** | **`~/.config/opencode/skills/`** | 运行时宽松；支持 HTTP catalog、权限、`autoinvoke` [S6][S26] |
| **Claude Code** | `.claude/skills/` | `~/.claude/skills/` | `.claude/skills/` | `~/.claude/skills/` | frontmatter 大多可选；支持 `context: fork`、hooks、paths [S3][S26] |
| **Codex** | 未明确（文档以用户级为主） | `~/.codex/skills/**/SKILL.md`（递归） | `.agents/skills/` | `~/.agents/skills/` | 文档建议 description ≤500 字符 [S4][S26] |
| **Cursor** | `.cursor/skills/` | `~/.cursor/skills/`、`~/.agents/skills/` | `.agents/skills/` | `~/.cursor/skills/` | 遵循标准；有 `/create-skill` [S5][S26] |
| **GitHub Copilot** | —（未核实） | —（未核实） | `.agents/skills/` | `~/.copilot/skills/` | 仅列 CLI 目录 [S26] |
| **Gemini CLI** | —（未核实） | —（未核实） | `.agents/skills/` | `~/.gemini/skills/` | 仅列 CLI 目录 [S26] |
| **Windsurf** | —（未核实） | —（未核实） | `.windsurf/skills/` | `~/.codeium/windsurf/skills/` | 仅列 CLI 目录 [S26] |

> 表中“原生目录”仅对 OpenCode、Claude Code、Cursor 以及 Codex 的用户级目录有官方文档依据；GitHub Copilot、Gemini CLI、Windsurf 的原生目录未逐一核实，表中只列 `skills` CLI 的目标目录。

**兼容性差异的实际影响 [I]：**

- **目录名与 `name` 不一致**：规范不允许；OpenCode 以路径为 ID、`name` 只作显示名。一个“能跑”的 skill 可能在不同客户端里 ID 不同。
- **`description` 长度**：规范 1,024；Codex 文档建议 ≤500。超长描述在 Codex 侧可能被截断或影响触发。
- **`allowed-tools`**：实验性字段；不能当作安全边界。
- **客户端扩展字段**（`context: fork`、`paths`、`hooks`）：只在特定客户端生效；跨客户端时应放在 `metadata` 或单独维护。

> **产品机会：** 详情页标注“**该 Skill 使用了哪些客户端扩展字段**”，并给出“可移植性”判断。这是现有目录普遍缺失的信息。

### 2.3 安装机制：`skills` CLI 的真实能力与边界

**事实 [S7][S25][S26]（CLI 1.8.1）：**

- 要求 Node.js ≥ 22.20；MIT；支持 80 个客户端。
- 命令：`add`、`find`、`list`、`use`、`check`、`update`、`remove`、`init`，以及实验性的 `experimental_install` / `experimental_sync`。
- 安装范围：默认当前项目；`-g/--global` 安装到用户目录。
- 安装方式：交互式默认 **symlink**（推荐，单一副本）；可选 `--copy`。
- 指定 skill：`-s/--skill <name>`（可多次；`'*'` 全部）；`-a/--agent <name>`。
- 非交互：`-y/--yes`；`--all`。
- 版本固定：
  - `npx skills add owner/repo@v1.2.3 --skill my-skill`（tag）
  - `npx skills add owner/repo@<40位commit SHA> --skill my-skill`（推荐，commit 不可变）
  - **注意**：`owner/repo@skill` 在 `add` 中可能被解析为 skill 过滤；**固定版本时用 `--skill` 明确选择**。
- 临时使用：
  - `npx skills use owner/repo@skill`：解析源、把选中的 skill 文件写入**系统临时目录**、把完整 `SKILL.md` 作为提示词打印到 stdout；**不安装到项目**。
  - `--agent <agent>`：启动一个支持的 agent 交互式执行；源码显示仅支持 **claude-code、codex、sarvam-code**（截至 1.8.1；**不包括 OpenCode/Cursor**）。
  - **不是沙箱**：agent 以用户正常权限运行；临时文件可能残留；skill 指令仍可能让 agent 读写文件、联网、执行命令。
- 更新/检查：
  - `skills check` 检查可用更新与本地改动，**有更新或本地改动时退出码 1**，可用于 CI。
  - `skills update <name>` 会把 lock 中的 commit 向前移动；**严格固定版本时不要随意 update**。
- 卸载：
  - `skills remove <name>`；只删除 lock 跟踪的 skill；手写/未跟踪的目录会被跳过。
- Lockfile：
  - `skills-lock.json` v2 记录 `computedHash`、`commit`、`sourceType`。
  - `skills experimental_install --frozen-lockfile` 可按 lock 恢复；CI 默认冻结。
- 直接下载：支持 URL 或 zip/tar/tgz，默认 10 MiB 下载、25 MiB 解压、1000 文件；**不建议**把第三方 skill 镜像成我们的下载源，除非许可证与安全审核都明确允许。

**这意味着 [I]：**

1. 网站**不需要**自建安装器；只需生成正确命令。
2. 网站应默认给出**固定 commit** 的命令，并同时提供“跟随最新”的选项；否则用户安装的版本可能与我们复核的版本不一致。
3. `skills use` 只能叫“**临时使用（无需安装）**”，不能叫“安全试用/沙箱”。
4. OpenCode 的 CLI 安装目录是 `.agents/skills/`；详情页必须写清楚，并提供原生目录说明。

### 2.4 生态规模：数字背后的含义

**事实 [S13]（2026-11-15 GitHub REST API 实测）：**

| 查询 | 结果 |
|---|---|
| GitHub 代码搜索 `filename:SKILL.md` | **7,684,096** 条文件结果 |
| `topic:agent-skills` 仓库 | **43,463** |
| `topic:claude-skills` 仓库 | **16,038** |
| `topic:codex-skills` 仓库 | **2,505** |

**事实 [S8][S9]：**

- skills.sh 首页 “All Time” 计数：**1,405,285**；榜单按 CLI 匿名遥测安装量排序。
- SkillsMP 自称约 **400 万** SKILL.md、63 分类、800+ 职业、9 语言、提供 API。

**解读 [I]：**

- 768 万文件结果包含大量 fork、vendored copy、示例、模板、重复文件；“文件数”不等于“可用 skill 数”。
- skills.sh 的 140 万与 SkillsMP 的 400 万口径不同，不能直接比较。
- 对公开测试版，**120 个经过人工复核的 skill** 比 400 万个未审核条目更有价值。

### 2.5 竞品逐家分析

#### 2.5.1 skills.sh（Vercel Labs）

| 维度 | 观察 |
|---|---|
| 定位 | “The Open Agent Skills Ecosystem”，以安装量榜单为核心 |
| 收录 | 约 140 万条（All Time）[S8] |
| 发现 | Leaderboard、Trending、Hot、Topics、Agents、Official、Packs、Security Audits |
| 搜索 | 单词 fuzzy、多词 semantic；API 需 Vercel OIDC [S8] |
| 安装 | `npx skills add owner/repo`；CLI 支持 80 客户端 [S7] |
| 安全 | 与 Gen Agent Trust Hub、Socket、Snyk、Runlayer、ZeroLeaks 合作；首次安装后自动审计 [S8] |
| 开源 | CLI MIT；站点与索引数据未见开源声明 [S7][S8] |
| 中文 | 公开页面以英文为主；未见系统性中文导读/场景 |
| 不足（相对我们） | ① 榜单偏向已流行；② 审计徽章缺少文件级“配料表”；③ 无 OpenCode catalog；④ API 锁定 Vercel；⑤ 中文体验浅 |

> **注意：** skills.sh 已经做了 Packs、Topics、Official、Audits。**“做合集”“做审计”本身不构成差异化。**

#### 2.5.2 SkillsMP

| 维度 | 观察 |
|---|---|
| 定位 | “Agent Skills 生态地图”，按职业/领域探索 |
| 收录 | 约 400 万 SKILL.md，365,959 creators（页面自述）[S9] |
| 分类 | 63 分类、800+ 职业、9 语言 |
| 搜索 | 关键词 + 创作者 + 分类/职业/语言过滤；提供 API [S9] |
| 安装 | 主要跳转 GitHub 源；也有 MCP/第三方集成 |
| 安全 | 未见系统性安全审计；免责声明“安装前自行审阅代码” |
| 开源 | 未声明开源 |
| 中文 | 支持 9 种语言，包含中文界面；但内容以机器聚合为主 |
| 不足（相对我们） | ① 全量地图信噪比低；② 无人工精选/场景叙事；③ 无安装前风险清单；④ 无 OpenCode 订阅；⑤ 无社区治理/收录标准 |

#### 2.5.3 LobeHub Skills Market

| 维度 | 观察 |
|---|---|
| 定位 | LobeHub 生态内的 Skills 市场 |
| 安装 | 自有 `@lobehub/market-cli`，需注册；支持 open-claw / claude-code / codex / cursor；默认 `.agents/skills` [S10] |
| 发现 | 分类、排序、`zh-CN` locale、`isValidated` 字段 |
| 安全 | 有 `isValidated` 标记，但未说明审计方法 |
| 开源 | 市场本身未声明开源 |
| 不足（相对我们） | ① 绑定 LobeHub 账号；② 发现体验偏插件市场；③ 中文有界面缺内容；④ 无 OpenCode catalog |

#### 2.5.4 ClawHub（OpenClaw）

| 维度 | 观察 |
|---|---|
| 定位 | OpenClaw 的公开 skill registry，支持发布、版本、搜索 |
| 安全 | 有安全审计与恶意 skill 阻断；`openclaw security audit --deep` 本地扫描 [S11] |
| 规模 | Snyk 扫描了 3,984 个来自 ClawHub 与 skills.sh 的 skill [S12] |
| 开源 | `openclaw/clawhub` 公开仓库 |
| 不足（相对我们） | ① 绑定 OpenClaw；② 偏个人助理场景；③ 安全事件多；④ 中文编辑内容弱 |

#### 2.5.5 其他

| 产品 | 定位 | 启示 |
|---|---|---|
| **Agensi** | curated marketplace，强调安全扫描、创作者分成 | “安全 + 创作者经济”可行，但早期不适合 |
| **Tessl** | Registry，部分安全审计（Snyk） | 企业化/商业化更重 |
| **mcpservers.org / skills 目录** | SEO 型聚合 | 目录门槛低，差异化在体验与信任 |
| **awesome-agent-skills** | GitHub 精选列表 | 证明人工精选有需求；缺搜索/版本/风险/安装 |
| **Anthropic `anthropics/skills`** | 官方示例仓库 | 官方来源是强信任信号，应作为首批 seed |

### 2.6 竞品功能矩阵

> 图例：● 有且较好；◐ 有但一般/有限；○ 未见；? 未核实。

| 能力 | skills.sh | SkillsMP | LobeHub | ClawHub | 本项目目标 |
|---|---|---|---|---|---|
| 收录规模 | ● 140 万 | ● 400 万 | ◐ 数千 | ◐ 数千–数万（未官方核实） | ◐ 120→5,000（精选） |
| 关键词搜索 | ● | ● | ● | ● | ● |
| 中文搜索/中文内容 | ○/◐ | ◐ | ◐ | ○ | **●** |
| 技术主题分类 | ● | ● | ● | ◐ | ● |
| 场景/任务驱动 | ○ | ◐（职业） | ○ | ○ | **●** |
| 编辑精选/专题 | ●（Packs） | ○ | ◐ | ○ | **●（带策展说明）** |
| 随机探索/逛 | ○ | ○ | ○ | ○ | **●** |
| 安装命令 | ● | ◐（跳转） | ●（自有 CLI） | ● | ●（复用 skills CLI） |
| 安装前风险清单 | ◐（审计徽章） | ○ | ◐（isValidated） | ◐（审计） | **●（文件级配料表）** |
| 版本锁定/哈希 | ◐（CLI lockfile） | ○ | ◐ | ◐ | **●（commit + bundleHash）** |
| OpenCode catalog 订阅 | ○ | ○ | ○ | ○ | **◐（1 个实验包）** |
| 开源 | ◐（仅 CLI） | ○ | ○ | ● | **●（代码 + 数据流程）** |
| 开放 API | ◐（OIDC 限制） | ●（API key） | ◐（CLI） | ? | **●（静态 JSON，无鉴权）** |
| 中英双语编辑 | ○ | ◐（界面） | ◐（locale） | ○ | **●** |

### 2.7 差异化机会

| 机会 | 为什么真实 | 为什么现有产品难复制 | 我们的成本 |
|---|---|---|---|
| **超市式发现体验** | 现有目录像搜索页，缺少“逛”的乐趣 | 需要编辑判断与持续策展，不是抓取能解决 | 中（设计 + 内容） |
| **场景驱动 + “不适合”说明** | 用户的问题是“我现在该用什么”，不是“有哪些分类” | 需要人工写场景与边界 | 中（内容） |
| **中文精品导读** | 中文开发者数量大；现有平台多为界面翻译 | 需要人工校对，机翻会毁掉信任 | 中（内容） |
| **文件级“配料表”** | Snyk 数据证明风险普遍 | 需要 tarball、解析、规则、证据展示 | 中（工程） |
| **版本一致性** | 用户装到的版本必须和网站说的一致 | 需要 commit 固定、bundleHash、复核状态 | 中（工程 + 流程） |
| **OpenCode 小包订阅** | OpenCode 官方支持 HTTP catalog | 需要按 pack 组织、快照、缓存策略 | 低–中（实验） |

**不建议作为差异化：** 更大索引、AI 语义搜索、安装量排行榜、安全认证、社区评分。

---

## 3. 差异化功能与产品设计建议

### 3.1 产品定位

**工作名（待定）：** `Skill Shelf` / `技能货架`  
**一句话：** 一个可以“逛”的 Agent Skills 精选货架：看懂它能做什么、装之前知道它可能做什么、用一条命令装进你的 agent。

**定位三角：**

```
        好玩（Discovery）
           /\
          /  \
         /    \
   可信（Trust）---- 好用（Install/Explain）
```

- **好玩**：货架、今日精选、随机、场景。
- **可信**：来源、版本、扫描覆盖、许可证。
- **好用**：客户端适配、安装命令、固定版本、卸载。

### 3.2 五个产品支柱

#### 支柱 1：场景驱动，而不是技术分类驱动

现有目录大多按“React / Next.js / Testing / Database”分类。开发者真实的问题是：

- “我刚接手一个陌生代码库，先干什么？”
- “给老项目补测试，从哪开始？”
- “设计稿怎么稳定地变成组件？”
- “上线前帮我做一次自查？”

**做法：** 一级导航放“场景”，技术主题作为二级过滤。每个场景页包含：

- 你可能遇到的情况（3–5 句）。
- 推荐 skills（3–6 个，带“为什么是它”）。
- 一个最小工作流（先装哪个、再装哪个）。
- **不适合用 skill 的场景**（建立信任）。

#### 支柱 2：文件级“配料表”，但不做成审计平台

详情页固定展示：

| 配料项 | 展示方式 |
|---|---|
| 文件清单 | 树形：`SKILL.md`、`scripts/*`、`references/*`、`assets/*` |
| 可执行文件 | 数量 + 文件列表 + 语言 |
| 网络访问 | 是否出现 URL / `curl` / `fetch` / API 调用 |
| 凭据访问 | 是否出现 `~/.aws`、`~/.ssh`、`.env`、keychain 等模式 |
| 危险模式 | `curl \| bash`、base64+eval、`sudo`、`systemctl`、隐藏 Unicode 等 |
| Token 成本 | 估算正文 tokens；标注“轻/中/重” |
| 许可证 | SPDX + 原始 LICENSE 链接 + 是否允许全文/镜像 |
| 版本 | 上游最新 commit、本站同步 commit、复核 commit、bundleHash |
| 扫描覆盖 | `complete` / `partial` / `failed` + 未扫描文件说明 |
| 人工复核 | “已复核 @ commit abc1234”或“未复核” |

**原则：**

- 不输出“安全分”。只输出**可验证的事实**与**证据行号**。
- 高风险信息放在详情页的“配料表”标签，不占据首屏；首屏是用途、场景、安装。
- 卡片上只放一个轻量风险 chip（无脚本/含脚本/高风险），不放大段警告。

#### 支柱 3：精选小目录 + 编辑说明

每个进入首页/专题的 skill 都有一条“为什么它在货架上”的编辑说明（中文 1–2 句，英文 1 句）；全量上架至少保留原文描述 + 一句可批量维护的编辑备注。例如：

> “它不教你写 CSS，而是让 agent 在每次改 UI 前先读一遍设计约束。适合已经有设计系统、但 agent 总爱自由发挥的团队。”

这条说明是**人类判断**，不是模型生成的套话。

#### 支柱 4：先看后装，不是“安全试用”

详情页提供两个动作：

- **临时使用（无需安装）**：`npx skills use ...`，把提示词打印出来或交给支持的 agent。明确写：**不是沙箱，仍可能读写文件/联网/执行命令**。
- **安装**：`npx skills add ...`，默认固定 commit；可选跟随最新。

#### 支柱 5：中英双语，但不是“机翻界面”

- UI 全量双语。
- 精选 skill 有**中文导读**（人工撰写/校对），原文描述保留可切换。
- 搜索支持中文分词、中文同义词、英文拼写容错。
- 安装文档、排错、安全说明有中文版。
- 英文用户看到完整英文；中文用户不被“英文原文 + 机翻”糊弄。

### 3.3 “超市式”浏览机制

> 隐喻只用于内部设计语言；界面文案保持直白，避免过度拟物。

| 机制 | 交互 | 目的 |
|---|---|---|
| **货架（Shelf）** | 首页横向/纵向专题区，每区 6–12 个 skill，带策展标题与一句说明 | 让浏览有“主题感” |
| **今日五件** | 每天按日期种子确定性地选 5 个，质量加权，不重复最近 7 天 | 回访新鲜感，无需后端 |
| **随手拿一件** | 随机跳到一个已发布 skill；质量加权，避开 localStorage 看过的 | 探索乐趣 |
| **试吃** | 详情页“临时使用（无需安装）” | 降低尝试成本 |
| **配料表** | 文件/脚本/网络/凭据/token 成本/扫描覆盖 | 把“信任”变成可检查的细节 |
| **保质期** | “上游更新于 3 天前”；超过 12 个月标“临期” | 维护状态可见 |
| **产地直供** | “官方组织/维护团队”标记 | 来源可信度 |
| **本地特产** | 中文文档/中文场景的 skill | 中文差异化 |
| **购物篮（P1）** | 选中多个 skill，按 repo 分组生成命令/一个 pack | 从发现到安装的闭环 |

**避免：**

- 3D 货架、拟物货架、动画过度——开发者工具应克制。
- 随机不能变成低质内容出口；必须质量加权。
- 不用“打折/限时”等电商话术，会伤害可信度。

### 3.4 场景体系（首发 5 个）

| 场景 slug | 中文名 | 典型任务 | 推荐 skill 类型 |
|---|---|---|---|
| `inherit-codebase` | 接手陌生代码库 | 读懂结构、找入口、生成地图 | 代码理解、架构梳理、文档生成 |
| `add-tests` | 给老项目补测试 | 找热点、生成测试、修 flaky | 测试生成、覆盖率分析、CI |
| `design-to-code` | 设计稿转代码 | Figma → 组件、设计约束 | 设计系统、可访问性、组件生成 |
| `ship-safely` | 上线前自查 | 安全、性能、回归、发布说明 | 代码审查、性能、发布 |
| `write-clearly` | 写清需求与文档 | PRD、ADR、周报、变更日志 | 写作、结构化、翻译 |

> 每个场景页都要有“**不适合**”段落。例如“接手代码库”不适合：没有 README、没有测试、代码量小于 500 行的项目——直接读更快。

### 3.5 精选与专题合集

**专题（Collection）不是标签页。** 每个专题必须有：

- 标题（有观点，不是“React Skills”）。
- 一句话论点。
- 6–10 个 skill，每个带入选理由。
- 1 个“不建议一起装”的提示（避免冲突/上下文膨胀）。
- 策展人 + 最后复核日期。

**首发 3 个专题建议：**

1. **把设计系统喂给 Agent**（设计约束 / 组件 / 可访问性）
2. **给老项目补测试的 7 件工具**（测试生成 / flaky 分析 / CI）
3. **轻量：没有可执行文件，但仍会驱动 agent**（prompt-only；同时说明“无脚本≠不操作文件/网络”）

### 3.6 质量、可信度与安全展示

**多轴分开，不打总分：**

| 轴 | 展示 | 数据来源 |
|---|---|---|
| **规范** | 通过/警告/失败 | 本地校验器 + skills-ref（可选） |
| **维护** | 最近 commit、是否 archived、issue 活跃度 | GitHub API |
| **轻量** | 无脚本 / 有脚本；token 成本 | 文件清单 + 正文估算 |
| **来源** | 官方组织 / 已验证作者 / 社区 | 人工 org 白名单 + GitHub 元数据 |
| **复核** | 已复核 @ commit / 未复核 / 复核失效 | 人工记录 + bundleHash |
| **扫描** | complete / partial / failed + 覆盖范围 | 静态规则 |
| **风险** | 风险旗标列表 + 证据 | 静态规则 + 人工 |

**文案原则：**

- 不说“安全”，说“未发现以下模式”。
- 不说“已验证”，说“我们在这个 commit 上看过”。
- 不说“推荐”，说“我们为什么选它”。
- 明确写“我们无法保证第三方 skill 的行为”。
- **“无脚本”只表示 skill 目录里没有可执行文件；提示词仍可能要求 agent 使用读写、联网或命令工具。**

### 3.7 中英双语体验

| 层面 | 中文 | 英文 |
|---|---|---|
| 默认语言 | `/` 为中文（待确认） | `/en` |
| 数据 | 原文 `description` + 中文导读 `descriptionZh` | 原文 `description` |
| 搜索 | 中文分词 + 同义词 + 英文别名 | 英文分词 + 拼写容错 |
| 排版 | 中文正文 1.75 行高；不用斜体 | 1.5–1.6 行高 |
| 日期 | “3 天前”“2026-11-10” | “3 days ago” |
| 命令 | 原样英文，不翻译 | 原样 |
| 安全说明 | 完整中文 | 完整英文 |
| 内容缺口 | 未翻译的标“英文原文” | 不显示中文占位 |

**翻译策略 [R]：**

- 首发 120 个中，**40 个**有中文精品导读（人工/半人工校对）。
- 其余保留英文原文 + 机器辅助摘要，明确标注“AI 辅助，待校对”。
- **不在运行时调用翻译 API**；翻译在数据提交时完成，进入 Git 历史。
- 中文导读是“编辑内容”，不是逐字翻译；重点是“什么时候用/不适合什么时候用”。

### 3.8 反模式清单

| 反模式 | 为什么不要 |
|---|---|
| 首页放巨大搜索框 + 空白 | 没有“逛”的入口，退回搜索引擎 |
| 卡片只放 star 数 | star 是仓库级信号，不是 skill 质量 |
| 单一“安全分” | 虚假精确，容易被 gaming |
| 详情页首屏放风险报告 | 变成审计工具，失去发现感 |
| 无限滚动 + 无 URL 状态 | 无法分享/收藏/SEO |
| 全量 400 万入库 | 信噪比崩坏，审核不可行 |
| 用 AI 生成所有描述 | 读起来都一样，失去编辑判断 |
| 强制登录才能收藏 | 开发者反感；localStorage 足够 |
| 自动安装/自动执行 | 安全边界不可控 |

---

## 4. MVP 功能范围及暂不开发的功能

### 4.1 MVP（P0）— 必须做

**目标：6 周内可公开测试；120 个精选 Skills。**

| # | 功能 | 验收标准 |
|---|---|---|
| 1 | **数据管道**：seed → GitHub tarball → 解析 → 校验 → 去重 → 扫描 → JSON | 120 个 skill 增量同步 <10 分钟；首次回填 <2 小时；失败可重试 |
| 2 | **首页货架**：今日五件、场景入口、本周专题、无脚本（仍需审查）、官方来源 | 首屏 LCP <2.0s（4G）；每个模块有真实数据 |
| 3 | **Explore**：搜索、筛选（客户端/场景/风险/许可证/语言）、排序 | 中文“测试”能返回测试类 skill；筛选写入 URL |
| 4 | **详情页**：用途、场景、安装、配料表、版本、相关推荐 | 每个已发布 skill 有 source/review/scan/license；默认安装指向已复核 commit |
| 5 | **安装**：`npx skills add` 固定 commit；临时使用；客户端切换 | 抽 10 条命令在临时目录验证；4 个客户端目录正确 |
| 6 | **专题合集**：3 个专题，带策展说明 | 每个专题 ≥6 个 skill，有复核日期 |
| 7 | **场景页**：5 个场景 | 每个场景有“适合/不适合” |
| 8 | **中英双语**：UI 全量；40 个中文导读 | 语言切换保留路径；`hreflang` 正确 |
| 9 | **提交入口**：GitHub Issue Form 预填 | 自动打标签；有审核 SLA |
| 10 | **自动化**：每日增量同步 + 校验 + 构建 | 连续 7 天成功；失败自动开 issue |
| 11 | **信任与法务页**：收录标准、安全说明、免责声明、下架流程 | 页面可访问；footer 链接 |
| 12 | **OpenCode catalog**：1 个实验 pack（8–10 个 skill） | 正确加载；version 变化刷新；移除/缓存限制有说明 |

### 4.2 P1 — 发布后 4–8 周

| 功能 | 说明 | 为什么不是 MVP |
|---|---|---|
| 购物篮 / 一键装一组 | 选中多个 skill，按 repo 分组生成命令 | 需要更多交互与边界处理 |
| 版本 diff / 变更提醒 | “上游变了，和复核时不一样” | 需要版本快照与 diff UI |
| 拼音搜索 | `ceshi` → 测试 | 需要额外索引；先看搜索日志 |
| 团队/组织收藏 | 共享 shelf | 需要账号/存储 |
| 作者认领 | 作者验证并更新描述 | 需要身份流程 |
| RSS / 邮件订阅 | 新上架/专题更新 | 需要邮件服务 |
| OG 图片自动生成 | 每个 skill/专题一张 | 构建时生成，但增加复杂度 |
| 安装意图分析 | 复制命令/点击 GitHub 的聚合统计 | 需要隐私友好的事件方案 |

### 4.3 暂不开发（P2 / 不做）

| 功能 | 原因 |
|---|---|
| 用户账号、评论、评分 | 冷启动无数据；审核与滥用成本高 |
| AI 语义搜索 / 向量数据库 | 成本/延迟/可解释性不划算；Pagefind 足够 |
| 自建 CLI / 安装器 | `skills` CLI 已覆盖 80 个客户端 |
| 在线运行 skill / playground | 安全边界不可控 |
| 付费/广告/赞助位 | 与 Vercel Hobby 非商业条款冲突；先不做 |
| 全量 GitHub 抓取 | 768 万文件，审核不可行；只做 seed + 提交 + 主题发现 |
| 移动 App | 响应式 Web 足够 |
| 多租户/企业版 | 早期不需要 |
| 自动翻译全站 | 质量不可控；人工导读优先 |

### 4.4 MVP 的“不妥协”项

1. **来源与许可证**：每个 skill 必须有 source URL、commit、license 状态。
2. **版本对应**：详情页必须能回答“你装的是哪个 commit、我们复核的是哪个 commit”。
3. **扫描覆盖**：必须显示 `complete/partial/failed`，不能把“未检测到”说成“安全”。
4. **免责声明**：明确“不背书、不保证、安装前自查”。
5. **可下架**：有明确的举报/下架流程。
6. **不执行第三方代码**：CI 只做静态分析，不跑 skill 脚本。

### 4.5 工作量估算：开发 vs 内容 vs 审核

> **原则：AI Coding 能加速写代码，但不能加速人工阅读、判断和翻译。** 以下按 1 名全职开发者 + 兼职内容/设计支持估算。

| 工作块 | 内容 | 人日 |
|---|---|---|
| **工程：基础** | 仓库、Astro、设计 tokens、schema、静态页骨架 | 3–4 |
| **工程：管道** | tarball、解析、校验、去重、扫描、许可证 | 5–7 |
| **工程：页面** | 首页、Explore、详情、专题、场景、i18n、SEO | 5–7 |
| **工程：版本/Catalog** | 版本状态机、配料表、catalog 生成/缓存 | 3–5 |
| **工程：QA** | 可访问性、性能、迁移演练、安全自查 | 3–4 |
| **工程小计** | | **19–27 人日** |
| **内容：选品** | 120 个 seed 阅读、分类、写一句话备注 | 5–7 |
| **内容：中文导读** | 40 篇（AI 辅助 + 人工校对） | 4–6 |
| **内容：专题/场景** | 3 个专题 + 5 个场景 | 3–4 |
| **内容：法务/安全文案** | 收录标准、免责声明、下架流程 | 1–2 |
| **内容小计** | | **13–19 人日** |
| **审核/QA：风险** | 120 个扫描结果与证据复核 | 3–5 |
| **审核/QA：安装** | 4 个客户端、10 条命令 smoke test | 1–2 |
| **审核/QA：体验** | 可访问性、SEO、移动端 | 1–2 |
| **审核小计** | | **5–9 人日** |
| **合计** | | **37–55 人日** |

**日历估算 [R]：**

- 全职 1 人 + 兼职内容：**6 周**（开发与内容并行）。
- 只有 1 人兼职：**8–10 周**。
- 不建议压缩到 4 周：人工审核和中文导读会成为瓶颈，且会牺牲“可信”这个基础。

---

## 5. 推荐技术栈及备选方案对比

### 5.1 决策原则

1. **静态优先**：能预生成就不运行时计算。
2. **无后端**：MVP 不引入数据库、API 服务、队列。
3. **可迁移**：不被 Vercel 专有能力锁定。
4. **可审计**：数据以文本进 Git，PR 可 review。
5. **复用**：安装用 `skills` CLI，搜索用 Pagefind，UI 用 Tailwind/Radix。
6. **中文友好**：搜索、排版、内容都要考虑中文。
7. **不执行第三方代码**：构建与 CI 只做静态处理。

### 5.2 推荐栈

| 层 | 选择 | 版本策略 | 理由 |
|---|---|---|---|
| 站点框架 | **Astro**（静态输出） | 实施时最新稳定版 | 内容型站点零 JS 默认、构建快、部署无关 |
| 交互岛 | **React** + `@astrojs/react` | React 19.x | 复用生态；只有搜索/筛选/命令面板需要 JS |
| 样式 | **Tailwind CSS v4** | 最新稳定版 | design tokens、快速、一致 |
| 组件 | **Radix Primitives + cmdk** | 最新 | 无样式、可访问；不引入整套组件库 |
| 图标 | **Lucide**（按需）或内联 SVG | 最新 | 体积可控 |
| 搜索 | **Pagefind**（`pagefind_extended`，CJK） | 最新 | 纯静态、中文分词、过滤、无服务 [S19] |
| 辅助索引 | 构建时 compact JSON + `Intl.Segmenter` | 原生 | 命令面板/排序/分面 |
| 数据格式 | **JSON + YAML** | — | 可 diff、可 review、无数据库 |
| 校验 | **Zod** + 自定义规则 | 最新 | schema 校验 |
| 解析 | `gray-matter` + `yaml` + `unified`/`remark` | 最新 | frontmatter、AST、sanitize |
| 数据管道 | **TypeScript + tsx**（Node 22+） | 最新 | 与站点同语言 |
| 采集 | **GitHub tarball** + REST API | — | 一次拿完整 skill 目录，减少 API 调用 [S28] |
| CI/CD | **GitHub Actions** | — | 免费（公开仓库）、同仓、可审计 |
| 部署 | **Vercel Hobby（静态）** | — | 首期要求；静态可迁移 |
| 分析 | Vercel Web Analytics（可选） | — | 50k events/月；无 cookie |

### 5.3 前端框架对比

| 维度 | Astro（推荐） | Next.js App Router | Vite + React SPA | 11ty |
|---|---|---|---|---|
| 内容型页面 | ★★★★★ | ★★★★ | ★★ | ★★★★★ |
| 首屏 JS | 极小（岛屿） | 中等 | 大（整包） | 极小 |
| 构建 5k 页面 | 快 | 中 | 快（无预渲染） | 很快 |
| SEO/分享 | 好 | 好 | 差（需额外预渲染） | 好 |
| 交互能力 | 岛屿足够 | 最强（RSC/Server Actions） | 强 | 弱 |
| 部署可迁移 | 最强（纯静态） | 中（ISR/Server 锁定） | 强 | 最强 |
| 适合本项目的理由 | 内容 + 少量交互 + 静态 | 如果很快要做账号/后台 | 不适合发现型站点 | 极简但生态弱 |

**结论 [R]：选 Astro。**  
如果 6 个月内确定要做“用户账号 + 团队收藏 + 提交后台”，Next.js 更省事；但那时数据层仍是 JSON/静态，迁移成本可控。**不要为了“可能”的后台提前上 Next.js。**

### 5.4 UI 方案

| 方案 | 优点 | 缺点 | 结论 |
|---|---|---|---|
| **Tailwind v4 + Radix + cmdk** | 体积小、可控、可访问 | 需要自己写样式 | **推荐** |
| shadcn/ui | 现成组件、代码归你 | 组件较多、默认风格重；Astro 集成需配置 | 可选，只取需要的组件 |
| MUI / Ant Design | 完整 | 风格强、体积大、难做出 Linear/Raycast 质感 | 不推荐 |
| CSS Modules / 原生 CSS | 最轻 | 设计系统一致性靠自律 | 备选 |

**设计原则（不锁死最终视觉）：**

- 近黑背景 + 1px 半透明边框 + 一个强调色；强调色可在设计阶段从青柠/琥珀/冷蓝中选。
- Latin 用 Inter/Geist；中文用系统字体栈（PingFang SC / Microsoft YaHei / Noto Sans SC），**不自托管完整中文字体**。
- 等宽：JetBrains Mono / ui-monospace，用于命令与 commit。
- 圆角：卡片 10–12px；chip 6px；阴影几乎不用。
- 动效：120–180ms ease-out；尊重 `prefers-reduced-motion`。
- 深/浅两套用 CSS variables；默认跟随系统。

### 5.5 搜索方案对比

| 方案 | 运行位置 | 中文 | 全文 | 分面过滤 | 索引体积 | 运维 | 结论 |
|---|---|---|---|---|---|---|---|
| **Pagefind** | 浏览器（WASM） | ●（extended，CJK）[S19] | ● | ● | 中（分块懒加载） | 无 | **推荐** |
| Fuse.js + JSON | 浏览器 | ◐（需自定义分词） | ○（仅元数据） | ● | 小 | 无 | 命令面板/排序 |
| Orama | 浏览器/服务端 | ◐（自定义 tokenizer） | ● | ● | 中 | 低 | 备选；代码更多 |
| Algolia / Typesense Cloud | SaaS | ● | ● | ● | 外部 | 账号/成本 | 不推荐 MVP |
| Meilisearch | 自托管 | ● | ● | ● | 外部 | 运维 | 不推荐 |
| Vercel Function + DB | 服务端 | ● | ● | ● | 外部 | 成本/冷启动 | 不推荐 MVP |

**推荐组合：**

- **Pagefind**：全站全文搜索、中文分词、按 agent/risk/scene/license 过滤。
- **compact JSON + `Intl.Segmenter`**：首页“今日五件”、Explore 排序、命令面板的即时元数据搜索。
- **同义词表**：`zhSynonyms.json` / `enSynonyms.json`，例如“测试/单测/QA”→“testing”，“部署/上线/发布”→“deploy”。

**为什么不用 AI 语义搜索 [R]：**

- 需要 embedding API / 向量库，增加成本与运行时依赖。
- 结果不可解释，难以向用户解释“为什么这个 skill 排第一”。
- 对 120–5,000 条数据，关键词 + 同义词 + 编辑精选的召回已经足够。
- 如果日后搜索日志显示“找不到”率高，再加语义层；不要提前。

### 5.6 数据存储方案对比

| 方案 | 优点 | 缺点 | 结论 |
|---|---|---|---|
| **提交式 JSON/YAML（Git）** | 免费、可 diff、可 review、可回滚、构建确定 | 文件多；不适合高频写入 | **推荐 MVP** |
| SQLite 单文件 | 查询强、单文件 | 二进制 diff 差、构建需额外步骤 | 备选（>2 万条时） |
| Postgres/Neon | 动态查询、账号 | 成本/运维/冷启动 | 不推荐 MVP |
| Vercel KV/Blob | 动态 | 锁定、无审计历史 | 不推荐 |
| GitHub Issues 作为提交队列 | 零后端、社区熟悉 | 不是数据库；需 bot 转换 | **推荐用于提交** |

**v1.1 调整：按 repo 存 JSON，而不是每个 skill 一个文件。**

- 原因：tarball 按 repo 获取；同一 repo 的多个 skill 共享元数据；PR diff 更连贯。
- 规模：120 skills ≈ 100 repo 文件；5,000 skills ≈ 3,000 repo 文件；Git 可承受。
- 详情页在构建时从 repo JSON 展开为单 skill 记录。

**推荐结构：**

```
data/
  repos/
    <owner>/<repo>.json        # repo 元数据 + skills[]
  index/
    skills.compact.json        # 客户端列表（元数据）
    facets.json
  seeds/
    repos.yml                  # 人工 seed 仓库
    submissions.yml            # 社区提交（经审核）
  editorial/
    shelves/*.yml              # 专题
    scenes/*.yml               # 场景
    translations/*.yml         # 中文导读
  reviews/
    reviews.json               # 人工复核记录（commit + bundleHash + reviewer）
  catalog-src/
    <pack>/                    # 仅存放允许再分发的已复核快照
      LICENSE
      NOTICE
      <skill>/...
  catalog.lock.json            # catalog 版本、来源、commit、hash、license
```

### 5.7 不采用方案及原因

| 方案 | 不采用原因 |
|---|---|
| Next.js + ISR + 数据库 | 对 MVP 过重；静态已足够；ISR 绑定 Vercel |
| 纯 Vite SPA | SEO/分享差；首屏慢；发现型站点需要可索引详情页 |
| 自建搜索服务 | 运维/成本；Pagefind 已解决 |
| 自建 CLI | `skills` CLI 已覆盖 80 客户端 |
| AI 生成全站描述 | 质量同质化；审核不可控 |
| 全量爬虫 | 审核不可行；法律/版权风险 |
| 付费 CDN/图片服务 | 静态 SVG/CSS 足够；避免成本 |
| 自建 catalog 安装器 | OpenCode 已支持；但只作为可选实验 |

### 5.8 版本策略

- Node.js：22 LTS 或 24 LTS（实施时确认）。
- Astro/React/Tailwind：锁 major；Dependabot/Renovate 每周提 PR；不追 beta。
- Pagefind：锁 minor；升级时跑中文搜索回归用例。
- `skills` CLI：**不在构建中依赖**；只引用命令。文档注明“截至 2026-11-15，CLI 1.8.1”；上线前重新核对命令。
- OpenCode catalog：按官方文档与源码行为实现；每个 OpenCode 大版本做一次 smoke test。

---

## 6. 系统架构、数据流与 Skill 数据模型

### 6.1 架构总览

```
┌──────────────────────────────────────────────────────────────────┐
│                         数据源（公开）                             │
│  GitHub repos (topic / seed / submission)                         │
└───────────────────────────────┬──────────────────────────────────┘
                                │ GitHub REST API
                                │ 1) repo metadata
                                │ 2) git tree
                                │ 3) tarball at commit（完整 skill 目录）
                                ▼
┌──────────────────────────────────────────────────────────────────┐
│                  GitHub Actions：sync worker                      │
│  1. 读取 seeds + submissions + editorial                          │
│  2. 拉取 repo 元数据 / tree / tarball                             │
│  3. 安全解压（禁止路径穿越/符号链接），只保留 skill 目录           │
│  4. 解析 frontmatter、校验、估算 token、静态扫描（SKILL.md + 文本）│
│  5. 去重、分类、许可证解析、生成 compact index                     │
│  6. 写入 data/repos/*.json，校验 schema，提交 commit               │
└───────────────────────────────┬──────────────────────────────────┘
                                │ git push（bot commit / PR）
                                ▼
┌──────────────────────────────────────────────────────────────────┐
│                     Astro 构建（Vercel / CI）                      │
│  - 读取 data/repos + editorial                                    │
│  - 生成静态页面（首页/Explore/详情/专题/场景）                     │
│  - 运行 Pagefind 生成搜索索引（zh + en）                           │
│  - 生成 OpenCode catalog（仅 catalog-src 中允许再分发的快照）      │
│  - 生成 sitemap / RSS / JSON API                                  │
└───────────────────────────────┬──────────────────────────────────┘
                                │ static dist/
                                ▼
┌──────────────────────────────────────────────────────────────────┐
│                        Vercel CDN（静态）                          │
│  HTML / CSS / JS / Pagefind / data / catalog                      │
└───────────────┬───────────────────────────────┬──────────────────┘
                │                               │
                ▼                               ▼
        浏览器（用户）                    OpenCode（可选 catalog）
        - 搜索/筛选/随机                  - base/index.json + 文件
        - 复制安装命令                    - version 变化才刷新
        - 查看版本/风险                   - 不是核心架构依赖
```

**关键：没有运行时后端。** 所有动态能力在构建时或浏览器完成。

### 6.2 数据流（详细）

| 步骤 | 输入 | 处理 | 输出 | 失败处理 |
|---|---|---|---|---|
| 1. 发现 | seeds.yml / topics / submissions | 合并、去重、优先级排序 | 候选 repo 列表 | 记录跳过原因 |
| 2. 元数据 | repo API | stars、license、archived、pushed_at、default_branch、repoId | repo 记录 | 404/403 → 隔离 |
| 3. 文件树 | git/trees?recursive=1 | 找 `SKILL.md`（大小写敏感）、统计文件 | skill 目录列表 | 树截断 → 逐层拉取 |
| 4. 快照 | tarball at commit | 安全解压，只保留 skill 目录 | 文件清单 + 内容 | 超限/失败 → 隔离 |
| 5. 解析 | `SKILL.md` | `gray-matter` + 宽松 YAML 回退 | 结构化字段 | YAML 失败 → 隔离 |
| 6. 校验 | 结构化字段 | 规范规则 + 客户端差异 | diagnostics | 严重 → 不发布 |
| 7. 扫描 | skill 目录内文本文件 | 静态规则（不执行） | risk flags + evidence + coverage | 严重 → 隔离 |
| 8. 去重 | bundleHash + simhash | 精确/近似重复 | canonicalId | 保留但标记 duplicate |
| 9. 分类 | 名称/描述/文件 | 规则 + 人工 editorial 覆盖 | scenes/topics/agents | 未分类 → “其他” |
| 10. 许可 | repo license + frontmatter | SPDX 归一化、冲突标记 | licenseStatus | 未知 → 仅 L0/L1 |
| 11. 写盘 | 全部 | 排序、稳定序列化、schema 校验 | data/repos/*.json | 失败 → 不提交 |
| 12. 构建 | data + editorial + catalog-src | Astro + Pagefind | dist/ | 失败 → 阻止部署 |
| 13. 部署 | dist/ | Vercel | CDN | 回滚上一版 |

### 6.3 Skill 数据模型（v1.1）

```ts
// 方案形状，不是实现代码
type LicenseStatus =
  | "permissive"          // MIT/Apache/BSD/ISC 等允许再分发
  | "copyleft"            // GPL/AGPL 等，需遵守义务
  | "no-redistribution"   // 明确禁止再分发
  | "unknown"             // 无许可证/无法识别
  | "conflict"            // 仓库与 frontmatter 冲突
  | "author-permission";  // 作者书面许可

type ScanStatus = "complete" | "partial" | "failed" | "not-scanned";
type ReviewStatus =
  | "unreviewed"
  | "machine-scanned"
  | "human-approved"
  | "human-rejected"
  | "stale";              // 上游/内容变化导致复核失效

type PublishStatus = "draft" | "published" | "quarantined" | "archived" | "removed";

interface RiskFlag {
  code: string;           // EXEC_CURL_PIPE, BASE64_EXEC, CREDENTIAL_ACCESS...
  severity: "info" | "warn" | "high" | "critical";
  evidence: { file: string; line?: number; excerpt: string }[];
  note?: string;
}

interface ScanResult {
  status: ScanStatus;
  coverage: {
    filesScanned: number;
    filesSkipped: number;
    bytesScanned: number;
    limitations: string[];   // 二进制/压缩包/超限/子模块/符号链接
  };
  flags: RiskFlag[];
  scannerVersion: string;
  rulesetVersion: string;
  scannedAt: string;
  scannedCommit: string;
  scannedBundleHash: string;
}

interface SkillRecord {
  // 稳定标识
  id: string;                 // 内部：github:<repoId>:<path>
  publicId: string;           // URL：owner/repo/<path-slug>
  aliases: string[];          // 旧 owner/repo/path、重命名前 ID
  slug: string;
  name: string;               // frontmatter name
  displayName?: string;
  description: string;        // 原文
  descriptionZh?: string;     // 人工导读（可选）

  source: {
    provider: "github";
    repoId: number;           // GitHub 数字 ID，抗重命名
    owner: string;
    repo: string;
    fullName: string;         // 当前 owner/repo
    previousFullNames: string[];
    url: string;
    stars: number;
    licenseSpdx: string | null;
    licenseStatus: LicenseStatus;
    licenseSource: "repo" | "frontmatter" | "none" | "conflict" | "author";
    defaultBranch: string;
    archived: boolean;
    pushedAt: string;
  };

  path: string;               // repo 内 skill 目录
  upstream: {
    latestCommit: string;     // 最近一次元数据看到的最新 commit
    latestCommitAt: string;
    latestTreeSha: string;
  };

  snapshot: {
    commit: string;           // 本次采集实际使用的 commit
    syncedAt: string;
    skillMdHash: string;      // SKILL.md 单文件 SHA-256
    bundleHash: string;       // 文件清单 + 内容 SHA-256
    filesFetched: number;
    filesSkipped: number;
    bytesFetched: number;
  };

  frontmatter: {
    license?: string;
    compatibility?: string;
    metadata?: Record<string, string>;
    allowedTools?: string;
  };

  files: {
    path: string;
    size: number;
    kind: "skill" | "script" | "reference" | "asset" | "binary" | "archive" | "symlink" | "other";
    scanned: boolean;
    skipReason?: string;
  }[];

  metrics: {
    bodyTokensEstimate: number;
    fileCount: number;
    scriptCount: number;
    hasNetwork: boolean;
    hasCredentialPatterns: boolean;
  };

  // 当前同步快照的扫描结果
  scan: ScanResult;

  review: {
    // 当前快照的复核状态（派生）：reviewed 存在且 hash 相同 → human-approved；不同 → stale
    status: ReviewStatus;
    // 最近一次人工通过的快照；上游更新后仍保留，用于“已复核版本”安装与 Catalog
    reviewed?: {
      commit: string;
      bundleHash: string;
      reviewedAt: string;
      reviewer: string;
      scope: string[];         // 看了什么：description/file-tree/scan-evidence/license
      notes?: string;
      scan: ScanResult;        // 复核时的扫描结果（不是当前扫描）
      licenseStatus: LicenseStatus;
    };
  };

  taxonomy: {
    scenes: string[];
    topics: string[];
    agents: string[];          // claude-code, codex, cursor, opencode
    language: "en" | "zh" | "multi";
    portability: "portable" | "client-specific" | "unknown";
  };

  editorial?: {
    shelfIds: string[];
    noteZh?: string;
    noteEn?: string;
    featuredRank?: number;
    curator?: string;
  };

  install: {
    // 推荐：固定到最近一次人工复核的 commit（即使上游已更新）
    reviewedCommand: string;
    // 可选：固定到最新同步 commit；明确标注“可能未复核”
    latestCommand: string;
    // 临时使用：固定到已复核 commit；不是沙箱
    useCommand: string;
    targetDirs: Record<string, { project: string; global: string }>;
    notes: string[];           // 例如“use 不是沙箱”
  };

  catalog?: {
    eligible: boolean;
    packIds: string[];
    publishedVersion?: string;
    publishedBundleHash?: string; // 必须等于 review.reviewed.bundleHash
    publishedAt?: string;
    snapshotPath?: string;        // 快照目录，指向已复核版本
  };

  status: PublishStatus;
  duplicateOf?: string;
  timestamps: {
    firstSeenAt: string;
    lastSyncedAt: string;
    upstreamUpdatedAt: string;
  };
}
```

**设计要点：**

- `id` 与 `publicId` 分离：repo 重命名/路径移动时，内部 ID 稳定，URL 用 alias 重定向。
- `snapshot.bundleHash` 是“当前同步版本”的指纹；`review.reviewed.bundleHash` 是“最近复核版本”的指纹。
- 当前扫描 `scan.scannedBundleHash` 必须与 `snapshot.bundleHash` 一致；复核时的扫描独立保存在 `review.reviewed.scan`。
- `scan.coverage` 是必填；没有覆盖信息就不能说“未发现风险”。
- 上游更新后：`review.status=stale`，但 `review.reviewed` 保留；默认安装与 Catalog 继续指向已复核快照。
- `editorial` 与上游事实分离；上游更新不会覆盖人工导读。
- `status` 支持隔离/下架，不删除记录（保留 tombstone 90 天）。
- `duplicateOf` 保留重复项但默认不出现在列表。

### 6.4 六层版本与状态机

**六个“版本”：**

| 版本 | 字段 | 含义 | 用户如何看到 |
|---|---|---|---|
| 上游最新 | `upstream.latestCommit` | 我们最近一次看到的默认分支 HEAD | “上游有更新/已是最新” |
| 本站同步 | `snapshot.commit` | 我们实际拉取并解析的 commit | “本站同步于 …” |
| 自动扫描 | `scan.scannedCommit` + `scannedBundleHash` | 静态扫描对应的版本 | “扫描覆盖 complete/partial” |
| 人工复核 | `review.reviewed.commit` + `.bundleHash` | 人看过的版本（可早于当前上游） | “已复核 @ abc1234” |
| 用户安装 | `install.reviewedCommand` 中的 commit | 用户默认装到的已复核版本 | 命令里的 40 位 SHA |
| Catalog 发布 | `catalog.publishedBundleHash` + `publishedVersion` | catalog 实际分发的版本 | “Catalog 版本 …” |

**不变量（构建时断言，失败则阻止发布）：**

1. `review.reviewed` 存在 ⇒ `review.reviewed.scan.scannedCommit === review.reviewed.commit` 且 `review.reviewed.scan.scannedBundleHash === review.reviewed.bundleHash` 且 `review.reviewed.scan.status != failed` 且 `review.reviewed.licenseStatus != unknown/conflict`。
2. `review.status=human-approved` ⇒ `review.reviewed.bundleHash === snapshot.bundleHash`（当前版本就是已复核版本）。
3. `scan.status=complete` ⇒ `scan.scannedCommit === snapshot.commit` 且 `scan.scannedBundleHash === snapshot.bundleHash`（当前扫描对应当前同步）。
4. `catalog.publishedVersion` 存在 ⇒ `catalog.publishedBundleHash === review.reviewed.bundleHash`（Catalog 永远是已复核快照，不跟随未复核更新）。
5. `status=published` ⇒ `review.reviewed` 存在、`snapshot.commit` 存在、`review.reviewed.scan.status != failed`（当前扫描失败不应撤下已复核版本，但必须提示“当前上游未复核”）。
6. 当前 `scan.flags` 含 `critical` ⇒ `status=quarantined`（停止推荐与安装，等待人工复核）。
7. `status=quarantined` ⇒ 不出现在列表、不生成 catalog、安装命令隐藏。
8. `review.status=stale` ⇒ 默认安装命令使用 `review.reviewed.commit`，不是 `snapshot.commit`。

**状态迁移：**

```
SYNCED_NEW
  ├─ scan critical ──> QUARANTINED
  ├─ scan complete/partial ──> SCANNED
  │      ├─ human approve ──> REVIEWED_CURRENT
  │      │      └─ catalog eligible ──> CATALOG_PUBLISHED
  │      └─ human reject ──> REJECTED
  └─ upstream changes later ──> REVIEW_STALE
```

| 事件 | 状态变化 | 页面表现 | Catalog 行为 |
|---|---|---|---|
| 首次同步 | `draft → scanned` | 可预览，不公开 | 不发布 |
| 人工复核通过 | `scanned → human-approved` | 公开，显示复核 commit | 下个构建发布 |
| 上游新 commit | `human-approved → stale` | “上游已更新，复核失效” | **保持旧已复核版本**，不自动更新 |
| 扫描发现 critical | 任意 → `quarantined` | 从列表移除；详情页显示隔离说明 | 下个构建移除 |
| 许可证改为禁止再分发 | `human-approved → stale` | 只保留 L0/L1 | 下个构建移除 |
| 作者要求下架 | 任意 → `removed` | 410 + tombstone | 下个构建移除 |
| 回滚 | 恢复上一 `catalog.lock.json` | 显示回滚版本 | 重新发布旧版本 |

**关于“扫描未发现问题”：**

- `scan.status=complete` + `flags=[]` 只能说“在已扫描文件中未发现已知模式”。
- `scan.status=partial` 必须显示“部分文件未扫描”，不能显示“未发现风险”。
- 人工复核是“人看过”，不是“安全认证”。
- 任何文案都不能出现“安全”“已认证”“无毒”等绝对承诺。

### 6.5 OpenCode Catalog 模型（可选实验）

**事实 [S6][S23][S24]：**

- `opencode.json` 的 `skills` 数组配置的是**基础 URL**，不是 `index.json`：
  ```jsonc
  { "skills": ["https://example.com/catalog/design-foundations/"] }
  ```
- OpenCode 会在该基础 URL 下固定请求 `index.json`。
- `index.json` 只读取：
  ```json
  {
    "skills": [
      { "name": "frontend-design", "version": "2026-11-15-a1b2c3d4", "files": ["SKILL.md", "references/checklist.md"] }
    ]
  }
  ```
- `files` 必须包含 `SKILL.md` 或 `<name>.md`；否则跳过。
- 文件路径必须安全、相对、**同源**；不能是绝对路径、不能含 `..`、不能带 query/hash。
- `version` 是缓存键：版本不变则只补缺失文件；版本变化则下载到 staging，全部成功后原子替换，并删除旧版本中不再存在的文件。
- 如果文件下载失败：版本更新会保留旧版本（staging 丢弃）；首次安装若设置了 version 也走 staging，因此不会替换半成品。
- 如果 `version` 缺失：只补缺失文件、不清理旧文件；**必须始终设置 version**。
- 如果 `index.json` 拉取失败：返回空列表，**catalog 技能本次不加载**；不是离线可用。
- 从 index 移除某个 skill：OpenCode 不会再返回它，但**不会自动删除本地缓存目录**；需要用户清理缓存。
- 同名 skill：OpenCode 按 source 注册顺序，后者覆盖前者；**pack 之间必须避免重名**。
- 不支持鉴权、签名、私有源；必须是公开 HTTP(S)。
- 没有内容完整性哈希；`version` 是唯一刷新信号；任何文件变化都必须 bump version。
- OpenCode 不校验内容哈希：version 更新要求所有列出文件下载成功才替换，但最终只校验入口文件存在；index 必须保证文件齐全。

**因此，v1.1 的定位：**

- **可选实验功能**，不是网站基础依赖。
- 只发布 **1 个 pack，8–10 个 skill**，且：
  - `review.reviewed` 存在（可以是较早的已复核快照，不要求等于当前上游）；
  - `review.reviewed.licenseStatus` 允许再分发（`permissive` 或书面许可）；
  - `review.reviewed.scan.status=complete`，或已知 partial 且无 high/critical；
  - 无 archive/二进制可执行文件；
  - `catalog.publishedBundleHash === review.reviewed.bundleHash`。
- 目录结构：
  ```
  catalog-src/design-foundations/
    LICENSE
    NOTICE
    catalog.lock.json
    frontend-design/SKILL.md
    frontend-design/references/checklist.md
    ...
  ```
- 构建输出：
  ```
  public/catalog/design-foundations/index.json
  public/catalog/design-foundations/frontend-design/SKILL.md
  ...
  public/catalog/design-foundations/catalog.lock.json
  ```
- `index.json` 只放 OpenCode 需要的字段；`catalog.lock.json` 放来源/commit/hash/license/review，供网站与审计使用。
- 构建时重新计算 `catalog-src/<pack>/<skill>` 的 bundleHash，必须等于 `catalog.lock.json` 中记录的 `review.reviewed.bundleHash`；不一致则阻止发布。`catalog-src` 必须完整镜像该 skill 目录（含 `index.json` 列出的所有文件），不能只放 `SKILL.md`。

**部署要求：**

| 文件 | 缓存头 | 原因 |
|---|---|---|
| `/catalog/*/index.json` | `Cache-Control: public, max-age=0, must-revalidate` | 版本变化必须让客户端看到新 index |
| `/catalog/*/<skill>/*` | `Cache-Control: public, max-age=0, must-revalidate` | 文件 URL 固定，内容会随 version 变化 |
| `/catalog/*/catalog.lock.json` | 同上 | 版本/来源信息 |

> 如果 CDN 把 catalog 文件缓存一年，OpenCode 即使看到新 version，也可能拿到旧文件；这是必须在上线前验证的部署细节。

### 6.6 文件布局

```
/
  astro.config.mjs
  package.json
  src/
    pages/
      index.astro
      [...locale]/...
      skill/[...id].astro
    components/
    layouts/
    lib/
      data.ts
      search.ts
      version.ts
    i18n/
  data/
    repos/<owner>/<repo>.json
    index/skills.compact.json
    seeds/repos.yml
    editorial/...
    reviews/reviews.json
  catalog-src/<pack>/...
  scripts/
    sync.ts
    parse.ts
    scan.ts
    build-index.ts
    build-catalog.ts
    validate-data.ts
  public/
    catalog/...            # 构建生成
    pagefind/...           # 构建生成
  docs/
```

### 6.7 稳定 ID、路径与去重

| 问题 | 方案 |
|---|---|
| repo 重命名/转移 | `source.repoId` 稳定；`fullName` 更新；`aliases` 保留旧 URL；301 重定向 |
| skill 目录移动 | `id` 用 `repoId + path`；旧 `publicId` 进 aliases；详情页 301 |
| 同名不同 repo | `publicId` 含 owner/repo，天然不同；展示层标注来源 |
| 完全重复 | `bundleHash` 相同 → `duplicateOf` canonical |
| 近似重复 | 正文 shingle + SimHash，Hamming ≤3 → 同组；人工确认 |
| fork | GitHub `fork=true` 或内容高度相似；canonical 选官方 > stars > 更早 |
| 删除/归档 | 404/archived → `archived`，保留 90 天；不立即删除 |

**Canonical 选择顺序：**

1. 官方组织/原作者仓库。
2. 非 fork 优先于 fork。
3. stars 更高。
4. 创建更早。
5. 最近更新。

### 6.8 索引、搜索与 i18n

| 文件 | 用途 | 预估（120 / 2,000 / 5,000） |
|---|---|---|
| `data/index/skills.compact.json` | 列表/排序/命令面板 | 0.1 / 1.5 / 4 MB raw |
| `pagefind/` | 全文搜索 | 0.5–1 / 6–10 / 12–20 MB |
| `data/repos/*.json` | 构建源 | 0.3 / 5 / 12 MB |
| `catalog/*` | OpenCode pack | <100 KB |

**分片策略 [R]：**

- 120–2,000：一个 compact 文件即可。
- 2,000–5,000：按 `scene` 或首字母分片；Explore 只加载当前分片。
- 5,000+：暂停自动收录，先优化质量或上服务端搜索。
- **MVP 硬上限 5,000 条已发布**。

**i18n：**

- 中文 `zh-CN` 在 `/`；英文在 `/en`（待确认）。
- `hreflang` + `x-default`；canonical 指向自身语言。
- 搜索索引按语言分目录（可选）：`/pagefind/zh/`、`/pagefind/en/`；减少单次下载。
- 未翻译内容明确标“英文原文”，不生成假中文。

---

## 7. Skills 收录、检索、更新和安装机制

### 7.1 收录来源与优先级

| 优先级 | 来源 | 说明 | MVP |
|---|---|---|---|
| P0 | 人工 seed 仓库 | 官方组织、知名作者、已验证高质量仓库 | ✅ |
| P0 | GitHub topic 搜索 | `agent-skills`、`claude-skills`、`codex-skills` | ✅ |
| P0 | 社区提交 | GitHub Issue Form → 审核 → 入 seeds | ✅ |
| P1 | `awesome-*` 列表 | 人工核对后导入 | 可选 |
| P1 | 作者自荐 | 作者通过 issue 提交 | ✅（同社区提交） |
| P2 | GitHub 代码搜索 | `filename:SKILL.md` + 限定 topic/语言/更新时间 | 不做全量 |
| P2 | well-known 来源 | skills.sh 已支持 `/.well-known/` 类型来源，但公开约定不完整 | 暂不做 |

**规模建议：**

- 首发候选：**300 个 repo**（人工 seed 80 + topic 220）。
- 自动解析后：约 350–450 个 skill。
- 人工/规则筛选后：**发布 120 个**。
- 3 个月目标：**500 个**。
- 硬上限：**5,000 个**。

### 7.2 抓取策略：tarball 优先，而不是逐文件 API

**事实 [S28]：**

- `GET /repos/{owner}/{repo}/tarball/{ref}` 返回 302 到归档下载；`ref` 可用 commit SHA。
- tarball 包含仓库完整目录，适合一次性获取 skill 目录及其 `scripts/`、`references/`。
- 相比逐文件 `contents` 请求，tarball 把“每 skill 多次请求”降为“每 repo 1 次归档请求”。
- 归档可能很大；必须设置大小上限与解压限制。

**策略：**

1. 先拉 repo 元数据（1 请求）和 tree（1 请求），找到所有 `SKILL.md` 路径。
2. 用 **commit SHA** 拉 tarball（1 请求），确保内容与 commit 对应。
3. 安全解压：
   - 拒绝绝对路径、`..`、符号链接、硬链接、设备文件。
   - 限制归档大小（如 50 MB）、解压后总大小（如 200 MB）、文件数（如 10,000）。
   - 只保留 skill 目录（`SKILL.md` 的父目录）及其子文件；其他文件丢弃。
   - 不执行任何脚本；不安装依赖。
4. 对每个 skill：
   - 计算 `bundleHash`（文件清单 + 每个文件 SHA-256）。
   - 扫描文本文件；记录 `coverage`。
5. 清理临时目录。

**配额测算 [I]：**

| 规模 | 每 repo 请求 | 总请求 | GITHUB_TOKEN 1,000/hr | PAT 5,000/hr |
|---|---|---|---|---|
| 300 repos | 3 | 900 | ~1 小时 | <20 分钟 |
| 1,000 repos | 3 | 3,000 | ~3 小时 | <1 小时 |
| 3,000 repos | 3 | 9,000 | ~9 小时（分 2 天） | ~2 小时 |
| 5,000 repos | 3 | 15,000 | ~15 小时（分 3 天） | ~3 小时 |

> 日常增量只拉 `pushed_at` 变化的 repo；用 ETag/条件请求；5,000 规模日常通常 <500 请求。公开仓库的定时工作流在 60 天无活动后会自动禁用，需要每月一次 keepalive 或手动启用 [S20]。

**失败路径：**

- tarball 过大/超时 → 回退到 tree + 只取 `SKILL.md`；`scan.status=partial`，不发布为“已完整扫描”。
- tarball 解压失败 → 隔离，记录原因。
- repo 404/403 → 标记 `archived` 或 `removed`，不阻塞整批。
- 子模块/符号链接 → 跳过并记录。

### 7.3 解析、校验与去重

**解析：**

- `gray-matter` 提取 frontmatter；YAML 失败时尝试“给含冒号的值加引号”的宽松回退 [S2]。
- 正文用 `remark` 解析，保留 AST：统计 token、提取代码块/URL/命令行、渲染时 sanitize。

**校验规则（MVP）：**

| 规则 | 严重度 | 动作 |
|---|---|---|
| 缺少 `name` / `description` | 高 | 不发布 |
| `name` 不符合正则 | 高 | 不发布 |
| `name` 与目录名不一致 | 中 | 警告；可发布但标记 |
| `description` > 1,024 | 中 | 截断展示；标记 |
| `description` > 500（Codex 建议） | 低 | 提示作者 |
| frontmatter 不可解析 | 高 | 隔离 |
| 正文为空 | 高 | 不发布 |
| 正文 > 5,000 tokens | 低 | 标记“重” |
| 引用文件不存在 | 中 | 警告 |
| 使用客户端扩展字段 | 信息 | 标记可移植性 |
| `allowed-tools` 存在 | 信息 | 标记“实验性” |

**去重：**

1. **精确**：`bundleHash` 相同 → 同一 skill。
2. **近似**：正文 shingle + SimHash，Hamming ≤3 → 疑似复制。
3. **同名**：`name` + `description` 相似度 > 0.9 → 同一组。
4. **fork 识别**：GitHub `fork=true` 或 repo 名/描述高度相似。
5. **canonical 选择**：官方 > 非 fork > stars > 更早 > 更新。
6. **展示**：重复项默认隐藏；详情页提供“这是 X 的副本”链接。

### 7.4 安全扫描：覆盖、规则与结论

> **v1.0 的问题：** 采集只取 `SKILL.md`，却声称扫描 `scripts/`。v1.1 改为 tarball 获取完整 skill 目录，并明确覆盖边界。

**文件处理策略：**

| 文件 | 处理 |
|---|---|
| `SKILL.md` | 必读、解析、扫描 |
| `scripts/**` | 读取文本内容，扫描；不执行 |
| `references/**` | 读取文本，扫描；可能含提示注入 |
| 其他文本 | 读取并扫描（有大小/数量上限） |
| 二进制（图片/字体/可执行） | 不解析；记录 `binary`；`coverage=partial` |
| 压缩包 | **不解压**；记录 `archive`；`coverage=partial`；高风险时人工复核 |
| 符号链接 | 不跟随；记录；`coverage=partial` |
| 子模块 | 不拉取；记录；`coverage=partial` |
| 超限文件 | 跳过；记录大小；`coverage=partial` |
| 无法获取 | `failed` 或 `partial`；不发布为“完整扫描” |

**限制建议：**

- 每个 skill 最多 50 个文件；每个文本 ≤256 KB；总文本 ≤2 MB。
- 只扫描 skill 目录内文件；不扫描 repo 其他目录。
- 所有文本按 UTF-8 解码（替换非法字节）；NUL 字节视为二进制。
- 记录 `scannerVersion`、`rulesetVersion`、`scannedAt`、`scannedCommit`、`scannedBundleHash`。

**规则集（MVP，可配置）：**

| 规则 | 检测 | 严重度 | 动作 |
|---|---|---|---|
| `SCRIPT_PRESENT` | `scripts/`、`*.sh`、`*.py`、`*.js`、`*.ts`、`*.ps1` | low | 标记 |
| `EXEC_CURL_PIPE` | `curl ... \| bash/sh/zsh`、`wget ... \| sh` | critical | 隔离 |
| `BASE64_EXEC` | `base64 -d` + `eval`/`sh`；长 base64 串 | critical | 隔离 |
| `REMOTE_INSTRUCTIONS` | `curl ... \| source`、`eval $(curl ...)` | critical | 隔离 |
| `CREDENTIAL_ACCESS` | `~/.aws`、`~/.ssh`、`.env`、keychain、`credentials` | high | 人工复核 |
| `NETWORK_FETCH` | `http(s)://`、`fetch(`、`requests.`、`curl`、`wget` | medium | 标记 |
| `PRIVILEGE_ESCALATION` | `sudo`、`chmod +x`、`systemctl`、`launchctl`、注册表 | high | 人工复核 |
| `HIDDEN_UNICODE` | 零宽字符、双向控制符、异常 Unicode | high | 人工复核 |
| `PROMPT_INJECTION_PATTERN` | “ignore previous instructions”、系统提示冒充、DAN | high | 人工复核 |
| `SECRET_PATTERN` | AWS key、GitHub token、私钥、常见 API key 格式 | high | 隔离/通知作者 |
| `OBFUSCATED_ARCHIVE` | 密码保护 zip/rar、`unzip -P` | critical | 隔离 |
| `DESTRUCTIVE_COMMAND` | `rm -rf /`、`mkfs`、删除系统目录 | critical | 隔离 |
| `MEMORY_WRITE` | 写 `MEMORY.md`/`SOUL.md`/agent 配置 | high | 人工复核 |
| `DEPENDENCY_INSTALL` | `npm install`、`pip install`、`brew install`（可能触发 postinstall） | high | 人工复核 |
| `EXTERNAL_INSTRUCTION_FETCH` | 运行时拉取远程指令/配置 | critical | 隔离 |

**风险结论：**

- `scan.status=complete` + `flags=[]` → “在已扫描的全部文本文件中未发现已知模式”。
- `scan.status=partial` → “部分文件未扫描（列表）；未发现模式不代表安全”。
- `scan.status=failed` → “扫描失败；不发布/不推荐”。
- 人工复核 → “人看过这个 commit 的描述、文件树、证据和许可证”；不是安全认证。
- **“无脚本”只表示没有可执行文件；提示词仍可能要求 agent 使用读写、联网、命令工具。**

### 7.5 复核与版本一致性

**复核记录 `reviews.json`：**

```json
{
  "owner/repo/skill-path": {
    "status": "human-approved",
    "reviewed": {
      "commit": "40-hex",
      "bundleHash": "sha256-hex",
      "reviewer": "github-handle",
      "reviewedAt": "2026-11-15",
      "scope": ["description", "file-tree", "scan-evidence", "license"],
      "notes": "No scripts; asks agent to read files but not network.",
      "scan": { "status": "complete", "flags": [], "scannerVersion": "1.0.0", "rulesetVersion": "1.0.0" },
      "licenseStatus": "permissive"
    }
  }
}
```

**规则：**

- 复核必须绑定 `review.reviewed.bundleHash`，不能只绑定 commit（同一 commit 下文件不会变，但 bundleHash 更直接）。
- 上游新 commit / 文件变化 → `review.status=stale`；页面显示“上游已更新，当前版本未复核”。
- **默认安装命令保持指向 `review.reviewed.commit`**，而不是最新同步 commit；用户装到的仍是已复核版本。
- Catalog 保持 `review.reviewed.bundleHash` 的快照，不自动跟随上游；页面明确标注“Catalog 是较早的已复核快照”。
- 扫描规则升级 → 重新扫描；如果 `scannerVersion` 或 `rulesetVersion` 变了，当前扫描标记 `stale`，但已复核快照保留其历史扫描记录。
- 不允许“扫描通过 = 已复核”；两者状态分开。
- `human-rejected` 默认不发布当前版本；是否保留旧已复核版本由复核人标注。若拒绝原因是安全风险，直接 `quarantined`，不保留 Catalog。

### 7.6 更新与回滚

| 机制 | 实现 |
|---|---|
| 上游更新 | 比较 `pushed_at` + tree SHA + commit |
| 内容变化 | 重新计算 `bundleHash` |
| 复核过期 | `review.reviewed.bundleHash !== snapshot.bundleHash` → `review.status=stale` |
| 扫描过期 | `scan.scannedBundleHash !== snapshot.bundleHash` → 当前扫描标记 `stale` |
| 删除/归档 | 404/archived → `archived`，保留 90 天 |
| 恶意变更 | critical → `quarantined` + 开 issue |
| Catalog 回滚 | 保留最近 3 个 `catalog.lock.json`；恢复旧快照并重新构建，**生成新的 version**（复用旧 version 不会触发客户端回退） |
| 数据回滚 | Git revert 对应 data commit；重新构建 |
| 通知 | GitHub Issue / RSS（P1） |

### 7.7 安装机制：命令、目录、固定版本

**三条路径：**

| 路径 | 命令 | 适用 |
|---|---|---|
| **安装已复核版本（推荐）** | `npx skills add <owner>/<repo>@<review.reviewed.commit> --skill "<name>" -a <agent>` | 与网站复核版本一致；上游更新后仍可复现 |
| **安装最新同步版本（可能未复核）** | `npx skills add <owner>/<repo>@<snapshot.commit> --skill "<name>" -a <agent>` | 想拿最新；页面必须标注“可能未复核” |
| **临时使用（无需安装）** | `npx skills use <owner>/<repo>@<review.reviewed.commit> --skill "<name>"` | 先看提示词；不是沙箱 |
| **OpenCode catalog** | `opencode.json` 加 base URL | 只用于 1 个实验 pack，内容为已复核快照 |

**示例：**

```bash
# 安装已复核版本到 OpenCode（项目级）
npx skills add vercel-labs/agent-skills@<40位commit> --skill frontend-design -a opencode

# 临时使用同一版本（打印提示词，不安装）
npx skills use vercel-labs/agent-skills@<40位commit> --skill frontend-design
```

**客户端目录（`skills` CLI 1.8.1）：**

| 客户端 | `--agent` | 项目目录 | 全局目录 |
|---|---|---|---|
| OpenCode | `opencode` | `.agents/skills/` | `~/.config/opencode/skills/` |
| Claude Code | `claude-code` | `.claude/skills/` | `~/.claude/skills/` |
| Codex | `codex` | `.agents/skills/` | `~/.agents/skills/` |
| Cursor | `cursor` | `.agents/skills/` | `~/.cursor/skills/` |

**UI 细节：**

- 客户端选择器：OpenCode / Claude Code / Codex / Cursor / 通用。
- 默认显示**已复核 commit** 的命令；提供“安装最新同步版本（可能未复核）”切换，并明确标注。
- 显示目标目录 + “项目级/全局”切换。
- “临时使用”独立按钮，文案必须包含“无需安装，但不是沙箱”。
- 卸载：`npx skills remove <name>`；说明只删除 lock 跟踪的 skill。
- 更新：`npx skills update <name>`；说明会把 commit 向前移动。
- 锁定：展示 `skills-lock.json` 片段 + commit + `computedHash`。
- Windows 无符号链接权限时，提示使用 `--copy`（复制而非 symlink）。
- 若 `--agent opencode` 不可用 `use --agent`（源码仅支持 claude-code/codex/sarvam-code），不要生成该命令；只给 `use` 打印提示词或交给支持的 agent。

### 7.8 Catalog 发布、缓存、删除与冲突

| 主题 | 行为/要求 |
|---|---|
| 配置 | `opencode.json` 的 `skills` 填 **base URL**（建议结尾 `/`），不是 `index.json` |
| index | 固定 `base/index.json`；字段仅 `name/version/files` |
| 文件 | 必须同源、相对、安全；必须列出 `SKILL.md` 或 `<name>.md` |
| 版本 | **每次文件变化必须 bump `version`**；客户端只比较字符串是否相等（不是 semver）；回滚需重新发布旧 version + 文件 |
| 缓存 | 版本不变只补缺失文件；版本变化原子替换并清理旧文件 |
| 失败 | 更新失败保留旧版本；index 拉取失败则本次不加载 |
| 删除 | 从 index 移除后不再加载，但**不删除本地缓存**；需用户清理 |
| 冲突 | 同名 skill 按 source 顺序覆盖；pack 之间避免重名 |
| 鉴权 | 不支持；必须公开 |
| 完整性 | 无签名/哈希；只靠 HTTPS + 我们的复核 + version |
| 缓存头 | index/文件必须 `no-cache`/`must-revalidate`，避免 CDN 缓存旧内容 |
| 适用 | 只对 OpenCode 生效；只放低风险、许可证允许、已复核的 8–10 个 skill；其他客户端仍用 `skills add` |

---

## 8. UI/UX 信息架构及页面设计建议

### 8.1 设计原则

1. **内容优先，界面退后**：卡片和排版承担主要信息，不靠装饰。
2. **一眼可判断**：名称 + 一句话 + 3 个信号（客户端/风险/新鲜度）。
3. **键盘优先**：⌘K 搜索、`/` 聚焦、`g h` 回首页、`r` 随机。
4. **克制**：近黑背景、1px 边框、一个强调色；没有大渐变、没有玻璃拟态堆叠。
5. **可读**：中文正文 16px/1.75；英文 15–16px/1.6；命令等宽。
6. **可访问**：对比度、焦点、语义、减少动效。
7. **发现优先**：首屏是“逛”的入口，不是安全报告。

### 8.2 视觉方向（不锁死）

设计阶段从三个方向中选一个，不在本阶段定稿：

| 方向 | 基调 | 适合 | 风险 |
|---|---|---|---|
| **A. 青柠/酸橙** | 近黑 + 高亮绿 | “新鲜、上架、可探索” | 容易显得潮牌化 |
| **B. 琥珀/暖橙** | 近黑 + 暖色 | “手作、精选、编辑感” | 容易显得电商 |
| **C. 冷蓝/青** | 近黑 + 冷色 | “工具、可信、技术” | 容易接近 Linear/Raycast 的既有印象 |

**共同 token 建议：**

- `bg #08090A`、`surface #0E1011`、`border rgba(255,255,255,.08)`、`text #EDEDED`、`muted #8A8F98`。
- 字体：Inter/Geist + 中文系统字体栈；等宽 JetBrains Mono。
- 圆角 10–12px；阴影几乎不用。
- 深/浅两套 CSS variables；默认跟随系统。
- 动效 120–180ms；`prefers-reduced-motion` 禁用位移。

### 8.3 信息架构（sitemap）

```
/                                首页（货架）
/explore                         全部 Skills（搜索 + 筛选）
/scenes/[scene]                  场景（5 个）
/collections/[slug]              专题合集（3 个）
/topics/[topic]                  技术主题（可选，SEO）
/agents/[agent]                  客户端兼容页（可选）
/skill/[...id]                   详情
/submit                          提交 Skill
/about                           关于
/curation                        收录标准
/security                        安全与披露
/changelog                       更新日志
/en/...                          英文
/catalog/[pack]/index.json       OpenCode catalog（实验）
/api/v1/skills.json              只读 JSON API
/sitemap.xml
/robots.txt
```

### 8.4 首页布局

```
┌────────────────────────────────────────────────────────────┐
│ Logo   Explore  Scenes  Collections  Submit   ⌘K  [中/EN]  │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  找到能立刻用上的 Agent Skills                              │
│  精选、可逛、装得进你的 agent。                              │
│                                                            │
│  [ 搜索 skill、场景或技术...            ]  [随手拿一件]     │
│                                                            │
├────────────────────────────────────────────────────────────┤
│  今日五件 · 2026-11-15                         [换一批]     │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐   │
│  │ card   │ │ card   │ │ card   │ │ card   │ │ card   │   │
│  └────────┘ └────────┘ └────────┘ └────────┘ └────────┘   │
├────────────────────────────────────────────────────────────┤
│  按场景挑                                                   │
│  [接手代码库] [补测试] [设计稿转代码] [上线自查] [写清楚]    │
├────────────────────────────────────────────────────────────┤
│  本周专题：把设计系统喂给 Agent              [查看 8 个 →]  │
│  一句策展说明……                                             │
│  ┌────────┐ ┌────────┐ ┌────────┐                         │
│  └────────┘ └────────┘ └────────┘                         │
├────────────────────────────────────────────────────────────┤
│  轻量：没有可执行文件 · 仍需审查              [查看全部 →]   │
│  ...                                                       │
├────────────────────────────────────────────────────────────┤
│  官方与团队出品                                [查看全部 →] │
│  ...                                                       │
├────────────────────────────────────────────────────────────┤
│  Footer: 开源 · 收录标准 · 安全 · 免责声明 · GitHub          │
└────────────────────────────────────────────────────────────┘
```

**首页必须避免：**

- 一个巨大的空白 hero（用户不知道下一步）。
- 轮播图（自动播放、不可控）。
- 没有真实数据的“热门”区。
- 把安全扫描放在首屏主视觉。

### 8.5 Explore 页

```
┌──────────────────────────────────────────────────────────┐
│ 搜索 [.......................................]  24 个结果 │
├──────────────┬───────────────────────────────────────────┤
│ 筛选         │  排序: [编辑推荐 ▾]   视图: [ grid | list ]│
│              │                                           │
│ 客户端       │  ┌──────────────┐ ┌──────────────┐        │
│ □ OpenCode   │  │ SkillCard    │ │ SkillCard    │        │
│ □ Claude     │  └──────────────┘ └──────────────┘        │
│ □ Codex      │  ┌──────────────┐ ┌──────────────┐        │
│ □ Cursor     │  │ SkillCard    │ │ SkillCard    │        │
│              │  └──────────────┘ └──────────────┘        │
│ 风险         │                                           │
│ □ 无脚本     │  [ 加载更多 ]                              │
│ □ 含脚本     │                                           │
│ □ 未发现高危 │                                           │
│              │                                           │
│ 场景/主题    │                                           │
│ 许可证       │                                           │
│ 语言         │                                           │
└──────────────┴───────────────────────────────────────────┘
```

**交互：**

- 所有筛选写入 URL query（`?agent=opencode&risk=scripts&sort=editor`），可分享。
- 移动端筛选变成底部抽屉。
- 结果为空时：显示“移除 X 筛选” + 推荐 3 个相近场景。
- 卡片 hover 显示安装命令的“复制”按钮。

### 8.6 详情页

**布局（桌面 8/4 栅格）：**

```
┌──────────────────────────────────────────────┬─────────────────────┐
│ Breadcrumb: Explore / Testing / skill-name   │  信任卡（sticky）    │
│                                              │                     │
│ H1  Skill Name            [官方] [无脚本]     │  来源: owner/repo    │
│ 一句话描述……                                  │  上游: abc1234       │
│                                              │  本站: def5678       │
│ [安装到 OpenCode ▾]  [临时使用]  [GitHub ↗]   │  复核: def5678       │
│                                              │  扫描: complete      │
│ ── 它能做什么 ─────────────────────────────   │  许可: MIT           │
│ 正文/导读……                                   │  更新: 3 天前        │
│                                              │  ─────────────       │
│ ── 什么时候用 ─────────────────────────────   │  风险                 │
│ · ...                                        │  · 含 2 个脚本       │
│                                              │  · 访问网络          │
│ ── 什么时候不适合 ─────────────────────────   │  · 未发现凭据访问    │
│ · ...                                        │  [查看证据 →]        │
│                                              │                     │
│ ── 配料表 ─────────────────────────────────   │  Token: ~1,200       │
│ [SKILL.md] [文件树] [风险] [版本]             │  文件: 6             │
│                                              │                     │
│ ── 相关 ───────────────────────────────────   │  [报告问题]          │
│ 3 个相似但更轻/更专的 skill                    │                     │
└──────────────────────────────────────────────┴─────────────────────┘
```

**首屏优先级：**

1. 名称 + 一句话 + 客户端兼容 + 安装命令。
2. “什么时候用/不适合”摘要。
3. 信任卡（紧凑，不抢视觉）。
4. 配料表（tab，默认收起部分）。

**安装区：**

- 客户端 segmented control。
- 固定 commit 命令块；可切换“跟随最新”。
- 小字：“默认安装到当前项目；全局加 `-g`。”
- “临时使用”折叠：明确“无需安装，但不是沙箱”。
- “锁定版本”折叠：`skills-lock.json` 片段。

### 8.7 专题与场景页

**专题页：**

```
┌──────────────────────────────────────────────────────────┐
│ 专题 · 2026-11-15 更新                                    │
│ 把设计系统喂给 Agent                                      │
│ 一句有观点的论点……                                        │
│ 策展人: @xxx  ·  8 个 skill  ·  最后复核 2026-11-10        │
├──────────────────────────────────────────────────────────┤
│ 01  frontend-design       为什么选它……        [安装]      │
│ 02  accessibility-audit    为什么选它……        [安装]      │
│ ...                                                      │
├──────────────────────────────────────────────────────────┤
│ 不建议一起装：X 与 Y 都会注入长上下文，二选一。            │
│ [订阅这个货架到 OpenCode（实验）]                          │
└──────────────────────────────────────────────────────────┘
```

**场景页：**

```
接手一个陌生代码库
你可能遇到：找不到入口、不知道先读哪、改一处崩三处。
适合：>5k 行、缺少文档、需要快速建立地图。
不适合：小脚本、已有完善文档、你只改一行。

推荐工作流：
1. 先用 repo-map 建立结构图
2. 再用 code-review 做一次基线审查
3. 最后用 adr-writer 记录决策

[ skills... ]
```

### 8.8 组件清单

| 组件 | 职责 |
|---|---|
| `SiteHeader` | 导航、搜索入口、语言切换 |
| `CommandPalette` | ⌘K 搜索、跳转、复制安装 |
| `SkillCard` | 列表卡片（名称、描述、信号、hover 安装） |
| `SkillRow` | 列表模式 |
| `AgentIcons` | 客户端兼容图标 |
| `RiskBadge` | 无脚本/含脚本/高风险 |
| `Freshness` | 更新时间/临期 |
| `InstallCommand` | 客户端切换 + 固定/最新 + 复制 |
| `TrustPanel` | 详情页右侧信任卡 |
| `VersionPanel` | 上游/本站/复核/安装/catalog 版本 |
| `FileTree` | 文件树 + 预览 |
| `RiskEvidence` | 风险证据列表 + 覆盖范围 |
| `ShelfRail` | 首页横向货架 |
| `SceneChips` | 场景入口 |
| `FilterRail` | Explore 筛选 |
| `EmptyState` | 空结果/无数据 |
| `ReportLink` | 举报/下架入口 |
| `LangToggle` | 中英切换 |

**控制在 ~18 个组件**；不要过早抽象 design system。

### 8.9 响应式

| 断点 | 布局 |
|---|---|
| < 640 | 单列卡片；底部导航（逛/搜/合集）；筛选抽屉；详情页底部粘性安装条 |
| 640–1024 | 2 列卡片；筛选可折叠 |
| 1024–1280 | 3 列卡片；详情 8/4 |
| > 1280 | 最大宽度 1200–1280px；4 列卡片；留白增加 |

### 8.10 可访问性

- WCAG 2.2 AA：正文对比度 ≥4.5:1；大字 ≥3:1。
- 焦点可见：2px 强调色 outline，`outline-offset: 2px`。
- 键盘：Tab 顺序合理；命令面板焦点陷阱；Esc 关闭。
- 语义：`<nav>`、`<main>`、`<h1>` 唯一；卡片链接不要嵌套按钮。
- 动效：`prefers-reduced-motion: reduce` 时禁用位移/缩放。
- 图标：`aria-label` 或 `aria-hidden`；不要只靠颜色传达风险。
- 表单：label、错误提示、`aria-describedby`。
- 语言：`<html lang="zh-CN">` / `en`；混排时用 `lang` 标注原文。

### 8.11 文案示例

| 场景 | 中文 | 英文 |
|---|---|---|
| 搜索占位 | 搜 skill、场景或技术，例如“补测试” | Search skills, scenes, or tech, e.g. “add tests” |
| 随机按钮 | 随手拿一件 | Surprise me |
| 无脚本 | 无脚本；提示词仍可能要求 agent 读写文件或联网 | No scripts; instructions may still ask the agent to use file or network tools |
| 含脚本 | 含 2 个脚本 | 2 scripts included |
| 扫描部分 | 部分文件未扫描，未发现模式不代表安全 | Some files were not scanned; no findings is not a safety guarantee |
| 未复核 | 我们还没复核这个版本 | Not reviewed at this commit |
| 风险提示 | 未发现高危模式，但这不等于安全 | No high-risk patterns found. This is not a safety guarantee. |
| 安装 | 安装到 OpenCode | Install for OpenCode |
| 临时使用 | 临时使用（无需安装） | Try without installing |
| 空结果 | 没找到。试试“补测试”或“设计稿转代码”。 | Nothing found. Try “add tests” or “design to code”. |

---

## 9. Vercel Hobby 资源、成本与扩展性评估

### 9.1 Hobby 额度（2026-11 官方）

**事实 [S16][S18]：**

| 资源 | Hobby 额度 |
|---|---|
| Fast Data Transfer | 前 **100 GB**/月 |
| **CDN Requests** | 前 **1,000,000**/月 |
| Function Invocations | 前 **1,000,000**/月 |
| Active CPU | **4 CPU-hours**/月 |
| Provisioned Memory | **360 GB-hours**/月 |
| Deployments | **100/天** |
| 并发构建 | **1** |
| 单次构建时长 | **45 分钟** |
| 静态文件上传（CLI 源文件） | **100 MB** |
| 运行时日志 | **1 小时** |
| Web Analytics | **50,000 events/月** |
| Build vCPU / Memory | 2 vCPU / 8 GB |
| 项目数 | 200 |
| 自定义域名/项目 | 50 |

### 9.2 政策约束（必须先确认）

**事实 [S17]：**

> “You shall only use the Services under a Hobby plan for your personal or non-commercial use.”

**事实 [S17]：**

> “We reserve the right to disable or remove any Project or website deployment on the Hobby plan with or without notice at our sole discretion.”

**事实 [S17]：**

> Hobby 计划下，Vercel 可将你的内容用于训练 AI/ML 模型，并可与第三方共享用于模型训练。

**含义 [I]：**

1. 如果项目未来有**广告、赞助、付费收录、商业服务**，Hobby 不再适用；需要 Pro（约 $20/月起）或换平台。
2. 即使是“开源非商业”，Vercel 也保留随时关闭的权利；**必须准备静态迁移方案**。
3. 如果接受用户提交的内容（描述、导读），要注意 Hobby 的模型训练条款；**不要在站内提交敏感信息**。
4. **这是一个“待决策”项，不是技术细节。** 见 12.2。

### 9.3 访问情景：请求数、传输量、构建频率

**假设：**

- 每页请求数：**6–10**（HTML 1、CSS 1、JS 1–3、字体 1–2、图标/杂项 1–2；搜索页额外 3–10 个 Pagefind 分块）。**CDN 请求按每个静态资源计，不只是 HTML 页面。**
- 平均页面传输：**200–300 KB**（不含搜索索引；不含大图）。
- 搜索使用率：15% 的访问。
- 构建：每日同步 1 次 + PR 预览 20 次/月 + 手动 10 次/月。

| 情景 | 月 PV | 请求数（8/页） | 传输（250 KB/页） | 搜索额外请求 | Hobby 判断 |
|---|---|---|---|---|---|
| **低** | 3,000 | 24,000 | 0.75 GB | ~3,600 | 很安全 |
| **中** | 30,000 | 240,000 | 7.5 GB | ~36,000 | 安全 |
| **高** | 100,000 | 800,000 | 25 GB | ~120,000 | **接近 1M 请求上限** |
| **超高** | 150,000 | 1,200,000 | 37.5 GB | ~180,000 | **超过请求上限** |

**结论 [I]：**

- **绑定约束是 CDN 请求数，不是带宽。** 100 GB 带宽可撑约 40 万 PV（按 250 KB），但 1M 请求在 10–12 万 PV 就用完。
- 100k PV/月是 Hobby 的现实上限（按 8 请求/页）；如果优化到 5 请求/页，可到 ~16 万 PV。
- 搜索页会显著增加请求；不要在全站预加载 Pagefind。
- 如果月 PV > 10 万，或商业化：升级 Pro / 迁 Cloudflare Pages / GitHub Pages / 自托管。

### 9.4 Skill 规模：100 / 500 / 2,000 / 5,000

| 已发布 skills | 页面数（中英 + 专题/场景） | 构建估算 | Pagefind 索引估算 | 可行性 |
|---|---|---|---|---|
| **100** | ~230 | 1–2 分钟 | 0.5–1 MB | 很轻松 |
| **500** | ~1,100 | 2–4 分钟 | 2–4 MB | 轻松 |
| **2,000** | ~4,200 | 4–8 分钟 | 6–10 MB | 可行，需监控构建 |
| **5,000** | ~10,200 | 8–15 分钟 | 12–20 MB | 可行，接近建议上限 |
| **20,000** | ~40,000 | 30–50 分钟 | 40 MB+ | 不建议；接近 45 分钟限制 |

> 以上为估算，需在 Phase 1 用真实数据实测。Pagefind 索引是分块懒加载，不代表首屏下载全部；但索引总量影响构建时间与 CDN 文件数。

**建议：**

- 公开测试版：**120**。
- 3 个月：**500**。
- 硬上限：**5,000**；超过则暂停自动收录，先优化质量或升级架构。
- 5,000 时若构建 >20 分钟，减少每个 topic 的静态页、拆分构建或迁移。

### 9.5 构建与部署频率

| 项目 | 估算 | 风险 |
|---|---|---|
| 每日同步 1 次 | 30 次部署/月 | 安全（100/天限制） |
| PR 预览 20–40 次/月 | 20–40 次 | 安全；注意并发构建 1 |
| 手动部署 10 次/月 | 10 次 | 安全 |
| 单次构建 5,000 skills | 8–15 分钟 | 低于 45 分钟；需实测 |
| 构建缓存 | Astro/Node 依赖 | 可显著缩短 |
| 并发构建 | 1 | 多个 PR 同时触发会排队，不失败 |

**注意：**

- Vercel 的 100 deployments/day 是团队级；正常使用远低于。
- 1 个并发构建意味着“同时只能跑一个”；不要在同一天合并大量数据 PR。
- 每日同步应生成**一个 bot commit**，避免多次触发构建。
- GitHub Actions 的定时工作流在 60 天无活动后会自动禁用；每月 keepalive 或手动启用 [S20]。

### 9.6 缓存策略

| 资源 | 建议 Cache-Control | 说明 |
|---|---|---|
| HTML | `s-maxage=300, stale-while-revalidate=86400` | 5 分钟更新；CDN 可回源 |
| Hashed JS/CSS | `public, max-age=31536000, immutable` | 文件名带 hash |
| 字体 | `public, max-age=31536000, immutable` | 只自托管 Latin subset |
| `data/index/*.json` | `public, max-age=300, stale-while-revalidate=86400` | 列表/命令面板 |
| `pagefind/*` | 入口短缓存；分块 immutable | Pagefind 分块带 hash |
| `catalog/*/index.json` | `public, max-age=0, must-revalidate` | 版本变化必须可见 |
| `catalog/*/<skill>/*` | `public, max-age=0, must-revalidate` | 文件 URL 固定，内容会变 |
| 图片 | 避免大图；SVG/CSS 优先 | 减少请求与带宽 |

### 9.7 成本情景与迁移

| 情景 | 月 PV | 方案 | 月成本 | 备注 |
|---|---|---|---|---|
| 冷启动 | <10k | Vercel Hobby | $0 | 非商业 |
| 增长 | 30k | Vercel Hobby | $0 | 安全 |
| 热门 | 100k | Vercel Hobby | $0（接近上限） | 监控请求数 |
| 超限 | 150k+ | Vercel Pro | ~$20 + 用量 | 或迁静态平台 |
| 商业 | 任意 | Vercel Pro | ~$20 起 | Hobby 不允许商业 |
| 自托管 | 任意 | Cloudflare Pages / Netlify / GitHub Pages | $0–低 | 额度以最新政策为准 |

**迁移能力：**

- Astro 静态输出 `dist/`，无 Vercel 专有 API（不用 ISR、KV、Blob、Edge Config）。
- 换托管只需改构建命令、输出目录、缓存头、DNS。
- **Phase 1 做一次迁移演练**：把 `dist/` 部署到 GitHub Pages 或本地 Nginx。

---

## 10. 安全、许可证与开源协作机制

### 10.1 威胁模型

| 威胁 | 说明 | 现实证据 | 我们的对策 |
|---|---|---|---|
| **直接提示词注入** | SKILL.md 正文包含“忽略之前指令”等 | Snyk：36.82% 有安全问题；恶意样本 91% 含提示注入 [S12] | 静态规则 + 人工复核 + 展示原文；不执行 |
| **间接提示词注入** | skill 抓取网页/issue/邮件，内容含恶意指令 | 第三方内容暴露在 ClawHub 占 17.7% [S12] | 标记“访问网络”；提示用户 |
| **恶意脚本** | `scripts/` 包含凭据窃取、后门、RCE | 恶意样本 100% 含恶意代码模式 [S12] | 文件清单 + 脚本扫描；不执行 |
| **远程指令加载** | `curl ... | source`，行为可变 | 2.9% ClawHub；恶意样本 21% [S12] | 高危规则，直接隔离 |
| **混淆/隐藏** | base64、零宽字符、双向文本 | 安全研究持续报告 [S12] | 检测并展示证据 |
| **凭据/密钥泄露** | 硬编码 API key、读取 `~/.aws` | ClawHub 10.9%；恶意样本 32% [S12] | 规则扫描 + 许可证/密钥提示 |
| **typosquatting / 仿冒** | 名称相似、冒充官方 | 安全研究记录 [S11][S12] | 官方 org 白名单；同名聚类；人工审核 |
| **供应链接管** | 仓库被转移/作者账号被盗 | 通用开源风险 | commit 锁定 + 变更提醒 + 复核过期 |
| **记忆污染** | skill 修改 agent 的长期记忆 | Snyk 提到 `SOUL.md`/`MEMORY.md` 风险 [S12] | 标记“写入记忆/配置”模式；提示 |
| **许可证侵权** | 抓取/镜像未经许可的内容 | 通用 | L0–L4 分级；全文/镜像需许可；下架流程 |
| **Catalog 撤回困难** | 已缓存 skill 不会自动删除 | OpenCode 源码行为 [S23][S24] | 只放低风险 skill；安全事件时从 index 移除 + 公告 + 清理指引 |

### 10.2 关键安全事实（写进产品文案）

**Snyk ToxicSkills（2026-02）[S12]：**

- 扫描 **3,984** 个来自 ClawHub 与 skills.sh 的 skill。
- **13.4%（534 个）** 至少有一个 CRITICAL 级问题。
- **36.82%（1,467 个）** 至少有一个安全问题。
- **76** 个确认的恶意 payload；**8** 个在发布时仍在线。
- 恶意样本中 **91%** 同时使用提示注入，**100%** 含恶意代码模式。
- ClawHub 中 **10.9%** 含硬编码密钥。

**结论 [I]：** “加一个安全徽章”不够；用户需要**可检查的证据**和**安装前的决策信息**。同时，任何“安全认证”都不可信——包括我们自己的。

### 10.3 风险状态与展示

| 维度 | 取值 | UI |
|---|---|---|
| 扫描状态 | `complete` / `partial` / `failed` / `not-scanned` | 明确显示；partial 必须解释 |
| 风险级别 | `none` / `low` / `medium` / `high` / `critical` | critical/high 红色；medium 黄色；其他灰色 |
| 复核状态 | `unreviewed` / `machine-scanned` / `human-approved` / `human-rejected` / `stale` | 徽章 + commit |
| 发布状态 | `published` / `quarantined` / `archived` / `removed` | 隔离/下架说明 |

**展示原则：**

- 永远显示“未发现 ≠ 安全”。
- 每个 flag 可展开看证据（文件、行、片段）。
- 不把多个 flag 合成一个分数。
- 高危 flag 出现在卡片上，不只详情页。
- **“无脚本”不等于“不访问网络/不操作文件”**；必须解释提示词仍可驱动 agent 使用工具。

### 10.4 自动校验规则与治理

> 只做**静态**检查；**绝不执行**第三方脚本。规则集、检测模式、严重度与动作见 **§7.4**，本节只定义治理要求，避免两处规则表漂移。

**治理要求：**

- 规则文件化（YAML/TS 数组），便于社区贡献。
- 每条规则有 `id`、`severity`、`pattern`、`message`、`references`。
- 误报通过 `allowlist`（按 skill id + 证据 hash）管理；allowlist 需 PR 审核。
- 规则测试：恶意/良性样本各 20 条做回归；**不追求 0 误报，追求可解释**。
- 扫描器版本化；规则更新后重新扫描全部已发布 skill。

### 10.5 人工复核

| 对象 | 要求 |
|---|---|
| 首发 120 个 | 至少 1 名维护者看过：描述、文件树、扫描证据、许可证 |
| 专题/首页推荐 | 2 名维护者或 1 名 + 作者确认 |
| 高风险 skill | 必须人工复核 + 记录理由 |
| 复核记录 | `reviews.json`：skill id、commit、bundleHash、reviewer、日期、scope、结论 |
| 复核过期 | bundleHash 变化即过期；显示“上游已变更” |

**复核检查清单：**

1. 描述是否准确？有没有夸大？
2. 是否包含未声明的网络/凭据/脚本行为？
3. 脚本是否可读？有没有混淆？
4. 许可证是否允许展示/分发？
5. 是否有明显的提示注入/越权指令？
6. 安装命令是否可用？
7. 是否与已有 skill 重复？

### 10.6 版权与许可证：L0–L4 五级策略

> **不是法律意见。** L0–L4 是产品政策阈值，不是法律标准；上线前建议做一次法律审阅，尤其是全文展示与 catalog 镜像。

| 级别 | 内容 | 允许条件 | 默认 |
|---|---|---|---|
| **L0** | 来源链接 + 事实元数据（名称、repo、路径、许可证、star、日期） | 公开仓库；事实性信息 | ✅ 总是允许 |
| **L1** | 网站自行撰写的客观简介/中文导读/场景说明 | 基于阅读的原创表达；不逐字复制长段 | ✅ 总是允许 |
| **L2** | 短引用原文描述（≤300 字符，注明来源） | 许可证允许，或合理使用评估 | ◐ 谨慎；未知许可证不用 |
| **L3** | 展示完整 `SKILL.md` | 许可证允许复制/展示，或作者书面许可；保留版权/许可声明 | ◐ 仅许可明确时 |
| **L4** | 镜像完整 skill 文件 / 通过 catalog 再分发 | 许可证明确允许再分发，或作者书面许可；保留 LICENSE/NOTICE | ◐ 仅 1 个实验 pack |

**许可证未知：**

- 只做 **L0 + L1**。
- 不展示 L2/L3，不镜像 L4。
- 页面显示“许可证未声明；请查看源仓库”。
- 依据：GitHub 官方说明，无许可证时默认版权法适用，他人不得复制、分发或创作衍生作品 [S29]。

**许可证冲突（仓库 vs frontmatter）：**

- 标记 `licenseStatus=conflict`。
- 暂按更严格者处理；不展示全文、不镜像。
- 联系作者澄清；解决后更新。

**明确禁止再分发：**

- 只做 L0 + L1。
- 不进入 catalog。
- 如果已经镜像，下个构建移除并保留记录。

**作者要求下架：**

- 验证身份/权利。
- 7 天内移除 L2–L4；如作者要求全量移除，连 L0/L1 一起移除并保留 tombstone。
- 公开说明（不泄露隐私）。

**GitHub 公开仓库不等于开源：**

- 公开可见 + fork 权，不等于普通 reuse/再分发权 [S29]。
- 我们的 L0/L1 是元数据与原创评论；L3/L4 需要额外许可。

**数据库权利：**

- 不要复制他人数据库的实质性部分；我们的目录是人工策展 + 元数据，仍需法律审阅。
- 不批量复制 competitor 的描述/分类/评分。

### 10.7 收录标准

**硬性：**

1. 公开 GitHub 仓库，可访问。
2. 有合法 `SKILL.md`（name/description 可解析）。
3. 许可证明确，或作者允许 L0/L1 + 链接。
4. 不包含 critical 风险模式（或已完成人工复核并明确标注）。
5. 不是恶意/仿冒/纯垃圾内容。
6. 最近 12 个月有更新，或属于“稳定完成态”且人工复核通过。

**质量（至少满足 3 项）：**

1. 描述清楚说明“做什么/何时用”。
2. 有示例、边界情况或参考文件。
3. 作者/组织有可验证的历史。
4. 被至少一个专题/场景采用。
5. 通过规范校验且可移植。
6. 无脚本或脚本可读、职责单一。

**拒绝：**

- 纯 prompt 合集/提示词堆砌，无明确任务。
- 包含未声明的网络上传、凭据读取、远程执行。
- 侵权、冒充官方、恶意刷量。
- 无法确认来源/许可证。
- 长期不维护且无可信替代。

### 10.8 社区贡献流程

```
用户提交 GitHub Issue（Form）
  → bot 校验 URL/重复/基本格式
  → 自动标签：needs-review / duplicate / invalid
  → 维护者审核（目标 7 天内）
  → 通过：加入 data/seeds/submissions.yml，提 PR
  → CI 跑解析/扫描/构建
  → 合并 → 下次同步上架
  → 拒绝：说明原因 + 申诉入口
```

**Issue Form 字段：**

- 仓库 URL
- Skill 路径（如果仓库有多个）
- 一句话说明（为什么值得收录）
- 你与作者的关系（作者/用户/无）
- 许可证确认
- 是否包含脚本/网络/凭据（自述）
- 可选：中文导读

### 10.9 下架、争议与安全披露

| 流程 | 承诺 |
|---|---|
| 安全问题举报 | `security@` 邮箱 + GitHub Security Advisory；48 小时内确认 |
| 版权/许可证投诉 | `takedown@` 邮箱 + Issue 模板；72 小时内确认，7 天内处理 |
| 作者要求下架 | 验证身份后 7 天内移除；保留 tombstone |
| 争议内容 | 先隐藏，双方举证，维护者裁决；公开说明（不泄露隐私） |
| 恶意提交 | 拉黑 + 报告 GitHub；保留证据 |
| 安全事件公告 | `/security` 页面 + changelog；说明影响范围与修复 |
| Catalog 撤回 | 从 index 移除 + bump version + 公告 + 清理缓存指引；**不能保证已缓存副本消失** |

**`security.txt`：**

```
Contact: mailto:security@example.com
Expires: 2027-11-15T00:00:00.000Z
Preferred-Languages: zh, en
Canonical: https://example.com/.well-known/security.txt
```

### 10.10 免责声明模板（需法律审阅）

> 本站是一个独立的开源目录，与 Anthropic、OpenAI、Vercel、Cursor 等公司无隶属或背书关系。
>
> 本站列出的 Agent Skills 由第三方作者创建和维护。我们展示来源、许可证、文件清单、版本和静态扫描结果，但**不对任何 Skill 的功能、安全性、合法性或适用性作出保证**。静态扫描只能发现已知模式，不能发现所有恶意行为；标记为“未发现”不代表安全；“无脚本”也不代表不会访问文件或网络。
>
> 安装 Skill 意味着你允许第三方指令在你的 Agent 中运行，可能访问文件、网络、凭据和系统命令。请在安装前阅读源代码，并在隔离环境中测试。你对自己的使用行为负责。
>
> 如果你认为某条目侵犯了你的权利或存在安全风险，请通过 `/security` 或 `takedown@` 联系我们。

### 10.11 本项目自身许可

| 资产 | 许可 | 理由 |
|---|---|---|
| 站点代码 | MIT | 便于复用、贡献 |
| 数据管道代码 | MIT | 同上 |
| 编辑内容（导读/专题/场景） | CC BY 4.0 | 便于传播，需署名 |
| 我们生成的元数据/索引字段 | CC BY 4.0 | 便于复用；不主张上游内容的额外权利 |
| 上游 skill 内容 | 原许可证 | 不改变；L3/L4 需额外许可 |
| Logo/品牌 | 保留 | 避免冒充 |

---

## 11. 分阶段开发路线及各阶段验收标准

> 假设 1 名全职开发者 + 兼职内容/设计支持；**6 周**公开测试版。AI Coding 可加速工程，但不加速人工审核/翻译。

### Phase 0：方案与决策（本轮）

**产出：** v1.1 文档 + 修订报告。  
**验收：** 关键事实有来源；OpenCode/CLI 行为核实；MVP 与数据模型一致；待决策项明确。  
**退出条件：** 你确认 12.2 的关键事项。

### Phase 1：基础骨架（第 1 周）

**任务：**

- 初始化 Astro + Tailwind + React 岛（**开发阶段才做**）。
- 定义 `SkillRecord` schema（Zod）。
- 设计 tokens、布局、卡片、导航。
- 手工 20 个 seed → JSON → 首页/详情/Explore 雏形。
- 建立 `data/repos`、`data/editorial`、`catalog-src` 目录结构。

**验收：**

- 20 个 skill 通过 schema 校验。
- 首页/详情/Explore 本地构建。
- Lighthouse 移动端 ≥90（雏形）。
- 构建 <2 分钟。
- 无运行时后端依赖。

### Phase 2：采集与扫描（第 2 周）

**任务：**

- GitHub Actions `sync.yml`：seed → repo → tree → tarball → 解析。
- 安全解压、大小限制、失败隔离。
- 去重（bundleHash + SimHash）、canonical 选择。
- 风险规则 v1（15 条）、证据提取、扫描覆盖。
- 许可证解析、L0–L4 判定。
- 扩展到 120 个发布 skill。

**验收：**

- 120 个 skill 增量同步 <10 分钟；首次回填 <2 小时。
- 0 个未处理异常；失败 repo 有记录。
- 100% 已发布 skill 有 source/commit/license/scan status。
- critical flag 0 个进入 published。
- 规则回归样本 40 条通过（恶意/良性各 20）。
- 扫描覆盖 `complete/partial` 正确显示；二进制/压缩包不被误判为已扫描。
- 连续 3 天定时同步成功。

### Phase 3：发现体验（第 3 周）

**任务：**

- Pagefind 集成（中英双语、CJK）。
- Explore 筛选/排序/URL 状态。
- 命令面板（⌘K）。
- 今日五件、随机、场景入口。
- 首页货架模块。
- 移动端筛选抽屉、粘性安装条。

**验收：**

- 中文“测试”“设计稿”“部署”各返回 ≥3 个相关结果，top 10 含预期。
- 英文拼写错误（如 `desgin`）能返回 design 类结果。
- 5,000 条模拟数据下，搜索 p95 <150ms。
- 所有筛选可分享 URL；刷新后状态保留。
- 键盘可完成：搜索 → 打开详情 → 复制安装命令。

### Phase 4：版本、信任与 Catalog（第 4 周）

**任务：**

- 六层版本状态机、`bundleHash`、复核记录。
- 详情页信任卡、配料表、文件树、扫描覆盖、版本面板。
- 固定 commit 安装命令；临时使用；客户端目录。
- 1 个 OpenCode catalog pack（8–10 个 skill）。
- 提交 Issue Form、收录标准、安全页、免责声明。

**验收：**

- 每个已发布 skill 显示：上游/本站/复核/安装/catalog 版本。
- `review.status=human-approved` 必须与 `review.reviewed.bundleHash` 一致；默认安装命令指向 `review.reviewed.commit`。
- 固定 commit 命令可安装；`skills use` 文案无“安全/沙箱”误导。
- Catalog 能被 `opencode.json` 加载；version 不变不重复下载；version 变化刷新；缺失文件回退旧版；移除/缓存限制有文档。
- 所有页面有 title/description/canonical/hreflang。

### Phase 5：内容与双语（第 5 周）

**任务：**

- 3 个专题、5 个场景的编辑内容。
- 40 个中文导读。
- 首页货架文案、空状态、错误状态。
- SEO：sitemap、JSON-LD、OG 默认图。
- 社区贡献指南、PR 模板。

**验收：**

- 每个专题 ≥6 个 skill，有策展说明/复核日期。
- 每个场景有“适合/不适合”。
- 40 个中文导读无明显机翻腔（人工抽检 10 条）。
- A11y 自动检查 0 critical。
- 所有页面可索引；sitemap 无 404。

### Phase 6：发布（第 6 周）

**任务：**

- 迁移演练（GitHub Pages / 本地 Nginx）。
- 安全自查：CSP、sanitize、外链、依赖审计。
- 性能优化：字体、缓存、图片、索引懒加载。
- 发布清单：域名、DNS、Analytics、Search Console、sitemap 提交。
- 社区运营：欢迎 issue、贡献指南、首批作者沟通。

**验收：**

- 生产构建 <10 分钟；Lighthouse 移动端 Perf/A11y/SEO ≥95。
- 0 个 critical 依赖漏洞（`npm audit`）。
- CSP 无 inline script（除必要的 hash/nonce）。
- 10 条安装命令在临时目录验证通过（4 个客户端）。
- 迁移演练成功，站点无 Vercel 专有依赖。
- 发布后 7 天无 P0/P1 事故。

### 11.1 时间线与依赖

```
Week 1  Phase 1  ████████
Week 2  Phase 2  ████████
Week 3  Phase 3  ████████
Week 4  Phase 4  ████████
Week 5  Phase 5  ████████
Week 6  Phase 6  ████████
```

**关键路径：** schema → tarball 采集 → 120 条数据 → 搜索/详情 → 版本/复核 → 内容 → 发布。  
**可并行：** 设计系统/组件（Week 1–3）、编辑内容（Week 2–5）、安全规则（Week 2–5）。

### 11.2 发布清单（Go/No-Go）

- [ ] 120 个已发布 skill，100% 有来源/许可证/扫描状态
- [ ] 0 个 critical 风险进入 published
- [ ] 3 个专题、5 个场景完成
- [ ] 40 个中文导读
- [ ] 搜索黄金查询通过
- [ ] 安装命令验证通过（4 客户端）
- [ ] 每个详情页显示六层版本
- [ ] 1 个 OpenCode catalog 可加载；缓存/移除限制有文档
- [ ] 免责声明/收录标准/下架流程可访问
- [ ] L3/L4 版权策略已审阅（至少 Catalog 再分发）
- [ ] Lighthouse ≥95（Perf/A11y/SEO）
- [ ] 迁移演练通过
- [ ] Vercel 使用条款确认（非商业）
- [ ] 备份/回滚方案（Git + Vercel 上一版）

---

## 12. 主要风险、待决策问题与最终建议

### 12.1 风险矩阵

| # | 风险 | 概率 | 影响 | 缓解 | 触发信号 |
|---|---|---|---|---|---|
| 1 | **Vercel Hobby 非商业条款** | 高 | 高 | 不商业化；静态可迁移；商业化则 Pro/换平台 | 收到 Vercel 通知/项目被暂停 |
| 2 | **CDN 请求数超限** | 中 | 高 | 优化请求数；100k PV 监控；Pro/迁移 | 月请求接近 1M |
| 3 | **版权/许可证** | 中 | 高 | L0–L4；未知只做 L0/L1；下架流程 | 收到投诉 |
| 4 | **安全责任** | 高 | 高 | 不认证；扫描覆盖可见；免责声明；快速下架 | 用户报告恶意 skill |
| 5 | **数据质量/垃圾** | 高 | 高 | 精选 120；去重；人工复核；硬上限 5k | 重复率 >20%；举报增多 |
| 6 | **竞品压制** | 中 | 高 | 中文/发现体验/版本透明；不做数量 | 流量连续 2 月下降 |
| 7 | **维护倦怠** | 中 | 高 | 自动化；小范围；社区；SLA 不过度承诺 | 同步连续失败；复核积压 |
| 8 | **构建/性能** | 中 | 中 | 5k 上限；分片；懒加载；迁移演练 | 构建 >20 分钟 |
| 9 | **OpenCode catalog 行为变化** | 中 | 中 | 只做实验；按源码行为测试；可随时下线 | OpenCode 大版本更新 |
| 10 | **标准/客户端变化** | 高 | 中 | 适配层；兼容性矩阵；季度复核 | 客户端 breaking change |
| 11 | **品牌/商标** | 低 | 中 | 不使用他人商标；命名检索；免责声明 | 商标投诉 |
| 12 | **法律辖区/隐私** | 低 | 中 | 无账号；最少数据；隐私页；法律审阅 | 监管问询 |

### 12.2 待决策问题（需要你确认）

| # | 问题 | 选项 | 我的建议 | 影响 |
|---|---|---|---|---|
| 1 | **项目是否严格非商业？** | A. 纯开源非商业；B. 未来可能广告/赞助/付费；C. 不确定 | **A**（若 B/C，直接 Pro 或换平台） | 决定 Vercel Hobby 是否可用 |
| 2 | **默认语言？** | A. 中文为 `/`，英文 `/en`；B. 英文为 `/`，中文 `/zh` | **A** | SEO/首屏/内容策略 |
| 3 | **首发规模？** | A. 100；B. 120；C. 150 | **B（120）** | 内容/审核工作量 |
| 4 | **全文/镜像策略？** | A. 只 L0/L1；B. 许可允许时 L3；C. 再加 L4 catalog | **B + 1 个 L4 实验 pack** | 版权/体验/运维 |
| 5 | **是否做 OpenCode catalog？** | A. 1 个实验 pack；B. 只给命令；C. 3 个 pack | **A** | 差异化/维护/许可 |
| 6 | **是否首发接受社区提交？** | A. 是（Issue Form）；B. 先内测，2 周后开放 | **A**（审核 SLA 写清楚） | 供给/审核负担 |
| 7 | **是否接入 Analytics？** | A. Vercel Web Analytics；B. 自托管 Umami；C. 不做 | **A**（隐私友好，额度够） | 数据/隐私 |
| 8 | **项目许可证？** | A. MIT + CC BY 4.0；B. Apache-2.0 + CC BY-SA；C. AGPL | **A** | 社区/复用 |
| 9 | **品牌名/域名？** | 待定 | 先定一个不与 skills.sh 混淆的名字 | 商标/记忆 |
| 10 | **是否做“购物篮/打包安装”？** | A. MVP 不做；B. P1 | **A** | 范围/复杂度 |
| 11 | **中文导读的生产方式？** | A. 人工为主 + 机器辅助；B. 全机器翻译；C. 只做 UI 翻译 | **A** | 质量/成本 |
| 12 | **同步频率？** | A. 每日；B. 每周 | **A**（增量成本低） | 新鲜度/CI 负担 |

### 12.3 最终建议

**建议：做，但按“窄 MVP + 发现优先”做。**

**三个下注：**

1. **发现体验（Discovery）**：货架、场景、随机、今日精选。这是用户来的理由。
2. **精选（Curation）**：120 个精选 > 400 万个条目；每个上架有“为什么是它”。
3. **可检查（Inspectability）**：来源、版本、扫描覆盖、commit 锁定，替代虚假安全分。

**不做什么：**

- 不做全量索引。
- 不做 AI 语义搜索/推荐。
- 不做账号/评论/评分。
- 不做自建 CLI。
- 不做安全认证。
- 不做商业化的 Hobby 部署。
- 不把 OpenCode catalog 当核心架构。

**成功的样子（6 个月）：**

- 500 个精选 skill，5,000+ 月访问。
- 30% 搜索→详情，15% 详情→复制安装。
- 10+ 社区提交/月。
- 3–5 个被社区引用的专题。
- 0 起严重安全事故。
- 至少 1 个客户端/作者主动合作。

**止损/转向条件：**

- 8 周后月访问 <500，且搜索→详情 <10% → 重新评估定位（可能只做“中文导读层”或“OpenCode pack 策展”）。
- Vercel 明确要求商业升级 → 迁 Cloudflare Pages 或 Pro，不放弃项目。
- 安全事件导致信任受损 → 暂停自动收录，转纯人工精选。
- OpenCode catalog 行为变化/不可用 → 下线该功能，保留命令安装。

### 12.4 下一步（等你确认后）

1. 你确认 12.2 的 12 个问题（至少 1–5、8、9）。
2. 定品牌名/域名（避免与 skills.sh / SkillsMP 混淆）。
3. 进入 Phase 1：初始化项目、设计 tokens、schema、20 个 seed（**本轮不执行**）。
4. 同步建立 `docs/` 文档与 Graphify（按你的全局规范）。

---

## 附录 A：调研来源

> 访问日期：2026-11-15。官方文档优先；产品页面用于功能观察；GitHub API 计数为当日快照。

| ID | 来源 | URL | 用途 |
|---|---|---|---|
| S1 | Agent Skills Specification | https://agentskills.io/specification | 规范、字段、渐进披露 |
| S2 | Adding skills support to your agent | https://agentskills.io/client-implementation/adding-skills-support | 目录约定、解析、宽松校验、`.agents/skills` |
| S3 | Claude Code Skills | https://code.claude.com/docs/en/skills | Claude Code 目录、扩展字段、行为 |
| S4 | Codex Skills | https://developers.openai.com/codex/skills | Codex 目录、配置、描述长度建议 |
| S5 | Cursor Agent Skills | https://cursor.com/docs/context/skills | Cursor 目录与兼容 |
| S6 | OpenCode Skills | https://opencode.ai/docs/skills/ | OpenCode 目录、catalog、权限、ID |
| S7 | vercel-labs/skills README | https://github.com/vercel-labs/skills | CLI 能力、80 客户端、lockfile、MIT |
| S8 | skills.sh Docs / API / Home | https://skills.sh/docs, https://skills.sh/docs/api, https://skills.sh/ | 榜单、API、审计、规模 |
| S9 | SkillsMP About / Skills | https://skillsmp.com/en/about, https://skillsmp.com/skills | 规模、分类、定位 |
| S10 | LobeHub Skills Market | https://lobehub.com/skills | 竞品功能、CLI、安装路径 |
| S11 | ClawHub / OpenClaw Docs | https://docs.openclaw.ai/clawhub, https://github.com/openclaw/clawhub | registry、审计、安装 |
| S12 | Snyk ToxicSkills | https://snyk.io/blog/toxicskills-malicious-ai-agent-skills-clawhub | 安全数据、威胁分类 |
| S13 | GitHub REST API 实测 | `search/code?q=filename:SKILL.md`, `search/repositories?q=topic:...` | 规模快照 |
| S14 | GitHub REST Rate Limits | https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api | 60/5,000/1,000、代码搜索 10/min、304 |
| S15 | GitHub Actions Limits | https://docs.github.com/en/actions/reference/limits | GITHUB_TOKEN 1,000/hr、并发、构建 |
| S16 | Vercel Hobby Plan | https://vercel.com/docs/plans/hobby | 额度表 |
| S17 | Vercel Terms of Service | https://vercel.com/legal/terms | Hobby 非商业、关闭权、内容训练条款 |
| S18 | Vercel Limits / Fair Use | https://vercel.com/docs/limits, https://vercel.com/docs/limits/fair-use-guidelines | 通用限制、带宽/函数额度、CDN 请求 |
| S19 | Pagefind Docs | https://pagefind.app/docs/ | 静态搜索、CJK、过滤 |
| S20 | GitHub Scheduled Workflows | https://docs.github.com/actions/using-workflows/disabling-and-enabling-a-workflow | 60 天无活动自动禁用 |
| S21 | Claude Code frontmatter 扩展 | https://code.claude.com/docs/en/skills#frontmatter-reference | 客户端扩展字段 |
| S22 | OpenCode HTTP Catalog | https://opencode.ai/docs/skills/#catalogs | `index.json`、版本、同源 |
| S23 | OpenCode SkillDiscovery source | https://github.com/anomalyco/opencode/blob/dev/packages/core/src/skill/discovery.ts | catalog 缓存/版本/下载/路径安全 |
| S24 | OpenCode skill-discovery tests | https://github.com/anomalyco/opencode/blob/dev/packages/core/test/skill-discovery.test.ts | 版本刷新、原子更新、旧文件清理 |
| S25 | vercel-labs/skills commands docs | https://github.com/vercel-labs/skills/blob/main/docs/commands.md | add/use/remove/update、ref 固定、目录 |
| S26 | vercel-labs/skills agents docs | https://github.com/vercel-labs/skills/blob/main/docs/agents.md | 各客户端项目/全局目录 |
| S27 | vercel-labs/skills use.ts | https://github.com/vercel-labs/skills/blob/main/src/use.ts | `use` 的真实行为、临时目录、支持的 agent |
| S28 | GitHub tarball API | https://docs.github.com/en/rest/repos/contents#download-a-repository-archive-tar | 一次获取完整归档 |
| S29 | GitHub Licensing a repository | https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/licensing-a-repository | 无许可证默认版权 |
| S30 | npm `skills` package | https://www.npmjs.com/package/skills | 当前版本 1.8.1 |

**补充说明：**

- skills.sh 的安装量来自 CLI 匿名遥测，未独立验证；本文只把它作为“规模/热度信号”。
- SkillsMP 的 400 万为页面自述；去重/口径未公开。
- Snyk 数据为 2026-02 的扫描结果，之后生态可能变化；引用时注明时间。
- OpenCode catalog 行为基于 2026-11-15 的 `dev` 分支源码与官方文档；实现可能变化，上线前必须用真实客户端验证。
- Vercel 额度与政策可能变化；上线前需再次核对。

## 附录 B：竞品观察记录（非功能测试）

> 本次未安装/执行竞品 CLI（执行边界限制），仅基于公开页面与文档。

| 观察 | 说明 |
|---|---|
| skills.sh 首页 | 榜单 + 安装量 + 8 周活动；有 Topics/Agents/Official/Packs/Audits；ASCII logo；英文 |
| skills.sh 详情 | API 返回文件树与 SKILL.md 内容；审计接口返回多供应商结果 |
| skills.sh API | 需要 Vercel OIDC；对非 Vercel 应用不友好 |
| SkillsMP | 职业分类是亮点；但“全量地图”导致单条信息薄；无安装命令集成 |
| LobeHub | 市场 CLI 需要注册；安装路径清晰；有 zh-CN；但绑定生态 |
| ClawHub | 安全审计与阻断是亮点；但绑定 OpenClaw，且安全事件多 |
| 共同缺口 | 中文编辑内容、文件级风险证据、版本一致性、发现体验、开放 API |

## 附录 C：术语表

| 术语 | 含义 |
|---|---|
| Agent Skill | 一个包含 `SKILL.md` 的目录，给 agent 提供可复用指令/资源 |
| SKILL.md | YAML frontmatter + Markdown 正文 |
| Progressive disclosure | 启动只加载元数据，激活时加载全文，资源按需加载 |
| Catalog | OpenCode 的 HTTP 技能目录（base URL + `index.json` + 文件） |
| Compact index | 站点构建时生成的轻量 JSON，用于列表/排序/命令面板 |
| Bundle hash | 文件清单 + 内容哈希，代表一个可复现的 skill 版本 |
| Canonical | 重复 skill 组中的“主条目” |
| Risk flag | 静态扫描发现的模式，带证据 |
| Scan coverage | 扫描覆盖范围（complete/partial/failed） |
| Review status | 人工复核状态（unreviewed/machine-scanned/human-approved/stale） |
| Pack | 面向 OpenCode 的小型 skill 集合（8–10 个） |
| Shelf | 编辑策展的专题货架 |
| Scene | 按任务/处境划分的发现入口 |

---

## 附录 D：一页纸决策摘要

| 问题 | 结论 |
|---|---|
| 做不做？ | 做，但做“发现 + 精选 + 可信 + 多客户端”，不做“最大索引” |
| 首发规模 | 120 个精选（100–150 区间），硬上限 5,000 |
| 核心差异化 | 超市式探索、场景推荐、中文导读、安装清晰、版本透明 |
| 技术栈 | Astro + React 岛 + Tailwind + Radix/cmdk + Pagefind |
| 数据 | GitHub Actions + tarball → JSON/YAML 进 Git → Astro 构建 |
| 搜索 | Pagefind（全文/中文）+ compact JSON（排序/命令面板） |
| 安装 | `npx skills add` 固定 commit；`use` 仅“无需安装”，不是沙箱 |
| OpenCode catalog | 1 个实验 pack；base URL；version 必填；不是核心依赖 |
| 版本一致性 | 六层版本 + bundleHash + 复核状态 + 构建断言 |
| 安全 | 扫描覆盖可见；不认证；不承诺绝对安全；无脚本≠不联网 |
| 部署 | Vercel Hobby（仅非商业）；CDN 请求数 ~10–12 万 PV 上限；静态可迁移 |
| 工期 | 6 周（37–55 人日，开发/内容/审核分开） |
| 最大风险 | Hobby 非商业条款、CDN 请求数、版权、安全责任 |
| 现在需要你确认 | 12.2 的 12 个问题，尤其是商业化意图、默认语言、首发规模、全文/镜像策略、catalog 是否做、品牌名 |
