"use client";

import { cn } from "@/lib/utils";
import type { Components } from "react-markdown";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { ReactNode } from "react";

function preprocessCitations(text: string) {
  return text.replace(/\[(\d+)\]/g, "[$1](cite:$1)");
}

function toCitationSet(
  validCitationIndexes?: Set<number> | number[],
): Set<number> | null {
  if (validCitationIndexes == null) return null;
  if (validCitationIndexes instanceof Set) return validCitationIndexes;
  return new Set(validCitationIndexes);
}

function CitationBadge({
  index,
  onCite,
}: {
  index: number;
  onCite: (n: number) => void;
}) {
  return (
    <button
      type="button"
      className="mx-0.5 inline-flex h-5 min-w-5 translate-y-[-1px] items-center justify-center rounded bg-teal-700/90 px-1 text-[11px] font-semibold text-white transition-transform hover:bg-teal-800 active:scale-95"
      onClick={() => onCite(index)}
      title={`查看引用 [${index}]`}
    >
      {index}
    </button>
  );
}

function InvalidCitationBadge({ index }: { index: number }) {
  return (
    <span
      className="mx-0.5 inline-flex h-5 min-w-5 translate-y-[-1px] items-center justify-center rounded bg-zinc-200 px-1 text-[11px] font-medium text-zinc-500"
      title="无效引用"
      aria-label={`无效引用 [${index}]`}
    >
      无效
    </span>
  );
}

function buildComponents(
  onCite: (n: number) => void,
  validSet: Set<number> | null,
): Components {
  return {
    a: ({ href, children }) => {
      if (href?.startsWith("cite:")) {
        const index = Number(href.slice(5));
        if (!Number.isNaN(index)) {
          if (validSet && !validSet.has(index)) {
            return <InvalidCitationBadge index={index} />;
          }
          return <CitationBadge index={index} onCite={onCite} />;
        }
      }
      return (
        <a
          href={href}
          className="font-medium text-teal-800 underline underline-offset-2"
          target="_blank"
          rel="noreferrer"
        >
          {children}
        </a>
      );
    },
    p: ({ children }) => (
      <p className="my-2 first:mt-0 last:mb-0">{children as ReactNode}</p>
    ),
    ul: ({ children }) => (
      <ul className="my-2 list-disc space-y-1 pl-5">{children as ReactNode}</ul>
    ),
    ol: ({ children }) => (
      <ol className="my-2 list-decimal space-y-1 pl-5">{children as ReactNode}</ol>
    ),
    li: ({ children }) => <li className="leading-relaxed">{children as ReactNode}</li>,
    blockquote: ({ children }) => (
      <blockquote className="my-2 border-l-2 border-teal-300/80 pl-3 text-zinc-600">
        {children as ReactNode}
      </blockquote>
    ),
    h1: ({ children }) => (
      <h3 className="mb-2 mt-3 text-base font-semibold text-zinc-900">
        {children as ReactNode}
      </h3>
    ),
    h2: ({ children }) => (
      <h4 className="mb-1.5 mt-2.5 text-sm font-semibold text-zinc-900">
        {children as ReactNode}
      </h4>
    ),
    h3: ({ children }) => (
      <h5 className="mb-1 mt-2 text-sm font-medium text-zinc-800">
        {children as ReactNode}
      </h5>
    ),
    strong: ({ children }) => (
      <strong className="font-semibold text-zinc-900">{children as ReactNode}</strong>
    ),
    em: ({ children }) => <em className="italic text-zinc-700">{children as ReactNode}</em>,
    code: ({ className, children }) => {
      const isBlock = Boolean(className);
      if (isBlock) {
        return (
          <code className={cn("font-mono text-[12px]", className)}>
            {children as ReactNode}
          </code>
        );
      }
      return (
        <code className="rounded bg-zinc-100 px-1 py-0.5 font-mono text-[12px] text-teal-900">
          {children as ReactNode}
        </code>
      );
    },
    pre: ({ children }) => (
      <pre className="my-2 overflow-x-auto rounded-md bg-zinc-900 p-3 text-[12px] text-zinc-100">
        {children as ReactNode}
      </pre>
    ),
    table: ({ children }) => (
      <div className="my-2 overflow-x-auto rounded-md border border-zinc-200">
        <table className="w-full min-w-[240px] border-collapse text-left text-xs">
          {children as ReactNode}
        </table>
      </div>
    ),
    thead: ({ children }) => (
      <thead className="bg-zinc-50 text-zinc-600">{children as ReactNode}</thead>
    ),
    tbody: ({ children }) => <tbody>{children as ReactNode}</tbody>,
    tr: ({ children }) => (
      <tr className="border-b border-zinc-100 last:border-0">{children as ReactNode}</tr>
    ),
    th: ({ children }) => (
      <th className="border-b border-zinc-200 px-3 py-2 font-medium">
        {children as ReactNode}
      </th>
    ),
    td: ({ children }) => (
      <td className="px-3 py-2 align-top text-zinc-800">{children as ReactNode}</td>
    ),
    hr: () => <hr className="my-3 border-zinc-200" />,
  };
}

export function MessageMarkdown({
  text,
  onCite,
  validCitationIndexes,
  className,
}: {
  text: string;
  onCite: (n: number) => void;
  validCitationIndexes?: Set<number> | number[];
  className?: string;
}) {
  const validSet = toCitationSet(validCitationIndexes);
  const components = buildComponents(onCite, validSet);
  return (
    <div className={cn("desk-markdown break-words", className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {preprocessCitations(text)}
      </ReactMarkdown>
    </div>
  );
}
