# Agent Skills 开源发现平台 — 调研与方案设计

> 文档版本：v1.0  
> 调研日期：2026-11-15  
> 状态：**待决策，不进入开发**  
> 适用阶段：OpenCode 正式开发前的方案基线  
> 调研方式：官方文档 / 公开 GitHub 仓库 / 产品公开页面 / GitHub API 实测计数 / 安全研究论文与厂商报告  
> 标注约定：**[F] 已验证事实**（附来源）；**[I] 合理推断**（基于事实的判断）；**[R] 个人建议**（需你确认）  
> 阅读说明：正文中的 `[S1]`–`[S22]` 对应附录 A 的来源链接；未特别标注的陈述默认为已验证事实，推断与建议会显式标注。  
> 调研限制：未安装/执行竞品 CLI（遵守执行边界）；未做用户访谈与真实流量压测；产品功能基于公开页面与文档观察；额度与政策以访问日为准。

---

## 0. 摘要

### 0.1 一句话结论

这个项目值得做，但**不能做成“又一个更大的 Skills 索引”**。skills.sh 已收录约 140 万条并拥有 Vercel 官方背景，SkillsMP 已索引约 400 万条 SKILL.md；在“数量”维度正面竞争没有胜算。真正的空位是：

> **面向中文与英文开发者的、可信且可检查的 Agent Skills 精选货架，并以 OpenCode 原生目录订阅作为差异化分发方式。**

### 0.2 六个关键判断

| # | 判断 | 依据 |
|---|---|---|
| 1 | Agent Skills 已经是事实标准，但客户端实现存在明显差异 | SKILL.md 规范由 agentskills.io 维护；Claude Code、Codex、Cursor、OpenCode 均支持，但目录、frontmatter 严格度、扩展字段不同 [S1–S6] |
| 2 | 生态规模巨大，但质量与安全是主要矛盾 | GitHub 文件名 `SKILL.md` 的代码搜索约 **768 万**条结果；Snyk 扫描 3,984 个 skills，**36.82%** 至少有一个安全问题，**13.4%** 有严重问题 [S12][S13] |
| 3 | 现有平台强在“量”和“榜单”，弱在“可信解释”和“中文场景” | skills.sh 有榜单、主题、官方、审计；SkillsMP 有 800+ 职业分类和 9 语言；但均以英文/技术分类为主 [S8][S9] |
| 4 | 安装层不需要自建 | `skills` CLI 已支持 80 个客户端（含 OpenCode），MIT 开源，提供 add/find/use/update/lockfile [S7] |
| 5 | 静态架构足够，且是当前最稳的选择 | 数据可预生成，搜索可用 Pagefind 在浏览器完成，无需数据库、后端或 AI API [S19] |
| 6 | Vercel Hobby 有一个必须先确认的硬约束 | Hobby 仅限**个人或非商业用途**；官方保留随时关闭项目的权利 [S17] |

### 0.3 推荐方案（一句话版）

**Astro 静态站 + Pagefind 搜索 + GitHub Actions 采集 + 提交式 JSON 数据 + `npx skills` 安装 + OpenCode HTTP catalog 订阅**；首发 **500 个经过人工复核的 Skills**、**5 个专题货架**、**8 个场景入口**、中英双语；4–5 周完成 MVP。

---

## 1. 项目定位、目标用户与核心价值

### 1.1 问题定义

Agent Skills 的供给已经过剩，开发者真正缺的不是“更多 skill”，而是：

1. **知道该装哪个**：搜索结果里大量重复、fork、低质、过时、甚至恶意 skill。
2. **知道装了什么**：skill 会读写文件、执行脚本、访问网络、读取凭据，但多数目录只给一句描述。
3. **知道是否适合自己**：中文开发者需要中文解释、中文场景、中文安装排错；英文开发者需要不牺牲原文信息的界面。
4. **装得动、退得掉**：安装命令、目标客户端、版本锁定、更新与卸载路径要清楚。
5. **逛得下去**：现有目录更像“搜索结果页”，缺少发现感和编辑判断。

### 1.2 目标用户

| 用户 | 典型场景 | 最在意 | 当前痛点 |
|---|---|---|---|
| **AI Coding 重度用户**（Claude Code / Codex / Cursor / OpenCode） | 给 agent 加工作流：代码审查、测试、部署、设计稿转代码 | 装完是否真的提升产出 | 目录太多，描述太虚，装完才知道不合适 |
| **中文开发者 / 独立开发者** | 英文文档读得懂但费时；希望有中文解释与案例 | 中文说明、国内工具链、安装排错 | 现有平台中文覆盖浅，分类偏英文技术栈 |
| **技术团队 lead / 平台工程师** | 为团队挑选可共享的 skills，控制风险 | 许可证、脚本、维护状态、可审计 | 缺少“安装前检查清单”和团队级可信信号 |
| **Skill 作者** | 让自己的 skill 被正确的人发现 | 曝光、来源标注、版本更新 | 大平台按安装量排序，新作者难被看见 |
| **好奇的探索者** | 没有明确目标，想看看别人把 agent 玩成什么样 | 有趣、新鲜、场景感 | 目录是列表，不是“货架” |

### 1.3 核心价值主张

**对用户：**

> 在 3 分钟内找到一个**适合你的客户端、你能看懂、你敢装**的 Skill；并且清楚它会改什么、跑了什么、来自哪里。

**对作者：**

> 一次提交，获得**可被搜索、可被引用、可被订阅**的长期入口，而不是被榜单淹没。

**对生态：**

> 用“可检查的透明度”替代“虚假的安全认证”；用“精选”替代“全量抓取”。

### 1.4 不做什么（反向定位）

| 不做 | 原因 |
|---|---|
| 不做“最大 Skill 索引” | skills.sh 约 140 万、SkillsMP 约 400 万；数量不是壁垒 [S8][S9] |
| 不做安装量排行榜 | 没有第一方遥测，复制第三方数字既不准确也不道德 |
| 不做“安全认证” | 无法为第三方代码背书；只做“风险可见、来源可查、版本可锁” |
| 不做 AI 语义搜索 / AI 推荐（MVP） | 成本、延迟、可解释性都不划算；关键词 + 同义词 + 编辑精选足够 [R] |
| 不做用户账号 / 评论 / 评分（MVP） | 增加审核、隐私、滥用成本；先用 localStorage 收藏 |
| 不做自建 CLI | `skills` CLI 已覆盖 80 个客户端，重复造轮子没有意义 [S7] |
| 不做在线运行 Skill | 安全边界不可控；MVP 只做发现、检查、安装 |

### 1.5 成功指标（MVP 阶段）

| 指标 | 目标 | 说明 |
|---|---|---|
| 月访问 | 1,000–3,000 | 冷启动，靠内容与社区 |
| 搜索 → 详情点击率 | ≥ 30% | 搜索是否有效 |
| 详情 → 复制安装命令率 | ≥ 15% | 安装意图，不冒充安装量 |
| 社区提交 | ≥ 10 个/月 | 供给是否活 |
| 发布 skill 数 | 500（首发）→ 1,500（3 个月） | 质量优先 |
| 严重安全事故 | 0 | 发现即下架并公开说明 |
| Lighthouse（移动端） | Performance / A11y / SEO ≥ 95 | 静态站应达到 |

---

## 2. Agent Skills 生态及竞品调研

### 2.1 开放标准：SKILL.md 到底规定了什么

**事实 [S1]：**

- 一个 Skill 是一个目录，至少包含 `SKILL.md`；可选 `scripts/`、`references/`、`assets/`。
- `SKILL.md` = YAML frontmatter + Markdown 正文。
- 必填字段：
  - `name`：1–64 字符，仅小写字母、数字、连字符；不能以连字符开头/结尾；不能连续两个连字符；**必须与父目录名一致**。
  - `description`：1–1024 字符，非空；应说明“做什么”和“什么时候用”。
- 可选字段：
  - `license`：许可证名称或指向 LICENSE 文件。
  - `compatibility`：≤500 字符，环境要求（目标产品、系统包、网络等）。
  - `metadata`：string → string 的任意键值对，客户端可自定义。
  - `allowed-tools`：空格分隔的预授权工具列表，**实验性**，各客户端支持不一。
- 正文没有格式限制；推荐步骤、示例、边界情况。
- **渐进披露**：启动时只加载 name + description（约 100 tokens）；激活时加载全文（建议 <5,000 tokens / <500 行）；资源按需加载。
- 校验工具：`skills-ref validate ./my-skill`。

**关键含义 [I]：**

1. 规范只定义“目录里有什么”，**不规定装到哪里**。所以各客户端目录不同，是生态碎片化的根源。
2. `name` 必须匹配目录名，是一个很容易被作者忽略、但对跨客户端兼容性很关键的约束。
3. `description` 是唯一的“检索/触发元数据”，它的质量直接决定 skill 是否会被 agent 选中。这为“描述质量审核”提供了产品抓手。

### 2.2 客户端支持矩阵

| 客户端 | 项目级目录 | 用户级目录 | 兼容目录 | 规范执行严格度 | 扩展能力 | 来源 |
|---|---|---|---|---|---|---|
| **Claude Code** | `.claude/skills/<name>/SKILL.md` | `~/.claude/skills/` | 插件、企业目录、`--add-dir` | frontmatter 字段大多可选；描述建议但非强制 | `disable-model-invocation`、`context: fork`、`allowed-tools`、`paths`、`hooks`、`!` 动态上下文注入 | [S3] |
| **Codex** | 文档以 `~/.codex/skills/**/SKILL.md` 为主（递归） | 同左 | 未明确统一 `.agents/skills` | 文档建议 `description` ≤500 字符（比规范更严） | `~/.codex/config.toml` 可按路径禁用 skill | [S4] |
| **Cursor** | `.cursor/skills/<name>/SKILL.md` | `~/.cursor/skills/`、`~/.agents/skills/` | 文档说明会兼容加载其他目录 | 遵循 Agent Skills 标准 | `/create-skill` 等 | [S5] |
| **OpenCode** | `.opencode/skills/<id>/SKILL.md` | `~/.config/opencode/skills/` | `~/.claude/skills`、`~/.agents/skills`、项目 `.claude/skills`、`.agents/skills` | **运行时非常宽松**：frontmatter 全可选；不强制 name=目录、不强制长度 | **HTTP catalog**（`index.json` + 同源文件）、`skills` 配置数组、`metadata.opencode/autoinvoke`、权限系统 | [S6] |
| **GitHub Copilot / Gemini / Windsurf / Cline / AMP 等** | 各自目录 | 各自目录 | 部分兼容 `.agents/skills` | 不一 | 不一 | [S7][S8] |

**兼容性差异的实际影响 [I]：**

- **目录名与 `name` 不一致**：规范不允许；OpenCode 以路径为 ID、`name` 只作显示名。一个“能跑”的 skill 可能在不同客户端里 ID 不同。
- **`description` 长度**：规范 1,024；Codex 文档建议 ≤500。超长描述在 Codex 侧可能被截断或影响触发。
- **`allowed-tools`**：实验性字段，Claude Code 支持较好，其他客户端可能忽略。不能把它当作安全边界。
- **客户端扩展字段**（`context: fork`、`paths`、`hooks`）：只在特定客户端生效；跨客户端时应放在 `metadata` 或单独维护，避免“看起来可移植，实际不生效”。

> **产品机会**：在详情页明确标注“**该 Skill 使用了哪些客户端扩展字段**”，并给出“可移植性”判断。这是现有目录普遍缺失的信息。

### 2.3 安装机制与目录约定

**事实 [S6][S7]：**

