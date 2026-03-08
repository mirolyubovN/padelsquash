import { expect, test } from "@playwright/test";
import { loginAsAdmin, nextWeekdayIsoDate, uniqueEmail } from "./helpers";

test("admin can top up balance and retry the same held booking", async ({ page }) => {
  const customerEmail = uniqueEmail("admin-wallet-booking");
  const bookingDate = nextWeekdayIsoDate(5);

  await loginAsAdmin(page);
  await page.goto(`/admin/calendar?date=${bookingDate}`);

  const freeLink = page.locator(".admin-calendar__free-slot").filter({ hasText: "+ Занять" }).first();
  await expect(freeLink).toBeVisible();
  await freeLink.click();

  await expect(page.locator("#cb-date")).toHaveValue(bookingDate);
  await expect(page.locator(".admin-create-booking__slot--active").first()).toBeVisible();

  await page.locator("#cb-name").fill("Клиент админ-брони");
  await page.locator("#cb-phone").fill("+77070000111");
  await page.locator("#cb-email").fill(customerEmail);
  await page.getByLabel("Только баланс клиента").check();

  await page.getByRole("button", { name: "Создать бронирования" }).click();

  await expect(page.locator(".admin-create-booking__error")).toContainText("Недостаточно средств на балансе");
  await expect(page.getByRole("button", { name: "Повторить после пополнения" })).toBeVisible();

  const walletPage = await page.context().newPage();
  await walletPage.goto(`/admin/wallet?customerEmail=${encodeURIComponent(customerEmail)}`);
  const customerRow = walletPage.locator("tr").filter({ has: walletPage.getByText(customerEmail) }).first();
  await expect(customerRow).toBeVisible();
  await customerRow.getByRole("button", { name: "Пополнить баланс" }).click();
  const topUpModal = walletPage.locator("dialog.admin-modal[open]").first();
  await expect(topUpModal).toBeVisible();
  await expect(topUpModal.locator("input[name='customerEmail']")).toHaveValue(customerEmail);
  await topUpModal.locator("input[name='amountKzt']").fill("100000");
  await topUpModal.locator("input[name='note']").fill("Оплата в клубе за ручную бронь");
  await topUpModal.getByRole("button", { name: "Провести операцию" }).click();
  await walletPage.waitForURL(/\/admin\/wallet\?success=adjusted/);
  await expect(walletPage.getByText("Баланс клиента обновлен.")).toBeVisible();

  await page.bringToFront();
  await page.getByRole("button", { name: "Повторить после пополнения" }).click();
  await expect(page.getByText("Создано бронирований: 1 из 1")).toBeVisible();
});
