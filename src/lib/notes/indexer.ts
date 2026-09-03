import { getDb } from "@/lib/db";
import { noteChunks, notes } from "@/lib/db/schema";
import { chunkText } from "@/lib/notes/chunk";
import { embedTexts } from "@/lib/notes/embed";
import { count, eq } from "drizzle-orm";
import { nanoid } from "nanoid";

export async function indexNote(noteId: string) {
  const db = getDb();
  const note = db.select().from(notes).where(eq(notes.id, noteId)).get();
  if (!note) return { noteId, chunks: 0 };

  db.delete(noteChunks).where(eq(noteChunks.noteId, noteId)).run();

  const pieces = chunkText(`${note.title}\n\n${note.content}`);
  if (pieces.length === 0) return { noteId, chunks: 0 };

  const { vectors, info } = await embedTexts(
    pieces.map((p) => p.content),
  );

  const now = Date.now();
  for (let i = 0; i < pieces.length; i++) {
    const piece = pieces[i]!;
    const vector = vectors[i] ?? [];
    db.insert(noteChunks)
      .values({
        id: nanoid(),
        noteId,
        chunkIndex: piece.index,
        content: piece.content,
        embeddingJson: JSON.stringify(vector),
        embeddingModel: info.model,
        dims: vector.length || info.dims,
        createdAt: now,
      })
      .run();
  }

  return {
    noteId,
    chunks: pieces.length,
    model: info.model,
    provider: info.provider,
  };
}

export async function reindexAllNotes() {
  const db = getDb();
  const all = db.select({ id: notes.id }).from(notes).all();
  let chunks = 0;
  let model = "";
  let provider = "";
  for (const row of all) {
    const result = await indexNote(row.id);
    chunks += result.chunks;
    if (result.model) model = result.model;
    if (result.provider) provider = result.provider;
  }
  return { notes: all.length, chunks, model, provider };
}

export function getIndexStats() {
  const db = getDb();
  const [{ noteCount }] = db.select({ noteCount: count() }).from(notes).all();
  const [{ chunkCount }] = db
    .select({ chunkCount: count() })
    .from(noteChunks)
    .all();
  const sample = db.select().from(noteChunks).limit(1).get();
  return {
    noteCount,
    chunkCount,
    embeddingModel: sample?.embeddingModel ?? null,
    dims: sample?.dims ?? null,
  };
}
