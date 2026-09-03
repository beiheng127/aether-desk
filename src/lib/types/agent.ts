/**
 * Agent 领域类型 —— 面试主线：
 * 「LLM 文本流」与「工具执行状态机」是两条并行数据流，前端必须分开建模。
 */

export type ToolName =
  | "search_notes"
  | "create_task_card"
  | "summarize_diff"
  | "save_note"
  | "fetch_url";

/** 工具执行生命周期 —— 可视化时间线的唯一真相来源 */
export type ToolRunStatus =
  | "pending"
  | "running"
  | "awaiting_approval"
  | "result"
  | "error"
  | "cancelled";

export interface ToolRun {
  id: string;
  name: ToolName;
  displayName: string;
  status: ToolRunStatus;
  args?: Record<string, unknown>;
  resultPreview?: string;
  errorMessage?: string;
  startedAt: number;
  endedAt?: number;
  /** 写操作需要 HITL 确认 */
  requiresApproval?: boolean;
}

export type ArtifactKind = "task_card" | "table_card" | "note";

export interface ArtifactBase {
  id: string;
  kind: ArtifactKind;
  title: string;
  createdAt: number;
  sourceToolRunId?: string;
}

export interface TaskCardArtifact extends ArtifactBase {
  kind: "task_card";
  payload: {
    items: Array<{ id: string; text: string; done: boolean }>;
  };
}

export interface TableCardArtifact extends ArtifactBase {
  kind: "table_card";
  payload: {
    columns: string[];
    rows: string[][];
  };
}

export interface Citation {
  index: number;
  noteId: string;
  title: string;
  snippet: string;
  score: number;
  mode: string;
  keywordScore?: number;
  vectorScore?: number;
}

export interface NoteArtifact extends ArtifactBase {
  kind: "note";
  payload: {
    body: string;
    citations?: Citation[];
    retrievalMode?: string;
    embeddingModel?: string;
    /** HITL：待批准写入的笔记草稿 */
    pendingNote?: {
      title: string;
      content: string;
      tags: string;
    };
  };
}

export type Artifact = TaskCardArtifact | TableCardArtifact | NoteArtifact;

export type MessageRole = "user" | "assistant" | "system";

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  createdAt: number;
  /** 本条助手回复关联的工具运行 id 列表 */
  toolRunIds?: string[];
}

export type AgentPhase =
  | "idle"
  | "thinking"
  | "tooling"
  | "streaming"
  | "awaiting_hitl"
  | "error";

export interface AgentEngineTurnInput {
  messages: ChatMessage[];
  userText: string;
}

export interface AgentEngineEventHandlers {
  onPhase: (phase: AgentPhase) => void;
  onAssistantDelta: (delta: string) => void;
  onToolRunUpsert: (run: ToolRun) => void;
  onArtifact: (artifact: Artifact) => void;
  onDone: (finalText: string) => void;
  onError: (message: string) => void;
}

/**
 * 可替换的 Agent 引擎接口。
 * Mock 实现用于离线演示；后续接 Vercel AI SDK / 真模型时只换实现，不改 UI。
 */
export interface AgentEngine {
  readonly id: string;
  runTurn(
    input: AgentEngineTurnInput,
    handlers: AgentEngineEventHandlers,
    signal?: AbortSignal,
  ): Promise<void>;
}
