import { getDb } from "@/lib/db";
import { artifacts, toolRuns } from "@/lib/db/schema";
import {
  canDecideHitl,
  statusAfterHitlReject,
} from "@/lib/hitl/transitions";
import { and, eq } from "drizzle-orm";

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

  db.update(toolRuns)
    .set({
      status: statusAfterHitlReject(),
      resultPreview: "用户拒绝写操作",
      endedAt: Date.now(),
    })
    .where(eq(toolRuns.id, toolRunId))
    .run();

  db.delete(artifacts)
    .where(
      and(
        eq(artifacts.sourceToolRunId, toolRunId),
        eq(artifacts.approvalStatus, "pending"),
      ),
    )
    .run();

  return Response.json({ ok: true, status: "rejected" });
}
