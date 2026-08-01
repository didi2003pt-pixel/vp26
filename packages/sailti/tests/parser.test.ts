import { describe, expect, it } from "vitest";
import { matchBoat, parseCanonicalCsv } from "../src";

describe("parseCanonicalCsv", () => {
  it("normaliza uma lista simples", () => {
    const result = parseCanonicalCsv("position;sail_number;boat_name;status\n1;POR 49;Allaboard49;CLASSIFIED\n2;POR 8551;Anthea;CLASSIFIED");
    expect(result.entries).toHaveLength(2);
    expect(result.entries[0].position).toBe(1);
  });
});

describe("matchBoat", () => {
  it("prefere o número de vela ao nome", () => {
    const result = matchBoat({ externalEntryId: null, sailNumber: "POR 49", boatNumber: null, boatName: "nome errado", position: 1, status: "CLASSIFIED", elapsedSeconds: null, correctedSeconds: null, penaltyCode: null, raw: {} }, [{ boatId: "b1", publicName: "Allaboard49", boatNumber: "10", sailNumbers: ["POR 49"], externalIds: [], aliases: [] }]);
    expect(result).toMatchObject({ boatId: "b1", status: "MATCHED", reason: "número de vela" });
  });
});
