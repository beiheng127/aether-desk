import { getDb } from "@/lib/db";
import { artifacts, notes, toolRuns } from "@/lib/db/schema";
import { canDecideHitl } from "@/lib/hitl/transitions";
import { indexNote } from "@/lib/notes/indexer";
import { and, eq } from "drizzle-orm";
import { nanoid } from "nanoid";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id: toolRunId } = await ctx.params;
  const db = getDb();
  const run = db
    .select()
    .from(toolRuns)
    .where(eq(toolRuns.id, toolRunId))
    .get();
  if (!run) {
    return Response.json({ error: "tool run not found" }, { status: 404 });
  }
  const gate = canDecideHitl(run.status);
  if (!gate.ok) {
    return Response.json(
      { error: gate.error, code: gate.code },
      { status: 409 },
    );
  }

  let noteResult: { noteId: string; chunks: number; model: string } | null =
    null;

  // save_note：批准后才真正写入知识库并索引
  if (run.name === "save_note") {
    const args = (run.argsJson
      ? (JSON.parse(run.argsJson) as {
          title?: string;
          content?: string;
          tags?: string;
        })
      : {}) as { title?: string; content?: string; tags?: string };
    const title = (args.title ?? "").trim();
    const content = (args.content ?? "").trim();
    if (!title || !content) {
      return Response.json(
        { error: "save_note 缺少 title/content", code: "INVALID_ARGS" },
        { status: 400 },
      );
    }
    const now = Date.now();
    const noteId = nanoid();
    // 先占位为 running，避免重复点击导致二次 insert
    db.update(toolRuns)
      .set({ status: "running", startedAt: now })
      .where(eq(toolRuns.id, toolRunId))
      .run();

    try {
      db.insert(notes)
        .values({
          id: noteId,
          title,
          content,
          tags: args.tags ?? "",
          createdAt: now,
          updatedAt: now,
        })
        .run();
      const indexed = await indexNote(noteId);
      const embeddingModel = indexed.model ?? "none";
      noteResult = {
        noteId,
        chunks: indexed.chunks,
        model: embeddingModel,
      };

      const art = db
        .select()
        .from(artifacts)
        .where(
          and(
            eq(artifacts.sourceToolRunId, toolRunId),
            eq(artifacts.approvalStatus, "pending"),
          ),
        )
        .get();
      if (art) {
        const payload = JSON.parse(art.payloadJson) as {
          body?: string;
          pendingNote?: unknown;
        };
        db.update(artifacts)
          .set({
            approvalStatus: "approved",
            title: `已保存：${title}`,
            payloadJson: JSON.stringify({
              ...payload,
              pendingNote: undefined,
              body: `${content}\n\n— 已分块索引 ${indexed.chunks} 段（${embeddingModel}）`,
            }),
          })
          .where(eq(artifacts.id, art.id))
          .run();
      }
    } catch (e) {
      try {
        db.delete(notes).where(eq(notes.id, noteId)).run();
      } catch {
        /* ignore orphan cleanup failure */
      }
      const message = e instanceof Error ? e.message : "save_note 执行失败";
      db.update(toolRuns)
        .set({
          status: "error",
          resultPreview: message,
          endedAt: Date.now(),
        })
        .where(eq(toolRuns.id, toolRunId))
        .run();
      return Response.json(
        { error: message, code: "SAVE_NOTE_FAILED" },
        { status: 500 },
      );
    }
  } else {
    db.update(artifacts)
      .set({ approvalStatus: "approved" })
      .where(
        and(
          eq(artifacts.sourceToolRunId, toolRunId),
          eq(artifacts.approvalStatus, "pending"),
        ),
      )
      .run();
  }

  const preview =
    noteResult != null
      ? `笔记已写入并索引（${noteResult.noteId} · ${noteResult.chunks} chunks）`
      : "用户已批准写操作";

  db.update(toolRuns)
    .set({
      status: "result",
      resultPreview: preview,
      endedAt: Date.now(),
    })
    .where(eq(toolRuns.id, toolRunId))
    .run();

  return Response.json({
    ok: true,
    status: "approved",
    note: noteResult,
  });
}
