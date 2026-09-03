import { getDb } from "@/lib/db";
import { artifacts, messages, sessions, toolRuns } from "@/lib/db/schema";
import type { Artifact, ChatMessage, ToolRun } from "@/lib/types/agent";
import { asc, eq } from "drizzle-orm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const db = getDb();
  const session = db.select().from(sessions).where(eq(sessions.id, id)).get();
  if (!session) {
    return Response.json({ error: "session not found" }, { status: 404 });
  }

  const messageRows = db
    .select()
    .from(messages)
    .where(eq(messages.sessionId, id))
    .orderBy(asc(messages.createdAt))
    .all();

  const toolRows = db
    .select()
    .from(toolRuns)
    .where(eq(toolRuns.sessionId, id))
    .orderBy(asc(toolRuns.startedAt))
    .all();

  const artifactRows = db
    .select()
    .from(artifacts)
    .where(eq(artifacts.sessionId, id))
    .orderBy(asc(artifacts.createdAt))
    .all();

  const chatMessages: ChatMessage[] = messageRows.map((m) => ({
    id: m.id,
    role: m.role,
    content: m.content,
    createdAt: m.createdAt,
  }));

  const tools: ToolRun[] = toolRows.map((t) => ({
    id: t.id,
    name: t.name as ToolRun["name"],
    displayName: t.displayName,
    status: t.status as ToolRun["status"],
    args: t.argsJson
      ? (JSON.parse(t.argsJson) as Record<string, unknown>)
      : undefined,
    resultPreview: t.resultPreview ?? undefined,
    errorMessage: t.errorMessage ?? undefined,
    requiresApproval: t.requiresApproval,
    startedAt: t.startedAt,
    endedAt: t.endedAt ?? undefined,
  }));

  const arts = artifactRows
    .slice()
    .reverse()
    .map((a) => ({
      id: a.id,
      kind: a.kind as Artifact["kind"],
      title: a.title,
      createdAt: a.createdAt,
      sourceToolRunId: a.sourceToolRunId ?? undefined,
      approvalStatus: a.approvalStatus,
      payload: JSON.parse(a.payloadJson) as unknown,
    }));

  return Response.json({
    session,
    messages: chatMessages,
    toolRuns: tools,
    artifacts: arts,
  });
}

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const db = getDb();
  const existing = db.select().from(sessions).where(eq(sessions.id, id)).get();
  if (!existing) {
    return Response.json({ error: "session not found" }, { status: 404 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    title?: string;
    pinned?: boolean;
  };

  const patch: {
    title?: string;
    pinned?: boolean;
    updatedAt: number;
  } = { updatedAt: Date.now() };

  if (typeof body.title === "string") {
    const title = body.title.trim();
    if (!title) {
      return Response.json({ error: "title 不能为空" }, { status: 400 });
    }
    patch.title = title.slice(0, 80);
  }

  if (typeof body.pinned === "boolean") {
    patch.pinned = body.pinned;
  }

  db.update(sessions).set(patch).where(eq(sessions.id, id)).run();
  const session = db.select().from(sessions).where(eq(sessions.id, id)).get();
  return Response.json({ session });
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const db = getDb();
  db.delete(sessions).where(eq(sessions.id, id)).run();
  return Response.json({ ok: true });
}