- `skills` CLI（Vercel Labs，MIT）：
  - 要求 Node.js ≥ 22.20。
  - 支持 **OpenCode、Claude Code、Codex、Cursor** 等 80 个客户端。
  - 命令：`add`、`find`、`list`、`use`、`check`、`update`、`remove`、`init`。
  - `npx skills add owner/repo` 默认安装到当前项目；`-g` 安装到全局。
  - `npx skills use owner/repo@skill` 可以不安装、直接生成提示或启动 agent。
  - `skills-lock.json` v2 记录 `computedHash` 与 Git commit；`--frozen-lockfile` 可复现安装。
  - 匿名遥测；`DISABLE_TELEMETRY=1` / `DO_NOT_TRACK=1` 可关闭。
- OpenCode 原生 HTTP catalog：
  - `opencode.json` 的 `skills` 数组可加入 `https://example.com/catalog/index.json`。
  - `index.json` 列出 `{ name, version, files[] }`；文件从 `<base-url>/<name>/<file>` 下载。
  - `version` 变化才会刷新缓存。
  - 路径必须安全、相对、同源。
  - 每个下载目录成为独立 source root。

**这意味着 [I]：**

1. 我们**不需要**自己做安装器。网站只需要生成正确的 `npx skills add ...` 命令。
2. 我们可以**额外**提供一个 OpenCode 专属的“货架订阅”：用户把某个专题的 catalog URL 加进配置，就能持续获得该专题的更新。这是 skills.sh 没有强调的分发方式。
3. catalog 不宜包含全部 500 个 skill：会挤占模型的可用 skill 列表。**按专题拆成 8–15 个 skill 的小包**更合理。

### 2.4 生态规模：数字背后的含义

**事实 [S13]（2026-11-15 通过 GitHub REST API 实测）：**

| 查询 | 结果 |
|---|---|
| GitHub 代码搜索 `filename:SKILL.md` | **7,684,096** 条文件结果 |
| `topic:agent-skills` 仓库 | **43,463** |
| `topic:claude-skills` 仓库 | **16,038** |
| `topic:codex-skills` 仓库 | **2,505** |

**事实 [S8]：**

- skills.sh 首页 “All Time” 计数：**1,405,285**。
- 榜单按 CLI 匿名遥测的安装量排序；示例头部 skill `find-skills` 显示约 **4.4M** 安装。
- 有 Trending / Hot / Official / Packs / Security Audits / Topics / Agents 等入口。

**事实 [S9]：**

- SkillsMP 自称从公开 GitHub 仓库收集约 **400 万** 个 SKILL.md。
- 63 个分类、约 800+ 职业分类、9 种语言、提供 API。
- 明确声明“不急于评判 skill”，先做“地图”。

**解读 [I]：**

- 768 万文件结果里包含大量 fork、vendored copy、示例、模板、重复文件；**“文件数”不等于“可用 skill 数”**。
- skills.sh 的 140 万与 SkillsMP 的 400 万口径不同（是否去重、是否包含 fork、是否包含非英文），不能直接比较。
- 对 MVP 来说，**500 个经过人工复核的 skill 比 400 万个未审核条目更有价值**。用户要的是“选择”，不是“全集”。

### 2.5 竞品逐家分析

#### 2.5.1 skills.sh（Vercel Labs）

| 维度 | 观察 |
|---|---|
| 定位 | “The Open Agent Skills Ecosystem”，以安装量榜单为核心 |
| 收录 | 约 140 万条（All Time）；首页按 8 周活动/安装量排序 [S8] |
| 发现 | Leaderboard、Trending、Hot、Topics、Agents、Official、Packs、Security Audits |
| 搜索 | API 文档：单词用 fuzzy，多词用 semantic；`/api/v1/skills/search` [S8] |
| 安装 | `npx skills add owner/repo`；CLI 支持 80 个客户端 [S7] |
| 安全 | 与 Gen Agent Trust Hub、Socket、Snyk、Runlayer、ZeroLeaks 合作；审计在首次安装后自动生成 [S8] |
| 开源 | **CLI 开源（MIT）**；站点与索引数据未见开源声明 [S7][S8] |
| API | 需要 Vercel OIDC token；对非 Vercel 部署的第三方不友好 [S8] |
| 中文 | 公开页面以英文为主；未见系统性的中文导读/中文场景 |
| 不足（相对我们） | ① 榜单逻辑偏向“已流行”，新作者难曝光；② 安全是“合作方审计徽章”，缺少文件级“配料表”；③ 无 OpenCode catalog 订阅；④ API 锁定 Vercel；⑤ 中文体验浅 |

> **注意**：skills.sh 已经做了 Packs、Topics、Official、Audits。**“做合集”“做审计”本身不构成差异化**，必须有更深的执行。

#### 2.5.2 SkillsMP

| 维度 | 观察 |
|---|---|
| 定位 | “Agent Skills 生态地图”，按职业/领域探索 |
| 收录 | 约 400 万 SKILL.md，365,959 creators（页面自述）[S9] |
| 分类 | 63 个分类、800+ 职业、9 种语言 |
| 搜索 | 关键词 + 创作者 + 分类/职业/语言过滤；提供 API [S9] |
| 安装 | 主要跳转 GitHub 源；也有 MCP/第三方集成 |
| 安全 | 未见系统性安全审计；免责声明“安装前自行审阅代码” |
| 开源 | 未声明开源 |
| 中文 | 支持 9 种语言，包含中文界面；但内容以机器聚合为主 |
| 不足（相对我们） | ① “全量地图”导致信噪比低；② 没有人工精选与场景叙事；③ 没有安装前风险清单；④ 没有 OpenCode 原生订阅；⑤ 没有社区治理/收录标准 |

#### 2.5.3 LobeHub Skills Market

| 维度 | 观察 |
|---|---|
| 定位 | LobeHub 生态内的 Skills 市场 |
| 安装 | 自有 `@lobehub/market-cli`，需注册；支持 open-claw / claude-code / codex / cursor；默认 `.agents/skills` [S10] |
| 发现 | 分类、排序（installCount/stars/name）、`zh-CN` locale、`isValidated` 字段 |
| 安全 | 有 `isValidated` 标记，但未说明审计方法 |
| 开源 | 市场本身未声明开源；CLI 可用 |
| 不足（相对我们） | ① 绑定 LobeHub 账号与市场；② 发现体验偏“插件市场”；③ 中文有界面但缺少中文编辑内容；④ 无 OpenCode catalog |

#### 2.5.4 ClawHub（OpenClaw）

| 维度 | 观察 |
|---|---|
| 定位 | OpenClaw 的公开 skill registry，支持发布、版本、搜索 |
| 安全 | 有安全审计与恶意 skill 阻断；`openclaw security audit --deep` 本地扫描 [S11] |
| 规模 | Snyk 扫描了 3,984 个来自 ClawHub 与 skills.sh 的 skill [S12] |
| 开源 | `openclaw/clawhub` 公开仓库 |
| 不足（相对我们） | ① 绑定 OpenClaw 生态；② 主要面向个人助理场景，不是 AI Coding 工作流；③ 安全事件多，信任修复难；④ 中文/英文双语编辑内容弱 |

#### 2.5.5 其他

| 产品 | 定位 | 对我们的启示 |
|---|---|---|
| **Agensi** |  curated marketplace，强调端到端安全扫描、创作者分成 | “安全 + 创作者经济”是可行方向，但早期不适合我们 |
| **Tessl** | Registry，部分安全审计（Snyk） | 企业化/商业化更重 |
| **mcpservers.org / skills 目录** | SEO 型聚合 | 说明“目录”本身门槛低，差异化必须在体验与信任 |
| **awesome-agent-skills** | GitHub 精选列表 | 证明“人工精选”有需求；但缺少搜索、版本、风险、安装体验 |
| **Anthropic `anthropics/skills`** | 官方示例仓库 | 官方来源是强信任信号，应作为首批 seed |

### 2.6 竞品功能矩阵

> 图例：● 有且较好；◐ 有但一般/有限；○ 未见；? 未核实。

| 能力 | skills.sh | SkillsMP | LobeHub | ClawHub | 本项目目标 |
|---|---|---|---|---|---|
| 收录规模 | ● 140 万 | ● 400 万 | ◐ 数千 | ◐ 数千–数万（未官方核实） | ◐ 500–5,000（精选） |
| 关键词搜索 | ● | ● | ● | ● | ● |
| 中文搜索/中文内容 | ○/◐ | ◐ | ◐ | ○ | **●** |
| 技术主题分类 | ● | ● | ● | ◐ | ● |
| 场景/任务驱动 | ○ | ◐（职业） | ○ | ○ | **●** |
| 编辑精选/专题 | ●（Packs） | ○ | ◐ | ○ | **●（带策展说明）** |
| 随机探索/逛 | ○ | ○ | ○ | ○ | **●** |
| 安装命令 | ● | ◐（跳转） | ●（自有 CLI） | ● | ●（复用 skills CLI） |
| 安装前风险清单 | ◐（审计徽章） | ○ | ◐（isValidated） | ◐（审计） | **●（文件级配料表）** |
| 版本锁定/哈希 | ◐（CLI lockfile） | ○ | ◐ | ◐ | **●（展示 commit + hash）** |
| OpenCode catalog 订阅 | ○ | ○ | ○ | ○ | **●** |
| 开源 | ◐（仅 CLI） | ○ | ○ | ● | **●（代码 + 数据流程）** |
| 开放 API | ◐（OIDC 限制） | ●（API key） | ◐（CLI） | ? | **●（静态 JSON，无鉴权）** |
| 中英双语编辑 | ○ | ◐（界面） | ◐（locale） | ○ | **●** |

### 2.7 差异化机会（按可信度排序）

| 机会 | 为什么真实 | 为什么现有产品难复制 | 我们的成本 |
|---|---|---|---|
| **中文优先的“使用场景 + 不适合场景”编辑层** | 中文开发者数量大；现有平台中文多为界面翻译 | 需要人工策展与持续维护，不是抓取能解决 | 中（内容运营） |
| **文件级“配料表”与风险证据** | Snyk 数据证明风险普遍；用户装前想知道“有没有脚本/联网/读凭据” | 需要解析文件树、静态扫描、展示证据；不是加一个 badge | 中（工程 + 规则） |
| **OpenCode 原生 catalog 订阅** | OpenCode 官方支持 HTTP catalog；skills.sh 未强调 | 需要把内容按 pack 组织并持续发版 | 低（静态文件） |
| **“精选小目录”而非“全量索引”** | 用户选择过载；编辑判断是稀缺品 | 与现有平台的“规模叙事”相反，组织上难转向 | 中（人工审核） |
| **开放数据 + 开放 API + 无登录** | 开发者讨厌锁定的 API 与账号墙 | 现有平台有商业/生态动机做锁定 | 低（静态 JSON） |
| **可移植性/客户端兼容性说明** | 客户端差异真实存在，作者和用户都困惑 | 需要持续跟踪 4+ 客户端文档 | 中（维护） |
| **“先试后装”** | `npx skills use` 已支持，但目录未突出 | 需要理解 CLI 能力并设计交互 | 低 |

**不建议作为差异化**：

- “更大的索引”（打不过）。
- “AI 语义搜索”（MVP 不划算）。
- “安装量排行榜”（没有第一方数据）。
- “安全认证”（承担不起责任）。
- “社区评分/评论”（冷启动没有数据，且易被刷）。

---

## 3. 差异化功能与产品设计建议

### 3.1 产品定位

**工作名（待定）：** `Skill Shelf` / `技能货架`  
**一句话：** 一个可以“逛”的 Agent Skills 精选货架：看懂它能做什么、装之前知道它改什么、用一条命令装进你的 agent。

**定位三角：**

```
        可信（Trust）
           /\
          /  \
         /    \
   中文体验 ---- 发现乐趣
   (Bilingual)   (Discovery)
```

### 3.2 六个差异化支柱

#### 支柱 1：场景驱动，而不是技术分类驱动

现有目录大多按“React / Next.js / Testing / Database”分类。开发者真实的问题是：

