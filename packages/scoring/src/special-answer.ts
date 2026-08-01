import type { SpecialQuestionDefinition } from "./types";

type Normalized = { type?: string; value?: unknown } | null;

function valueOf(input: unknown): unknown {
  if (input && typeof input === "object" && "value" in input) {
    return (input as { value?: unknown }).value;
  }
  return input;
}

function numberOf(input: unknown): number | null {
  const value = valueOf(input);
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace(",", "."));
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

export function evaluateSpecialAnswer(
  answer: unknown,
  definition: SpecialQuestionDefinition | null,
): { correct: boolean; numericError: number } {
  if (!definition || definition.correctAnswer == null || answer == null) {
    return { correct: false, numericError: 0 };
  }

  const expected = valueOf(definition.correctAnswer);
  const received = valueOf(answer);

  if (["EXACT_NUMBER", "TIME_DIFFERENCE"].includes(definition.type)) {
    const expectedNumber = numberOf(definition.correctAnswer);
    const receivedNumber = numberOf(answer);
    if (expectedNumber == null || receivedNumber == null) {
      return { correct: false, numericError: 0 };
    }
    const tolerance = numberOf(definition.tolerance) ?? 0;
    const numericError = Math.abs(expectedNumber - receivedNumber);
    return { correct: numericError <= tolerance, numericError };
  }

  return {
    correct: JSON.stringify(received) === JSON.stringify(expected),
    numericError: 0,
  };
}
