import { expect, test } from "@playwright/test";
import { loginAsAdmin, nextWeekdayIsoDate, uniqueEmail } from "./helpers";

test("admin can update booking status from bookings page", async ({ page }) => {
  const customerEmail = uniqueEmail("admin-bookings");
  const bookingDate = nextWeekdayIsoDate(5);

  await loginAsAdmin(page);
  await page.goto("/admin/bookings/create");

  await page.locator("#cb-date").fill(bookingDate);
  await expect(page.locator("#cb-date")).toHaveValue(bookingDate);

  const firstSlot = page.locator(".admin-create-booking__slot").first();
  await expect(firstSlot).toBeVisible();
  await firstSlot.click();

  await page.locator("#cb-name").fill("Проверка админ-броней");
  await page.locator("#cb-phone").fill("+77070000003");
  await page.locator("#cb-email").fill(customerEmail);
  await page.getByLabel("Оплата в клубе (наличные или карта)").check();
  await page.getByRole("button", { name: "Создать бронирования" }).click();
  await expect(page.getByText("Создано позиций: 1 из 1")).toBeVisible();

  await page.goto(`/admin/bookings?customerEmail=${encodeURIComponent(customerEmail)}`);

  const row = page.locator("tr").filter({ has: page.getByText(customerEmail) }).first();
  await expect(row).toBeVisible();
  await row.getByRole("button", { name: "Завершено" }).click();

  const updatedRow = page.locator("tr").filter({ has: page.getByText(customerEmail) }).first();
  await expect(updatedRow.locator(".admin-bookings__chip").filter({ hasText: "Завершено" }).first()).toBeVisible();
  await updatedRow.getByText("Исправить").click();
  await updatedRow.getByLabel("Статус брони").selectOption("confirmed");
  await updatedRow.getByRole("button", { name: "Сохранить статус" }).click();

  const correctedRow = page.locator("tr").filter({ has: page.getByText(customerEmail) }).first();
  await expect(correctedRow.locator(".admin-bookings__chip").filter({ hasText: "Подтверждено" }).first()).toBeVisible();
});
