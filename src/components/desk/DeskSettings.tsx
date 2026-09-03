"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DEFAULT_DESK_PREFS,
  loadDeskPrefs,
  saveDeskPrefs,
  type DeskPrefs,
} from "@/lib/desk-prefs";

export function DeskSettings({ onBack }: { onBack: () => void }) {
  const [prefs, setPrefs] = useState<DeskPrefs>(DEFAULT_DESK_PREFS);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setPrefs(loadDeskPrefs());
  }, []);

  const update = (patch: Partial<DeskPrefs>) => {
    const next = { ...prefs, ...patch };
    setPrefs(next);
    saveDeskPrefs(next);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1200);
  };

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-8">
        <div className="mb-6 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">页面设置</h2>
            <p className="mt-1 text-xs text-zinc-500">
              仅影响本机界面；模型与 Embedding 仍在{" "}
              <code className="font-mono">.env.local</code>
            </p>
          </div>
          <Button size="sm" variant="ghost" onClick={onBack}>
            返回
          </Button>
        </div>

        <div className="space-y-4 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
          <label className="flex cursor-pointer items-start justify-between gap-4">
            <span>
              <span className="block text-sm font-medium text-zinc-900">
                紧凑布局
              </span>
              <span className="mt-0.5 block text-xs text-zinc-500">
                缩小页头与栏间距，适合小屏长时间使用
              </span>
            </span>
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 accent-teal-700"
              checked={prefs.compact}
              onChange={(e) => update({ compact: e.target.checked })}
            />
          </label>

          <label className="flex cursor-pointer items-start justify-between gap-4 border-t border-zinc-100 pt-4">
            <span>
              <span className="block text-sm font-medium text-zinc-900">
                显示副标题
              </span>
              <span className="mt-0.5 block text-xs text-zinc-500">
                顶栏「个人知识工作台 · …」说明行
              </span>
            </span>
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 accent-teal-700"
              checked={prefs.showSubtitle}
              onChange={(e) => update({ showSubtitle: e.target.checked })}
            />
          </label>

          <label className="flex cursor-pointer items-start justify-between gap-4 border-t border-zinc-100 pt-4">
            <span>
              <span className="block text-sm font-medium text-zinc-900">
                显示离线 Fixture 提示条
              </span>
              <span className="mt-0.5 block text-xs text-zinc-500">
                无 Chat Key 时顶部琥珀色说明（仍可用演示剧本）
              </span>
            </span>
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 accent-teal-700"
              checked={prefs.showFixtureBanner}
              onChange={(e) => update({ showFixtureBanner: e.target.checked })}
            />
          </label>

          <label className="flex cursor-pointer items-start justify-between gap-4 border-t border-zinc-100 pt-4">
            <span>
              <span className="block text-sm font-medium text-zinc-900">
                启动进入主页
              </span>
              <span className="mt-0.5 block text-xs text-zinc-500">
                关闭则默认打开对话工作台
              </span>
            </span>
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 accent-teal-700"
              checked={prefs.startOnHome}
              onChange={(e) => update({ startOnHome: e.target.checked })}
            />
          </label>
        </div>

        <p className="mt-4 text-xs text-zinc-500">
          {saved ? "已保存到本机。" : "修改即时生效并写入 localStorage。"}
        </p>

        <div className="mt-8 rounded-xl border border-zinc-200 bg-zinc-50/80 p-4 text-xs leading-relaxed text-zinc-600">
          <p className="font-medium text-zinc-800">环境配置（只读提示）</p>
          <ul className="mt-2 list-disc space-y-1 pl-4">
            <li>
              Chat：<code className="font-mono">DEEPSEEK_API_KEY</code> /{" "}
              <code className="font-mono">OPENAI_API_KEY</code>
            </li>
            <li>
              Embedding：<code className="font-mono">EMBEDDING_API_KEY</code> 或
              local-hash
            </li>
            <li>
              Hybrid：<code className="font-mono">AETHER_RAG_TOP_K</code> /{" "}
              <code className="font-mono">AETHER_RAG_KW_WEIGHT</code> /{" "}
              <code className="font-mono">AETHER_RAG_VEC_WEIGHT</code>
            </li>
            <li>
              启动：<code className="font-mono">npm run desk</code> → :3000
            </li>
            <li>
              迁移说明：<code className="font-mono">docs/MIGRATE.md</code>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