- “我刚接手一个陌生代码库，先干什么？”
- “给老项目补测试，从哪开始？”
- “设计稿怎么稳定地变成组件？”
- “上线前帮我做一次自查。”
- “把这周的会议记录变成周报。”

**做法：** 一级导航放“场景”，技术主题作为二级过滤。每个场景页包含：

- 你可能遇到的情况（3–5 句）。
- 推荐 skills（3–6 个，带“为什么是它”）。
- 一个最小工作流（先装哪个、再装哪个）。
- **不适合用 skill 的场景**（建立信任）。

#### 支柱 2：文件级“配料表”

不要只给“安全/不安全”的二元标签。详情页固定展示：

| 配料项 | 展示方式 |
|---|---|
| 文件清单 | 树形：`SKILL.md`、`scripts/*`、`references/*`、`assets/*` |
| 可执行脚本 | 数量 + 文件列表 + 语言 |
| 网络访问 | 是否出现 URL / `curl` / `fetch` / API 调用 |
| 凭据访问 | 是否读取 `~/.aws`、`~/.ssh`、`.env`、keychain 等 |
| 危险模式 | `curl \| bash`、base64+eval、`sudo`、`systemctl`、隐藏 Unicode 等 |
| Token 成本 | 估算正文 tokens；标注“轻/中/重” |
| 许可证 | SPDX + 原始 LICENSE 链接 + 是否允许全文镜像 |
| 版本 | commit 短 SHA + 内容 hash + 最近同步时间 |
| 人工复核 | “已复核 @ commit abc1234，2026-11-10”或“未复核” |

**原则：** 不输出“安全分”。只输出**可验证的事实**与**证据行号**。用户自己判断，或让 agent 帮他判断。

#### 支柱 3：精选小目录 + 编辑说明

每个进入首页/专题的 skill 都有一条“为什么它在货架上”的编辑说明（中文 1–2 句，英文 1 句）；全量上架至少保留原文描述 + 一句可批量维护的编辑备注。例如：

> “它不教你写 CSS，而是让 agent 在每次改 UI 前先读一遍设计约束。适合已经有设计系统、但 agent 总爱自由发挥的团队。”

这条说明是**人类判断**，不是模型生成的套话。它让“精选”有内容，而不是一个标签。

#### 支柱 4：OpenCode 原生“货架订阅”

把专题合集输出为 OpenCode HTTP catalog：

```jsonc
// opencode.json
{
  "skills": [
    "https://skill-shelf.example/catalog/design-foundations/index.json"
  ]
}
```

用户订阅的不是“全站 500 个”，而是“设计基础 12 个”“测试与质量 10 个”这样的小包。版本变化自动刷新。

**价值：**

- 对用户：一次配置，持续获得该专题的更新。
- 对作者：进入一个可持续分发的 pack。
- 对我们：形成与 skills.sh 不同的分发入口。

#### 支柱 5：先试后装

`npx skills use owner/repo@skill` 可以在不安装的情况下生成提示/启动 agent。详情页提供：

- **试一下**：复制 `use` 命令。
- **正式装**：复制 `add` 命令。
- **锁定版本**：展示 `skills-lock.json` 片段与 commit。

这降低了“装完才发现不合适”的成本。

#### 支柱 6：中英双语，但不是“机翻界面”

- UI 全量双语。
- 精选 skill 有**中文导读**（人工撰写/校对），原文描述保留可切换。
- 搜索支持中文分词、中文同义词、英文拼写容错。
- 安装文档、排错、安全说明有中文版。
- 英文用户看到完整英文，不被中文内容干扰；中文用户不被“英文原文 + 机翻”糊弄。

### 3.3 “超市式”浏览机制

> 隐喻只用于内部设计语言；界面文案保持直白，避免过度拟物。

| 机制 | 交互 | 目的 |
|---|---|---|
| **货架（Shelf）** | 首页横向/纵向的专题区，每区 6–12 个 skill，带策展标题与一句说明 | 让浏览有“主题感”，不是无限列表 |
| **今日五件** | 每天按日期种子确定性地选 5 个，质量加权，不重复最近 7 天 | 给回访用户新鲜感，无需后端 |
| **随手拿一件** | 一个按钮，随机跳到一个已发布 skill；优先高质量、避开 localStorage 里看过的 | 探索乐趣，低实现成本 |
| **试吃** | 详情页“先试不装”命令 | 降低尝试成本 |
| **配料表** | 详情页文件/脚本/网络/凭据/token 成本 | 把“信任”变成可检查的细节 |
| **保质期** | “上游更新于 3 天前”；超过 12 个月标“临期” | 让维护状态可见 |
| **产地直供** | “官方组织/维护团队”标记 | 来源可信度 |
| **本地特产** | 中文文档/中文场景的 skill | 中文差异化 |
| **购物篮（P1）** | 选中多个 skill，按 repo 分组生成命令/一个 pack | 从发现到安装的闭环 |

**避免：**

- 不要做 3D 货架、拟物货架、动画过度——开发者工具应克制。
- 不要把“随机”做成低质内容的出口；随机必须**质量加权**。
- 不要用“打折/限时”等电商话术，会伤害可信度。

### 3.4 场景体系（首发建议 8 个）

| 场景 slug | 中文名 | 典型任务 | 推荐 skill 类型 |
|---|---|---|---|
| `inherit-codebase` | 接手陌生代码库 | 读懂结构、找入口、生成地图 | 代码理解、架构梳理、文档生成 |
| `add-tests` | 给老项目补测试 | 找热点、生成测试、修 flaky | 测试生成、覆盖率分析、CI |
| `design-to-code` | 设计稿转代码 | Figma → 组件、设计约束 | 设计系统、可访问性、组件生成 |
| `ship-safely` | 上线前自查 | 安全、性能、回归、发布说明 | 代码审查、性能、发布 |
| `write-clearly` | 写清需求与文档 | PRD、ADR、周报、变更日志 | 写作、结构化、翻译 |
| `data-and-docs` | 处理数据与文档 | Excel/CSV/PDF/PPT | 文档解析、表格、报告 |
| `agent-workflow` | 搭建 Agent 工作流 | 多 agent、子代理、工具编排 | 工作流、prompt 工程、评测 |
| `learn-and-explore` | 学习与探索 | 新技术、代码阅读、实验 | 教学、示例、实验 |

> 每个场景页都要有“**不适合**”段落。例如“接手代码库”不适合：没有 README、没有测试、代码量小于 500 行的项目——直接读更快。

### 3.5 精选与专题合集

**专题（Collection）不是标签页。** 每个专题必须有：

- 标题（有观点，不是“React Skills”）。
- 一句话论点（“先把设计约束写进 agent，再让它写组件”）。
- 6–12 个 skill，每个带入选理由。
- 1 个“不建议一起装”的提示（避免冲突/上下文膨胀）。
- 策展人 + 最后复核日期。

**首发 5 个专题建议：**

1. **把设计系统喂给 Agent**（design-to-code / 可访问性 / 组件规范）
2. **给老项目补测试的 7 件工具**（测试生成 / flaky 分析 / CI）
3. **上线前的 30 分钟自查**（安全 / 性能 / 发布说明）
4. **中文开发者的效率工具箱**（飞书/语雀/微信/国内云）
5. **轻量无脚本：只改提示词，不碰你的机器**（prompt-only，建立信任）

### 3.6 质量、可信度与安全展示

**多轴分开，不打总分：**

| 轴 | 展示 | 数据来源 |
|---|---|---|
| **规范** | 通过/警告/失败 | 本地校验器 + skills-ref（可选） |
| **维护** | 最近 commit、是否 archived、issue 活跃度 | GitHub API |
| **轻量** | 无脚本 / 有脚本；token 成本 | 文件树 + 正文估算 |
| **来源** | 官方组织 / 已验证作者 / 社区 | 人工维护的 org 白名单 + GitHub 元数据 |
| **复核** | 已复核 @ commit / 未复核 | 人工流程 |
| **风险** | 风险旗标列表 + 证据 | 静态规则 + 人工 |

**文案原则：**

- 不说“安全”，说“未发现以下模式”。
- 不说“已验证”，说“我们在这个 commit 上看过”。
- 不说“推荐”，说“我们为什么选它”。
- 明确写“我们无法保证第三方 skill 的行为”。

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

- 首发 500 个中，**前 150 个**有中文导读（人工/半人工校对）。
- 其余保留英文原文 + 机器辅助摘要，明确标注“AI 辅助，待校对”。
- **不在运行时调用翻译 API**；翻译在数据提交时完成，进入 Git 历史。
- 中文导读是“编辑内容”，不是“逐字翻译”；重点是“什么时候用/不适合什么时候用”。

### 3.8 反模式清单

| 反模式 | 为什么不要 |
|---|---|
| 首页放巨大搜索框 + 空白 | 没有“逛”的入口，退回搜索引擎 |
| 卡片只放 star 数 | star 是仓库级信号，不是 skill 质量 |
| 单一“安全分” | 虚假精确，容易被 gaming |
| 无限滚动 + 无 URL 状态 | 无法分享/收藏/SEO |
| 全量 400 万入库 | 信噪比崩坏，审核不可行 |
| 用 AI 生成所有描述 | 读起来都一样，失去编辑判断 |
| 强制登录才能收藏 | 开发者反感；localStorage 足够 |
| 自动安装/自动执行 | 安全边界不可控 |

---

## 4. MVP 功能范围及暂不开发的功能

### 4.1 MVP（P0）— 必须做

| # | 功能 | 验收标准 |
|---|---|---|
| 1 | **数据管道**：seed 列表 → GitHub API → 解析 → 校验 → 去重 → 风险扫描 → JSON | 500 个 seed 在 10 分钟内完成；输出确定性；失败可重试 |
| 2 | **首页货架**：今日五件、场景入口、本周专题、轻量无脚本、官方来源 | 首屏 LCP < 2.0s（4G）；每个模块有真实数据 |
| 3 | **Explore**：搜索、筛选（客户端/场景/风险/许可证/语言）、排序 | 中文“测试”能返回测试类 skill；筛选状态写入 URL |
| 4 | **详情页**：描述、安装命令、配料表、信任卡、文件树、相关推荐 | 每个已发布 skill 都有 source/commit/license/risk |
| 5 | **安装**：`npx skills add` / `use` 命令生成；按客户端切换 | 抽 10 条命令在临时目录验证可安装 |
| 6 | **专题合集**：5 个专题，带策展说明 | 每个专题 ≥6 个 skill，有“最后复核日期” |
| 7 | **场景页**：8 个场景 | 每个场景有“适合/不适合” |
| 8 | **中英双语**：UI 全量；150 个中文导读 | 语言切换保留当前路径；`hreflang` 正确 |
| 9 | **提交入口**：GitHub Issue Form 预填 | 提交后自动打标签；有审核 SLA 说明 |
| 10 | **自动化**：每日增量同步 + 校验 + 构建 | 连续 7 天成功；失败自动开 issue |
| 11 | **信任与法务页**：收录标准、安全说明、免责声明、下架流程 | 页面可访问；链接在 footer |
| 12 | **OpenCode catalog**：3 个 pack（设计/测试/轻量） | `opencode.json` 加 URL 后能加载；版本变化能刷新 |

### 4.2 P1 — 发布后 4–8 周

| 功能 | 说明 | 为什么不是 MVP |
|---|---|---|
| 购物篮 / 一键装一组 | 选中多个 skill，按 repo 分组生成命令 | 需要更多交互与边界处理 |
| 版本 diff / 变更提醒 | “上游变了，和复核时不一样” | 需要版本快照与 diff UI |
| 拼音搜索 | `ceshi` → 测试 | 需要额外索引；先看搜索日志 |
| 团队/组织收藏 | 共享 shelf | 需要账号/存储 |
| 作者认领 | 作者验证并更新描述 | 需要身份流程 |
| RSS / 邮件订阅 | 新上架/专题更新 | 需要邮件服务 |
| OG 图片自动生成 | 每个 skill/专题一张 | 可用 satori 构建时生成，但增加复杂度 |
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

