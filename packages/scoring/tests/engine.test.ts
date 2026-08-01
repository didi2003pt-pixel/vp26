import { describe, expect, it } from "vitest";
import { scorePrediction, validateOfficialResult } from "../src";

const result = [
  { boatId: "a", position: 1, status: "CLASSIFIED" as const },
  { boatId: "b", position: 2, status: "CLASSIFIED" as const },
  { boatId: "c", position: 3, status: "CLASSIFIED" as const },
  { boatId: "d", position: 4, status: "CLASSIFIED" as const },
];

describe("scorePrediction", () => {
  it("aplica apenas a melhor regra por escolha do pódio", () => {
    const score = scorePrediction({
      prediction: {
        id: "p", userId: "u", marketId: "m",
        podium: [
          { position: 1, boatId: "a" },
          { position: 2, boatId: "c" },
          { position: 3, boatId: "b" },
        ],
        surpriseBoatId: "d",
        specialAnswer: { type: "option", value: "menos-3" },
      },
      resultEntries: result,
      specialQuestion: {
        type: "SINGLE_CHOICE",
        correctAnswer: { type: "option", value: "menos-3" },
      },
    });
    expect(score.points).toBe(100 + 40 + 40 + 60 + 50);
    expect(score.events).toHaveLength(5);
  });
});

describe("validateOfficialResult", () => {
  it("aceita empate na primeira posição", () => {
    expect(validateOfficialResult([
      { boatId: "a", position: 1, status: "CLASSIFIED" },
      { boatId: "b", position: 1, status: "CLASSIFIED" },
    ])).toEqual([]);
  });
});
