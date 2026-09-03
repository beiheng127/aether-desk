import { createDeskTools, type DeskStreamEvent } from "@/lib/ai/desk-tools";
import {
  matchChatFixture,
  type ChatFixture,
  type FixtureToolName,
} from "@/lib/ai/fixtures/catalog";
import { getDb } from "@/lib/db";
import { messages, sessions } from "@/lib/db/schema";
import { formatRuntimeError } from "@/lib/errors";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";

function sseEncode(event: string, data: unknown) {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

function sleep(ms: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }
    const t = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(t);
        reject(new DOMException("Aborted", "AbortError"));
      },
      { once: true },
    );
  });
}

type DeskTools = ReturnType<typeof createDeskTools>;

async function runTool(
  tools: DeskTools,
  name: FixtureToolName,
  args: Record<string, unknown>,
) {
  const tool = tools[name];
  if (!tool?.execute) {
    throw new Error(`fixture 缺少工具: ${name}`);
  }
  // AI SDK tool execute
  return tool.execute(args as never, {
    toolCallId: nanoid(),
    messages: [],
  });
}

async function emitAnswer(
  send: (event: string, data: unknown) => void,
  text: string,
  signal?: AbortSignal,
) {
  send("phase", { phase: "streaming" });
  const chunk = 28;
  for (let i = 0; i < text.length; i += chunk) {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
    const delta = text.slice(i, i + chunk);
    send("text-delta", { delta });
    await sleep(12, signal);
  }
}

/**
 * 无 API Key 时的确定性 Chat：真实落库工具事件 + fixture 剧本。
 * 有 Key 时切勿调用。
 */
export function createFixtureChatStream(input: {
  sessionId: string;
  userText: string;
  signal?: AbortSignal;
}): ReadableStream<Uint8Array> {
  const { sessionId, userText, signal } = input;
  const fixture: ChatFixture = matchChatFixture(userText);
  const encoder = new TextEncoder();
  const db = getDb();

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(sseEncode(event, data)));
      };
      const pending: DeskStreamEvent[] = [];
      const flush = () => {
        while (pending.length) {
          const evt = pending.shift()!;
          if (evt.type === "tool-run") send("tool-run", evt.toolRun);
          else if (evt.type === "artifact") send("artifact", evt.artifact);
        }
      };

      let assistantText = "";
      let aborted = false;

      try {
        send("session", { sessionId });
        send("phase", { phase: "thinking" });
        await sleep(180, signal);

        const tools = createDeskTools({
          sessionId,
          emit: (evt) => pending.push(evt),
        });

        for (const step of fixture.tools) {
          if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
          send("phase", { phase: "tooling" });
          await runTool(tools, step.name, step.args);
          flush();
          await sleep(120, signal);
        }

        const banner = `【离线测试 · ${fixture.id} · ${fixture.title}】\n`;
        assistantText = `${banner}${fixture.answer}`;
        await emitAnswer(send, assistantText, signal);
        flush();

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
          aborted: false,
          fixtureId: fixture.id,
          mock: true,
        });
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
          aborted = true;
          if (assistantText.trim()) {
            assistantText = `${assistantText.trim()}\n\n（用户已停止生成）`;
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
          send("done", {
            sessionId,
            text: assistantText,
            aborted: true,
            fixtureId: fixture.id,
            mock: true,
          });
        } else {
          send("error", { message: formatRuntimeError(err) });
        }
      } finally {
        void aborted;
        controller.close();
      }
    },
  });
}

export function fixtureSseHeaders() {
  return {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Aether-Mock": "1",
  };
}
