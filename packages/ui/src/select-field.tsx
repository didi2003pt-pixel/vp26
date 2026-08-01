import type { SelectHTMLAttributes } from "react";

export type SelectOption = { value: string; label: string; disabled?: boolean };

export type SelectFieldProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  options: SelectOption[];
  error?: string | undefined;
  placeholder?: string;
};

export function SelectField({
  label,
  options,
  error,
  id,
  className = "",
  placeholder = "Selecionar…",
  ...props
}: SelectFieldProps) {
  const inputId = id ?? props.name;
  const errorId = error && inputId ? `${inputId}-error` : undefined;

  return (
    <label className="grid gap-2 text-sm font-semibold text-slate-800" htmlFor={inputId}>
      {label}
      <select
        id={inputId}
        aria-invalid={Boolean(error)}
        aria-describedby={errorId}
        className={`min-h-11 rounded-xl border bg-white px-3 py-2 font-normal outline-none transition focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/10 ${error ? "border-red-500" : "border-slate-300"} ${className}`}
        {...props}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value} disabled={option.disabled}>
            {option.label}
          </option>
        ))}
      </select>
      {error ? <span id={errorId} className="text-xs font-medium text-red-700">{error}</span> : null}
    </label>
  );
}
