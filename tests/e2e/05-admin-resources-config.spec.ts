import { expect, test, type Locator, type Page } from "@playwright/test";
import { isoDatePlusDays, loginAsAdmin } from "./helpers";

async function getAdminTableRowIndicesByNameValue(page: Page, targetName: string): Promise<number[]> {
  return page.locator("tbody tr").evaluateAll((rows, name) => {
    const matches: number[] = [];
    rows.forEach((row, index) => {
      const hasMatch = Array.from(row.querySelectorAll('input[name="name"]')).some(
        (input) => (input as HTMLInputElement).value === name,
      );
      if (hasMatch) {
        matches.push(index);
      }
    });
    return matches;
  }, targetName);
}

async function waitForAdminTableRowByNameValue(page: Page, targetName: string, timeoutMs = 20_000): Promise<Locator> {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const matchIndices = await getAdminTableRowIndicesByNameValue(page, targetName);
    if (matchIndices.length > 0) {
      return page.locator("tbody tr").nth(matchIndices[0]);
    }
    await page.waitForTimeout(200);
  }

  throw new Error(`Не найдена строка таблицы с name="${targetName}"`);
}

async function waitForAdminTableRowCountByNameValue(
  page: Page,
  targetName: string,
  expectedCount: number,
  timeoutMs = 20_000,
) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const matchIndices = await getAdminTableRowIndicesByNameValue(page, targetName);
    if (matchIndices.length === expectedCount) {
      return;
    }
    await page.waitForTimeout(200);
  }

  const lastCount = (await getAdminTableRowIndicesByNameValue(page, targetName)).length;
  throw new Error(
    `Ожидалось ${expectedCount} строк(и) таблицы с name="${targetName}", получено ${lastCount}`,
  );
}

async function getAdminTableRowIndicesContainingText(page: Page, targetText: string): Promise<number[]> {
  return page.locator("tbody tr").evaluateAll((rows, textToFind) => {
    const matches: number[] = [];
    rows.forEach((row, index) => {
      if ((row.textContent ?? "").includes(textToFind)) {
        matches.push(index);
      }
    });
    return matches;
  }, targetText);
}

async function waitForAdminTableRowContainingText(
  page: Page,
  targetText: string,
  timeoutMs = 20_000,
): Promise<Locator> {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const matchIndices = await getAdminTableRowIndicesContainingText(page, targetText);
    if (matchIndices.length > 0) {
      return page.locator("tbody tr").nth(matchIndices[0]);
    }
    await page.waitForTimeout(200);
  }

  throw new Error(`Не найдена строка таблицы с текстом "${targetText}"`);
}

async function waitForAdminTableRowCountContainingText(
  page: Page,
  targetText: string,
  expectedCount: number,
  timeoutMs = 20_000,
) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const matchIndices = await getAdminTableRowIndicesContainingText(page, targetText);
    if (matchIndices.length === expectedCount) {
      return;
    }
    await page.waitForTimeout(200);
  }

  const lastCount = (await getAdminTableRowIndicesContainingText(page, targetText)).length;
  throw new Error(`Ожидалось ${expectedCount} строк(и) таблицы с текстом "${targetText}", получено ${lastCount}`);
}

