export interface Shelf {
  id: string;
  title: string;
  titleEn: string;
  blurb: string;
  curator: string;
}

export const shelves: Shelf[] = [
  {
    id: "design-systems",
    title: "把设计系统喂给 Agent",
    titleEn: "Feed your design system to the agent",
    blurb: "先让 agent 读懂设计约束，再让它写界面。",
    curator: "Skill Shelf",
  },
  {
    id: "testing",
    title: "先补测试，再改代码",
    titleEn: "Tests before changes",
    blurb: "给老项目补测试、定位 flaky、把修复变成可验证的循环。",
    curator: "Skill Shelf",
  },
  {
    id: "small-and-readable",
    title: "小而易读",
    titleEn: "Small and readable",
    blurb: "按 SKILL.md 体积挑选的轻量条目；体积小不等于安全。",
    curator: "Skill Shelf",
  },
  {
    id: "docs-and-data",
    title: "文档与数据",
    titleEn: "Docs and data",
    blurb: "PDF、Word、表格，以及把想法写清楚的工作流。",
    curator: "Skill Shelf",
  },
  {
    id: "code-quality",
    title: "交给 Agent 之前，先审一遍",
    titleEn: "Review before handoff",
    blurb: "代码审查、架构改进、调试与验证。",
    curator: "Skill Shelf",
  },
  {
    id: "official",
    title: "官方与团队出品",
    titleEn: "Official and team-maintained",
    blurb: "来自产品团队或长期维护者的条目，来源优先于热度。",
    curator: "Skill Shelf",
  },
];

export interface Scene {
  id: string;
  title: string;
  titleEn: string;
  description: string;
  notFor: string;
}

export const scenes: Scene[] = [
  {
    id: "inherit-codebase",
    title: "接手陌生代码库",
    titleEn: "Inherit a codebase",
    description: "找不到入口、不知道先读哪、改一处崩三处。",
    notFor: "小脚本、已有完善文档、你只改一行。",
  },
  {
    id: "add-tests",
    title: "给老项目补测试",
    titleEn: "Add tests to a legacy project",
    description: "先找到风险最高的路径，再让 agent 写可验证的测试。",
    notFor: "没有可运行环境、需求还在剧烈变化。",
  },
  {
    id: "design-to-code",
    title: "设计稿转代码",
    titleEn: "Design to code",
    description: "让 agent 先理解设计约束，再生成可维护的组件。",
    notFor: "没有设计规范、只需要一次性静态页面。",
  },
  {
    id: "ship-safely",
    title: "上线前自查",
    titleEn: "Ship safely",
    description: "代码审查、浏览器验证、发布前检查。",
    notFor: "还没有可运行版本、没有明确验收标准。",
  },
  {
    id: "write-clearly",
    title: "写清需求与文档",
    titleEn: "Write clearly",
    description: "把想法拆成可执行计划，或把材料整理成文档。",
    notFor: "只需要一句结论、不需要协作的场景。",
  },
];

export const agents = [
  { id: "opencode", label: "OpenCode", short: "OC" },
  { id: "claude-code", label: "Claude Code", short: "CC" },
  { id: "codex", label: "Codex", short: "CX" },
  { id: "cursor", label: "Cursor", short: "CU" },
] as const;

export function getShelf(id: string): Shelf | undefined {
  return shelves.find((shelf) => shelf.id === id);
}

export function getScene(id: string): Scene | undefined {
  return scenes.find((scene) => scene.id === id);
}
