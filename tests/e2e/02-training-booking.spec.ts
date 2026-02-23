import { expect, test } from "@playwright/test";
import {
  fillBookingCustomerFields,
  isoDatePlusDays,
  pickFirstCourtSlot,
  selectBookingFlowOptions,
  submitBookingAndExpectSuccess,
  uniqueEmail,
} from "./helpers";

test("guest can book a training session with trainer selection and trainer-specific pricing", async ({
  page,
}) => {
  const bookingDate = isoDatePlusDays(4);
  const email = uniqueEmail("training-guest");

  await selectBookingFlowOptions(page, {
    sport: "padel",
    serviceKind: "training",
    date: bookingDate,
  });

  await pickFirstCourtSlot(page);

  const trainerButtons = page.locator(".booking-live__trainer-button");
  await expect(trainerButtons).toHaveCount(2);

  const firstTrainerText = (await trainerButtons.nth(0).innerText()).trim();
  const secondTrainerText = (await trainerButtons.nth(1).innerText()).trim();
  expect(firstTrainerText).not.toBe(secondTrainerText);

  const secondTrainerName = ((await trainerButtons.nth(1).locator(".booking-live__trainer-name").innerText()) ?? "").trim();
  await trainerButtons.nth(1).click();

  await expect(page.locator(".booking-live__summary")).toBeVisible();
  await expect(page.locator(".booking-live__summary")).toContainText(secondTrainerName);

  await fillBookingCustomerFields(page, {
    name: "Гость тренировка",
    email,
    phone: "+77070000002",
  });
  await submitBookingAndExpectSuccess(page);
});
