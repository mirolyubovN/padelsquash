import { expect, test } from "@playwright/test";
import {
  loginAsAdmin,
  nextWeekdayIsoDate,
  pickFirstCourtSlot,
  pickTrainerAndWaitForAvailability,
  selectBookingFlowOptions,
} from "./helpers";

function amountRegex(amount: number): RegExp {
  const digits = amount.toString();
  if (digits.length <= 3) return new RegExp(digits);
  const grouped = digits.replace(/\B(?=(\d{3})+(?!\d))/g, "[\\s\\u00A0]?");
  return new RegExp(grouped);
}

test("admin can edit trainer price inline and booking preview uses updated trainer price", async ({
  page,
}) => {
  const newPrice = 23456;
  const bookingDate = nextWeekdayIsoDate(2);

  await loginAsAdmin(page);
  await page.goto("/admin/instructors");

  const ilyaRow = page.locator("tr").filter({ has: page.getByText("Илья Смирнов") }).first();
  await expect(ilyaRow).toBeVisible();

  await ilyaRow.getByLabel("Ставка за час").fill(String(newPrice));
  await ilyaRow.getByRole("button", { name: "Сохранить" }).click();

  const refreshedRow = page.locator("tr").filter({ has: page.getByText("Илья Смирнов") }).first();
  await expect(refreshedRow.getByLabel("Ставка за час")).toHaveValue(String(newPrice));

  await selectBookingFlowOptions(page, {
    sport: "padel",
    serviceKind: "training",
    date: bookingDate,
  });

  const ilyaTrainerButton = page.locator(".booking-live__trainer-button", { hasText: "Илья Смирнов" }).first();
  await expect(ilyaTrainerButton).toBeVisible();
  await expect(ilyaTrainerButton).toContainText(amountRegex(newPrice));
  await pickTrainerAndWaitForAvailability(page, { trainerName: "Илья Смирнов", date: bookingDate });

  const pickedSlot = await pickFirstCourtSlot(page);

  await expect(page.locator(".booking-live__summary")).toContainText("Илья Смирнов");
  if (pickedSlot.slotPrice) {
    await expect(page.locator(".booking-live__summary")).toContainText(pickedSlot.slotPrice);
  } else {
    await expect(page.locator(".booking-live__summary")).toContainText(amountRegex(newPrice));
  }
});
