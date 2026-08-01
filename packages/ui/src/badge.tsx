import type { HTMLAttributes } from "react";

export type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: "neutral" | "info" | "success" | "warning" | "danger";
};

const tones = {
  neutral: "bg-slate-100 text-slate-700",
  info: "bg-blue-100 text-blue-800",
  success: "bg-emerald-100 text-emerald-800",
  warning: "bg-amber-100 text-amber-900",
  danger: "bg-red-100 text-red-800",
};

export function Badge({ tone = "neutral", className = "", ...props }: BadgeProps) {
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${tones[tone]} ${className}`} {...props} />;
}
