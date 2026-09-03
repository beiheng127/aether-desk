import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

const tones = {
  neutral: "bg-zinc-100 text-zinc-700",
  teal: "bg-teal-50 text-teal-800",
  amber: "bg-amber-50 text-amber-800",
  rose: "bg-rose-50 text-rose-800",
  sky: "bg-sky-50 text-sky-800",
} as const;

export function Badge({
  className,
  tone = "neutral",
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: keyof typeof tones }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-medium",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}