即使范围小，以下不能省：

1. **来源与许可证**：每个 skill 必须有 source URL、commit、license 状态。
2. **风险旗标**：每个已发布 skill 必须有静态扫描结果（哪怕是“未发现”）。
3. **免责声明**：明确“不背书、不保证、安装前自查”。
4. **可下架**：有明确的举报/下架流程。
5. **不执行第三方代码**：CI 只做静态分析，不跑 skill 脚本。

---

## 5. 推荐技术栈及备选方案对比

### 5.1 决策原则

1. **静态优先**：能预生成就不运行时计算。
2. **无后端**：MVP 不引入数据库、API 服务、队列。
3. **可迁移**：不被 Vercel 专有能力锁定。
4. **可审计**：数据以文本形式进 Git，PR 可 review。
5. **复用**：安装用 `skills` CLI，搜索用 Pagefind，UI 用 Tailwind/Radix。
6. **中文友好**：搜索、排版、内容都要考虑中文。

### 5.2 推荐栈

| 层 | 选择 | 版本策略 | 理由 |
|---|---|---|---|
| 站点框架 | **Astro**（静态输出） | 实施时最新稳定版 | 内容型站点零 JS 默认、构建快、部署无关、内置 i18n/content collections |
| 交互岛 | **React** + `@astrojs/react` | React 19.x | 复用生态；只有搜索/筛选/命令面板等小岛需要 JS |
| 样式 | **Tailwind CSS v4** | 最新稳定版 | 快速、一致的 design tokens；CSS-first 配置 |
| 组件 | **Radix Primitives + cmdk**（按需） | 最新 | 无样式、可访问；不引入整套 shadcn 依赖 |
| 图标 | **Lucide**（按需引入）或内联 SVG | 最新 | 体积可控 |
| 搜索 | **Pagefind**（`pagefind_extended` 构建，支持中日韩） | 最新 | 纯静态、CJK 分词、过滤、无服务 [S19] |
| 辅助索引 | 构建时生成 compact JSON + `Intl.Segmenter` | 原生 | 命令面板/排序/分面用；不依赖第三方 |
| 数据格式 | **JSON + YAML**（编辑内容） | — | 可 diff、可 review、无数据库 |
| 校验 | **Zod** + 自定义规则 | 最新 | 运行时/构建时 schema 校验 |
| 解析 | `gray-matter` + `yaml` + `unified`/`remark` | 最新 | frontmatter、Markdown AST、sanitize |
| 数据管道 | **TypeScript + tsx**（Node 22+） | 最新 | 与站点同语言；GitHub Actions 直接跑 |
| CI/CD | **GitHub Actions** | — | 免费（公开仓库）、与数据同仓、可审计 |
| 部署 | **Vercel Hobby（静态）** | — | 首期要求；静态产物可迁移 |
| 分析 | Vercel Web Analytics（可选） | — | 50k events/月；无 cookie；也可不用 |

### 5.3 前端框架对比

| 维度 | Astro（推荐） | Next.js App Router | Vite + React SPA | 11ty |
|---|---|---|---|---|
| 内容型页面 | ★★★★★ | ★★★★ | ★★ | ★★★★★ |
| 首屏 JS | 极小（岛屿） | 中等 | 大（整包） | 极小 |
| 构建 5k 页面 | 快 | 中 | 快（但无预渲染） | 很快 |
| SEO/分享 | 好 | 好 | 差（需额外预渲染） | 好 |
| 交互能力 | 岛屿足够 | 最强（RSC/Server Actions） | 强 | 弱 |
| 学习成本 | 低–中 | 中–高 | 低 | 低 |
| 部署可迁移 | 最强（纯静态） | 中（ISR/Server 锁定） | 强 | 最强 |
| 适合本项目的理由 | 内容 + 少量交互 + 静态 | 如果很快要做账号/后台 | 不适合发现型站点 | 极简但生态弱 |

**结论 [R]：选 Astro。**  
如果 6 个月内确定要做“用户账号 + 团队收藏 + 提交后台”，Next.js 更省事；但那时数据层仍是 JSON/静态，迁移成本可控。**不要为了“可能”的后台提前上 Next.js。**

### 5.4 UI 方案

| 方案 | 优点 | 缺点 | 结论 |
|---|---|---|---|
| **Tailwind v4 + Radix + cmdk** | 体积小、可控、可访问 | 需要自己写样式 | **推荐** |
| shadcn/ui | 现成组件、代码归你 | 组件较多、默认风格重；Astro 集成需额外配置 | 可选，只取需要的组件 |
| MUI / Ant Design | 完整 | 风格强、体积大、难做出 Linear/Raycast 质感 | 不推荐 |
| CSS Modules / 原生 CSS | 最轻 | 设计系统一致性靠自律 | 备选 |

**设计系统建议：**

- 颜色：近黑背景 + 1px 半透明边框 + 一个“新鲜”强调色（柠檬绿/青柠），避免紫色渐变俗套。
- 字体：Latin 用 Inter/Geist；中文用系统字体栈（PingFang SC / Microsoft YaHei / Noto Sans SC），**不自托管完整中文字体**（体积太大）。
- 等宽：JetBrains Mono / ui-monospace，用于命令与 commit。
- 圆角：卡片 10–12px；chip 6px。
- 阴影：几乎不用；用边框和层次。
- 动效：120–180ms ease-out；hover 抬升 1px；尊重 `prefers-reduced-motion`。

### 5.5 搜索方案对比

| 方案 | 运行位置 | 中文 | 全文 | 分面过滤 | 索引体积 | 运维 | 结论 |
|---|---|---|---|---|---|---|---|
| **Pagefind** | 浏览器（WASM） | ●（extended 构建，CJK 分词）[S19] | ● | ● | 中（按块懒加载） | 无 | **推荐** |
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
- 对 500–5,000 条数据，关键词 + 同义词 + 编辑精选的召回已经足够。
- 如果日后搜索日志显示“找不到”率高，再加语义层；不要提前。

### 5.6 数据存储方案对比

| 方案 | 优点 | 缺点 | 结论 |
|---|---|---|---|
| **提交式 JSON/YAML（Git）** | 免费、可 diff、可 review、可回滚、构建确定 | 5k 以上文件多；不适合高频写入 | **推荐 MVP** |
| SQLite 单文件 | 查询强、单文件 | 二进制 diff 差、构建需额外步骤 | 备选（>2 万条时） |
| Postgres/Neon | 动态查询、账号 | 成本/运维/冷启动 | 不推荐 MVP |
| Vercel KV/Blob | 动态 | 锁定、无审计历史 | 不推荐 |
| GitHub Issues 作为提交队列 | 零后端、社区熟悉 | 不是数据库；需 bot 转换 | **推荐用于提交** |

**推荐结构：**

```
data/
  skills/                 # 每个 skill 一个 JSON（或按 repo 分片）
  index/
    skills.compact.json   # 客户端列表（元数据）
    facets.json
  seeds/
    repos.yml             # 人工 seed 仓库
    submissions.yml       # 社区提交（经审核）
  editorial/
    shelves/*.yml         # 专题
    scenes/*.yml          # 场景
    translations/*.yml    # 中文导读
  snapshots/
    reviews.json          # 人工复核记录（commit + 日期 + 结论）
```

### 5.7 不采用方案及原因

| 方案 | 不采用原因 |
|---|---|
| Next.js + ISR + 数据库 | 对 MVP 过重；静态已足够；ISR 绑定 Vercel |
| 纯 Vite SPA | SEO/分享差；首屏慢；发现型站点需要可索引的详情页 |
| 自建搜索服务 | 运维/成本；Pagefind 已解决 |
| 自建 CLI | `skills` CLI 已覆盖 80 客户端 |
| AI 生成全站描述 | 质量同质化；审核不可控 |
| 全量爬虫 | 审核不可行；法律/版权风险 |
| 付费 CDN/图片服务 | 静态 SVG/CSS 足够；避免成本 |

### 5.8 版本策略

- Node.js：22 LTS 或 24 LTS（实施时确认）。
- Astro/React/Tailwind：锁 major，Renovate/Dependabot 每周提 PR；不追 beta。
- Pagefind：锁 minor；升级时跑中文搜索回归用例。
- `skills` CLI：不在构建中依赖；只在文档/命令中引用最新版。若要做安装验证，固定在 CI 的临时环境。

---

## 6. 系统架构、数据流与 Skill 数据模型

### 6.1 架构总览

```
┌──────────────────────────────────────────────────────────────────┐
│                         数据源（公开）                             │
│  GitHub repos (topic / seed / submission)   GitHub raw files      │
└───────────────────────────────┬──────────────────────────────────┘
                                │ GitHub REST API（ETag / 限流）
                                ▼
┌──────────────────────────────────────────────────────────────────┐
│                  GitHub Actions：sync worker                      │
│  1. 读取 seeds + submissions + editorial                          │
│  2. 拉取 repo 元数据 / tree / SKILL.md                            │
│  3. 解析 frontmatter、校验、估算 token、静态风险扫描               │
│  4. 去重、分类、许可证解析、生成 compact index                     │
│  5. 写入 data/*.json，校验 schema，提交 commit                     │
└───────────────────────────────┬──────────────────────────────────┘
                                │ git push（bot commit / PR）
                                ▼
┌──────────────────────────────────────────────────────────────────┐
│                     Astro 构建（Vercel / CI）                      │
│  - 读取 data/*.json + editorial/*.yml                             │
│  - 生成静态页面（首页/Explore/详情/专题/场景）                     │
│  - 运行 Pagefind 生成搜索索引（zh + en）                           │
│  - 生成 OpenCode catalog（pack/index.json + 文件）                 │
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
        浏览器（用户）                    OpenCode（catalog 订阅）
        - 搜索/筛选/随机                  - index.json + SKILL.md
        - 复制安装命令                    - 版本变化自动刷新
        - 查看 GitHub 源
```

**关键：没有运行时后端。** 所有动态能力在构建时或浏览器完成。

### 6.2 数据流（详细）

