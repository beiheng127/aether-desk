import { getDb } from "@/lib/db";
import { artifacts } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 更新 task_card 勾选状态（持久化） */
export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const body = (await req.json()) as {
    itemId: string;
    done: boolean;
  };
  const db = getDb();
  const row = db.select().from(artifacts).where(eq(artifacts.id, id)).get();
  if (!row) {
    return Response.json({ error: "not found" }, { status: 404 });
  }
  if (row.kind !== "task_card") {
    return Response.json({ error: "not a task card" }, { status: 400 });
  }

  const payload = JSON.parse(row.payloadJson) as {
    items: Array<{ id: string; text: string; done: boolean }>;
  };
  payload.items = payload.items.map((item) =>
    item.id === body.itemId ? { ...item, done: body.done } : item,
  );

  db.update(artifacts)
    .set({ payloadJson: JSON.stringify(payload) })
    .where(eq(artifacts.id, id))
    .run();

  return Response.json({ ok: true, payload });
}
