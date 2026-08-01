import { describe, expect, it } from "vitest";
import { normalizeEmail, slugify } from "../src/index";

describe("auth normalization", () => {
  it("normalizes email", () => {
    expect(normalizeEmail(" User@Example.COM ")).toBe("user@example.com");
  });

  it("creates stable slugs", () => {
    expect(slugify("Viana do Castelo")).toBe("viana-do-castelo");
  });
});