test("admin can manage config and resource CRUD/toggle flows", async ({ page }) => {
  const uniqueSuffix = `${Date.now()}`;
  const sportName = `Тест спорт ${uniqueSuffix}`;
  const sportSlug = `test-sport-${uniqueSuffix}`;
  const courtName = `Тест корт ${uniqueSuffix}`;
  const instructorName = `Тест тренер ${uniqueSuffix}`;
  const serviceCode = `test-rental-${uniqueSuffix}`;
  const serviceName = `Тест аренда ${uniqueSuffix}`;
  const exceptionNote = `E2E exception ${uniqueSuffix}`;

  await loginAsAdmin(page);

  await page.goto("/admin");
  await expect(page.getByText("Панель управления")).toBeVisible();
  await expect(page.getByRole("link", { name: "Корты" }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: "Тренеры" }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: "Бронирования" }).first()).toBeVisible();

  await page.goto("/admin/opening-hours");
  await expect(page.getByText("Часы работы площадки")).toBeVisible();
  await page.getByRole("button", { name: "Сохранить часы работы" }).click();
  await expect(page.getByRole("button", { name: "Сохранить часы работы" })).toBeVisible();

  await page.goto("/admin/pricing/base");
  await expect(page.getByText("Матрица цен")).toBeVisible();
  await page.getByRole("button", { name: "Сохранить матрицу цен" }).click();
  await expect(page.getByRole("button", { name: "Сохранить матрицу цен" })).toBeVisible();

  await page.goto("/admin/pricing/rules");
  await expect(page.getByRole("heading", { name: "Периоды цен" })).toBeVisible();
  await expect(page.getByText("Вечер / выходные")).toBeVisible();

  await page.goto("/admin/sports");
  const createSportSection = page
    .locator(".admin-section")
    .filter({ has: page.getByRole("button", { name: "Добавить вид спорта" }) })
    .first();
  await createSportSection.getByLabel("Название").fill(sportName);
  await createSportSection.getByLabel("Slug").fill(sportSlug);
  await createSportSection.getByLabel("Иконка (опционально)").fill("🏓");
  await createSportSection.getByLabel("Порядок").fill("950");
  await createSportSection.getByRole("button", { name: "Добавить вид спорта" }).click();
  let sportRow = await waitForAdminTableRowByNameValue(page, sportName);
  await expect(sportRow).toBeVisible({ timeout: 20000 });
  await sportRow.getByRole("button", { name: "Выключить" }).click();
  sportRow = await waitForAdminTableRowByNameValue(page, sportName);
  await expect(sportRow.getByText("Неактивен")).toBeVisible();
  await sportRow.getByRole("button", { name: "Удалить" }).click();
  await page.getByRole("button", { name: "Удалить вид спорта" }).click();
  await waitForAdminTableRowCountByNameValue(page, sportName, 0);

  await page.goto("/admin/courts");
  const createCourtSection = page.locator(".admin-section").filter({ has: page.getByRole("button", { name: "Добавить корт" }) }).first();
  await createCourtSection.getByLabel("Название").fill(courtName);
  await createCourtSection.getByLabel("Спорт").selectOption({ label: "Падел" });
  await createCourtSection.getByLabel("Примечание (опционально)").fill("E2E court");
  await createCourtSection.getByRole("button", { name: "Добавить корт" }).click();
  let courtRow = await waitForAdminTableRowByNameValue(page, courtName);
  await expect(courtRow).toBeVisible({ timeout: 20000 });
  await courtRow.getByRole("button", { name: "Выключить" }).click();
  courtRow = await waitForAdminTableRowByNameValue(page, courtName);
  await expect(courtRow.getByText("Неактивен")).toBeVisible();
  await courtRow.getByRole("button", { name: "Удалить" }).click();
  await page.getByRole("button", { name: "Удалить корт" }).click();
  await waitForAdminTableRowCountByNameValue(page, courtName, 0);

  await page.goto("/admin/instructors");
  const createInstructorForm = page
    .locator("form")
    .filter({ has: page.getByRole("button", { name: "Добавить тренера" }) })
    .first();
  await createInstructorForm.getByLabel("Имя").fill(instructorName);
  await createInstructorForm.getByRole("checkbox", { name: "Падел" }).uncheck();
  await createInstructorForm.getByRole("checkbox", { name: "Сквош" }).check();
  await createInstructorForm.getByLabel("Описание (для страницы тренеров)").fill("E2E trainer");
  await createInstructorForm.getByLabel("Ставка за час (₸)").fill("9003");
  await createInstructorForm.getByRole("button", { name: "Добавить тренера" }).click();
  let instructorRow = await waitForAdminTableRowContainingText(page, instructorName);
  await expect(instructorRow).toBeVisible({ timeout: 20000 });
  await instructorRow.getByRole("button", { name: "Выключить" }).click();
  instructorRow = await waitForAdminTableRowContainingText(page, instructorName);
  await expect(instructorRow.getByText("Неактивен")).toBeVisible();
  await instructorRow.getByRole("button", { name: "Удалить" }).click();
  await page.getByRole("button", { name: "Удалить тренера" }).click();
  await waitForAdminTableRowCountContainingText(page, instructorName, 0);

  await page.goto("/admin/services");
  const createServiceSection = page.locator(".admin-section").filter({ has: page.getByRole("button", { name: "Добавить услугу" }) }).first();
  await createServiceSection.getByLabel("Код").fill(serviceCode);
  await createServiceSection.getByLabel("Название").fill(serviceName);
  await createServiceSection.getByLabel("Спорт").selectOption({ label: "Сквош" });
  await createServiceSection.getByRole("checkbox", { name: "Это тренировка (добавляет тренера к цене)" }).check();
  await createServiceSection.getByRole("button", { name: "Добавить услугу" }).click();
  let serviceRow = await waitForAdminTableRowByNameValue(page, serviceName);
  await expect(serviceRow).toBeVisible({ timeout: 20000 });
  await serviceRow.getByRole("button", { name: "Выключить" }).click();
  serviceRow = await waitForAdminTableRowByNameValue(page, serviceName);
  await expect(serviceRow.getByText("Неактивна")).toBeVisible();
  await serviceRow.getByRole("button", { name: "Удалить" }).click();
  await page.getByRole("button", { name: "Удалить услугу" }).click();
  await waitForAdminTableRowCountByNameValue(page, serviceName, 0);

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
