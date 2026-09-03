import { listChatFixtures } from "@/lib/ai/fixtures/catalog";
import { hasApiKey, useMockChat } from "@/lib/ai/model";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 列出离线 Chat Fixture；有 API Key 时标注 mockDisabled */
export async function GET() {
  const mockMode = useMockChat();
  return Response.json({
    mockMode,
    apiKeyConfigured: hasApiKey(),
    mockDisabledWhenApiKey: true,
    count: listChatFixtures().length,
    fixtures: listChatFixtures().map((f) => ({
      id: f.id,
      title: f.title,
      label: f.label,
      hint: f.hint,
      prompt: f.prompt,
      tools: f.tools.map((t) => t.name),
    })),
  });
}
