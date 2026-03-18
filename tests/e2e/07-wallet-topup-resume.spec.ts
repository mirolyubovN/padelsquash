import { expect, test } from "@playwright/test";
import { loginCustomer, nextWeekdayIsoDate } from "./helpers";

const SEEDED_CUSTOMER_EMAIL = "customer@example.com";
const SEEDED_CUSTOMER_PASSWORD = "Customer123!";

test("authenticated customer can top up and return to a held multi-slot booking", async ({ page }) => {
  const bookingDate = nextWeekdayIsoDate(6);
  await loginCustomer(page, {
    email: SEEDED_CUSTOMER_EMAIL,
    password: SEEDED_CUSTOMER_PASSWORD,
    next: "/book",
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

  const selectedSlotCells = page.locator(".booking-flow__timetable-cell[aria-pressed='true']");
  await expect(selectedSlotCells).toHaveCount(2);
  const additionalAvailableCell = page.locator(".booking-flow__timetable-cell--available").first();
  await expect(additionalAvailableCell).toBeVisible();
  await additionalAvailableCell.click();
  await expect(selectedSlotCells).toHaveCount(3);

  await page.getByRole("button", { name: "Забронировать" }).click();

  await expect(page.getByText("Бронирование создано")).toBeVisible();
  await expect(page.locator(".booking-flow__success-row")).toHaveCount(3);
});
