import { test, expect } from "@playwright/test";

test("User interaction replay with input typing", async ({ page }) => {
  await page.goto("http://localhost:3000/frame.html");

  await page.waitForLoadState("networkidle");

  await page.setViewportSize({ width: 1280, height: 720 });

  const button1 = page.locator('[data-testid="staktrak-div"]');
  await button1.waitFor({ state: "visible" });
  await button1.click();

  await expect(button1).toHaveText("data-testid");

  await page.waitForTimeout(500);

  const inputField = page.locator('[data-testid="staktrak-input"]');
  await inputField.waitFor({ state: "visible" });
  await inputField.click();

  await inputField.fill("Hello, this is a test input");

  await expect(inputField).toHaveValue("Hello, this is a test input");

  await page.waitForTimeout(1000);

  const content = page.locator(".content-section");
  await expect(content).toBeVisible();

  await expect(content).toContainText("You can select any text");

  const button3 = page.locator("#staktrak-div");
  await button3.waitFor({ state: "visible" });
  await button3.click();

  await page.waitForTimeout(2500);
});
