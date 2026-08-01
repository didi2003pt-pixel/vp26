import { expect, test } from "@playwright/test";

test("health endpoint is not cached", async ({ request }) => {
  const response = await request.get("/api/health");
  expect(response.ok()).toBeTruthy();
  expect(response.headers()["cache-control"]).toContain("no-store");
});

test("metrics endpoint is not public", async ({ request }) => {
  const response = await request.get("/api/metrics");
  expect([401, 404]).toContain(response.status());
});
