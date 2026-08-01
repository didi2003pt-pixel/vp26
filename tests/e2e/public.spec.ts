import { expect, test } from "@playwright/test";

test("home page and security headers", async ({ page }) => {
  const response = await page.goto("/");
  expect(response?.ok()).toBeTruthy();
  expect(await response?.headerValue("x-content-type-options")).toBe("nosniff");
  expect(await response?.headerValue("x-frame-options")).toBe("DENY");
  expect(await response?.headerValue("content-security-policy")).toContain("frame-ancestors 'none'");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});

test("privacy and terms are public", async ({ page }) => {
  await page.goto("/privacidade");
  await expect(page.getByRole("heading", { name: "Política de privacidade" })).toBeVisible();
  await page.goto("/termos");
  await expect(page.getByRole("heading", { name: "Termos e condições" })).toBeVisible();
});

test("no horizontal overflow on mobile", async ({ page }) => {
  await page.goto("/");
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(overflow).toBe(false);
});
