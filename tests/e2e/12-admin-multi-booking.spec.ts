import { expect, test } from "@playwright/test";
import { loginAsAdmin, nextWeekdayIsoDate, uniqueEmail } from "./helpers";

test("admin can create multiple bookings in one submit by selecting several slot/court cells", async ({ page }) => {
  const customerEmail = uniqueEmail("admin-multi-booking");
  const bookingDate = nextWeekdayIsoDate(6);

  await loginAsAdmin(page);
  await page.goto("/admin/bookings/create");

  const dateInput = page.locator("#cb-date");
  await expect(dateInput).toBeVisible();
  await dateInput.evaluate((input, value) => {
    const dateInputElement = input as HTMLInputElement;
    dateInputElement.value = value;
    dateInputElement.dispatchEvent(new Event("input", { bubbles: true }));
    dateInputElement.dispatchEvent(new Event("change", { bubbles: true }));
  }, bookingDate);
  await expect(dateInput).toHaveValue(bookingDate);

  const slotButtons = page.locator(".admin-create-booking__slot");
  await expect(slotButtons.first()).toBeVisible();
  await slotButtons.first().click();
  await page.locator(".admin-create-booking__slot:not(.admin-create-booking__slot--active)").first().click();
  await expect(page.getByText("Выбрано позиций: 2")).toBeVisible();

  await page.locator("#cb-name").fill("Клиент мульти-бронь");
  await page.locator("#cb-phone").fill("+77070000122");
  await page.locator("#cb-email").fill(customerEmail);
  await page.getByLabel("Оплата в клубе (наличные или карта)").check();

  await page.getByRole("button", { name: "Создать бронирования" }).click();

  await expect(page.getByText("Создано позиций: 2 из 2")).toBeVisible();
  await expect(page.getByRole("link", { name: "К списку бронирований" })).toBeVisible();
});