| 步骤 | 输入 | 处理 | 输出 | 失败处理 |
|---|---|---|---|---|
| 1. 发现 | seeds.yml / topics / submissions | 合并、去重、优先级排序 | 候选 repo 列表 | 记录跳过原因 |
| 2. 元数据 | repo API | stars、license、archived、pushed_at、default_branch | repo 记录 | 404/403 → 隔离 |
| 3. 文件树 | git/trees?recursive=1 | 找 `SKILL.md`（大小写敏感）、统计文件 | skill 目录列表 | 树截断 → 逐层拉取 |
| 4. 内容 | raw / contents API | 读取 SKILL.md，限制 256KB | 原文 + frontmatter | 超限 → 截断并标记 |
| 5. 解析 | 原文 | `gray-matter` + 宽松 YAML 回退 | 结构化字段 | YAML 失败 → 隔离 |
| 6. 校验 | 结构化字段 | 规范规则 + 客户端差异 | diagnostics | 严重 → 不发布 |
| 7. 扫描 | 正文 + 文件树 | 静态规则（不执行） | risk flags + evidence | 严重 → 隔离 |
| 8. 去重 | 内容 hash + simhash | 精确/近似重复 | canonicalId | 保留但标记 duplicate |
| 9. 分类 | 名称/描述/文件 | 规则 + 人工 editorial 覆盖 | scenes/topics/agents | 未分类 → “其他” |
| 10. 许可 | repo license + frontmatter | SPDX 归一化、冲突标记 | licenseStatus | 未知 → 仅摘要 |
| 11. 写盘 | 全部 | 排序、稳定序列化、schema 校验 | data/*.json | 失败 → 不提交 |
| 12. 构建 | data + editorial | Astro + Pagefind | dist/ | 失败 → 阻止部署 |
| 13. 部署 | dist/ | Vercel | CDN | 回滚上一版 |

### 6.3 Skill 数据模型

```ts
// 建议的 TypeScript 形状（仅方案，不实现）
type RiskCode =
  | "SCRIPT_PRESENT"
  | "EXEC_CURL_PIPE"
  | "BASE64_EXEC"
  | "REMOTE_INSTRUCTIONS"
  | "CREDENTIAL_ACCESS"
  | "NETWORK_FETCH"
  | "PRIVILEGE_ESCALATION"
  | "HIDDEN_UNICODE"
  | "PROMPT_INJECTION_PATTERN"
  | "SECRET_PATTERN"
  | "OBFUSCATED_ARCHIVE"
  | "DESTRUCTIVE_COMMAND";

interface RiskFlag {
  code: RiskCode;
  severity: "info" | "warn" | "high" | "critical";
  evidence: { file: string; line?: number; excerpt: string }[];
  note?: string;
}

interface SkillRecord {
  id: string;                 // owner/repo/path-slug（稳定）
  slug: string;               // URL 用
  name: string;               // frontmatter name
  displayName?: string;       // 可选展示名
  description: string;        // 原文
  descriptionZh?: string;     // 人工导读（可选）
  source: {
    provider: "github";
    owner: string;
    repo: string;
    url: string;
    stars: number;
    license: string | null;   // SPDX 或 null
    licenseSource: "repo" | "frontmatter" | "none" | "conflict";
    defaultBranch: string;
    pushedAt: string;         // ISO
    archived: boolean;
  };
  path: string;               // repo 内路径，如 skills/pdf
  commit: string;             // 采集时 commit SHA
  contentHash: string;        // 文件树哈希（SHA-256）
  frontmatter: {
    license?: string;
    compatibility?: string;
    metadata?: Record<string, string>;
    allowedTools?: string;
  };
  files: {
    path: string;
    size: number;
    kind: "skill" | "script" | "reference" | "asset" | "other";
  }[];
  metrics: {
    bodyTokensEstimate: number;
    fileCount: number;
    scriptCount: number;
    hasNetwork: boolean;
    hasCredentialAccess: boolean;
  };
  risk: {
    level: "none" | "low" | "medium" | "high";
    flags: RiskFlag[];
    reviewedAt?: string;
    reviewedCommit?: string;
  };
  taxonomy: {
    scenes: string[];         // inherit-codebase, add-tests...
    topics: string[];         // react, testing...
    agents: string[];         // claude-code, codex, cursor, opencode
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
  status: "published" | "quarantined" | "archived" | "removed";
  duplicateOf?: string;       // canonical id
  timestamps: {
    firstSeenAt: string;
    lastSyncedAt: string;
    upstreamUpdatedAt: string;
  };
  install: {
    cli: string;              // npx skills add owner/repo --skill name -a opencode
    use: string;              // npx skills use owner/repo@name
    sourceUrl: string;
    catalogPack?: string;     // 若进入 OpenCode catalog
  };
}
```

**设计要点：**

- `id` 与 `path` 分离：同一个 repo 可以有多个 skill。
- `commit` + `contentHash` 是“可复现”的核心；没有它们，不做“已复核”。
- `editorial` 与上游事实分离：上游更新不会覆盖人工导读。
- `status` 支持隔离/下架，不删除记录（保留 tombstone 90 天）。
- `duplicateOf` 保留重复项但默认不出现在列表；避免“删除后又被抓回来”。

### 6.4 索引文件与分片

| 文件 | 用途 | 预估大小（5k） |
|---|---|---|
| `data/index/skills.compact.json` | 列表/排序/命令面板 | 3–5 MB raw，~1 MB gzip |
| `data/index/facets.json` | 筛选计数 | < 100 KB |
| `pagefind/` | 全文搜索 | 3–8 MB（分块懒加载） |
| `data/skills/<id>.json` | 单条详情（构建用） | 每条约 1–2 KB |
| `catalog/<pack>/index.json` | OpenCode catalog | 每包 < 10 KB |

**分片策略 [R]：**

- 500–2,000 条：一个 compact 文件即可（1 MB gzip 内）。
- 2,000–5,000：按首字母或 `scene` 分片；Explore 只加载当前筛选的分片。
- 5,000+：按 `topic` 分片 + 服务端搜索（此时再考虑升级架构）。
- **MVP 硬上限 5,000 条已发布**，超过则暂停自动收录，先优化质量。

### 6.5 OpenCode catalog 设计

**目录：**

```
public/catalog/
  design-foundations/
    index.json
    frontend-design/SKILL.md
    accessibility-audit/SKILL.md
    ...
  testing/
    index.json
    ...
```

**index.json：**

```json
{
  "skills": [
    {
      "name": "frontend-design",
      "version": "2026-11-15-a1b2c3d4",
      "files": ["SKILL.md", "references/checklist.md"]
    }
  ]
}
```

**生成规则：**

- 只包含：`status=published`、`risk.level != high`、许可证允许再分发、无 `critical` flag。
- `version` = 内容 hash 前 8 位 + 日期；内容变化必须变。
- 每个 pack 8–15 个 skill；避免模型可用列表过长。
- 文件路径必须同源、相对、安全；构建时校验。
- 不包含脚本？**建议包内允许脚本，但必须在详情页明确标注**；如果用户希望“纯提示词包”，单独提供 `prompt-only` pack。

**用户配置：**

```jsonc
{
  "skills": [
    "https://skill-shelf.example/catalog/design-foundations/index.json"
  ]
}
```

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

**seed 规模建议：**

- 首发候选：**1,500 个 repo**（人工 seed 300 + topic 1,200）。
- 自动解析后：约 2,000–2,500 个 skill。
- 人工/规则筛选后：**发布 500 个**。
- 3 个月目标：**1,500 个**。
- 硬上限：**5,000 个**。

### 7.2 抓取策略与配额测算

**事实 [S14][S15]：**

- 未认证：60 请求/小时。
- PAT：5,000 请求/小时。
- GitHub Actions 的 `GITHUB_TOKEN`：**1,000 请求/小时/仓库**。
- 代码搜索：**10 请求/分钟**（需认证）。
- 条件请求返回 304 时，**不计入主速率限制**（需正确认证）。
- 公开仓库的定时工作流在 **60 天无仓库活动**后会自动禁用。

**测算 [I]：**

| 规模 | 每 repo 约请求数 | 总请求 | 用 GITHUB_TOKEN 耗时 | 用 PAT 耗时 |
|---|---|---|---|---|
| 500 repos | 3–5 | 1,500–2,500 | 2–3 小时 | <1 小时 |
| 1,500 repos | 3–5 | 4,500–7,500 | 5–8 小时 | 1–2 小时 |
| 5,000 repos | 3–5 | 15,000–25,000 | 15–25 小时（分 3 天） | 3–5 小时 |

> 每天增量同步不需要重拉全部：用 ETag + `pushed_at` 分层，只拉变化的 repo。5,000 规模下，日常可能只有 100–500 请求。

**策略：**

1. **初次回填**：用 fine-grained PAT（只读公开仓库）放在 Actions secret；或接受 2–3 天用 `GITHUB_TOKEN` 分批。
2. **日常增量**：`GITHUB_TOKEN` + ETag；按 `pushed_at` 分层（热/温/冷）。
3. **发现**：repo search（30/分钟）而不是 code search；code search 只用于抽样/补漏，不要做全量枚举。
4. **分页**：GitHub 搜索最多 1,000 条/查询；按 `updated`、`language`、`topic` 切分。
5. **失败隔离**：单个 repo 失败不影响整批；记录错误，开 issue。
6. **不抓 HTML**：只用官方 REST API；不绕过限流；不伪造 UA。
7. **不碰私有仓库**：只处理 public。

### 7.3 解析、校验与去重

**解析：**

- 用 `gray-matter` 提取 frontmatter；YAML 失败时尝试“给含冒号的值加引号”的宽松回退（agentskills 文档明确提到这是常见问题）[S2]。
- 正文用 `remark` 解析，保留 AST 以便：
  - 统计 token（粗略：字符数/4，或 `tiktoken` 可选）。
  - 提取代码块、URL、命令行。
  - 渲染时 sanitize。

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

1. **精确**：`contentHash`（文件树）相同 → 同一 skill。
2. **近似**：正文 shingle + SimHash，Hamming 距离 ≤3 → 疑似复制。
3. **同名**：`name` + `description` 相似度 > 0.9 → 同一组。
4. **fork 识别**：GitHub `fork=true` 或 repo 名/描述高度相似。
5. **canonical 选择**：官方组织 > stars 更高 > 创建更早 > 最近更新。
6. **展示**：重复项默认隐藏；详情页提供“这是 X 的副本”链接。

### 7.4 质量信号（不是单一评分）

| 信号 | 计算 | 展示 |
|---|---|---|
| 规范 | 校验通过/警告/失败 | 徽章 |
| 维护 | `pushed_at` 距今 | “3 天前更新”/“临期” |
| 轻量 | 无脚本 + token 估算 | “无脚本”/“含 2 个脚本”/“轻” |
| 可移植 | 是否只用标准字段 | “跨客户端”/“Claude Code 专用” |
| 来源 | 官方 org 白名单 / 已验证作者 | “官方”/“社区” |
| 复核 | 人工记录 | “已复核 @ commit” |
| 采用度 | repo stars（log 缩放） | “仓库 12k stars”（明确是仓库级） |

**排序选项：**

- 编辑推荐（默认）
- 最近更新
- 最轻（token 少/无脚本）
- 仓库 stars（明确标注）
- 随机（质量加权）

**不做：** 安装量、下载量、评分、评论数。

### 7.5 更新与变更检测

| 机制 | 实现 |
|---|---|
| 上游更新 | 比较 `pushed_at` + tree SHA + SKILL.md blob SHA |
| 内容变化 | 重新计算 `contentHash` |
| 复核过期 | 若 `contentHash` 与 `reviewedCommit` 不一致 → “上游已变更，待复核” |
| 删除/归档 | 404 / `archived=true` → `status=archived`，保留 90 天 |
| 失效链接 | 定期检查 `source.url` 与文件路径 |
| 恶意变更 | 风险规则命中 critical → 立即 `quarantined` + 开 issue |
| 通知 | GitHub Issue / RSS（P1） |

**分层同步：**

- 热（最近 30 天有 push）：每周。
- 温（90 天内）：每月。
- 冷（>90 天）：每季度。
- 人工精选：每周检查一次。

### 7.6 检索机制

**两层：**

1. **Pagefind 全文**：
   - 详情页 `data-pagefind-body`；标题/描述/正文可搜。
   - 过滤器：`agent`、`risk`、`scene`、`license`、`language`、`hasScripts`。
   - 中文：`pagefind_extended` 构建；`lang="zh-CN"`。
2. **compact JSON 元数据**：
   - 命令面板即时搜索（名称/描述/tag）。
   - Explore 排序/分面。
   - 中文分词：`Intl.Segmenter("zh", { granularity: "word" })`；英文 lowercase + 简单 stem。

**搜索质量保障：**

- 建立 30 条“黄金查询”回归集（中英各 15 条），每次构建跑一遍，检查 top 10 是否包含预期 skill。
- 同义词表版本化；新增词条需 PR。
- 记录“零结果查询”（隐私友好的聚合），每月 review。

### 7.7 安装机制

**三条路径：**

| 路径 | 命令 | 适用 |
|---|---|---|
| **正式安装** | `npx skills add <owner>/<repo> --skill <name> -a <agent>` | 大多数用户 |
| **先试后装** | `npx skills use <owner>/<repo>@<name>` | 不确定是否合适 |
| **OpenCode 订阅** | `opencode.json` 加 catalog URL | OpenCode 用户，按专题持续更新 |

**UI 细节：**

- 客户端选择器：Claude Code / Codex / Cursor / OpenCode / 通用。
- 命令随选择变化；复制按钮有“已复制”反馈。
- 显示目标目录（例如 OpenCode `.opencode/skills`；Claude Code `.claude/skills`）。
- 全局安装加 `-g` 的说明。
- 卸载：`npx skills remove <name>`。
- 更新：`npx skills update <name>`。
- 锁定：展示 `skills-lock.json` 片段 + commit。

**验证：**

- CI 不执行第三方 skill；但可以在**临时目录**用官方 CLI 对一个已知安全 repo 做 smoke test（安装/卸载），验证命令格式。不要把第三方 skill 加入构建依赖。

### 7.8 版本锁定与哈希

- 展示 `commit` 短 SHA（7–12 位）与 `contentHash` 前 12 位。
- 说明：`skills-lock.json` v2 的 `computedHash` 算法由 CLI 定义；我们的 hash 是独立的内容哈希，用于站内变更检测。两者不混用。
- “已复核 @ commit”必须与当前 `commit` 一致；否则显示“上游已变更”。
- 若作者 force-push / 删除 tag，保留历史记录并标记“历史版本不可复现”。

---

## 8. UI/UX 信息架构及页面设计建议

### 8.1 设计原则

1. **内容优先，界面退后**：卡片和排版承担主要信息，不靠装饰。
2. **一眼可判断**：名称 + 一句话 + 3 个信号（客户端/风险/新鲜度）。
3. **键盘优先**：⌘K 搜索、`/` 聚焦、`g h` 回首页、`r` 随机。
4. **克制**：近黑背景、1px 边框、一个强调色；没有大渐变、没有玻璃拟态堆叠。
5. **可读**：中文正文 16px/1.75；英文 15–16px/1.6；命令等宽。
6. **可访问**：对比度、焦点、语义、减少动效。

### 8.2 视觉系统

| Token | 建议值 | 说明 |
|---|---|---|
| `bg` | `#08090A` | 近黑，不是纯黑 |
| `surface` | `#0E1011` | 卡片 |
| `surface-2` | `#141617` | hover/嵌套 |
| `border` | `rgba(255,255,255,0.08)` | 1px |
| `text` | `#EDEDED` | 主文本 |
| `muted` | `#8A8F98` | 次要 |
| `accent` | `#C8F751`（青柠） | 新鲜/行动；避免紫色俗套 |
| `warn` | `#FFB86B` | 风险提示 |
| `danger` | `#FF6B6B` | 高危 |
| `ok` | `#7EE787` | 通过 |
| `radius` | 10px / 6px | 卡片 / chip |
| `font-sans` | Inter, PingFang SC, Microsoft YaHei, Noto Sans SC, sans-serif | 中文系统字体 |
| `font-mono` | JetBrains Mono, ui-monospace, monospace | 命令 |

**浅色主题**：MVP 用 CSS variables 同时支持深/浅两套，默认跟随系统；不做两套独立设计。深色是开发者工具的主场景，但中文开发者中不少人用浅色，只做深色会损失可读性与好感。

### 8.3 信息架构（sitemap）

```
/                                首页（货架）
/explore                         全部 Skills（搜索 + 筛选）
/scenes/[scene]                  场景（8 个）
/collections/[slug]              专题合集（5 个）
/topics/[topic]                  技术主题（可选，SEO）
/agents/[agent]                  客户端兼容页（可选）
/skill/[...id]                   详情
/submit                          提交 Skill
/about                           关于
/curation                        收录标准
/security                        安全与披露
/changelog                       更新日志
/en/...                          英文
/catalog/[pack]/index.json       OpenCode catalog
/catalog/[pack]/[skill]/...      catalog 文件
/api/v1/skills.json              只读 JSON API
/rss.xml                         RSS（P1）
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
│  精选、可检查、装得进你的 agent。                            │
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
│  [接手代码库] [补测试] [设计稿转代码] [上线自查] ...          │
├────────────────────────────────────────────────────────────┤
│  本周专题：把设计系统喂给 Agent              [查看 12 个 →] │
│  一句策展说明……                                             │
│  ┌────────┐ ┌────────┐ ┌────────┐                         │
│  └────────┘ └────────┘ └────────┘                         │
├────────────────────────────────────────────────────────────┤
│  轻量无脚本 · 只改提示词，不碰你的机器        [查看全部 →]   │
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

### 8.5 Explore 页

**布局：**

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

- 所有筛选写入 URL query（`?agent=opencode&risk=none&sort=editor`），可分享。
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
│ 一句话描述……                                  │  Commit: a1b2c3d     │
│                                              │  Hash: 9f8e7d6       │
│ [安装到 OpenCode ▾]  [先试不装]  [GitHub ↗]   │  许可: MIT           │
│                                              │  更新: 3 天前        │
│ ── 它能做什么 ─────────────────────────────   │  复核: 2026-11-10    │
│ 正文/导读……                                   │  ─────────────       │
│                                              │  风险                 │
│ ── 什么时候用 ─────────────────────────────   │  · 含 2 个脚本       │
│ · ...                                        │  · 访问网络          │
│                                              │  · 未发现凭据访问    │
│ ── 什么时候不适合 ─────────────────────────   │  [查看证据 →]        │
│ · ...                                        │                     │
│                                              │  Token: ~1,200       │
│ ── 配料表 ─────────────────────────────────   │  文件: 6             │
│ [SKILL.md] [文件树] [风险] [版本]             │                     │
│                                              │  [报告问题]          │
│ ── 相关 ───────────────────────────────────   │                     │
│ 3 个相似但更轻/更专的 skill                    │                     │
└──────────────────────────────────────────────┴─────────────────────┘
```

**安装区：**

- 客户端 segmented control：`OpenCode | Claude Code | Codex | Cursor | 通用`。
- 命令块：等宽、可复制、带“复制”按钮。
- 下方小字：“安装到当前项目；全局安装加 `-g`。”
- “先试不装”折叠：显示 `npx skills use ...`。
- “锁定版本”折叠：显示 `skills-lock.json` 片段。

**配料表 tabs：**

1. **SKILL.md**：渲染后的正文（sanitize），可切换原文/中文导读。
2. **文件树**：`SKILL.md` + 脚本/引用/资源；点击预览文本文件（构建时生成，不请求 GitHub）。
3. **风险**：旗标列表 + 证据（文件:行 + 代码片段）；高危用红色，信息用灰色。
4. **版本**：commit、hash、最近同步、复核记录；P1 加 diff。

**信任卡文案示例：**

> 我们在这个 commit 上检查过：没有发现 `curl | bash`、base64 执行、隐藏 Unicode 或凭据读取。它包含 2 个 Python 脚本，会访问网络。**这不是安全认证**，安装前请自行审阅。

### 8.7 专题与场景页

**专题页：**

```
┌──────────────────────────────────────────────────────────┐
│ 专题 · 2026-11-15 更新                                    │
│ 把设计系统喂给 Agent                                      │
│ 一句有观点的论点……                                        │
│ 策展人: @xxx  ·  12 个 skill  ·  最后复核 2026-11-10       │
├──────────────────────────────────────────────────────────┤
│ 01  frontend-design       为什么选它……        [安装]      │
│ 02  accessibility-audit    为什么选它……        [安装]      │
│ ...                                                      │
├──────────────────────────────────────────────────────────┤
│ 不建议一起装：X 与 Y 都会注入长上下文，二选一。            │
│ [订阅这个货架到 OpenCode]                                 │
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
| `RiskBadge` | 无脚本/含脚本/高危 |
| `Freshness` | 更新时间/临期 |
| `InstallCommand` | 客户端切换 + 复制 |
| `TrustPanel` | 详情页右侧信任卡 |
| `FileTree` | 文件树 + 预览 |
| `RiskEvidence` | 风险证据列表 |
| `ShelfRail` | 首页横向货架 |
| `SceneChips` | 场景入口 |
| `FilterRail` | Explore 筛选 |
| `EmptyState` | 空结果/无数据 |
| `ReportLink` | 举报/下架入口 |
| `LangToggle` | 中英切换 |

**控制在 ~16 个组件**；不要过早抽象 design system。

### 8.9 响应式

| 断点 | 布局 |
|---|---|
| < 640 | 单列卡片；底部导航（逛/搜/合集）；筛选抽屉；详情页底部粘性安装条 |
| 640–1024 | 2 列卡片；筛选可折叠 |
| 1024–1280 | 3 列卡片；详情 8/4 |
| > 1280 | 最大宽度 1200–1280px；4 列卡片；留白增加 |

### 8.10 可访问性

- WCAG 2.2 AA：正文对比度 ≥4.5:1；大字 ≥3:1。
- 焦点可见：2px accent outline，`outline-offset: 2px`。
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
| 无脚本 | 无脚本，只改提示词 | Prompt-only, no scripts |
| 含脚本 | 含 2 个脚本 | 2 scripts included |
| 未复核 | 我们还没复核这个版本 | Not reviewed at this commit |
| 风险提示 | 未发现高危模式，但这不等于安全 | No high-risk patterns found. This is not a safety guarantee. |
| 安装 | 安装到 OpenCode | Install for OpenCode |
| 先试 | 先试不装 | Try without installing |
| 空结果 | 没找到。试试“补测试”或“设计稿转代码”。 | Nothing found. Try “add tests” or “design to code”. |

---

## 9. Vercel Hobby 资源、成本与扩展性评估

### 9.1 Hobby 额度（2026-11 官方）

**事实 [S16][S18]：**

| 资源 | Hobby 额度 |
|---|---|
| Fast Data Transfer | 前 **100 GB**/月 |
| CDN Requests | 前 **1,000,000**/月 |
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

