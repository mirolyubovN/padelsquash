import { expect, test } from "@playwright/test";
import { loginAsAdmin } from "./helpers";

test("super admin is redirected away from customer account pages", async ({ page }) => {
  await loginAsAdmin(page);
  await page.goto("/account");
  await expect(page).toHaveURL(/\/admin$/);
  await page.goto("/account/bookings");
  await expect(page).toHaveURL(/\/admin\/bookings/);
  await expect(page.locator("body")).not.toContainText("Application error");
});
