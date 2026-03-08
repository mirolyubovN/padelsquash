import { expect, test } from "@playwright/test";
import { loginAsAdmin, uniqueEmail } from "./helpers";

test("admin can create a customer from wallet page and prefill balance adjustment", async ({ page }) => {
  const email = uniqueEmail("wallet-customer");

  await loginAsAdmin(page);
  await page.goto("/admin/wallet");

  await page.locator("#wallet-first-name").fill("Алина");
  await page.locator("#wallet-last-name").fill("Сафиуллина");
  await page.locator("#wallet-create-phone").fill("+77070000999");
  await page.locator("#wallet-create-email").fill(email);
  await page.getByRole("button", { name: "Создать клиента" }).click();

  await page.waitForURL(new RegExp(`/admin/wallet\\?success=customer_created&customerEmail=${encodeURIComponent(email)}`));
  await expect(page.getByText("Клиент создан. Ниже доступна ссылка для активации аккаунта.")).toBeVisible();

  const row = page.locator("tr").filter({ has: page.getByText(email) }).first();
  await expect(row).toBeVisible();

  await row.getByRole("button", { name: "Управлять клиентом" }).click();
  const manageModal = page.locator("dialog.admin-modal[open]").first();
  await expect(manageModal).toBeVisible();
  await expect(manageModal.getByRole("heading", { name: /Клиент:/ })).toBeVisible();
  await manageModal.getByRole("button", { name: "Закрыть" }).click();
  await expect(page.locator("dialog.admin-modal[open]")).toHaveCount(0);

  await row.getByRole("link", { name: "Брони клиента" }).click();
  await page.waitForURL(/\/admin\/clients\//);
  await page.goto(`/admin/wallet?customerEmail=${encodeURIComponent(email)}`);
  await row.getByRole("button", { name: "Пополнить баланс" }).click();
  const topUpModal = page.locator("dialog.admin-modal[open]").first();
  await expect(topUpModal).toBeVisible();
  await expect(topUpModal.locator("input[name='customerEmail']")).toHaveValue(email);

  await topUpModal.locator("input[name='amountKzt']").fill("20000");
  await topUpModal.locator("input[name='note']").fill("Наличная оплата в клубе");
  await topUpModal.getByRole("button", { name: "Провести операцию" }).click();

  await page.waitForURL(new RegExp(`/admin/wallet\\?success=adjusted&customerEmail=${encodeURIComponent(email)}`));
  await expect(page.getByText("Баланс клиента обновлен.")).toBeVisible();
});

test("admin wallet search matches е/ё variants in customer names", async ({ page }) => {
  const email = uniqueEmail("wallet-yo-search");
  const uniquePhoneSuffix = String(Date.now()).slice(-4);
  const phone = `+7707000${uniquePhoneSuffix}`;

  await loginAsAdmin(page);
  await page.goto("/admin/wallet");

  await page.locator("#wallet-first-name").fill("Семён");
  await page.locator("#wallet-last-name").fill("Егоров");
  await page.locator("#wallet-create-phone").fill(phone);
  await page.locator("#wallet-create-email").fill(email);
  await page.getByRole("button", { name: "Создать клиента" }).click();
  await page.waitForURL(new RegExp(`/admin/wallet\\?success=customer_created&customerEmail=${encodeURIComponent(email)}`));

  await page.goto(`/admin/wallet?q=${encodeURIComponent("Семен")}`);
  const row = page.locator("tr").filter({ has: page.getByText(email) }).first();
  await expect(row).toBeVisible();
});

