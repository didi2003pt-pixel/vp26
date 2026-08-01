export function normalizeIdentifier(value: string | null | undefined): string {
  return (value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function normalizeName(value: string | null | undefined): string {
  return normalizeIdentifier(value);
}

export function parseDuration(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return Math.round(value);
  if (typeof value !== "string" || !value.trim()) return null;
  const input = value.trim();
  if (/^\d+$/.test(input)) return Number(input);
  const match = input.match(/^(?:(\d+):)?([0-5]?\d):([0-5]\d)$/);
  if (!match) return null;
  return Number(match[1] ?? 0) * 3600 + Number(match[2]) * 60 + Number(match[3]);
}
