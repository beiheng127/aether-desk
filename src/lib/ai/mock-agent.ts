/**
 * MockAgentEngine（对照实现）
 * 产品默认路径已改为 /api/chat + SQLite。
 * 保留本文件用于对比「前端假编排」与「服务端真编排」。
 */
import { TOOL_CATALOG } from "@/lib/ai/tools/catalog";
import type {
  AgentEngine,
  AgentEngineEventHandlers,
  AgentEngineTurnInput,
  Artifact,
  ToolRun,
} from "@/lib/types/agent";
import { uid } from "@/lib/utils";

function sleep(ms: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }
    const t = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(t);
        reject(new DOMException("Aborted", "AbortError"));
      },
      { once: true },
    );
  });
}

export class MockAgentEngine implements AgentEngine {
  readonly id = "mock-agent-v1-legacy";

  async runTurn(
    input: AgentEngineTurnInput,
    handlers: AgentEngineEventHandlers,
    signal?: AbortSignal,
  ): Promise<void> {
    try {
      handlers.onPhase("thinking");
      await sleep(300, signal);
      const runId = uid("tool");
      const base: ToolRun = {
        id: runId,
        name: "search_notes",
        displayName: TOOL_CATALOG.search_notes.displayName,
        status: "running",
        args: { query: input.userText },
        startedAt: Date.now(),
        requiresApproval: false,
      };
      handlers.onToolRunUpsert(base);
      await sleep(400, signal);
      handlers.onToolRunUpsert({
        ...base,
        status: "result",
        resultPreview: "legacy mock only — use /api/chat",
        endedAt: Date.now(),
      });
      const artifact: Artifact = {
        id: uid("art"),
        kind: "note",
        title: "Legacy mock",
        createdAt: Date.now(),
        sourceToolRunId: runId,
        payload: {
          body: "请改用全栈 /api/chat 路径。",
        },
      };
      handlers.onArtifact(artifact);
      handlers.onPhase("streaming");
      const text =
        "当前产品默认走服务端 Agent。若你看到这条回复，说明仍在调用旧 Mock。";
      handlers.onAssistantDelta(text);
      handlers.onDone(text);
      handlers.onPhase("idle");
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        handlers.onPhase("idle");
        return;
      }
      handlers.onError(err instanceof Error ? err.message : "error");
      handlers.onPhase("error");
    }
  }
}

export const mockAgentEngine = new MockAgentEngine();
