import { getDb } from "@/lib/db";
import { noteChunks, notes } from "@/lib/db/schema";
import { indexNote } from "@/lib/notes/indexer";
import { desc, eq } from "drizzle-orm";
import { nanoid } from "nanoid";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const db = getDb();
  const rows = db.select().from(notes).orderBy(desc(notes.updatedAt)).all();
  return Response.json({ notes: rows });
}

export async function POST(req: Request) {
  const body = (await req.json()) as {
    title?: string;
    content?: string;
    tags?: string;
  };
  if (!body.title?.trim() || !body.content?.trim()) {
    return Response.json({ error: "title/content required" }, { status: 400 });
  }
  const db = getDb();
  const now = Date.now();
  const id = nanoid();
  db.insert(notes)
    .values({
      id,
      title: body.title.trim(),
      content: body.content.trim(),
      tags: body.tags?.trim() || "",
      createdAt: now,
      updatedAt: now,
    })
    .run();

  const indexed = await indexNote(id);

  return Response.json({
    note: {
      id,
      title: body.title.trim(),
      content: body.content.trim(),
      tags: body.tags?.trim() || "",
      createdAt: now,
      updatedAt: now,
    },
    index: indexed,
  });
}

export async function PATCH(req: Request) {
  const body = (await req.json()) as {
    id: string;
    title?: string;
    content?: string;
    tags?: string;
  };
  if (!body.id) {
    return Response.json({ error: "id required" }, { status: 400 });
  }
  const db = getDb();
  const existing = db
    .select()
    .from(notes)
    .where(eq(notes.id, body.id))
    .get();
  if (!existing) {
    return Response.json({ error: "note not found" }, { status: 404 });
  }
  db.update(notes)
    .set({
      ...(body.title !== undefined ? { title: body.title } : {}),
      ...(body.content !== undefined ? { content: body.content } : {}),
      ...(body.tags !== undefined ? { tags: body.tags } : {}),
      updatedAt: Date.now(),
    })
    .where(eq(notes.id, body.id))
    .run();

  const indexed = await indexNote(body.id);
  return Response.json({ ok: true, index: indexed });
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) {
    return Response.json({ error: "id required" }, { status: 400 });
  }
  const db = getDb();
  db.delete(noteChunks).where(eq(noteChunks.noteId, id)).run();
  db.delete(notes).where(eq(notes.id, id)).run();
  return Response.json({ ok: true });
}
