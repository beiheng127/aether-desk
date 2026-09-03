/** 演示剧本：与离线 fixtures 对齐；无 Key 时走 mock，有 Key 时走真模型。 */

import { listChatFixtures } from "@/lib/ai/fixtures/catalog";

export type DemoScript = {
  id: string;
  label: string;
  hint?: string;
  prompt: string;
};

/** 优先展示高价值全流程，其余从 fixture 目录展开 */
const FEATURED_IDS = [
  "fx-full-demo",
  "fx-workflow-export",
  "fx-agent-loop-cite",
  "fx-ssr-csr-table",
  "fx-hitl-tasks",
  "fx-save-note-hitl",
  "fx-desk-vs-loom",
  "fx-triple-hitl",
];

export const DEMO_SCRIPTS: DemoScript[] = (() => {
  const all = listChatFixtures().filter((f) => f.id !== "fx-default");
  const featured = FEATURED_IDS.map((id) => all.find((f) => f.id === id)).filter(
    Boolean,
  ) as typeof all;
  const rest = all.filter((f) => !FEATURED_IDS.includes(f.id));
  return [...featured, ...rest].map((f) => ({
    id: f.id,
    label: f.label,
    hint: f.hint,
    prompt: f.prompt,
  }));
})();
