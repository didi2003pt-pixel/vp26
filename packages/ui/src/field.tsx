import type { InputHTMLAttributes } from "react";

export type FieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string | undefined;
};

export function Field({ label, error, id, className = "", ...props }: FieldProps) {
  const inputId = id ?? props.name;
  const errorId = error && inputId ? `${inputId}-error` : undefined;

  return (
    <label className="grid gap-2 text-sm font-semibold text-slate-800" htmlFor={inputId}>
      {label}
      <input
        id={inputId}
        aria-invalid={Boolean(error)}
        aria-describedby={errorId}
        className={`min-h-11 rounded-xl border bg-white px-3 py-2 font-normal outline-none transition focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/10 ${error ? "border-red-500" : "border-slate-300"} ${className}`}
        {...props}
      />
      {error ? (
        <span id={errorId} className="text-xs font-medium text-red-700">
          {error}
        </span>
      ) : null}
    </label>
  );
}
