import fs from "node:fs";
import path from "node:path";

const outRoot = path.join(process.cwd(), "data", "repos");
const syncedAt = "2026-11-15";
const reviewNote =
  "Phase 1 样例：未拉取 SKILL.md 正文，未扫描，也未人工复核。";

const repos = [
  {
    id: 1061953414,
    owner: "anthropics",
    repo: "skills",
    fullName: "anthropics/skills",
    stars: 194683,
    licenseSpdx: null,
    licenseStatus: "unknown",
    headCommit: "1780c5e5a552fd4d1c9d6a7b0cab26b0c2bef064",
    pushedAt: "2026-11-14T21:52:49Z",
    skills: [
      {
        name: "frontend-design",
        path: "skills/frontend-design/SKILL.md",
        size: 9390,
        description:
          "Design and build distinctive front-end interfaces with a clear visual point of view instead of falling back to generic templates.",
        descriptionZh:
          "把前端界面做出明确的视觉主张，而不是套用通用模板。",
        scenes: ["design-to-code"],
        topics: ["design", "frontend"],
        shelves: ["design-systems", "official"],
        rank: 1,
      },
      {
        name: "skill-creator",
        path: "skills/skill-creator/SKILL.md",
        size: 33168,
        description:
          "Guide an agent through creating, testing, and refining a new Agent Skill.",
        descriptionZh: "引导 agent 创建、测试并迭代一个新的 Agent Skill。",
        scenes: [],
        topics: ["agent-workflows", "skills"],
        shelves: ["official"],
        rank: 13,
      },
      {
        name: "pdf",
        path: "skills/pdf/SKILL.md",
        size: 8058,
        description:
          "Extract text and tables, fill forms, and manipulate PDF documents.",
        descriptionZh: "提取 PDF 文本与表格、填写表单并处理文档。",
        scenes: ["write-clearly"],
        topics: ["docs", "pdf"],
        shelves: ["docs-and-data", "official"],
        rank: 5,
      },
      {
        name: "docx",
        path: "skills/docx/SKILL.md",
        size: 7442,
        description: "Create and edit Word documents with structured formatting.",
        descriptionZh: "创建和编辑带结构化格式的 Word 文档。",
        scenes: ["write-clearly"],
        topics: ["docs", "word"],
        shelves: ["docs-and-data", "official"],
        rank: 16,
      },
      {
        name: "xlsx",
        path: "skills/xlsx/SKILL.md",
        size: 9770,
        description: "Build and edit spreadsheets, formulas, and data workflows.",
        descriptionZh: "创建和编辑表格、公式与数据工作流。",
        scenes: ["write-clearly"],
        topics: ["docs", "spreadsheet", "data"],
        shelves: ["docs-and-data", "official"],
        rank: 17,
      },
    ],
  },
  {
    id: 1112540808,
    owner: "vercel-labs",
    repo: "agent-skills",
    fullName: "vercel-labs/agent-skills",
    stars: 34072,
    licenseSpdx: null,
    licenseStatus: "unknown",
    headCommit: "1a2c79d4e6c4a2283dc2c614b6538cbe1ed5ca62",
    pushedAt: "2026-11-12T14:09:10Z",
    skills: [
      {
        name: "web-design-guidelines",
        path: "skills/web-design-guidelines/SKILL.md",
        size: 1231,
        description:
          "Review web interfaces against a practical set of design and usability guidelines.",
        descriptionZh: "按一套实用的设计与可用性准则审查 Web 界面。",
        scenes: ["design-to-code"],
        topics: ["design", "frontend", "review"],
        shelves: ["design-systems", "small-and-readable", "official"],
        rank: 3,
      },
      {
        name: "react-best-practices",
        path: "skills/react-best-practices/SKILL.md",
        size: 7251,
        description:
          "Apply React and Next.js performance and composition best practices.",
        descriptionZh: "应用 React 与 Next.js 的性能和组合最佳实践。",
        scenes: ["design-to-code", "ship-safely"],
        topics: ["react", "nextjs", "performance"],
        shelves: ["official"],
        rank: 12,
      },
      {
        name: "composition-patterns",
        path: "skills/composition-patterns/SKILL.md",
        size: 2886,
        description:
          "Structure React components with composable, scalable patterns.",
        descriptionZh: "用可组合、可扩展的模式组织 React 组件。",
        scenes: ["design-to-code"],
        topics: ["react", "frontend", "architecture"],
        shelves: ["design-systems", "small-and-readable", "official"],
        rank: 15,
      },
    ],
  },
  {
    id: 1134543109,
    owner: "vercel-labs",
    repo: "skills",
    fullName: "vercel-labs/skills",
    stars: 39384,
    licenseSpdx: "MIT",
    licenseStatus: "permissive",
    headCommit: "b716f9dc2ba36b6aa8f0080615e5a3a6caeac63b",
    pushedAt: "2026-11-12T23:25:25Z",
    skills: [
      {
        name: "find-skills",
        path: "skills/find-skills/SKILL.md",
        size: 5472,
        description:
          "Search the open Agent Skills ecosystem from the command line and install a matching skill.",
        descriptionZh:
          "从命令行搜索开放 Agent Skills 生态并安装匹配的 skill。",
        scenes: ["inherit-codebase"],
        topics: ["skills", "discovery"],
        shelves: ["official"],
        rank: 2,
      },
    ],
  },
  {
    id: 1073224795,
    owner: "obra",
    repo: "superpowers",
    fullName: "obra/superpowers",
    stars: 317683,
    licenseSpdx: "MIT",
    licenseStatus: "permissive",
    headCommit: "22f0b463e7a5e579904dd6211a520321035526f7",
    pushedAt: "2026-11-03T23:24:58Z",
    skills: [
      {
        name: "test-driven-development",
        path: "skills/test-driven-development/SKILL.md",
        size: 9578,
        description:
          "Drive implementation with a red-green-refactor workflow and focused tests.",
        descriptionZh: "用红-绿-重构的循环和聚焦测试驱动实现。",
        scenes: ["add-tests"],
        topics: ["testing", "tdd"],
        shelves: ["testing", "code-quality"],
        rank: 4,
      },
      {
        name: "systematic-debugging",
        path: "skills/systematic-debugging/SKILL.md",
        size: 9530,
        description:
          "Debug systematically: reproduce, isolate, form hypotheses, and verify fixes.",
        descriptionZh:
          "系统化调试：复现、隔离、提出假设并验证修复。",
        scenes: ["add-tests", "inherit-codebase"],
        topics: ["debugging", "testing"],
        shelves: ["testing", "code-quality"],
        rank: 11,
      },
      {
        name: "writing-plans",
        path: "skills/writing-plans/SKILL.md",
        size: 10335,
        description:
          "Turn a feature request into a clear, executable implementation plan.",
        descriptionZh: "把功能需求拆成清晰、可执行的实现计划。",
        scenes: ["write-clearly"],
        topics: ["planning", "docs"],
        shelves: ["docs-and-data", "code-quality"],
        rank: 10,
      },
    ],
  },
  {
    id: 1135501937,
    owner: "supabase",
    repo: "agent-skills",
    fullName: "supabase/agent-skills",
    stars: 3071,
    licenseSpdx: "MIT",
    licenseStatus: "permissive",
    headCommit: "c9be0e931b7930f7d02126d04774d904c381e7d7",
    pushedAt: "2026-11-12T15:32:31Z",
    skills: [
      {
        name: "supabase-postgres-best-practices",
        path: "skills/supabase-postgres-best-practices/SKILL.md",
        size: 3231,
        description:
          "Design and review Postgres schemas, queries, and Supabase usage.",
        descriptionZh:
          "设计与审查 Postgres schema、查询和 Supabase 用法。",
        scenes: ["ship-safely", "inherit-codebase"],
        topics: ["database", "postgres", "supabase"],
        shelves: ["small-and-readable", "official"],
        rank: 14,
      },
    ],
  },
  {
    id: 1137388347,
    owner: "remotion-dev",
    repo: "skills",
    fullName: "remotion-dev/skills",
    stars: 7140,
    licenseSpdx: null,
    licenseStatus: "unknown",
    headCommit: "7e541aa4d7361dfaca0780a565a47307eb7bdfbb",
    pushedAt: "2026-11-11T19:23:32Z",
    skills: [
      {
        name: "remotion-best-practices",
        path: "skills/remotion-best-practices/SKILL.md",
        size: 4426,
        description:
          "Build programmatic videos with Remotion using current APIs and patterns.",
        descriptionZh: "用 Remotion 的当前 API 与模式制作程序化视频。",
        scenes: [],
        topics: ["video", "remotion"],
        shelves: ["official"],
        rank: 18,
      },
    ],
  },
  {
    id: 1140468701,
    owner: "prisma",
    repo: "skills",
    fullName: "prisma/skills",
    stars: 80,
    licenseSpdx: "MIT",
    licenseStatus: "permissive",
    headCommit: "a6f192959cf43b08aa330fe1ffca090267215812",
    pushedAt: "2026-11-10T16:06:30Z",
    skills: [
      {
        name: "prisma-client-api",
        path: "prisma-client-api/SKILL.md",
        size: 6346,
        description:
          "Use the Prisma Client API correctly for queries, relations, and transactions.",
        descriptionZh:
          "正确使用 Prisma Client API 处理查询、关联和事务。",
        scenes: ["ship-safely"],
        topics: ["database", "prisma"],
        shelves: ["official"],
        rank: 8,
      },
      {
        name: "prisma-database-setup",
        path: "prisma-database-setup/SKILL.md",
        size: 704,
        description:
          "Set up a Prisma project with the right database connection and schema.",
        descriptionZh: "配置 Prisma 项目的数据库连接与 schema。",
        scenes: ["inherit-codebase"],
        topics: ["database", "prisma", "setup"],
        shelves: ["small-and-readable", "official"],
        rank: 19,
      },
    ],
  },
  {
    id: 585146387,
    owner: "shadcn-ui",
    repo: "ui",
    fullName: "shadcn-ui/ui",
    stars: 128206,
    licenseSpdx: "MIT",
    licenseStatus: "permissive",
    headCommit: "e62c9435fff729a175f38983dee73b2cb4f6a069",
    pushedAt: "2026-11-13T10:58:16Z",
    skills: [
      {
        name: "shadcn",
        path: "skills/shadcn/SKILL.md",
        size: 21606,
        description:
          "Build interfaces with shadcn/ui components and the project's design conventions.",
        descriptionZh: "用 shadcn/ui 组件和项目设计规范构建界面。",
        scenes: ["design-to-code"],
        topics: ["ui", "react", "design"],
        shelves: ["design-systems", "official"],
        rank: 6,
      },
    ],
  },
  {
    id: 1132001614,
    owner: "vercel-labs",
    repo: "agent-browser",
    fullName: "vercel-labs/agent-browser",
    stars: 51269,
    licenseSpdx: "Apache-2.0",
    licenseStatus: "permissive",
    headCommit: "e1723082258b6ff7f8ee9ba1e681ea872d128e43",
    pushedAt: "2026-11-15T03:21:45Z",
    skills: [
      {
        name: "agent-browser",
        path: "skills/agent-browser/SKILL.md",
        size: 3306,
        description:
          "Give an agent a browser for navigating pages, filling forms, and verifying UI behavior.",
        descriptionZh:
          "让 agent 操作浏览器：导航、填表并验证界面行为。",
        scenes: ["ship-safely"],
        topics: ["browser", "testing", "ui"],
        shelves: ["small-and-readable", "official"],
        rank: 9,
      },
    ],
  },
  {
    id: 1148788086,
    owner: "mattpocock",
    repo: "skills",
    fullName: "mattpocock/skills",
    stars: 324553,
    licenseSpdx: "MIT",
    licenseStatus: "permissive",
    headCommit: "5863806dd4e15c63174bee4e7515a4256792ecfa",
    pushedAt: "2026-11-13T12:30:31Z",
    skills: [
      {
        name: "code-review",
        path: "skills/engineering/code-review/SKILL.md",
        size: 6721,
        description:
          "Review a change for correctness, clarity, and missing tests before merge.",
        descriptionZh:
          "在合并前审查变更的正确性、清晰度和测试缺口。",
        scenes: ["ship-safely"],
        topics: ["code-review", "quality"],
        shelves: ["code-quality"],
        rank: 7,
      },
      {
        name: "improve-codebase-architecture",
        path: "skills/engineering/improve-codebase-architecture/SKILL.md",
        size: 6028,
        description:
          "Find structural friction in a codebase and propose incremental architecture improvements.",
        descriptionZh:
          "发现代码库的结构性摩擦，并提出渐进式架构改进。",
        scenes: ["inherit-codebase", "ship-safely"],
        topics: ["architecture", "code-review"],
        shelves: ["code-quality"],
        rank: 20,
      },
    ],
  },
];

