import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface PanelProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}

export function Panel({
  title,
  subtitle,
  actions,
  children,
  className,
  bodyClassName,
}: PanelProps) {
  return (
    <section
      className={cn(
        "flex min-h-0 flex-col border-r border-zinc-200 bg-white last:border-r-0",
        className,
      )}
    >
      <header className="flex shrink-0 items-start justify-between gap-3 border-b border-zinc-200 px-4 py-3">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold tracking-tight text-zinc-900">
            {title}
          </h2>
          {subtitle ? (
            <p className="mt-0.5 text-xs text-zinc-500">{subtitle}</p>
          ) : null}
        </div>
        {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
      </header>
      <div className={cn("min-h-0 flex-1 overflow-y-auto overscroll-contain [scrollbar-width:thin]", bodyClassName)}>
        {children}
      </div>
    </section>
  );
}
