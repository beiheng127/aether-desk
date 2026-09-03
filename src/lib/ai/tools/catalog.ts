import type { ToolName } from "@/lib/types/agent";

export interface ToolMeta {
  name: ToolName;
  displayName: string;
  description: string;
  requiresApproval: boolean;
}

export const TOOL_CATALOG: Record<ToolName, ToolMeta> = {
  search_notes: {
    name: "search_notes",
    displayName: "检索笔记",
    description: "混合检索知识库（关键词 + 向量，默认 hybrid，返回可点击引用）",
    requiresApproval: false,
  },
  create_task_card: {
    name: "create_task_card",
    displayName: "生成待办卡片",
    description: "结构化待办（HITL：界面批准后标记生效；拒绝则删除预览制品）",
    requiresApproval: true,
  },
  summarize_diff: {
    name: "summarize_diff",
    displayName: "对比摘要",
    description: "生成对比表制品",
    requiresApproval: false,
  },
  save_note: {
    name: "save_note",
    displayName: "保存笔记",
    description: "写入个人知识库（HITL：批准后才落库并索引）",
    requiresApproval: true,
  },
  fetch_url: {
    name: "fetch_url",
    displayName: "抓取网页",
    description: "抓取公开 HTTPS/HTTP 页面摘要（禁止内网地址）",
    requiresApproval: false,
  },
};

export const TOOL_ORDER: ToolName[] = [
  "search_notes",
  "create_task_card",
  "summarize_diff",
  "save_note",
  "fetch_url",
];