function slugFromName(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function buildSkill(repo, skill) {
  const skillPath = skill.path;
  const size = skill.size;
  const slug = slugFromName(skill.name);
  return {
    path: skillPath,
    slug,
    name: skill.name,
    description: skill.description,
    descriptionZh: skill.descriptionZh,
    frontmatter: {},
    files: [
      {
        path: "SKILL.md",
        size,
        kind: "skill",
        scanned: false,
        skipReason:
          "Phase 1 样例：只获取了仓库元数据，文件未扫描。",
      },
    ],
    metrics: {
      bodyTokensEstimate: Math.round(size / 4),
      fileCount: 1,
      scriptCount: null,
      hasNetwork: null,
      hasCredentialPatterns: null,
    },
    scan: {
      status: "not-scanned",
      coverage: {
        filesScanned: 0,
        filesSkipped: 1,
        bytesScanned: 0,
        limitations: [
          "Phase 1 样例：未拉取或扫描 SKILL.md 内容。",
        ],
      },
      flags: [],
      scannerVersion: "none",
      rulesetVersion: "none",
      scannedAt: syncedAt,
      scannedCommit: repo.headCommit,
      scannedBundleHash: "not-scanned",
    },
    review: {
      status: "unreviewed",
      notes: reviewNote,
    },
    taxonomy: {
      scenes: skill.scenes,
      topics: skill.topics,
      agents: ["opencode", "claude-code", "codex", "cursor"],
      language: "en",
      portability: "unknown",
    },
    editorial: {
      shelfIds: skill.shelves,
      featuredRank: skill.rank,
      curator: "Skill Shelf",
    },
    status: "draft",
    timestamps: {
      firstSeenAt: syncedAt,
      lastSyncedAt: syncedAt,
      upstreamUpdatedAt: repo.pushedAt,
    },
  };
}

for (const repo of repos) {
  const dir = path.join(outRoot, repo.owner);
  fs.mkdirSync(dir, { recursive: true });
  const repoFile = {
    repo: {
      id: repo.id,
      owner: repo.owner,
      repo: repo.repo,
      fullName: repo.fullName,
      url: `https://github.com/${repo.fullName}`,
      stars: repo.stars,
      licenseSpdx: repo.licenseSpdx,
      licenseStatus: repo.licenseStatus,
      defaultBranch: "main",
      headCommit: repo.headCommit,
      archived: false,
      pushedAt: repo.pushedAt,
    },
    skills: repo.skills.map((skill) => buildSkill(repo, skill)),
  };
  const file = path.join(dir, `${repo.repo}.json`);
  fs.writeFileSync(file, `${JSON.stringify(repoFile, null, 2)}\n`);
  console.log(`wrote ${path.relative(process.cwd(), file)}`);
}

console.log(`\n${repos.length} repos / ${repos.reduce((sum, r) => sum + r.skills.length, 0)} skills`);
