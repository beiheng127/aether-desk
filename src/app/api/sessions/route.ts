import { getDb } from "@/lib/db";
import { sessions } from "@/lib/db/schema";
import { desc } from "drizzle-orm";
import { nanoid } from "nanoid";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const db = getDb();
  const rows = db
    .select()
    .from(sessions)
    .orderBy(desc(sessions.pinned), desc(sessions.updatedAt))
    .limit(50)
    .all();
  return Response.json({ sessions: rows });
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { title?: string };
  const db = getDb();
  const now = Date.now();
  const id = nanoid();
  const title = body.title?.trim() || "新会话";
  db.insert(sessions)
    .values({
      id,
      title,
      pinned: false,
      createdAt: now,
      updatedAt: now,
    })
    .run();
  return Response.json({
    session: {
      id,
      title,
      pinned: false,
      createdAt: now,
      updatedAt: now,
    },
  });
}
