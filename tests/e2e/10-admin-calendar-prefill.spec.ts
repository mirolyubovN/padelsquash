import { expect, test } from "@playwright/test";
import { loginAsAdmin, nextWeekdayIsoDate } from "./helpers";

test("calendar free slot opens create booking with prefilled date and time", async ({ page }) => {
  const date = nextWeekdayIsoDate(5);

  await loginAsAdmin(page);
  await page.goto(`/admin/calendar?date=${date}`);

  const freeLink = page.locator(".admin-calendar__free-slot").filter({ hasText: "+ Занять" }).first();
  await expect(freeLink).toBeVisible();

  const href = await freeLink.getAttribute("href");
  expect(href).toBeTruthy();
  const url = new URL(`http://localhost${href}`);
  const selectedTime = url.searchParams.get("time");
  expect(selectedTime).toBeTruthy();

  await freeLink.click();
  await page.waitForURL(/\/admin\/bookings\/create\?/);
  await expect(page.locator("#cb-date")).toHaveValue(date);
  await expect(page.locator(".admin-create-booking__slot--active")).toContainText(selectedTime ?? "");
});
