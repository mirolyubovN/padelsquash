import { expect, test } from "@playwright/test";
import { loginAsAdmin, uniqueEmail } from "./helpers";

test("super admin can create an admin staff account and activate it", async ({ browser, page }) => {
  const email = uniqueEmail("staff-e2e-admin");
  const password = "StaffActivation123!";

  await loginAsAdmin(page);
  await page.goto("/admin/staff");

  await page.locator("#staff-name").fill("E2E Администратор");
  await page.locator("#staff-email").fill(email);
  await page.locator("#staff-phone").fill("+77075550901");
  await page.locator("#staff-role").selectOption("admin");
  await page.getByRole("button", { name: "Создать сотрудника" }).click();
  await page.waitForURL(/\/admin\/staff\?success=created/);
  await expect(page.getByText(email)).toBeVisible();

  const row = page.locator("tr", { hasText: email }).first();
  await row.getByRole("button", { name: "Управлять" }).click();
  const activationUrl = await page.locator("dialog[open] input[readonly]").inputValue();
  expect(activationUrl).toContain("/activate-account?");

  const staffPage = await browser.newPage();
  await staffPage.goto(activationUrl);
  await staffPage.locator("#activate-password").fill(password);
  await staffPage.locator("#activate-password-confirm").fill(password);
  await staffPage.getByRole("button", { name: "Активировать аккаунт" }).click();
  await staffPage.waitForURL(/\/admin/);
  await expect(staffPage.locator(".admin-shell__email", { hasText: email }).first()).toBeVisible();
  await staffPage.close();
});
