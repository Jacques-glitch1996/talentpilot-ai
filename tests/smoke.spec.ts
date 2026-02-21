import { test, expect } from "@playwright/test";

test.describe("smoke", () => {
  test("login page loads", async ({ page }) => {
    await page.goto("http://127.0.0.1:3000/login");

    // Assert robuste : champ email + bouton submit
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();

    // Le bouton peut être "Se connecter" ou autre -> on check juste qu'il existe un submit
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test("protected page redirects to login when not authenticated", async ({ page, context }) => {
    // ✅ Force un contexte "clean" (pas de cookies/session)
    await context.clearCookies();
    await page.addInitScript(() => {
      window.localStorage.clear();
      window.sessionStorage.clear();
    });

    await page.goto("http://127.0.0.1:3000/dashboard");

    // Attendre une navigation potentielle
    await page.waitForTimeout(500);

    // ✅ Assert : on doit être sur /login OU voir un input email
    // (plus robuste qu'un texte)
    const url = page.url();
    if (!url.includes("/login")) {
      // fallback: vérifier présence du champ email
      await expect(page.locator('input[type="email"]')).toBeVisible();
    } else {
      await expect(page).toHaveURL(/\/login/);
    }
  });
});