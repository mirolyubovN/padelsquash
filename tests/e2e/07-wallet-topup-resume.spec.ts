import { expect, test } from "@playwright/test";
import { nextWeekdayIsoDate, registerCustomer, uniqueEmail } from "./helpers";

test("authenticated customer can top up and return to a held multi-slot booking", async ({ page }) => {
  const bookingDate = nextWeekdayIsoDate(6);
  const email = uniqueEmail("wallet-resume");

  await registerCustomer(page, {
    email,
    next: "/book",
    name: "Баланс Клиент",
    phone: "+77015550000",
  });

  await page.getByRole("button", { name: "Аренда корта" }).click();

  const dateInput = page.locator("#booking-date-live");
  await expect(dateInput).toBeVisible();
  await dateInput.fill(bookingDate);
  await expect(dateInput).toHaveValue(bookingDate);

  const availableCells = page.locator(".booking-flow__timetable-cell--available");
  await expect(availableCells.nth(1)).toBeVisible();

  await availableCells.nth(0).click();
  await availableCells.nth(1).click();

  await expect(page.locator(".booking-flow__breakdown-row")).toHaveCount(3);

  await page.getByRole("button", { name: "Забронировать" }).click();

  await expect(page.getByText("Слоты временно удержаны для вас")).toBeVisible();
  const topUpLink = page.getByRole("link", { name: "Пополнить баланс и вернуться →" });
  await expect(topUpLink).toBeVisible();

  await topUpLink.click();
  await page.waitForURL((url) => url.pathname === "/account" && url.searchParams.has("next"));

  const amountInput = page.locator("#wallet-amount");
  await expect(amountInput).toBeVisible();
  await amountInput.fill("50000");
  await page.getByRole("button", { name: "Пополнить баланс" }).click();

  await page.waitForURL((url) => url.pathname === "/book" && url.searchParams.has("cell"));

  await expect(page.locator("button[aria-pressed='true']")).toHaveCount(2);
  await page.getByRole("button", { name: "Забронировать" }).click();

  await expect(page.getByText("Бронирование создано")).toBeVisible();
  await expect(page.locator(".booking-flow__success-row")).toHaveCount(2);
});
