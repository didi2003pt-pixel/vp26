import { describe, expect, it } from "vitest";
import {
  buildPredictionSnapshot,
  normalizeSpecialAnswer,
  resolveMarketAvailability,
  validatePredictionSelection,
} from "../src";

const baseMarket = {
  marketStatus: "OPEN" as const,
  stageStatus: "PREDICTIONS_OPEN" as const,
  opensAt: new Date("2026-07-29T10:00:00Z"),
  closesAt: new Date("2026-07-29T18:00:00Z"),
};

describe("resolveMarketAvailability", () => {
  it("abre dentro da janela", () => {
    expect(resolveMarketAvailability({ ...baseMarket, now: new Date("2026-07-29T12:00:00Z") }).open).toBe(true);
  });

  it("fecha exatamente no prazo", () => {
    const result = resolveMarketAvailability({ ...baseMarket, now: new Date("2026-07-29T18:00:00Z") });
    expect(result.open).toBe(false);
    expect(result.code).toBe("CLOSED");
  });

  it("não abre sem janela configurada", () => {
    expect(resolveMarketAvailability({ ...baseMarket, closesAt: null }).code).toBe("WINDOW_NOT_CONFIGURED");
  });
});

describe("validatePredictionSelection", () => {
  const eligible = ["a", "b", "c", "d"];
  const surpriseEligible = ["d"];

  it("aceita uma seleção válida", () => {
    const result = validatePredictionSelection({
      winnerBoatId: "a",
      secondBoatId: "b",
      thirdBoatId: "c",
      surpriseBoatId: "d",
      eligibleBoatIds: eligible,
      surpriseEligibleBoatIds: surpriseEligible,
      allowSurpriseInPodium: false,
    });
    expect(result.valid).toBe(true);
  });

  it("rejeita embarcações repetidas no pódio", () => {
    const result = validatePredictionSelection({
      winnerBoatId: "a",
      secondBoatId: "a",
      thirdBoatId: "c",
      surpriseBoatId: "d",
      eligibleBoatIds: eligible,
      surpriseEligibleBoatIds: surpriseEligible,
      allowSurpriseInPodium: false,
    });
    expect(result.errors.podium).toBeDefined();
  });

  it("rejeita surpresa dentro do pódio quando a regra está desligada", () => {
    const result = validatePredictionSelection({
      winnerBoatId: "a",
      secondBoatId: "b",
      thirdBoatId: "c",
      surpriseBoatId: "c",
      eligibleBoatIds: eligible,
      surpriseEligibleBoatIds: ["c"],
      allowSurpriseInPodium: false,
    });
    expect(result.errors.surpriseBoatId).toBeDefined();
  });
});

describe("normalizeSpecialAnswer", () => {
  it("normaliza número com vírgula", () => {
    expect(normalizeSpecialAnswer("EXACT_NUMBER", "12,5")).toEqual({ type: "number", value: 12.5 });
  });

  it("normaliza diferença de tempo", () => {
    expect(normalizeSpecialAnswer("TIME_DIFFERENCE", "02:30")).toEqual({ type: "duration_seconds", value: 150 });
  });

  it("valida uma opção", () => {
    expect(normalizeSpecialAnswer("SINGLE_CHOICE", "menos-3", ["menos-3"])).toEqual({ type: "option", value: "menos-3" });
  });
});

describe("buildPredictionSnapshot", () => {
  it("preserva a ordem do pódio", () => {
    const snapshot = buildPredictionSnapshot({
      winnerBoatId: "a",
      secondBoatId: "b",
      thirdBoatId: "c",
      surpriseBoatId: "d",
      specialAnswer: { type: "number", value: 2 },
    });
    expect(snapshot.podium.map((entry) => entry.position)).toEqual([1, 2, 3]);
  });
});
