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
  await expect(page.locator(".admin-create-booking__slot--active")).toBeVisible();

  await page.locator("#cb-name").fill("Клиент админ-брони");
  await page.locator("#cb-phone").fill("+77070000111");
  await page.locator("#cb-email").fill(customerEmail);

  await page.getByRole("button", { name: "Создать бронирование" }).click();

  await expect(page.locator(".admin-create-booking__error")).toContainText("Недостаточно средств на балансе");
  await expect(page.getByRole("button", { name: "Повторить после пополнения" })).toBeVisible();

  const walletPage = await page.context().newPage();
  await walletPage.goto(`/admin/wallet?customerEmail=${encodeURIComponent(customerEmail)}`);
  await expect(walletPage.locator("#wallet-customer-email")).toHaveValue(customerEmail);
  await walletPage.locator("#wallet-amount-kzt").fill("100000");
  await walletPage.locator("#wallet-note").fill("Оплата в клубе за ручную бронь");
  await walletPage.getByRole("button", { name: "Провести операцию" }).click();
  await walletPage.waitForURL(/\/admin\/wallet\?success=adjusted/);
  await expect(walletPage.getByText("Баланс клиента обновлен.")).toBeVisible();

  await page.bringToFront();
  await page.getByRole("button", { name: "Повторить после пополнения" }).click();
  await page.waitForURL(/\/admin\/bookings$/);

  const row = page.locator("tr").filter({ has: page.getByText(customerEmail) }).first();
  await expect(row).toBeVisible();
  await expect(row.getByText("Подтверждено")).toBeVisible();
});
