import { expect, type Locator, type Page } from "@playwright/test";

export const ADMIN_EMAIL = "admin@example.com";
export const ADMIN_PASSWORD = "Admin123!";
export const DEFAULT_CUSTOMER_PASSWORD = "TestUser123!";

export function uniqueEmail(prefix: string): string {
  const stamp = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  return `${prefix}-${stamp}@example.com`;
}

export function isoDatePlusDays(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return formatIsoDate(date);
}

export function nextWeekdayIsoDate(minDaysAhead = 1): string {
  const date = new Date();
  date.setDate(date.getDate() + minDaysAhead);
  while (date.getDay() === 0 || date.getDay() === 6) {
    date.setDate(date.getDate() + 1);
  }
  return formatIsoDate(date);
}

function formatIsoDate(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export async function loginAsAdmin(page: Page) {
  await page.goto("/login?next=%2Fadmin");
  await page.locator("#login-email").fill(ADMIN_EMAIL);
  await page.locator("#login-password").fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Войти" }).click();
  await page.waitForURL(/\/admin/);
  await expect(page.getByText("admin@example.com")).toBeVisible();
}

export async function registerCustomer(page: Page, options: { email: string; next?: string; name?: string; phone?: string; password?: string }) {
  const next = options.next ?? "/book";
  const password = options.password ?? DEFAULT_CUSTOMER_PASSWORD;
  await page.goto(`/register?next=${encodeURIComponent(next)}`);
  await page.locator("#register-name").fill(options.name ?? "Тестовый клиент");
  await page.locator("#register-email").fill(options.email);
  await page.locator("#register-phone").fill(options.phone ?? "+77010000000");
  await page.locator("#register-password").fill(password);
  await page.locator("#register-password-confirm").fill(password);
  await page.getByRole("button", { name: "Создать аккаунт" }).click();
  await page.waitForURL((url) => url.pathname === next);
}

export async function loginCustomer(page: Page, options: { email: string; password?: string; next?: string }) {
  const password = options.password ?? DEFAULT_CUSTOMER_PASSWORD;
  const next = options.next ?? "/account";
  await page.goto(`/login?next=${encodeURIComponent(next)}`);
  await page.locator("#login-email").fill(options.email);
  await page.locator("#login-password").fill(password);
  await page.getByRole("button", { name: "Войти" }).click();
  await page.waitForURL((url) => url.pathname === next);
}

export async function selectBookingFlowOptions(page: Page, options: {
  sport: "padel" | "squash";
  serviceKind: "court" | "training";
  date: string;
}) {
  await page.goto("/book");

  await page.getByRole("button", { name: options.sport === "padel" ? "Падел" : "Сквош" }).click();
  await page
    .getByRole("button", { name: options.serviceKind === "court" ? "Аренда корта" : "Тренировка" })
    .click();

  const dateInput = page.locator("#booking-date-live");
  await dateInput.fill(options.date);
  await expect(dateInput).toHaveValue(options.date);

  await waitForAvailabilityLoaded(page);
}

export async function waitForAvailabilityLoaded(page: Page) {
  await expect(page.locator(".booking-live__availability-title")).toBeVisible();
}

export async function pickFirstCourtSlot(page: Page): Promise<{ courtTitle: string; slotLabel: string }> {
  const firstCourtGroup = page.locator(".booking-live__court-group").first();
  await expect(firstCourtGroup).toBeVisible();
  const courtTitle = (await firstCourtGroup.locator(".booking-live__court-title").first().innerText()).trim();
  const firstSlotButton = firstCourtGroup.locator(".booking-live__slot-button").first();
  const slotLabel = (await firstSlotButton.locator(".booking-live__slot-time").innerText()).trim();
  await firstSlotButton.click();
  return { courtTitle, slotLabel };
}

export function findCourtGroupByTitle(page: Page, courtTitle: string): Locator {
  return page
    .locator(".booking-live__court-group")
    .filter({ has: page.locator(".booking-live__court-title", { hasText: courtTitle }) })
    .first();
}

export async function fillBookingCustomerFields(page: Page, options: { name?: string; email?: string; phone: string }) {
  await page.getByRole("button", { name: "Изменить данные" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  if (options.name !== undefined) {
    await page.locator("#customer-name-live").fill(options.name);
  }
  if (options.email !== undefined) {
    await page.locator("#customer-email-live").fill(options.email);
  }
  await page.locator("#customer-phone-live").fill(options.phone);
  await page.getByRole("button", { name: "Сохранить" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
}

export async function submitBookingAndExpectSuccess(page: Page) {
  await page.getByRole("button", { name: "Забронировать" }).click();
  await expect(page.locator(".booking-live__message--success")).toBeVisible();
  await expect(page.getByText("Бронь:", { exact: false })).toBeVisible();
}

export async function bookFirstAvailableTrainingSlot(page: Page, options: {
  sport?: "padel" | "squash";
  date: string;
  customerEmail: string;
  customerName?: string;
  customerPhone?: string;
  trainerName?: string;
}) {
  await registerCustomer(page, {
    email: options.customerEmail,
    next: "/book",
    name: options.customerName ?? "Тренировочный клиент",
    phone: options.customerPhone ?? "+77012223344",
  });

  await selectBookingFlowOptions(page, {
    sport: options.sport ?? "padel",
    serviceKind: "training",
    date: options.date,
  });

  await pickFirstCourtSlot(page);
  const trainerButtons = page.locator(".booking-live__trainer-button");
  await expect(trainerButtons.first()).toBeVisible();
  expect(await trainerButtons.count()).toBeGreaterThan(0);

  if (options.trainerName) {
    await page.locator(".booking-live__trainer-button", { hasText: options.trainerName }).click();
  } else {
    await page.locator(".booking-live__trainer-button").first().click();
  }

  await submitBookingAndExpectSuccess(page);
}
