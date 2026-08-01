import type { HTMLAttributes } from "react";

export type AlertProps = HTMLAttributes<HTMLDivElement> & {
  tone?: "info" | "success" | "warning" | "danger";
};

const tones = {
  info: "border-blue-200 bg-blue-50 text-blue-950",
  success: "border-emerald-200 bg-emerald-50 text-emerald-950",
  warning: "border-amber-300 bg-amber-50 text-amber-950",
  danger: "border-red-200 bg-red-50 text-red-950",
};

export function Alert({ tone = "info", className = "", ...props }: AlertProps) {
  return <div role="status" className={`rounded-2xl border p-4 text-sm ${tones[tone]} ${className}`} {...props} />;
}
