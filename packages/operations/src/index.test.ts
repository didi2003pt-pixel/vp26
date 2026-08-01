import { describe, expect, it } from "vitest";
import {
  buildAnonymizedIdentity,
  buildContentSecurityPolicy,
  calculateDueAt,
  hashIdentifier,
  isTrustedOrigin,
  redactSensitive,
  retentionCutoff,
} from "./index";

describe("operations", () => {
  it("redacts nested credentials", () => {
    expect(redactSensitive({ token: "abc", nested: { passwordHash: "hash", ok: 1 } }))
      .toEqual({ token: "[REDACTED]", nested: { passwordHash: "[REDACTED]", ok: 1 } });
  });

  it("hashes identifiers deterministically", () => {
    const pepper = "x".repeat(32);
    expect(hashIdentifier(" User@example.com ", pepper))
      .toBe(hashIdentifier("user@example.com", pepper));
  });

  it("builds a non-identifying replacement", () => {
    const value = buildAnonymizedIdentity(
      "12345678-1234-1234-1234-1234567890ab",
      new Date("2026-07-30T00:00:00Z"),
    );
    expect(value.email).toContain("@invalid.local");
    expect(value.nickname).toContain("jogador-eliminado");
  });

  it("calculates deadlines and retention cutoffs", () => {
    expect(calculateDueAt(new Date("2026-07-01T00:00:00Z"), 30).toISOString())
      .toBe("2026-07-31T00:00:00.000Z");
    expect(retentionCutoff(new Date("2026-07-31T00:00:00Z"), 30).toISOString())
      .toBe("2026-07-01T00:00:00.000Z");
  });

  it("checks origins", () => {
    expect(isTrustedOrigin("https://jogo.example.pt", "https://jogo.example.pt")).toBe(true);
    expect(isTrustedOrigin("https://evil.example", "https://jogo.example.pt")).toBe(false);
  });

  it("creates a restrictive CSP", () => {
    const policy = buildContentSecurityPolicy({ nonce: "abc", production: true });
    expect(policy).toContain("nonce-abc");
    expect(policy).toContain("frame-ancestors 'none'");
    expect(policy).toContain("upgrade-insecure-requests");
  });
});