### 9.3 带宽测算

**假设：**

- 典型页面：HTML 25 KB + CSS 20 KB + JS 60 KB + 字体 80 KB（Latin subset）+ 图片 0（SVG/CSS）= **约 185 KB**。
- 搜索页额外加载 Pagefind 分块：**200–500 KB**（仅搜索时）。
- 详情页可能加载文件预览：**< 50 KB**。

| 月访问（PV） | 平均传输 | 总流量 | 占 100 GB | 判断 |
|---|---|---|---|---|
| 10,000 | 200 KB | 2 GB | 2% | 很安全 |
| 50,000 | 220 KB | 11 GB | 11% | 安全 |
| 100,000 | 250 KB | 25 GB | 25% | 安全 |
| 200,000 | 300 KB | 60 GB | 60% | 需观察 |
| 350,000 | 300 KB | 105 GB | 105% | 超限/被暂停 |

**加上搜索索引：**

- 100k PV，15% 使用搜索，每次 500 KB → 7.5 GB → 总计约 32.5 GB（32.5%）。
- 200k PV，15% → 15 GB → 总计约 75 GB（75%）。

**结论 [R]：**

- Hobby 100 GB 足以支撑 **10–20 万 PV/月**的静态站。
- 真正的风险不是“正常用户”，而是**爬虫/热链/大文件**。对策：
  - 不提供大图/视频；OG 图用静态小图。
  - `robots.txt` 合理配置；对恶意爬虫用 Vercel WAF（Hobby 3 条自定义规则 / 10 个 IP 封禁）。
  - 静态资源 `Cache-Control: public, max-age=31536000, immutable`。
  - 数据 JSON 用 `stale-while-revalidate`；不要每次请求都回源。
  - 详情页不加载全量索引。

### 9.4 构建测算

| 已发布 skill | 页面数（中英 + 专题/场景） | Astro 构建（估） | Pagefind（估） | 总时长 | 45 分钟限制 |
|---|---|---|---|---|---|
| 500 | ~1,100 | 30–60s | 10–20s | <2 min | 安全 |
| 2,000 | ~4,200 | 2–4 min | 30–60s | <5 min | 安全 |
| 5,000 | ~10,200 | 5–10 min | 1–2 min | <12 min | 安全 |
| 20,000 | ~40,000 | 20–40 min | 5–10 min | 25–50 min | **风险** |

