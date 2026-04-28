import { describe, it, expect } from "vitest";
import {
  validateAgentList,
  traverseBranches,
  conceptUnitWidth,
  isSentenceLike,
  DEFAULT_LIMITS,
  validateCapacity,
  formatCapacityFeedback,
  type AgentListLimits,
  type AgentMindMapList,
} from "./index";

// Inline fixtures for test isolation (no fs dependency)
const fixtures: Record<string, unknown> = {
  "valid-chinese.json": {
    version: 1,
    title: "商业模式分析",
    paper: "a4-landscape",
    center: { concept: "商业模式", visualHint: "商业中心" },
    branches: [
      {
        concept: "客户细分",
        children: [
          {
            concept: "企业客户",
            children: [{ concept: "中小企业" }, { concept: "大型企业" }],
          },
          {
            concept: "个人用户",
            children: [{ concept: "学生群体" }, { concept: "职场人士" }],
          },
        ],
      },
      {
        concept: "价值主张",
        children: [
          { concept: "低成本", children: [{ concept: "自动化流程" }] },
          { concept: "差异化", children: [{ concept: "专利技术" }] },
        ],
      },
    ],
  },
  "valid-english.json": {
    version: 1,
    title: "Product Strategy",
    center: { concept: "PRODUCT STRATEGY" },
    branches: [
      {
        concept: "MARKET FIT",
        children: [
          {
            concept: "TARGET USERS",
            children: [{ concept: "STARTUPS" }, { concept: "ENTERPRISE" }],
          },
          {
            concept: "USE CASES",
            children: [{ concept: "AUTOMATION" }, { concept: "ANALYTICS" }],
          },
        ],
      },
    ],
  },
  "valid-mixed-cjk-ascii.json": {
    version: 1,
    title: "Mixed Concept Test",
    center: { concept: "AI提示词工程" },
    branches: [
      {
        concept: "PROMPT设计",
        children: [
          { concept: "Few-shot学习" },
          { concept: "Chain-of-Thought" },
        ],
      },
      {
        concept: "应用场景",
        children: [{ concept: "代码生成" }, { concept: "文档摘要" }],
      },
    ],
  },
  "invalid-missing-center.json": {
    version: 1,
    title: "Missing Center",
    center: { concept: "" },
    branches: [{ concept: "分支A" }],
  },
  "invalid-malformed-children.json": {
    version: 1,
    title: "Malformed Children",
    center: { concept: "测试" },
    branches: [{ concept: "分支A", children: "not-an-array" }],
  },
  "invalid-sentence-like.json": {
    version: 1,
    title: "Sentence Like Concepts",
    center: { concept: "商业模式" },
    branches: [
      { concept: "我们需要先分析用户为什么会流失", children: [] },
      {
        concept: "This is important because pricing affects conversion",
        children: [],
      },
    ],
  },
  "invalid-oversized-concept.json": {
    version: 1,
    title: "Oversized Concepts",
    center: { concept: "测试" },
    branches: [
      { concept: "大语言模型提示词工程与自动化测试框架设计", children: [] },
    ],
  },
  "invalid-deep-nesting.json": {
    version: 1,
    title: "Nesting Too Deep",
    center: { concept: "测试" },
    branches: [
      {
        concept: "L1",
        children: [
          {
            concept: "L2",
            children: [
              {
                concept: "L3",
                children: [{ concept: "L4-TOO-DEEP" }],
              },
            ],
          },
        ],
      },
    ],
  },
  "invalid-oversized-capacity.json": (() => {
    const branches = [];
    for (let i = 0; i < 5; i++) {
      const children = [];
      for (let j = 0; j < 9; j++) {
        children.push({ concept: `S${j}` });
      }
      branches.push({ concept: `B${i}`, children });
    }
    return {
      version: 1,
      title: "Oversized Input",
      center: { concept: "测试中心" },
      branches,
    };
  })(),
  "invalid-wrong-version.json": {
    version: 2,
    title: "Wrong Version",
    center: { concept: "测试" },
    branches: [{ concept: "分支A" }],
  },
};

describe("validateAgentList — valid inputs", () => {
  it("accepts valid Chinese concept-unit fixture", () => {
    const result = validateAgentList(fixtures["valid-chinese.json"]);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.data).not.toBeNull();
  });

  it("accepts valid English concept-phrase fixture", () => {
    const result = validateAgentList(fixtures["valid-english.json"]);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("accepts valid mixed CJK+ASCII concept fixture", () => {
    const result = validateAgentList(fixtures["valid-mixed-cjk-ascii.json"]);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("accepts minimal valid input (no optional fields)", () => {
    const result = validateAgentList({
      version: 1,
      title: "Minimal",
      center: { concept: "根" },
      branches: [{ concept: "B1" }],
    });
    expect(result.valid).toBe(true);
  });
});

describe("validateAgentList — version & structure", () => {
  it("rejects unsupported contract version with version path error", () => {
    const result = validateAgentList(fixtures["invalid-wrong-version.json"]);
    expect(result.valid).toBe(false);
    expect(result.errors[0].path).toBe("version");
    expect(result.errors[0].message).toContain("Unsupported contract version");
  });

  it("rejects missing center concept with center.concept path", () => {
    const result = validateAgentList(fixtures["invalid-missing-center.json"]);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.path === "center.concept")).toBe(true);
  });

  it("rejects malformed children with correct branch path", () => {
    const result = validateAgentList(
      fixtures["invalid-malformed-children.json"],
    );
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.path.includes("children"))).toBe(true);
  });
});

