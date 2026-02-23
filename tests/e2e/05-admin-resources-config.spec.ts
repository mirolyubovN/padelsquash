import { expect, test } from "@playwright/test";
import { isoDatePlusDays, loginAsAdmin } from "./helpers";

test("admin can manage config and resource CRUD/toggle flows", async ({ page }) => {
  const uniqueSuffix = `${Date.now()}`;
  const courtName = `Тест корт ${uniqueSuffix}`;
  const instructorName = `Тест тренер ${uniqueSuffix}`;
  const serviceCode = `test-rental-${uniqueSuffix}`;
  const serviceName = `Тест аренда ${uniqueSuffix}`;
  const exceptionNote = `E2E exception ${uniqueSuffix}`;

  await loginAsAdmin(page);

  await page.goto("/admin");
  await expect(page.getByText("Панель управления")).toBeVisible();
  await expect(page.locator('a[href="/admin/courts"]')).toBeVisible();
  await expect(page.locator('a[href="/admin/instructors"]')).toBeVisible();
  await expect(page.locator('a[href="/admin/bookings"]')).toBeVisible();

  await page.goto("/admin/opening-hours");
  await expect(page.getByText("Часы работы площадки")).toBeVisible();
  await page.getByRole("button", { name: "Сохранить часы работы" }).click();
  await expect(page.getByRole("button", { name: "Сохранить часы работы" })).toBeVisible();

  await page.goto("/admin/pricing/base");
  await expect(page.getByText("Матрица цен")).toBeVisible();
  await page.getByRole("button", { name: "Сохранить матрицу цен" }).click();
  await expect(page.getByRole("button", { name: "Сохранить матрицу цен" })).toBeVisible();

  await page.goto("/admin/pricing/rules");
  await expect(page.getByText("Периоды цен")).toBeVisible();
  await expect(page.getByText("Вечер / выходные")).toBeVisible();

  await page.goto("/admin/courts");
  await page.getByLabel("Название").fill(courtName);
  await page.getByLabel("Спорт").selectOption("padel");
  await page.getByLabel("Примечание (опционально)").fill("E2E court");
  await page.getByRole("button", { name: "Добавить корт" }).click();
  let courtRow = page.locator("tr").filter({ has: page.getByText(courtName) }).first();
  await expect(courtRow).toBeVisible();
  await courtRow.getByRole("button", { name: "Выключить" }).click();
  courtRow = page.locator("tr").filter({ has: page.getByText(courtName) }).first();
  await expect(courtRow.getByText("Нет")).toBeVisible();

  await page.goto("/admin/instructors");
  await page.getByLabel("Имя").fill(instructorName);
  await page.getByLabel("Спорт").selectOption("squash");
  await page.getByLabel("Описание (опционально)").fill("E2E trainer");
  await page.getByLabel("Утро (₸)").fill("7001");
  await page.getByLabel("День (₸)").fill("8002");
  await page.getByLabel("Вечер/выходные (₸)").fill("9003");
  await page.getByRole("button", { name: "Добавить тренера" }).click();
  let instructorRow = page.locator("tr").filter({ has: page.getByText(instructorName) }).first();
  await expect(instructorRow).toBeVisible();
  await instructorRow.getByRole("button", { name: "Выключить" }).click();
  instructorRow = page.locator("tr").filter({ has: page.getByText(instructorName) }).first();
  await expect(instructorRow.getByText("Нет")).toBeVisible();

  await page.goto("/admin/services");
  await page.getByLabel("Код").fill(serviceCode);
  await page.getByLabel("Название").fill(serviceName);
  await page.getByLabel("Спорт").selectOption("squash");
  await page.getByRole("checkbox", { name: "Это тренировка (добавляет тренера к цене)" }).check();
  await page.getByRole("button", { name: "Добавить услугу" }).click();
  let serviceRow = page.locator("tr").filter({ has: page.getByText(serviceName) }).first();
  await expect(serviceRow).toBeVisible();
  await serviceRow.getByRole("button", { name: "Выключить" }).click();
  serviceRow = page.locator("tr").filter({ has: page.getByText(serviceName) }).first();
  await expect(serviceRow.getByText("Нет")).toBeVisible();

  await page.goto("/admin/exceptions");
  await page.getByLabel("Ресурс").selectOption("venue");
  await page.getByLabel("Дата").fill(isoDatePlusDays(10));
  await page.getByLabel("Начало").fill("12:00");
  await page.getByLabel("Конец").fill("13:00");
  await page.getByLabel("Тип").selectOption("maintenance");
  await page.getByLabel("Комментарий (опционально)").fill(exceptionNote);
  await page.getByRole("button", { name: "Добавить исключение" }).click();
  const exceptionRow = page.locator("tr").filter({ has: page.getByText(exceptionNote) }).first();
  await expect(exceptionRow).toBeVisible();
  await exceptionRow.getByRole("button", { name: "Удалить" }).click();
  await expect(page.locator("tr").filter({ has: page.getByText(exceptionNote) })).toHaveCount(0);
});
