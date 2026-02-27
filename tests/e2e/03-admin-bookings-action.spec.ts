import { expect, test } from "@playwright/test";
import { bookFirstAvailableTrainingSlot, isoDatePlusDays, loginAsAdmin, uniqueEmail } from "./helpers";

test("admin can update booking status from bookings page", async ({ page }) => {
  const customerEmail = uniqueEmail("admin-bookings");

  await bookFirstAvailableTrainingSlot(page, {
    date: isoDatePlusDays(5),
    customerEmail,
    customerName: "Проверка админ-броней",
    customerPhone: "+77070000003",
  });

  await loginAsAdmin(page);
  await page.goto("/admin/bookings");

  const row = page.locator("tr").filter({ has: page.getByText(customerEmail) }).first();
  await expect(row).toBeVisible();
  await row.getByRole("button", { name: "Завершено" }).click();

  const updatedRow = page.locator("tr").filter({ has: page.getByText(customerEmail) }).first();
  await expect(updatedRow.getByText("Завершено")).toBeVisible();
});