**结论：** MVP 硬上限 5,000；超过则分片/增量构建/迁移。**不要等到 2 万再改架构。**

### 9.5 数据规模与性能

| 已发布 | compact JSON（raw/gzip） | Pagefind 索引 | 首屏 | 搜索延迟 |
|---|---|---|---|---|
| 500 | ~0.5 MB / 0.15 MB | 1–2 MB | <1s | <50ms |
| 2,000 | ~2 MB / 0.5 MB | 3–4 MB | <1.5s | <100ms |
| 5,000 | ~5 MB / 1.2 MB | 6–8 MB | <2s（懒加载） | <150ms |
| 20,000 | ~20 MB / 5 MB | 20 MB+ | 不可接受 | 需服务端 |

**优化：**

- compact JSON 不阻塞首屏；只在 Explore/命令面板加载。
- Pagefind 分块懒加载；首页不加载。
- 详情页只加载自己的 JSON（构建时内联）。
- 静态资源 immutable；HTML 短缓存 + CDN。

### 9.6 成本情景

| 情景 | 月 PV | 方案 | 月成本 | 备注 |
|---|---|---|---|---|
| 冷启动 | <10k | Vercel Hobby | $0 | 非商业 |
| 增长 | 50k | Vercel Hobby | $0 | 仍在额度内 |
| 热门 | 200k | Vercel Hobby | $0（接近上限） | 需监控流量 |
| 超限 | 350k+ | Vercel Pro | ~$20 + 用量 | 或迁 Cloudflare/GitHub Pages |
| 商业 | 任意 | Vercel Pro | ~$20 起 | Hobby 不允许商业 |
| 自托管 | 任意 | Cloudflare Pages / Netlify / GitHub Pages | $0–低 | 静态产物可迁移；额度以最新政策为准 |

> 不要为“可能的流量”提前买 Pro；先上线，用真实数据决策。但**如果确定要商业化，直接 Pro 或换平台**，不要赌 Hobby。

### 9.7 迁移与降级方案

**因为选择 Astro 静态输出，迁移成本很低：**

1. `dist/` 是纯静态文件。
2. 换托管：Cloudflare Pages / Netlify / GitHub Pages / 自托管 Nginx。
3. 需要改的只有：
   - 构建命令与输出目录。
   - 自定义 headers（缓存/CSP）在目标平台的配置。
   - 域名 DNS。
4. 数据与页面不依赖 Vercel 专有 API（不使用 ISR、Edge Config、KV、Blob）。

**建议在 Phase 1 就做一次“迁移演练”**：把 `dist/` 部署到 GitHub Pages 或本地 Nginx，确认无 Vercel 依赖。

---

## 10. 安全、许可证与开源协作机制

### 10.1 威胁模型

| 威胁 | 说明 | 现实证据 | 我们的对策 |
|---|---|---|---|
| **直接提示词注入** | SKILL.md 正文包含“忽略之前指令”等 | Snyk：36.82% 有安全问题；恶意样本 91% 含提示注入 [S12] | 静态规则 + 人工复核 + 展示原文；不执行 |
| **间接提示词注入** | skill 抓取网页/issue/邮件，内容含恶意指令 | 第三方内容暴露在 ClawHub 占 17.7% [S12] | 标记“访问网络”；提示用户 |
| **恶意脚本** | `scripts/` 包含凭据窃取、后门、RCE | 恶意样本 100% 含恶意代码模式 [S12] | 文件树 + 脚本清单 + 规则扫描；不执行 |
| **远程指令加载** | `curl ... | source`，行为可变 | 2.9% ClawHub；恶意样本 21% [S12] | 高危规则，直接隔离 |
| **混淆/隐藏** | base64、Unicode 零宽字符、双向文本 | 安全研究持续报告 [S12] | 检测并展示证据 |
| **凭据/密钥泄露** | 硬编码 API key、读取 `~/.aws` | ClawHub 10.9%；恶意样本 32% [S12] | 规则扫描 + 许可证/密钥提示 |
| **typosquatting / 仿冒** | 名称相似、冒充官方 | 安全研究记录 [S11][S12] | 官方 org 白名单；同名聚类；人工审核 |
| **供应链接管** | 仓库被转移/作者账号被盗 | 通用开源风险 | commit 锁定 + 变更提醒 + 复核过期 |
| **记忆污染** | skill 修改 agent 的长期记忆 | Snyk 提到 `SOUL.md`/`MEMORY.md` 风险 [S12] | 标记“写入记忆/配置”模式；提示 |
| **许可证侵权** | 抓取/镜像未经许可的内容 | 通用 | 只存元数据 + 摘要；全文需许可；下架流程 |
| **恶意举报/滥用** | 竞争对手举报、刷提交 | 社区通用 | 审核流程、证据要求、申诉 |

### 10.2 关键安全事实（写进产品文案）

**Snyk ToxicSkills（2026-02）[S12]：**

- 扫描 **3,984** 个来自 ClawHub 与 skills.sh 的 skill。
- **13.4%（534 个）** 至少有一个 CRITICAL 级问题。
- **36.82%（1,467 个）** 至少有一个安全问题。
- **76** 个确认的恶意 payload；**8** 个在发布时仍在线。
- 恶意样本中 **91%** 同时使用提示注入，**100%** 含恶意代码模式。
- ClawHub 中 **10.9%** 含硬编码密钥。

**结论 [I]：** “加一个安全徽章”不够；用户需要**可检查的证据**和**安装前的决策信息**。同时，任何“安全认证”都不可信——包括我们自己的。

### 10.3 风险分级与展示

| 级别 | 定义 | 示例 | UI | 动作 |
|---|---|---|---|---|
| `critical` | 明确恶意/可直接控制机器 | `curl \| bash`、base64+eval、反弹 shell、凭据外传 | 红色“高危” | **不发布/隔离** |
| `high` | 高风险能力，可能被滥用 | `sudo`、`systemctl`、写 SSH/云凭据、下载可执行文件 | 橙色“高风险” | 人工复核后才发布 |
| `medium` | 需要用户知情 | 网络请求、读取 `.env`、写文件、安装依赖 | 黄色“需注意” | 可发布，显著提示 |
| `low` | 轻微/信息 | 含脚本、长正文、外部链接 | 灰色“信息” | 可发布 |
| `none` | 未发现 | 纯提示词、无脚本、无网络 | 绿色“未发现” | 可发布 |

**展示原则：**

- 永远显示“未发现 ≠ 安全”。
- 每个 flag 可展开看证据（文件、行、片段）。
- 不把多个 flag 合成一个分数。
- 高危 flag 出现在卡片上，不只详情页。

### 10.4 自动校验规则（MVP）

> 只做**静态**检查；**绝不执行**第三方脚本。

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
| `OBFUSCATED_ARCHIVE` | 密码保护的 zip/rar、`unzip -P` | critical | 隔离 |
| `DESTRUCTIVE_COMMAND` | `rm -rf /`、`mkfs`、删除系统目录 | critical | 隔离 |

**实现建议：**

- 规则文件化（YAML/TS 数组），便于社区贡献。
- 每条规则有 `id`、`severity`、`pattern`、`message`、`references`。
- 误报通过 `allowlist`（按 skill id + 证据 hash）管理；allowlist 需 PR 审核。
- 规则测试：用恶意/良性样本各 20 条做回归；**不追求 0 误报，追求可解释**。

### 10.5 人工复核

| 对象 | 要求 |
|---|---|
| 首发 500 个 | 至少 1 名维护者看过：描述、文件树、风险旗标、许可证 |
| 专题/首页推荐 | 2 名维护者或 1 名 + 作者确认 |
| 高风险 skill | 必须人工复核 + 记录理由 |
| 复核记录 | `reviews.json`：skill id、commit、reviewer、日期、结论、备注 |
| 复核过期 | commit 变化即过期；显示“上游已变更” |

**复核检查清单：**

1. 描述是否准确？有没有夸大？
2. 是否包含未声明的网络/凭据/脚本行为？
3. 脚本是否可读？有没有混淆？
4. 许可证是否允许展示/分发？
5. 是否有明显的提示注入/越权指令？
6. 安装命令是否可用？
7. 是否与已有 skill 重复？

### 10.6 许可证策略

| 情况 | 策略 |
|---|---|
| 仓库有明确 OSI 许可证（MIT/Apache/BSD/ISC 等） | 展示全文 + 许可证；允许全文镜像（保留版权声明） |
| `SKILL.md` frontmatter 有 `license` | 以更具体者为准；与仓库冲突时标记 `conflict`，人工判断 |
| 无许可证 | **只展示元数据 + 短摘要（≤1,500 字符）+ 源链接**；不镜像全文 |
| 明确禁止再分发 | 只展示元数据 + 链接；不镜像 |
| 未知/自定义 | 按“无许可证”处理，除非作者书面许可 |
| 许可证变更 | 重新计算 `licenseStatus`；若不再允许镜像，移除全文 |

**我们的许可建议 [R]：**

- **代码**：MIT（便于复用）。
- **编辑内容**（中文导读、专题文案、策展说明）：CC BY 4.0。
- **上游 skill 内容**：各自许可证；在详情页与 NOTICE 中标注。
- **数据集合**：注明“元数据来自公开 GitHub 仓库，按各自许可证”；不主张对上游内容的额外权利。
- **免责声明**：不是法律意见；上线前建议做一次法律审阅（尤其是全文镜像与数据库权利）。

### 10.7 收录标准（公开发布）

一个 skill 要上架，必须满足：

**硬性：**

1. 公开 GitHub 仓库，可访问。
2. 有合法 `SKILL.md`（name/description 可解析）。
3. 许可证明确，或作者允许展示摘要 + 链接。
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
  → CI 跑解析/风险/构建
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

**PR 模板：**

- 变更类型（新增/更新/下架/专题）
- 来源与许可证
- 风险自检
- 截图/预览（可选）
- 复核人

### 10.9 下架、争议与安全披露

| 流程 | 承诺 |
|---|---|
| 安全问题举报 | `security@` 邮箱 + GitHub Security Advisory；48 小时内确认 |
| 版权/许可证投诉 | `takedown@` 邮箱 + Issue 模板；72 小时内确认，7 天内处理 |
| 作者要求下架 | 验证身份后 7 天内移除；保留 tombstone |
| 争议内容 | 先隐藏，双方举证，维护者裁决；公开说明（不泄露隐私） |
| 恶意提交 | 拉黑 + 报告 GitHub；保留证据 |
| 安全事件公告 | `/security` 页面 + changelog；说明影响范围与修复 |

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
> 本站列出的 Agent Skills 由第三方作者创建和维护。我们展示来源、许可证、文件清单和静态风险扫描结果，但**不对任何 Skill 的功能、安全性、合法性或适用性作出保证**。静态扫描只能发现已知模式，不能发现所有恶意行为；标记为“未发现”不代表安全。
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
| 上游 skill 内容 | 原许可证 | 不改变 |
| Logo/品牌 | 保留 | 避免冒充 |

---

## 11. 分阶段开发路线及各阶段验收标准

> 假设 1 名全职开发者 + 兼职内容/设计支持；4–5 周 MVP。

### Phase 0：调研与决策（已完成）

**产出：** 本文档。  
**验收：** 12 个章节齐全；关键事实有来源；待决策项明确。  
**退出条件：** 你确认 12.2 的关键事项。

### Phase 1：数据骨架 + 静态站（第 1 周）

**任务：**

- 初始化 Astro + Tailwind + React 岛（**这是开发阶段，不在本次执行**）。
- 定义 `SkillRecord` schema（Zod）。
- 实现 frontmatter 解析、规范校验、token 估算。
- 50 个 seed 的手动数据 → 生成 JSON → 渲染首页/详情/Explore 雏形。
- 基础设计 tokens、布局、卡片、导航。

**验收：**

