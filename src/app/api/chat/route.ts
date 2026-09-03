import {
  SYSTEM_PROMPT,
  createDeskTools,
  type DeskStreamEvent,
} from "@/lib/ai/desk-tools";
import {
  createFixtureChatStream,
  fixtureSseHeaders,
} from "@/lib/ai/fixtures/runner";
import { getChatModel, hasApiKey, useMockChat } from "@/lib/ai/model";
import { getDb } from "@/lib/db";
import { messages, sessions, toolRuns } from "@/lib/db/schema";
import { formatRuntimeError } from "@/lib/errors";
import { and, desc, eq, inArray } from "drizzle-orm";
import { nanoid } from "nanoid";
import { streamText, stepCountIs, type ModelMessage } from "ai";

/** Statuses that typically carry a useful resultPreview for multi-turn rehydration */
const TOOL_EVIDENCE_STATUSES = ["result", "success", "approved"] as const;

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type IncomingMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

function sseEncode(event: string, data: unknown) {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

async function ensureSession(sessionId: string | undefined, firstUserText: string) {
  const db = getDb();
  const now = Date.now();

  if (sessionId) {
    const existing = db
      .select()
      .from(sessions)
      .where(eq(sessions.id, sessionId))
      .get();
    if (existing) {
      db.update(sessions)
        .set({ updatedAt: now })
        .where(eq(sessions.id, sessionId))
        .run();
      return existing.id;
    }
  }

  const id = sessionId || nanoid();
  const title = firstUserText.trim().slice(0, 28) || "未命名会话";
  db.insert(sessions)
    .values({
      id,
      title,
      pinned: false,
      createdAt: now,
      updatedAt: now,
    })
    .run();
  return id;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      sessionId?: string;
      message: string;
      messages?: IncomingMessage[];
    };

    const userText = (body.message || "").trim();
    if (!userText) {
      return Response.json({ error: "message 不能为空" }, { status: 400 });
    }

    const sessionId = await ensureSession(body.sessionId, userText);
    const db = getDb();
    const now = Date.now();

    db.insert(messages)
      .values({
        id: nanoid(),
        sessionId,
        role: "user",
        content: userText,
        createdAt: now,
      })
      .run();

    // 无可用 Chat Key → 离线 fixture；有 Key → 绝不走 mock
    if (useMockChat()) {
      return new Response(
        createFixtureChatStream({
          sessionId,
          userText,
          signal: req.signal,
        }),
        { headers: fixtureSseHeaders() },
      );
    }

    if (!hasApiKey()) {
      return Response.json(
        {
          error:
            "未配置 API Key。请复制 .env.example 为 .env.local 并填写 DEEPSEEK_API_KEY 或 OPENAI_API_KEY，然后执行 npm run desk 重启。",
          code: "MISSING_API_KEY",
        },
        { status: 503 },
      );
    }

    const history = db
      .select()
      .from(messages)
      .where(eq(messages.sessionId, sessionId))
      .orderBy(desc(messages.createdAt))
      .limit(30)
      .all()
      .reverse();

    const modelMessages: ModelMessage[] = history
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));

    const recentRuns = db
      .select()
      .from(toolRuns)
      .where(
        and(
          eq(toolRuns.sessionId, sessionId),
          inArray(toolRuns.status, [...TOOL_EVIDENCE_STATUSES]),
        ),
      )
      .orderBy(desc(toolRuns.startedAt))
      .limit(12)
      .all()
      .reverse()
      .filter((r) => Boolean(r.resultPreview?.trim()));

    const toolEvidence = recentRuns
      .map((r) => `- [${r.name}] ${r.resultPreview!.slice(0, 800)}`)
      .join("\n");

    if (toolEvidence && modelMessages.length > 0) {
      const evidenceMsg: ModelMessage = {
        role: "user",
        content: `【系统回灌：本会话近期工具结果，追问时优先依据此处事实，勿编造】\n${toolEvidence}`,
      };
      modelMessages.splice(modelMessages.length - 1, 0, evidenceMsg);
    }

    const encoder = new TextEncoder();
    const pendingEmits: DeskStreamEvent[] = [];

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const send = (event: string, data: unknown) => {
          controller.enqueue(encoder.encode(sseEncode(event, data)));
        };

        send("session", { sessionId });

        const flushEmits = () => {
          while (pendingEmits.length > 0) {
            const evt = pendingEmits.shift()!;
            if (evt.type === "tool-run") {
              send("tool-run", evt.toolRun);
            } else if (evt.type === "artifact") {
              send("artifact", evt.artifact);
            }
          }
        };

        try {
          const tools = createDeskTools({
            sessionId,
            emit: (evt) => {
              pendingEmits.push(evt);
            },
          });

          const result = streamText({
            model: getChatModel(),
            system: SYSTEM_PROMPT,
            messages: modelMessages,
            tools,
            stopWhen: stepCountIs(6),
            maxRetries: 2,
            abortSignal: req.signal,
          });

          let assistantText = "";
          let aborted = false;

          try {
            for await (const part of result.fullStream) {
              if (req.signal.aborted) {
                aborted = true;
                break;
              }
              flushEmits();

              if (part.type === "text-delta") {
                const delta =
                  (part as { text?: string; delta?: string }).text ??
                  (part as { delta?: string }).delta ??
                  "";
                if (delta) {
                  assistantText += delta;
                  send("text-delta", { delta });
                }
              } else if (part.type === "tool-call") {
                send("phase", { phase: "tooling" });
              } else if (part.type === "error") {
                const message =
                  part.error instanceof Error
                    ? part.error.message
                    : String(part.error);
                send("error", { message: formatRuntimeError(message) });
              }
            }
          } catch (err) {
            if (req.signal.aborted) {
              aborted = true;
            } else {
              throw err;
            }
          }

          flushEmits();

          if (!aborted) {
            const finalText = (await result.text) || assistantText;
            if (finalText && finalText !== assistantText) {
              const extra = finalText.slice(assistantText.length);
              if (extra) {
                assistantText = finalText;
                send("text-delta", { delta: extra });
              }
            }
          } else if (assistantText.trim()) {
            assistantText = `${assistantText.trim()}\n\n（用户已停止生成）`;
            send("text-delta", { delta: "\n\n（用户已停止生成）" });
          }

          if (assistantText.trim()) {
            db.insert(messages)
              .values({
                id: nanoid(),
                sessionId,
                role: "assistant",
                content: assistantText,
                createdAt: Date.now(),
              })
              .run();
          }

          db.update(sessions)
            .set({ updatedAt: Date.now() })
            .where(eq(sessions.id, sessionId))
            .run();

          send("done", {
            sessionId,
            text: assistantText,
            aborted,
            mock: false,
          });
        } catch (err) {
          send("error", { message: formatRuntimeError(err) });
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Aether-Mock": "0",
      },
    });
  } catch (err) {
    return Response.json(
      {
        error: formatRuntimeError(err),
        code: "CHAT_BOOTSTRAP_FAILED",
        hint: "若页面在 :3001，请关掉旧进程，执行 npm run desk，只用 http://localhost:3000",
      },
      { status: 500 },
    );
  }
}
