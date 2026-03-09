import { expect, test } from "@playwright/test";
import { loginAsAdmin, nextWeekdayIsoDate, uniqueEmail } from "./helpers";

test("admin bookings client link opens dedicated customer profile with balance and booking history", async ({
  page,
}) => {
  const customerEmail = uniqueEmail("admin-bookings-client-link");
  const bookingDate = nextWeekdayIsoDate(7);

  await loginAsAdmin(page);
  await page.goto("/admin/bookings/create");

  await page.locator("#cb-date").fill(bookingDate);
  await expect(page.locator("#cb-date")).toHaveValue(bookingDate);

  const firstSlot = page.locator(".admin-create-booking__slot").first();
  await expect(firstSlot).toBeVisible();
  await firstSlot.click();

  await page.locator("#cb-name").fill("Клиент карточки админ");
  await page.locator("#cb-phone").fill("+77070000133");
  await page.locator("#cb-email").fill(customerEmail);
  await page.getByLabel("Оплата в клубе (наличные или карта)").check();

  await page.getByRole("button", { name: "Создать бронирования" }).click();
  await expect(page.getByText("Создано позиций: 1 из 1")).toBeVisible();

  await page.getByRole("link", { name: "К списку бронирований" }).click();
  await page.goto(`/admin/bookings?customerEmail=${encodeURIComponent(customerEmail)}`);

  const bookingRow = page.locator("tr").filter({ has: page.getByText(customerEmail) }).first();
  await expect(bookingRow).toBeVisible();
  await bookingRow.getByRole("link", { name: customerEmail }).click();

  await page.waitForURL(/\/admin\/clients\/.+/);
  await expect(page.getByRole("heading", { name: /Клиент:/ })).toBeVisible();
  await expect(page.locator(`input[readonly][value="${customerEmail}"]`)).toBeVisible();
  await expect(page.getByText("Всего бронирований: 1")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Бронирования клиента" })).toBeVisible();
  await expect(page.locator("table").first().locator("tbody tr")).toHaveCount(1);
});