- 50 个 skill 全部通过 schema 校验。
- 首页/详情/Explore 可在本地构建。
- Lighthouse 移动端 ≥90（雏形）。
- 构建 < 2 分钟。
- 无运行时后端依赖。

### Phase 2：采集管道 + 质量/安全（第 2 周）

**任务：**

- GitHub Actions `sync.yml`：seed → repo → tree → SKILL.md → JSON。
- ETag 缓存、限流、重试、失败隔离。
- 去重（hash + SimHash）、canonical 选择。
- 风险规则 v1（12 条）、证据提取。
- 许可证解析、`licenseStatus`。
- 扩展到 500 个发布 skill。

**验收：**

- 500 个 skill 在 10 分钟内完成同步（增量）。
- 0 个未处理异常；失败 repo 有记录。
- 100% 已发布 skill 有 source/commit/license/risk。
- critical flag 0 个进入 published。
- 规则回归样本 40 条通过（恶意/良性各 20）。
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
- 5,000 条模拟数据下，搜索 p95 < 150ms。
- 所有筛选可分享 URL；刷新后状态保留。
- 键盘可完成：搜索 → 打开详情 → 复制安装命令。

### Phase 4：信任、专题与双语（第 4 周）

**任务：**

- 详情页信任卡、配料表、文件树、风险证据、版本信息。
- 5 个专题、8 个场景的编辑内容。
- 150 个中文导读。
- OpenCode catalog 3 个 pack。
- 提交 Issue Form、收录标准、安全页、免责声明。
- SEO：sitemap、canonical、hreflang、JSON-LD、OG 默认图。

**验收：**

- 每个专题 ≥6 个 skill，有策展说明/复核日期。
- 每个场景有“适合/不适合”。
- 150 个中文导读无明显机翻腔（人工抽检 20 条）。
- OpenCode catalog 能被 `opencode.json` 加载，版本变化刷新。
- 所有页面有 title/description/canonical。
- A11y 自动检查 0 critical。

### Phase 5：发布与运营（第 5 周）

**任务：**

- 迁移演练（GitHub Pages / 本地 Nginx）。
- 安全自查：CSP、sanitize、外链、依赖审计。
- 性能优化：字体、缓存、图片、索引懒加载。
- 发布清单：域名、DNS、Analytics、Search Console、sitemap 提交。
- 社区运营：欢迎 issue、贡献指南、首批作者沟通。

**验收：**

- 生产构建 < 10 分钟；Lighthouse 移动端 Perf/A11y/SEO ≥95。
- 0 个 critical 依赖漏洞（`npm audit`）。
- CSP 无 inline script（除必要的 hash/nonce）。
- 10 条安装命令在临时目录验证通过。
- 迁移演练成功，站点无 Vercel 专有依赖。
- 发布后 7 天无 P0/P1 事故。

### 时间线与依赖

```
Week 1  Phase 1  ████████
Week 2  Phase 2  ████████
Week 3  Phase 3  ████████
Week 4  Phase 4  ████████
Week 5  Phase 5  ████████
```

**关键路径：** 数据 schema → 采集 → 500 条数据 → 搜索/详情 → 内容 → 发布。  
**可并行：** 设计系统/组件（Week 1–3）、编辑内容（Week 2–4）、安全规则（Week 2–4）。

### 发布清单（Go/No-Go）

- [ ] 500 个已发布 skill，100% 有来源/许可证/风险
- [ ] 0 个 critical 风险进入 published
- [ ] 5 个专题、8 个场景完成
- [ ] 150 个中文导读
- [ ] 搜索黄金查询通过
- [ ] 安装命令验证通过
- [ ] 免责声明/收录标准/下架流程可访问
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
| 2 | **版权/许可证** | 中 | 高 | 元数据 + 摘要 + 链接；全文需许可；下架流程 | 收到投诉 |
| 3 | **安全责任** | 高 | 高 | 不认证；风险可见；免责声明；快速下架 | 用户报告恶意 skill |
| 4 | **数据质量/垃圾** | 高 | 高 | 精选 500；去重；人工复核；硬上限 5k | 重复率 >20%；举报增多 |
| 5 | **竞品压制** | 中 | 高 | 中文/信任/OpenCode 差异化；不做数量 | 流量连续 2 月下降 |
| 6 | **维护倦怠** | 中 | 高 | 自动化；小范围；社区；SLA 不过度承诺 | 同步连续失败；复核积压 |
| 7 | **构建/性能** | 中 | 中 | 5k 上限；分片；懒加载；迁移演练 | 构建 >20 分钟 |
| 8 | **标准/客户端变化** | 高 | 中 | 适配层；兼容性矩阵；季度复核 | 客户端 breaking change |
| 9 | **品牌/商标** | 低 | 中 | 不使用他人商标；命名检索；免责声明 | 商标投诉 |
| 10 | **法律辖区/隐私** | 低 | 中 | 无账号；最少数据；隐私页；法律审阅 | 监管问询 |

### 12.2 待决策问题（需要你确认）

| # | 问题 | 选项 | 我的建议 | 影响 |
|---|---|---|---|---|
| 1 | **项目是否严格非商业？** | A. 纯开源非商业；B. 未来可能广告/赞助/付费；C. 不确定 | **A**（若 B/C，直接 Pro 或换平台） | 决定 Vercel Hobby 是否可用 |
| 2 | **默认语言？** | A. 中文为 `/`，英文 `/en`；B. 英文为 `/`，中文 `/zh` | **A**（目标含中文开发者，先服务母语） | SEO/首屏/内容策略 |
| 3 | **首发规模？** | A. 300；B. 500；C. 1,000 | **B**（质量与“货架感”的平衡） | 内容工作量/构建 |
| 4 | **是否展示全文？** | A. 只展示摘要 + 链接；B. 许可允许时展示全文；C. 全部展示 | **B** | 版权/体验/SEO |
| 5 | **是否做 OpenCode catalog 镜像？** | A. 做 3 个 pack；B. 只给命令；C. 做全站 catalog | **A** | 差异化/维护/许可 |
| 6 | **是否首发接受社区提交？** | A. 是（Issue Form）；B. 先内测，2 周后开放 | **A**（但审核 SLA 写清楚） | 供给/审核负担 |
| 7 | **是否接入 Analytics？** | A. Vercel Web Analytics；B. 自托管 Umami；C. 不做 | **A**（隐私友好，额度够） | 数据/隐私 |
| 8 | **项目许可证？** | A. MIT + CC BY 4.0；B. Apache-2.0 + CC BY-SA；C. AGPL | **A** | 社区/复用 |
| 9 | **品牌名/域名？** | 待定 | 先定一个不与 skills.sh 混淆的名字 | 商标/记忆 |
| 10 | **是否做“购物篮/打包安装”？** | A. MVP 不做；B. P1 | **A** | 范围/复杂度 |
| 11 | **中文导读的生产方式？** | A. 人工为主 + 机器辅助；B. 全机器翻译；C. 只做 UI 翻译 | **A** | 质量/成本 |
| 12 | **同步频率？** | A. 每日；B. 每周 | **A**（增量成本低） | 新鲜度/CI 负担 |

### 12.3 最终建议

**建议：做，但按“窄 MVP”做。**

**三个下注：**

1. **策展（Curation）**：500 个精选 > 400 万个条目。每个上架 skill 有“为什么是它”。
2. **可检查（Inspectability）**：文件级配料表 + 证据 + commit 锁定，替代虚假安全分。
3. **OpenCode 原生（Native distribution）**：专题 catalog 订阅，形成与 skills.sh 不同的分发入口。

**不做什么：**

- 不做全量索引。
- 不做 AI 语义搜索/推荐。
- 不做账号/评论/评分。
- 不做自建 CLI。
- 不做安全认证。
- 不做商业化的 Hobby 部署。

**成功的样子（6 个月）：**

- 1,500 个精选 skill，5,000+ 月访问。
- 30% 搜索→详情，15% 详情→复制安装。
- 10+ 社区提交/月。
- 3–5 个被社区引用的专题。
- 0 起严重安全事故。
- 至少 1 个客户端/作者主动合作。

**止损/转向条件：**

- 8 周后月访问 < 500，且搜索→详情 < 10% → 重新评估定位（可能只做“中文导读层”或“OpenCode pack 策展”）。
- Vercel 明确要求商业升级 → 迁 Cloudflare Pages 或 Pro，不放弃项目。
- 安全事件导致信任受损 → 暂停自动收录，转纯人工精选。

### 12.4 下一步（等你确认后）

1. 你确认 12.2 的 12 个问题（至少 1–5、8、9）。
2. 定品牌名/域名（避免与 skills.sh / SkillsMP 混淆）。
3. 进入 Phase 1：初始化项目、设计 tokens、schema、50 个 seed（**本次不执行**）。
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
| S18 | Vercel Limits / Fair Use | https://vercel.com/docs/limits, https://vercel.com/docs/limits/fair-use-guidelines | 通用限制、带宽/函数额度 |
| S19 | Pagefind Docs | https://pagefind.app/docs/ | 静态搜索、CJK、过滤 |
| S20 | GitHub Scheduled Workflows | https://docs.github.com/actions/using-workflows/disabling-and-enabling-a-workflow | 60 天无活动自动禁用 |
| S21 | Claude Code frontmatter 扩展 | https://code.claude.com/docs/en/skills#frontmatter-reference | 客户端扩展字段 |
| S22 | OpenCode HTTP Catalog | https://opencode.ai/docs/skills/#catalogs | `index.json`、版本、同源 |

**补充说明：**

- skills.sh 的安装量来自 CLI 匿名遥测，未独立验证；本文只把它作为“规模/热度信号”，不作为质量结论。
- SkillsMP 的 400 万为页面自述；其去重/口径未公开。
- Snyk 数据为 2026-02 的扫描结果，之后生态可能变化；引用时注明时间。
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
| 共同缺口 | 中文编辑内容、文件级风险证据、OpenCode catalog、开放 API、场景驱动 |

## 附录 C：术语表

| 术语 | 含义 |
|---|---|
| Agent Skill | 一个包含 `SKILL.md` 的目录，给 agent 提供可复用指令/资源 |
| SKILL.md | YAML frontmatter + Markdown 正文 |
| Progressive disclosure | 启动只加载元数据，激活时加载全文，资源按需加载 |
| Catalog | OpenCode 的 HTTP 技能目录（`index.json` + 文件） |
| Compact index | 站点构建时生成的轻量 JSON，用于列表/排序/命令面板 |
| Canonical | 重复 skill 组中的“主条目” |
| Risk flag | 静态扫描发现的模式，带证据 |
| Pack | 面向 OpenCode 的小型 skill 集合（8–15 个） |
| Shelf | 编辑策展的专题货架 |
| Scene | 按任务/处境划分的发现入口 |

---

## 附录 D：一页纸决策摘要（给快速阅读）

| 问题 | 结论 |
|---|---|
| 做不做？ | 做，但做“精选 + 可信 + 中文 + OpenCode 原生”，不做“最大索引” |
| 首发规模 | 500 个精选，硬上限 5,000 |
| 技术栈 | Astro + React 岛 + Tailwind + Radix/cmdk + Pagefind |
| 数据 | GitHub Actions 采集 → JSON/YAML 进 Git → Astro 构建 |
| 搜索 | Pagefind（全文/中文）+ compact JSON（排序/命令面板） |
| 安装 | `npx skills add` / `use`；OpenCode catalog 3 个 pack |
| 后端 | 无；无数据库；无 AI API |
| 部署 | Vercel Hobby（仅非商业）；静态可迁移 |
| 最大风险 | Vercel Hobby 非商业条款；版权/许可证；安全责任 |
| 最大机会 | 中文编辑层；文件级信任；OpenCode 订阅；场景发现 |
| 时间 | 4–5 周 MVP |
| 现在需要你确认 | 12.2 的 12 个问题，尤其是商业化意图、默认语言、首发规模、全文策略、品牌名 |
