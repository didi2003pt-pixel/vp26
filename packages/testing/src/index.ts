export function fixedClock(iso: string): () => Date {
  const value = new Date(iso);
  return () => new Date(value);
}
