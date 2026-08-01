import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { parseXrr } from "../src";

describe("parseXrr", () => {
  it("normaliza um documento XRR de teste", async () => {
    const source = await readFile(new URL("../fixtures/example-results.xrr.xml", import.meta.url), "utf8");
    const result = parseXrr(source);
    expect(result.provider).toBe("SAILTI_XRR");
    expect(result.entries).toHaveLength(2);
    expect(result.entries[0]).toMatchObject({
      externalEntryId: "TEST-001",
      sailNumber: "POR TEST 001",
      position: 1,
      status: "CLASSIFIED",
      elapsedSeconds: 9070,
    });
    expect(result.entries[1]).toMatchObject({ status: "DNF", position: null });
  });
});
