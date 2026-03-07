import { expect, test } from "@playwright/test";
import { loginAsAdmin, uniqueEmail } from "./helpers";

test("admin-created customer can activate account from wallet invite link", async ({ browser, page }) => {
  const email = uniqueEmail("wallet-activation");
  const password = "CustomerActivation123!";

  await loginAsAdmin(page);
  await page.goto("/admin/wallet");

  await page.locator("#wallet-first-name").fill("Алина");
  await page.locator("#wallet-last-name").fill("Сафиуллина");
  await page.locator("#wallet-create-phone").fill("+77070000888");
  await page.locator("#wallet-create-email").fill(email);
  await page.getByRole("button", { name: "Создать клиента" }).click();

  await page.waitForURL(new RegExp(`/admin/wallet\\?success=customer_created&customerEmail=${encodeURIComponent(email)}`));
  await expect(page.locator("#wallet-account-setup-link")).toBeVisible();

  const activationUrl = await page.locator("#wallet-account-setup-link").inputValue();
  expect(activationUrl).toContain("/activate-account?");

  const customerContext = await browser.newContext();
  const customerPage = await customerContext.newPage();
  await customerPage.goto(activationUrl);
  await customerPage.locator("#activate-password").fill(password);
  await customerPage.locator("#activate-password-confirm").fill(password);
  await customerPage.getByRole("button", { name: "Активировать аккаунт" }).click();
  await customerPage.waitForURL(/\/account$/);

  const secondContext = await browser.newContext();
  const expiredPage = await secondContext.newPage();
  await expiredPage.goto(activationUrl);
  await expect(expiredPage.getByText("Ссылка недействительна, истекла или уже была использована.")).toBeVisible();

  await customerContext.close();
  await secondContext.close();
});
