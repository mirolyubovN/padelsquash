import { expect, test } from "@playwright/test";
import { nextWeekdayIsoDate } from "./helpers";

const SEEDED_CUSTOMER_EMAIL = "customer@example.com";
const SEEDED_CUSTOMER_PASSWORD = "Customer123!";
const TRAINER_NAME = "Руслан Алимов";

test("guest booking selections survive the login redirect", async ({ page }) => {
  const bookingDate = nextWeekdayIsoDate(2);

  await page.goto("/book");

  await page.getByRole("button", { name: "Тренировка с тренером" }).click();

  const trainerButton = page.locator(".booking-flow__trainer-card", { hasText: TRAINER_NAME }).first();
  await expect(trainerButton).toBeVisible();
  await trainerButton.click();

  const dateInput = page.locator("#booking-date-live");
  await expect(dateInput).toBeVisible();
  await dateInput.fill(bookingDate);
  await expect(dateInput).toHaveValue(bookingDate);

  const firstAvailableCell = page.locator(".booking-flow__timetable-cell--available").first();
  await expect(firstAvailableCell).toBeVisible();

  const slotRow = firstAvailableCell.locator("xpath=ancestor::tr[1]");
  const slotTime = (await slotRow.locator(".booking-flow__timetable-time-label").innerText()).trim();

  await firstAvailableCell.click();

  const authGate = page.locator(".booking-flow__auth-gate");
  const loginLink = authGate.getByRole("link", { name: "Войти" });
  await expect(authGate).toBeVisible();
  await expect(loginLink).toBeVisible();

  const loginHref = await loginLink.getAttribute("href");
  expect(loginHref).not.toBeNull();

  const loginUrl = new URL(loginHref ?? "", "http://localhost:3000");
  const returnTo = loginUrl.searchParams.get("next");
  expect(returnTo).not.toBeNull();
  expect(returnTo).toContain("/book?");
  expect(returnTo).toContain(`date=${bookingDate}`);
  expect(returnTo).toContain("instructor=");
  expect(returnTo).toContain("cell=");

  await loginLink.click();
  await page.waitForURL(/\/login\?next=/);

  await page.locator("#login-email").fill(SEEDED_CUSTOMER_EMAIL);
  await page.locator("#login-password").fill(SEEDED_CUSTOMER_PASSWORD);
  await page.getByRole("button", { name: "Войти" }).click();

  await page.waitForURL((url) => url.pathname === "/book" && url.searchParams.has("cell"));

  await expect(page.locator(".booking-flow__breakdown")).toContainText(TRAINER_NAME);
  await expect(page.locator(".booking-flow__breakdown")).toContainText(slotTime);
  await expect(page.locator("button[aria-pressed='true']")).toHaveCount(1);
  await expect(page.getByRole("button", { name: "Забронировать" })).toBeVisible();
});
