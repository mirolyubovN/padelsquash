import { expect, test } from "@playwright/test";
import {
  fillBookingCustomerFields,
  findCourtGroupByTitle,
  isoDatePlusDays,
  registerCustomer,
  selectBookingFlowOptions,
  submitBookingAndExpectSuccess,
  uniqueEmail,
} from "./helpers";

test("customer can register, book a court, slot disappears after refresh, and cancel from account", async ({
  page,
}) => {
  const email = uniqueEmail("customer-court");
  const bookingDate = isoDatePlusDays(3);

  await page.goto("/book");
  await expect(
    page.getByText("Для оформления бронирования войдите в аккаунт или зарегистрируйтесь.", { exact: false }),
  ).toBeVisible();

  await registerCustomer(page, {
    email,
    next: "/book",
    name: "Клиент Корты",
    phone: "+77070000001",
  });

  await selectBookingFlowOptions(page, {
    sport: "padel",
    serviceKind: "court",
    date: bookingDate,
  });

  const firstCourtGroup = page.locator(".booking-live__court-group").first();
  await expect(firstCourtGroup).toBeVisible();
  const courtTitle = (await firstCourtGroup.locator(".booking-live__court-title").innerText()).trim();
  const firstSlotButton = firstCourtGroup.locator(".booking-live__slot-button").first();
  const slotLabel = (await firstSlotButton.locator(".booking-live__slot-time").innerText()).trim();
  await firstSlotButton.click();

  await expect(page.getByText(email)).toBeVisible();
  await expect(page.getByRole("button", { name: "Изменить данные" })).toBeVisible();

  await fillBookingCustomerFields(page, {
    name: "Клиент Корты",
    email,
    phone: "+77070000001",
  });
  await expect(page.getByText("+77070000001")).toBeVisible();
  await submitBookingAndExpectSuccess(page);

  await page.reload();
  await selectBookingFlowOptions(page, {
    sport: "padel",
    serviceKind: "court",
    date: bookingDate,
  });

  const sameCourtGroup = findCourtGroupByTitle(page, courtTitle);
  await expect(sameCourtGroup).toBeVisible();
  await expect(sameCourtGroup.getByRole("button", { name: new RegExp(slotLabel.replace(" - ", "\\s*-\\s*")) })).toHaveCount(0);

  await page.goto("/account/bookings");
  await expect(page.getByText("История бронирований")).toBeVisible();
  await expect(page.getByText("Аренда корта (падел)")).toBeVisible();

  const cancelButton = page.getByRole("button", { name: "Отменить" }).first();
  await expect(cancelButton).toBeVisible();
  await cancelButton.click();

  await page.waitForURL(/\/account\/bookings\?success=cancelled/);
  await expect(page.getByText("Бронирование отменено.")).toBeVisible();
});
