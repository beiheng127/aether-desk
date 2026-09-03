import { getDb } from "@/lib/db";
import { artifacts, messages, sessions, toolRuns } from "@/lib/db/schema";
import type { Artifact, ChatMessage, ToolRun } from "@/lib/types/agent";
import { nanoid } from "nanoid";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface ImportPayload {
  session?: {
    title?: string;
    pinned?: boolean;
    createdAt?: number;
    updatedAt?: number;
  };
  messages?: ChatMessage[];
  toolRuns?: ToolRun[];
  artifacts?: Array<{
    id: string;
    kind: Artifact["kind"];
    title: string;
    createdAt: number;
    sourceToolRunId?: string;
    payload: unknown;
    approvalStatus?: string;
  }>;
}

/**
 * 导入导出的会话 JSON，生成新 ID，便于作品集回放 / 跨机演示。
 * 不覆盖已有会话。
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as ImportPayload | null;
  if (!body || typeof body !== "object") {
    return Response.json({ error: "无效 JSON" }, { status: 400 });
  }

  const incomingMessages = Array.isArray(body.messages) ? body.messages : [];
  const incomingTools = Array.isArray(body.toolRuns) ? body.toolRuns : [];
  const incomingArts = Array.isArray(body.artifacts) ? body.artifacts : [];

  if (
    incomingMessages.length === 0 &&
    incomingTools.length === 0 &&
    incomingArts.length === 0
  ) {
    return Response.json(
      { error: "导入内容为空：需要 messages / toolRuns / artifacts 之一" },
      { status: 400 },
    );
  }

  const db = getDb();
  const now = Date.now();
  const sessionId = nanoid();
  const title =
    (typeof body.session?.title === "string" && body.session.title.trim()
      ? body.session.title.trim()
      : "导入的会话"
    ).slice(0, 80) + "（导入）";

  const toolIdMap = new Map<string, string>();
  for (const t of incomingTools) {
    if (t?.id) toolIdMap.set(t.id, nanoid());
  }

  db.insert(sessions)
    .values({
      id: sessionId,
      title,
      pinned: Boolean(body.session?.pinned),
      createdAt:
        typeof body.session?.createdAt === "number"
          ? body.session.createdAt
          : now,
      updatedAt: now,
    })
    .run();

  for (const m of incomingMessages) {
    if (!m || typeof m.content !== "string") continue;
    const role =
      m.role === "user" || m.role === "assistant" || m.role === "system"
        ? m.role
        : "assistant";
    db.insert(messages)
      .values({
        id: nanoid(),
        sessionId,
        role,
        content: m.content,
        createdAt: typeof m.createdAt === "number" ? m.createdAt : now,
      })
      .run();
  }

  for (const t of incomingTools) {
    if (!t?.id || !t.name) continue;
    const newId = toolIdMap.get(t.id) ?? nanoid();
    db.insert(toolRuns)
      .values({
        id: newId,
        sessionId,
        name: String(t.name),
        displayName: t.displayName || String(t.name),
        status: t.status || "result",
        argsJson: t.args ? JSON.stringify(t.args) : null,
        resultPreview: t.resultPreview ?? null,
        errorMessage: t.errorMessage ?? null,
        requiresApproval: Boolean(t.requiresApproval),
        startedAt: typeof t.startedAt === "number" ? t.startedAt : now,
        endedAt: typeof t.endedAt === "number" ? t.endedAt : null,
      })
      .run();
  }

  for (const a of incomingArts) {
    if (!a || !a.kind || !a.title) continue;
    const sourceToolRunId = a.sourceToolRunId
      ? (toolIdMap.get(a.sourceToolRunId) ?? null)
      : null;
    db.insert(artifacts)
      .values({
        id: nanoid(),
        sessionId,
        kind: a.kind,
        title: a.title,
        payloadJson: JSON.stringify(a.payload ?? {}),
        sourceToolRunId,
        approvalStatus: a.approvalStatus ?? "none",
        createdAt: typeof a.createdAt === "number" ? a.createdAt : now,
      })
      .run();
  }

  return Response.json({
    ok: true,
    session: {
      id: sessionId,
      title,
      pinned: Boolean(body.session?.pinned),
      createdAt:
        typeof body.session?.createdAt === "number"
          ? body.session.createdAt
          : now,
      updatedAt: now,
    },
    counts: {
      messages: incomingMessages.length,
      toolRuns: incomingTools.length,
      artifacts: incomingArts.length,
    },
  });
}