describe("validateAgentList — quality", () => {
  it("rejects Chinese sentence-like concept as Error", () => {
    const result = validateAgentList(fixtures["invalid-sentence-like.json"]);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.message.includes("sentence"))).toBe(
      true,
    );
    expect(result.data).toBeNull();
  });

  it("rejects concept exceeding unit-width 25", () => {
    const result = validateAgentList(
      fixtures["invalid-oversized-concept.json"],
    );
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.message.includes("unit-width"))).toBe(
      true,
    );
    expect(result.data).toBeNull();
  });
});

describe("validateAgentList — depth & capacity", () => {
  it("rejects nesting deeper than 3 levels", () => {
    const result = validateAgentList(fixtures["invalid-deep-nesting.json"]);
    expect(result.valid).toBe(false);
    expect(
      result.errors.some((e) => e.message.includes("maximum depth of 3")),
    ).toBe(true);
  });

  it("rejects oversized input with capacity feedback", () => {
    const strictLimits: AgentListLimits = { ...DEFAULT_LIMITS, maxNodes: 10 };
    const result = validateAgentList(
      fixtures["invalid-oversized-capacity.json"],
      strictLimits,
    );
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.message.includes("exceeds"))).toBe(true);
  });

  it("capacity feedback message is retry-friendly", () => {
    const data = fixtures[
      "invalid-oversized-capacity.json"
    ] as AgentMindMapList;
    const capErrors = validateCapacity(data, DEFAULT_LIMITS);
    const msg = formatCapacityFeedback(capErrors);
    expect(msg).toContain("exceeds");
    expect(msg).toContain("regenerate a shorter concept list");
  });
});

describe("validateAgentList — hints", () => {
  it("preserves optional visualHint and colorHint in validated output", () => {
    const input = {
      version: 1 as const,
      title: "Hints Test",
      center: { concept: "中心", visualHint: "太阳" },
      branches: [
        {
          concept: "B1",
          visualHint: "箭头",
          colorHint: "#FF5733",
          children: [{ concept: "S1", visualHint: "气泡" }],
        },
      ],
    };
    const result = validateAgentList(input);
    expect(result.valid).toBe(true);
    expect(result.data!.center.visualHint).toBe("太阳");
    expect(result.data!.branches[0].visualHint).toBe("箭头");
    expect(result.data!.branches[0].colorHint).toBe("#FF5733");
    expect(result.data!.branches[0].children![0].visualHint).toBe("气泡");
  });

  it("rejects non-string visualHint with path-specific error", () => {
    const input = {
      version: 1 as const,
      title: "Bad Hints",
      center: { concept: "中心", visualHint: 42 },
      branches: [
        {
          concept: "B1",
          colorHint: true,
          children: [{ concept: "S1", visualHint: null }],
        },
      ],
    };
    const result = validateAgentList(input);
    expect(result.valid).toBe(false);
    const paths = result.errors.map((e) => e.path);
    expect(paths).toContain("center.visualHint");
    expect(paths).toContain("branches[0].colorHint");
    expect(paths).toContain("branches[0].children[0].visualHint");
  });
});

describe("conceptUnitWidth", () => {
  it("counts CJK characters as 2", () => {
    expect(conceptUnitWidth("商业模式")).toBe(8); // 4 CJK × 2
  });

  it("counts ASCII characters as 1", () => {
    expect(conceptUnitWidth("BUSINESS MODEL")).toBe(14); // 14 ASCII × 1
  });

  it("counts mixed CJK+ASCII correctly", () => {
    expect(conceptUnitWidth("AI提示词工程")).toBe(12); // 2 ASCII + 5 CJK × 2 = 2 + 10
  });
});

describe("isSentenceLike", () => {
  it("detects Chinese sentence patterns", () => {
    expect(isSentenceLike("我们需要先分析用户为什么会流失")).toBe(true);
    expect(isSentenceLike("因为价格影响转化率")).toBe(true);
    expect(isSentenceLike("如果用户离开那么收入下降")).toBe(true);
  });

  it("detects English sentence patterns", () => {
    expect(
      isSentenceLike("This is important because pricing affects conversion"),
    ).toBe(true);
  });

  it("accepts concise concept units", () => {
    expect(isSentenceLike("商业模式")).toBe(false);
    expect(isSentenceLike("BUSINESS MODEL")).toBe(false);
    expect(isSentenceLike("客户细分")).toBe(false);
  });
});

describe("traverseBranches", () => {
  it("visits all concepts with correct paths and depths", () => {
    const input: AgentMindMapList = {
      version: 1,
      title: "Traversal Test",
      center: { concept: "ROOT" },
      branches: [
        {
          concept: "B1",
          children: [{ concept: "S1", children: [{ concept: "L1" }] }],
        },
        {
          concept: "B2",
        },
      ],
    };

    const visited: Array<{ concept: string; path: string; depth: number }> = [];
    traverseBranches(input, (concept, path, depth) => {
      visited.push({ concept, path, depth });
    });

    expect(visited).toEqual([
      { concept: "ROOT", path: "center.concept", depth: 0 },
      { concept: "B1", path: "branches[0].concept", depth: 1 },
      { concept: "S1", path: "branches[0].children[0].concept", depth: 2 },
      {
        concept: "L1",
        path: "branches[0].children[0].children[0].concept",
        depth: 3,
      },
      { concept: "B2", path: "branches[1].concept", depth: 1 },
    ]);
  });
});
