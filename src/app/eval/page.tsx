"use client";

import { useCallback, useEffect, useState } from "react";

type HitAt = { 1: boolean; 3: boolean; 5: boolean };

type EvalRow = {
  id: string;
  query: string;
  keywordHitAt: HitAt;
  hybridHitAt: HitAt;
  keywordHits: Array<{ title: string; score: number }>;
  hybridHits: Array<{ title: string; score: number }>;
};

type EvalSummary = {
  keyword: { "hit@1": number; "hit@3": number; "hit@5": number };
  hybrid: { "hit@1": number; "hit@3": number; "hit@5": number };
  queryCount: number;
};

type EvalPayload = {
  results: EvalRow[];
  summary: EvalSummary;
  error?: string;
};

function fmtRate(n: number) {
  return `${(n * 100).toFixed(1)}%`;
}

function HitCell({ ok }: { ok: boolean }) {
  return (
    <span className={ok ? "text-teal-800" : "text-zinc-400"}>{ok ? "✓" : "·"}</span>
  );
}

export default function EvalPage() {
  const [data, setData] = useState<EvalPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/eval/rag");
      const json = (await res.json()) as EvalPayload;
      if (!res.ok) {
        throw new Error(json.error || `HTTP ${res.status}`);
      }
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void run();
  }, [run]);

  return (
    <main className="min-h-screen bg-[var(--desk-glow)] px-4 py-8 text-zinc-900">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-teal-800">
              Aether Desk
            </p>
            <h1 className="mt-1 text-xl font-semibold">RAG 轻量评测</h1>
            <p className="mt-1 text-sm text-zinc-600">
              固定 query 集 · keyword vs hybrid · Hit@1 / @3 / @5
            </p>
          </div>
          <div className="flex gap-2">
            <a
              href="/"
              className="rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-xs text-zinc-700 hover:border-teal-300"
            >
              回工作台
            </a>
            <button
              type="button"
              onClick={() => void run()}
              disabled={loading}
              className="rounded-md bg-teal-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-teal-900 disabled:opacity-60"
            >
              {loading ? "评测中…" : "重新跑"}
            </button>
          </div>
        </div>

        {error ? (
          <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        {data?.summary ? (
          <div className="mb-6 grid gap-3 sm:grid-cols-2">
            <SummaryCard label="Keyword" summary={data.summary.keyword} />
            <SummaryCard label="Hybrid" summary={data.summary.hybrid} />
          </div>
        ) : null}

        <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-sm">
          <table className="w-full min-w-[640px] border-collapse text-left text-xs">
            <thead className="bg-zinc-50 text-zinc-600">
              <tr>
                <th className="border-b border-zinc-200 px-3 py-2 font-medium">Query</th>
                <th className="border-b border-zinc-200 px-3 py-2 font-medium">KW @1</th>
                <th className="border-b border-zinc-200 px-3 py-2 font-medium">KW @3</th>
                <th className="border-b border-zinc-200 px-3 py-2 font-medium">KW @5</th>
                <th className="border-b border-zinc-200 px-3 py-2 font-medium">Hy @1</th>
                <th className="border-b border-zinc-200 px-3 py-2 font-medium">Hy @3</th>
                <th className="border-b border-zinc-200 px-3 py-2 font-medium">Hy @5</th>
                <th className="border-b border-zinc-200 px-3 py-2 font-medium">Top hit</th>
              </tr>
            </thead>
            <tbody>
              {loading && !data ? (
                <tr>
                  <td colSpan={8} className="px-3 py-6 text-center text-zinc-500">
                    加载中…
                  </td>
                </tr>
              ) : null}
              {(data?.results ?? []).map((row) => (
                <tr key={row.id} className="border-b border-zinc-100 last:border-0">
                  <td className="px-3 py-2 align-top text-zinc-800">
                    <span className="font-medium">{row.id}</span>
                    <p className="mt-0.5 text-zinc-500">{row.query}</p>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <HitCell ok={row.keywordHitAt[1]} />
                  </td>
                  <td className="px-3 py-2 text-center">
                    <HitCell ok={row.keywordHitAt[3]} />
                  </td>
                  <td className="px-3 py-2 text-center">
                    <HitCell ok={row.keywordHitAt[5]} />
                  </td>
                  <td className="px-3 py-2 text-center">
                    <HitCell ok={row.hybridHitAt[1]} />
                  </td>
                  <td className="px-3 py-2 text-center">
                    <HitCell ok={row.hybridHitAt[3]} />
                  </td>
                  <td className="px-3 py-2 text-center">
                    <HitCell ok={row.hybridHitAt[5]} />
                  </td>
                  <td className="px-3 py-2 align-top text-zinc-600">
                    <div>kw: {row.keywordHits[0]?.title ?? "—"}</div>
                    <div>hy: {row.hybridHits[0]?.title ?? "—"}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-4 text-xs text-zinc-500">
          数据源：`data/eval-queries.json` · API：`GET /api/eval/rag`
          {data?.summary ? ` · ${data.summary.queryCount} queries` : null}
        </p>
      </div>
    </main>
  );
}

function SummaryCard({
  label,
  summary,
}: {
  label: string;
  summary: { "hit@1": number; "hit@3": number; "hit@5": number };
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white px-4 py-3 shadow-sm">
      <p className="text-xs font-medium text-zinc-500">{label}</p>
      <div className="mt-2 flex gap-4 text-sm">
        <div>
          <span className="text-zinc-500">@1 </span>
          <span className="font-semibold text-teal-900">{fmtRate(summary["hit@1"])}</span>
        </div>
        <div>
          <span className="text-zinc-500">@3 </span>
          <span className="font-semibold text-teal-900">{fmtRate(summary["hit@3"])}</span>
        </div>
        <div>
          <span className="text-zinc-500">@5 </span>
          <span className="font-semibold text-teal-900">{fmtRate(summary["hit@5"])}</span>
        </div>
      </div>
    </div>
  );
}
