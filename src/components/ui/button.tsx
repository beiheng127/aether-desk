import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md";

const variants: Record<Variant, string> = {
  primary:
    "bg-teal-700 text-white hover:bg-teal-800 disabled:bg-teal-700/50",
  secondary:
    "bg-zinc-100 text-zinc-900 hover:bg-zinc-200 border border-zinc-200",
  ghost: "bg-transparent text-zinc-700 hover:bg-zinc-100",
  danger: "bg-rose-600 text-white hover:bg-rose-700",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-2.5 text-xs",
  md: "h-9 px-3 text-sm",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export function Button({
  className,
  variant = "secondary",
  size = "md",
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-md font-medium transition-[color,background-color,transform] duration-150 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  );
}
