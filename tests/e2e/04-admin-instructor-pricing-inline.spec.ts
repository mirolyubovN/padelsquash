import { expect, test } from "@playwright/test";
import { loginAsAdmin, nextWeekdayIsoDate, pickFirstCourtSlot, selectBookingFlowOptions } from "./helpers";

function amountRegex(amount: number): RegExp {
  const digits = amount.toString();
  if (digits.length <= 3) return new RegExp(digits);
  const grouped = digits.replace(/\B(?=(\d{3})+(?!\d))/g, "[\\s\\u00A0]?");
  return new RegExp(grouped);
}

test("admin can edit trainer prices inline and booking preview uses updated trainer price", async ({
  page,
}) => {
  const newPrice = 23456;

  await loginAsAdmin(page);
  await page.goto("/admin/instructors");

  const ilyaRow = page.locator("tr").filter({ has: page.getByText("Илья Смирнов") }).first();
  await expect(ilyaRow).toBeVisible();

  await ilyaRow.getByLabel("Утро").fill(String(newPrice));
  await ilyaRow.getByLabel("День").fill(String(newPrice));
  await ilyaRow.getByLabel("Вечер").fill(String(newPrice));
  await ilyaRow.getByRole("button", { name: "Сохранить цены" }).click();

  const refreshedRow = page.locator("tr").filter({ has: page.getByText("Илья Смирнов") }).first();
  await expect(refreshedRow.getByLabel("Утро")).toHaveValue(String(newPrice));
  await expect(refreshedRow.getByLabel("День")).toHaveValue(String(newPrice));
  await expect(refreshedRow.getByLabel("Вечер")).toHaveValue(String(newPrice));

  await selectBookingFlowOptions(page, {
    sport: "padel",
    serviceKind: "training",
    date: nextWeekdayIsoDate(2),
  });

  await pickFirstCourtSlot(page);

  const ilyaTrainerButton = page.locator(".booking-live__trainer-button", { hasText: "Илья Смирнов" }).first();
  await expect(ilyaTrainerButton).toBeVisible();
  await expect(ilyaTrainerButton).toContainText(amountRegex(newPrice));
  await ilyaTrainerButton.click();

  await expect(page.locator(".booking-live__summary")).toContainText("Илья Смирнов");
  await expect(page.locator(".booking-live__summary")).toContainText(amountRegex(newPrice));
});
