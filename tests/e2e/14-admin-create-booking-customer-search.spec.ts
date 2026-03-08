import { expect, test } from "@playwright/test";
import { loginAsAdmin, uniqueEmail } from "./helpers";

test("admin create booking supports yo/e name lookup and single-click customer select", async ({ page }) => {
  const email = uniqueEmail("admin-create-lookup");
  const phone = "+77070000144";

  await loginAsAdmin(page);
  await page.goto("/admin/wallet");

  await page.locator("#wallet-first-name").fill("Семён");
  await page.locator("#wallet-last-name").fill("Петров");
  await page.locator("#wallet-create-phone").fill(phone);
  await page.locator("#wallet-create-email").fill(email);
  await page.getByRole("button", { name: "Создать клиента" }).click();
  await page.waitForURL(new RegExp(`/admin/wallet\\?success=customer_created&customerEmail=${encodeURIComponent(email)}`));

  await page.goto("/admin/bookings/create");
  await expect(page.getByRole("button", { name: "Открыть баланс клиента" })).toHaveCount(0);
  await page.locator("#cb-customer-query").fill("Семен");

  const customerResult = page.locator(".admin-create-booking__customer-result").filter({ hasText: email }).first();
  await expect(customerResult).toBeVisible();
  await customerResult.click();

  await expect(page.locator("#cb-phone")).toHaveValue(phone);
  await expect(page.locator("#cb-email")).toHaveValue(email);
  await expect(page.locator("#cb-name")).toHaveValue("Семён Петров");
  await expect(page.locator("#cb-name")).not.toBeEditable();
  await expect(page.locator("#cb-phone")).not.toBeEditable();
  await expect(page.locator("#cb-email")).not.toBeEditable();
  await expect(page.locator(".booking-flow__timetable-time-price").first()).toContainText("₸");
});
