import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { randomUUID } from "node:crypto";
import { prisma } from "@/src/lib/prisma";
import { AdminEditModal } from "@/src/components/admin/admin-edit-modal";
import { AdminPageShell } from "@/src/components/admin/admin-page-shell";
import { assertAdmin, assertSuperAdmin } from "@/src/lib/auth/guards";
import { buildAccountSetupPath, createAccountSetupToken } from "@/src/lib/auth/account-setup";
import { canManagePricing } from "@/src/lib/auth/roles";
import { siteConfig } from "@/src/lib/content/site-data";
import { formatMoneyKzt as formatMoneyKztValue } from "@/src/lib/format/money";
import { buildPageMetadata } from "@/src/lib/seo/metadata";
import { getAdminWalletPageData } from "@/src/lib/wallet/queries";
import { adjustUserWalletByEmail, saveWalletBonusSettings } from "@/src/lib/wallet/service";

export const metadata = buildPageMetadata({
  title: "Админ: баланс клиентов | Padel & Squash KZ",
  description: "Ручные начисления, создание клиентов и настройки бонуса на пополнение.",
  path: "/admin/wallet",
  noIndex: true,
});

export const dynamic = "force-dynamic";

function formatMoneyKztLegacy(amount: number): string {
  if (Number.isFinite(amount)) {
    return formatMoneyKztValue(amount);
  }
  return `${amount.toLocaleString("ru-KZ")} ₸`;
}

const formatMoneyKzt = formatMoneyKztLegacy;

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("ru-KZ");
}

function getRequestOrigin(headerStore: Headers): string {
  const host = headerStore.get("x-forwarded-host") ?? headerStore.get("host");
  if (!host) {
    return siteConfig.siteUrl;
  }

  const proto = headerStore.get("x-forwarded-proto") ?? (host.includes("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

function getWalletTypeLabel(type: string): string {
  if (type === "topup") return "Пополнение";
  if (type === "bonus") return "Бонус";
  if (type === "admin_credit") return "Начисление";
  if (type === "admin_debit") return "Списание";
  if (type === "booking_charge") return "Оплата брони";
  if (type === "booking_refund") return "Возврат брони";
  return type;
}

function revalidateWalletDependencies() {
  revalidatePath("/admin/wallet");
  revalidatePath("/account");
  revalidatePath("/account/bookings");
  revalidatePath("/book");
}

export default async function AdminWalletPage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string;
    success?: string;
    customerEmail?: string;
    q?: string;
  }>;
}) {
  const session = await assertAdmin();
  const params = await searchParams;
  const [headerStore, data] = await Promise.all([headers(), getAdminWalletPageData(30, params.q)]);
  const canManageBonusProgram = canManagePricing(session.user.role);
  const prefilledCustomerEmail = params.customerEmail?.trim().toLowerCase() ?? "";
  const customerQuery = params.q?.trim() ?? "";
  const requestOrigin = getRequestOrigin(headerStore);

  const successMessage =
    params.success === "adjusted"
      ? "Баланс клиента обновлен."
      : params.success === "bonus_saved"
        ? "Настройки бонуса сохранены."
        : params.success === "customer_created"
          ? "Клиент создан. Ниже доступна ссылка для активации аккаунта."
          : params.success === "customer_exists"
            ? "Клиент уже существует. Можно сразу работать с балансом и доступом."
            : null;

  const errorMessage =
    params.error === "adjust_failed"
      ? "Не удалось обновить баланс клиента."
      : params.error === "bonus_failed"
        ? "Не удалось сохранить настройки бонуса."
        : params.error === "customer_failed"
          ? "Не удалось создать клиента. Проверьте email и обязательные поля."
          : null;

  const resolvedSuccessMessage =
    params.success === "customer_updated"
      ? "Данные клиента сохранены."
      : params.success === "password_reset"
        ? "Пароль клиента сброшен. Новая ссылка активации уже доступна ниже."
        : successMessage;

  const resolvedErrorMessage =
    params.error === "customer_update_failed"
      ? "Не удалось обновить данные клиента."
      : params.error === "customer_email_taken"
        ? "Этот email уже используется другим аккаунтом."
        : params.error === "password_reset_failed"
          ? "Не удалось сбросить пароль клиента."
          : errorMessage;

  async function adjustBalanceAction(formData: FormData) {
    "use server";
    const actionSession = await assertAdmin();

    const customerEmail = String(formData.get("customerEmail") ?? "").trim();
    const amountKzt = Number(formData.get("amountKzt") ?? 0);
    const direction = String(formData.get("direction") ?? "credit");
    const note = String(formData.get("note") ?? "").trim() || undefined;

    try {
      await adjustUserWalletByEmail({
        customerEmail,
        amountKzt,
        direction: direction === "debit" ? "debit" : "credit",
        actorUserId: actionSession.user.id,
        note,
      });
    } catch {
      redirect(`/admin/wallet?error=adjust_failed&customerEmail=${encodeURIComponent(customerEmail.toLowerCase())}`);
    }

    revalidateWalletDependencies();
    redirect(`/admin/wallet?success=adjusted&customerEmail=${encodeURIComponent(customerEmail.toLowerCase())}`);
  }

  async function createCustomerAction(formData: FormData) {
    "use server";
    await assertAdmin();

    const firstName = String(formData.get("firstName") ?? "").trim();
    const lastName = String(formData.get("lastName") ?? "").trim();
    const phone = String(formData.get("phone") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    const fullName = `${firstName} ${lastName}`.trim();

    if (!firstName || !lastName || !phone || !email) {
      redirect("/admin/wallet?error=customer_failed");
    }

    let existing: { id: string; role: "customer" | "trainer" | "admin" | "super_admin" } | null = null;
    try {
      existing = await prisma.user.findUnique({
        where: { email },
        select: { id: true, role: true },
      });
    } catch {
      redirect("/admin/wallet?error=customer_failed");
    }

    if (existing) {
      if (existing.role !== "customer") {
        redirect("/admin/wallet?error=customer_failed");
      }
      redirect(`/admin/wallet?success=customer_exists&customerEmail=${encodeURIComponent(email)}`);
    }

    try {
      await prisma.user.create({
        data: {
          name: fullName,
          email,
          phone,
          passwordHash: "admin-created-customer-placeholder",
          role: "customer",
          emailVerifiedAt: new Date(),
          phoneVerifiedAt: new Date(),
        },
      });
    } catch {
      redirect("/admin/wallet?error=customer_failed");
    }

    revalidateWalletDependencies();
    redirect(`/admin/wallet?success=customer_created&customerEmail=${encodeURIComponent(email)}`);
  }

  async function updateCustomerContactsAction(formData: FormData) {
    "use server";
    await assertAdmin();

    const customerId = String(formData.get("customerId") ?? "").trim();
    const currentEmail = String(formData.get("currentEmail") ?? "").trim().toLowerCase();
    const nextEmail = String(formData.get("email") ?? "").trim().toLowerCase();
    const nextPhone = String(formData.get("phone") ?? "").trim();
    const fallbackEmail = currentEmail || nextEmail;

    if (!customerId || !nextEmail || !nextPhone || !nextEmail.includes("@")) {
      redirect(`/admin/wallet?error=customer_update_failed&customerEmail=${encodeURIComponent(fallbackEmail)}`);
    }

    let customer: { id: string; email: string } | null = null;
    try {
      customer = await prisma.user.findFirst({
        where: { id: customerId, role: "customer" },
        select: { id: true, email: true },
      });
    } catch {
      redirect(`/admin/wallet?error=customer_update_failed&customerEmail=${encodeURIComponent(fallbackEmail)}`);
    }

    if (!customer) {
      redirect(`/admin/wallet?error=customer_update_failed&customerEmail=${encodeURIComponent(fallbackEmail)}`);
    }

    let emailOwner: { id: string } | null = null;
    try {
      emailOwner = await prisma.user.findUnique({
        where: { email: nextEmail },
        select: { id: true },
      });
    } catch {
      redirect(`/admin/wallet?error=customer_update_failed&customerEmail=${encodeURIComponent(customer.email)}`);
    }

    if (emailOwner && emailOwner.id !== customer.id) {
      redirect(`/admin/wallet?error=customer_email_taken&customerEmail=${encodeURIComponent(customer.email)}`);
    }

    try {
      await prisma.user.update({
        where: { id: customer.id },
        data: {
          email: nextEmail,
          phone: nextPhone,
          emailVerifiedAt: new Date(),
          phoneVerifiedAt: new Date(),
        },
      });
    } catch {
      redirect(`/admin/wallet?error=customer_update_failed&customerEmail=${encodeURIComponent(customer.email)}`);
    }

    revalidateWalletDependencies();
    redirect(`/admin/wallet?success=customer_updated&customerEmail=${encodeURIComponent(nextEmail)}`);
  }

  async function resetCustomerPasswordAction(formData: FormData) {
    "use server";
    await assertAdmin();

    const customerId = String(formData.get("customerId") ?? "").trim();
    const currentEmail = String(formData.get("currentEmail") ?? "").trim().toLowerCase();

    if (!customerId) {
      redirect("/admin/wallet?error=password_reset_failed");
    }

    let customer: { id: string; email: string } | null = null;
    try {
      customer = await prisma.user.findFirst({
        where: { id: customerId, role: "customer" },
        select: { id: true, email: true },
      });
    } catch {
      redirect(`/admin/wallet?error=password_reset_failed&customerEmail=${encodeURIComponent(currentEmail)}`);
    }

    if (!customer) {
      redirect(`/admin/wallet?error=password_reset_failed&customerEmail=${encodeURIComponent(currentEmail)}`);
    }

    try {
      await prisma.user.update({
        where: { id: customer.id },
        data: {
          passwordHash: `admin-reset-${randomUUID()}`,
        },
      });
    } catch {
      redirect(`/admin/wallet?error=password_reset_failed&customerEmail=${encodeURIComponent(customer.email)}`);
    }

    revalidateWalletDependencies();
    redirect(`/admin/wallet?success=password_reset&customerEmail=${encodeURIComponent(customer.email)}`);
  }

  async function saveBonusAction(formData: FormData) {
    "use server";
    await assertSuperAdmin();

    try {
      await saveWalletBonusSettings({
        thresholdKzt: Number(formData.get("thresholdKzt") ?? 0),
        bonusPercent: Number(formData.get("bonusPercent") ?? 0),
        active: String(formData.get("active") ?? "") === "on",
      });
    } catch {
      redirect("/admin/wallet?error=bonus_failed");
    }

    revalidateWalletDependencies();
    redirect("/admin/wallet?success=bonus_saved");
  }

  return (
    <AdminPageShell
      title="Баланс клиентов"
      description="Здесь администратор ищет или создает клиента, пополняет баланс для наличной или клубной оплаты и контролирует историю операций."
    >
      {resolvedErrorMessage ? (
        <p className="account-history__message account-history__message--error" role="alert">
          {resolvedErrorMessage}
        </p>
      ) : null}
      {resolvedSuccessMessage ? (
        <p className="account-history__message account-history__message--success" role="status">
          {resolvedSuccessMessage}
        </p>
      ) : null}

      <section className="admin-section">
        <div className="admin-section__head">
          <h2 className="admin-section__title">Клиенты</h2>
          <p className="admin-section__description">
            Найдите существующего клиента, проверьте баланс и откройте нужные действия без ручного поиска email.
          </p>
        </div>
        <form method="get" className="admin-filters">
          <div className="admin-filters__grid">
            <div className="admin-form__group">
              <label className="admin-form__label" htmlFor="wallet-customer-query">
                Поиск клиента
              </label>
              <input
                id="wallet-customer-query"
                name="q"
                className="admin-form__field"
                defaultValue={customerQuery}
                placeholder="Имя или телефон"
              />
            </div>
          </div>
          <div className="admin-filters__actions">
            <button type="submit" className="admin-form__submit">
              Найти
            </button>
            <a href="/admin/wallet" className="admin-bookings__action-button">
              Сбросить
            </a>
          </div>
        </form>

        <div className="admin-table">
          <table className="admin-table__table">
            <thead>
              <tr className="admin-table__row">
                <th className="admin-table__cell admin-table__cell--head">Клиент</th>
                <th className="admin-table__cell admin-table__cell--head">Баланс</th>
                <th className="admin-table__cell admin-table__cell--head">Брони</th>
                <th className="admin-table__cell admin-table__cell--head">Доступ</th>
                <th className="admin-table__cell admin-table__cell--head">Создан</th>
                <th className="admin-table__cell admin-table__cell--head">Действия</th>
              </tr>
            </thead>
            <tbody>
              {data.customers.length === 0 ? (
                <tr className="admin-table__row">
                  <td className="admin-table__cell" colSpan={6}>
                    Клиенты не найдены.
                  </td>
                </tr>
              ) : (
                data.customers.map((customer) => {
                  const customerAccountSetupUrl = customer.needsPasswordSetup
                    ? new URL(
                        buildAccountSetupPath(
                          createAccountSetupToken({
                            userId: customer.id,
                            email: customer.email,
                            passwordHash: customer.passwordHash,
                          }),
                        ),
                        requestOrigin,
                      ).toString()
                    : null;

                  return (
                  <tr key={customer.id} className="admin-table__row">
                    <td className="admin-table__cell">
                      <div>
                        <a href={`/admin/clients/${customer.id}`}>{customer.name}</a>
                      </div>
                      <div className="admin-bookings__cell-sub">
                        <a href={`/admin/clients/${customer.id}`}>{customer.email}</a>
                      </div>
                      <div className="admin-bookings__cell-sub">{customer.phone}</div>
                    </td>
                    <td className="admin-table__cell">{formatMoneyKzt(customer.balanceKzt)}</td>
                    <td className="admin-table__cell">{customer.bookingsCount}</td>
                    <td className="admin-table__cell">
                      {customer.needsPasswordSetup ? "Нет пароля" : "Активирован"}
                    </td>
                    <td className="admin-table__cell">{formatDate(customer.createdAtIso)}</td>
                    <td className="admin-table__cell">
                      <div className="admin-bookings__actions">
                        <AdminEditModal triggerLabel="Пополнить баланс" title={`Баланс: ${customer.name}`}>
                          <form action={adjustBalanceAction} className="admin-form admin-form--panel">
                            <div className="admin-form__panel-grid">
                              <div className="admin-form__group">
                                <label className="admin-form__label" htmlFor={`wallet-customer-email-${customer.id}`}>
                                  Email клиента
                                </label>
                                <input
                                  id={`wallet-customer-email-${customer.id}`}
                                  name="customerEmail"
                                  type="email"
                                  className="admin-form__field"
                                  defaultValue={customer.email}
                                  required
                                />
                              </div>
                              <div className="admin-form__group">
                                <label className="admin-form__label" htmlFor={`wallet-amount-kzt-${customer.id}`}>
                                  Сумма, KZT
                                </label>
                                <input
                                  id={`wallet-amount-kzt-${customer.id}`}
                                  name="amountKzt"
                                  type="number"
                                  min="1"
                                  step="1"
                                  className="admin-form__field"
                                  required
                                />
                              </div>
                              <div className="admin-form__group">
                                <label className="admin-form__label" htmlFor={`wallet-direction-${customer.id}`}>
                                  Действие
                                </label>
                                <select
                                  id={`wallet-direction-${customer.id}`}
                                  name="direction"
                                  className="admin-form__field"
                                  defaultValue="credit"
                                >
                                  <option value="credit">Начислить</option>
                                  <option value="debit">Списать</option>
                                </select>
                              </div>
                              <div className="admin-form__group">
                                <label className="admin-form__label" htmlFor={`wallet-note-${customer.id}`}>
                                  Комментарий
                                </label>
                                <input
                                  id={`wallet-note-${customer.id}`}
                                  name="note"
                                  className="admin-form__field"
                                  placeholder="Например: оплата в клубе"
                                />
                              </div>
                            </div>
                            <div className="admin-form__actions">
                              <button type="submit" className="admin-form__submit">
                                Провести операцию
                              </button>
                            </div>
                          </form>
                        </AdminEditModal>
                        <a
                          href={`/admin/bookings/create?customerEmail=${encodeURIComponent(customer.email)}`}
                          className="admin-bookings__action-button"
                        >
                          Создать бронь
                        </a>
                        <a
                          href={`/admin/clients/${customer.id}`}
                          className="admin-bookings__action-button"
                        >
                          Брони клиента
                        </a>
                        <AdminEditModal triggerLabel="Управлять клиентом" title={`Клиент: ${customer.name}`}>
                          <form action={updateCustomerContactsAction} className="admin-form admin-form--panel">
                            <input type="hidden" name="customerId" value={customer.id} />
                            <input type="hidden" name="currentEmail" value={customer.email} />
                            <div className="admin-form__panel-grid">
                              <div className="admin-form__group">
                                <label className="admin-form__label" htmlFor={`wallet-edit-email-${customer.id}`}>
                                  Email
                                </label>
                                <input
                                  id={`wallet-edit-email-${customer.id}`}
                                  name="email"
                                  type="email"
                                  className="admin-form__field"
                                  defaultValue={customer.email}
                                  required
                                />
                              </div>
                              <div className="admin-form__group">
                                <label className="admin-form__label" htmlFor={`wallet-edit-phone-${customer.id}`}>
                                  Телефон
                                </label>
                                <input
                                  id={`wallet-edit-phone-${customer.id}`}
                                  name="phone"
                                  className="admin-form__field"
                                  defaultValue={customer.phone}
                                  required
                                />
                              </div>
                            </div>
                            <div className="admin-form__actions">
                              <button type="submit" className="admin-form__submit">
                                Сохранить данные
                              </button>
                            </div>
                          </form>
                          <form action={resetCustomerPasswordAction} className="admin-form admin-form--panel">
                            <input type="hidden" name="customerId" value={customer.id} />
                            <input type="hidden" name="currentEmail" value={customer.email} />
                            <p className="admin-bookings__cell-sub">
                              Сброс пароля отключает текущий пароль клиента и создаёт новую ссылку активации.
                            </p>
                            <div className="admin-form__actions">
                              <button
                                type="submit"
                                className="admin-bookings__action-button admin-bookings__action-button--danger"
                              >
                                Сбросить пароль
                              </button>
                            </div>
                          </form>
                        </AdminEditModal>
                        {customer.needsPasswordSetup ? (
                          <AdminEditModal triggerLabel="Ссылка доступа" title={`Доступ: ${customer.name}`}>
                            {customerAccountSetupUrl ? (
                              <div className="admin-form admin-form--panel">
                                <div className="admin-form__panel-grid">
                                  <div className="admin-form__group">
                                    <label className="admin-form__label" htmlFor={`wallet-access-link-${customer.id}`}>
                                      Ссылка активации
                                    </label>
                                    <input
                                      id={`wallet-access-link-${customer.id}`}
                                      className="admin-form__field"
                                      value={customerAccountSetupUrl}
                                      readOnly
                                    />
                                  </div>
                                </div>
                                <div className="admin-form__actions">
                                  <a href={customerAccountSetupUrl} target="_blank" rel="noreferrer" className="admin-form__submit">
                                    Открыть ссылку
                                  </a>
                                </div>
                              </div>
                            ) : (
                              <p className="account-history__message account-history__message--success">
                                Аккаунт уже активирован.
                              </p>
                            )}
                          </AdminEditModal>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="admin-section">
        <div className="admin-section__head">
          <h2 className="admin-section__title">Новый клиент</h2>
          <p className="admin-section__description">
            Быстрая регистрация клиента из админки для клубных продаж, наличной оплаты и ручных бронирований.
          </p>
        </div>
        <form action={createCustomerAction} className="admin-form admin-form--panel">
          <div className="admin-form__panel-grid">
            <div className="admin-form__group">
              <label className="admin-form__label" htmlFor="wallet-first-name">
                Имя
              </label>
              <input id="wallet-first-name" name="firstName" className="admin-form__field" required />
            </div>
            <div className="admin-form__group">
              <label className="admin-form__label" htmlFor="wallet-last-name">
                Фамилия
              </label>
              <input id="wallet-last-name" name="lastName" className="admin-form__field" required />
            </div>
            <div className="admin-form__group">
              <label className="admin-form__label" htmlFor="wallet-create-phone">
                Телефон
              </label>
              <input id="wallet-create-phone" name="phone" className="admin-form__field" required />
            </div>
            <div className="admin-form__group">
              <label className="admin-form__label" htmlFor="wallet-create-email">
                Email
              </label>
              <input id="wallet-create-email" name="email" type="email" className="admin-form__field" required />
            </div>
          </div>
          <div className="admin-form__actions">
            <button type="submit" className="admin-form__submit">
              Создать клиента
            </button>
          </div>
        </form>
      </section>

      <section className="admin-section" id="wallet-adjustment">
        <div className="admin-section__head">
          <h2 className="admin-section__title">Пополнение и списание</h2>
          <p className="admin-section__description">
            Используйте для наличной или клубной оплаты. Все операции попадают в журнал и сразу влияют на доступность бронирования.
          </p>
        </div>
        <form action={adjustBalanceAction} className="admin-form admin-form--panel">
          <div className="admin-form__panel-grid">
            <div className="admin-form__group">
              <label className="admin-form__label" htmlFor="wallet-customer-email">
                Email клиента
              </label>
              <input
                id="wallet-customer-email"
                name="customerEmail"
                type="email"
                className="admin-form__field"
                defaultValue={prefilledCustomerEmail}
                required
              />
            </div>
            <div className="admin-form__group">
              <label className="admin-form__label" htmlFor="wallet-amount-kzt">
                Сумма, KZT
              </label>
              <input
                id="wallet-amount-kzt"
                name="amountKzt"
                type="number"
                min="1"
                step="1"
                className="admin-form__field"
                required
              />
            </div>
            <div className="admin-form__group">
              <label className="admin-form__label" htmlFor="wallet-direction">
                Действие
              </label>
              <select id="wallet-direction" name="direction" className="admin-form__field" defaultValue="credit">
                <option value="credit">Начислить</option>
                <option value="debit">Списать</option>
              </select>
            </div>
            <div className="admin-form__group">
              <label className="admin-form__label" htmlFor="wallet-note">
                Комментарий
              </label>
              <input id="wallet-note" name="note" className="admin-form__field" placeholder="Например: оплата в клубе" />
            </div>
          </div>
          <div className="admin-form__actions">
            <button type="submit" className="admin-form__submit">
              Провести операцию
            </button>
          </div>
        </form>
      </section>

      {canManageBonusProgram ? (
        <section className="admin-section">
          <div className="admin-section__head">
            <h2 className="admin-section__title">Бонус на пополнение</h2>
            <p className="admin-section__description">
              По умолчанию клиент получает 10% бонуса при пополнении от 50 000 KZT. Порог и процент можно менять здесь.
            </p>
          </div>
          <form action={saveBonusAction} className="admin-form admin-form--panel">
            <div className="admin-form__panel-grid">
              <div className="admin-form__group">
                <label className="admin-form__label" htmlFor="wallet-threshold">
                  Порог бонуса, KZT
                </label>
                <input
                  id="wallet-threshold"
                  name="thresholdKzt"
                  type="number"
                  min="1"
                  step="1"
                  defaultValue={data.bonusSettings.thresholdKzt}
                  className="admin-form__field"
                  required
                />
              </div>
              <div className="admin-form__group">
                <label className="admin-form__label" htmlFor="wallet-bonus-percent">
                  Бонус, %
                </label>
                <input
                  id="wallet-bonus-percent"
                  name="bonusPercent"
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  defaultValue={data.bonusSettings.bonusPercent}
                  className="admin-form__field"
                  required
                />
              </div>
              <div className="admin-form__group">
                <label className="admin-form__checkbox">
                  <input name="active" type="checkbox" defaultChecked={data.bonusSettings.active} />
                  <span>Программа активна</span>
                </label>
              </div>
            </div>
            <div className="admin-form__actions">
              <button type="submit" className="admin-form__submit">
                Сохранить настройки
              </button>
            </div>
          </form>
        </section>
      ) : null}

      <section className="admin-section">
        <div className="admin-section__head">
          <h2 className="admin-section__title">Последние операции</h2>
          <p className="admin-section__description">Журнал ручных корректировок и автоматических движений по балансу.</p>
        </div>
        <div className="admin-table">
          <table className="admin-table__table">
            <thead>
              <tr className="admin-table__row">
                <th className="admin-table__cell admin-table__cell--head">Клиент</th>
                <th className="admin-table__cell admin-table__cell--head">Операция</th>
                <th className="admin-table__cell admin-table__cell--head">Сумма</th>
                <th className="admin-table__cell admin-table__cell--head">Баланс после</th>
                <th className="admin-table__cell admin-table__cell--head">Комментарий</th>
              </tr>
            </thead>
            <tbody>
              {data.transactions.length === 0 ? (
                <tr className="admin-table__row">
                  <td className="admin-table__cell" colSpan={5}>
                    Операций пока нет.
                  </td>
                </tr>
              ) : (
                data.transactions.map((row) => (
                  <tr key={row.id} className="admin-table__row">
                    <td className="admin-table__cell">
                      <div>{row.userName ?? "Клиент"}</div>
                      <div className="admin-bookings__cell-sub">{row.userEmail ?? "—"}</div>
                    </td>
                    <td className="admin-table__cell">
                      <div>{getWalletTypeLabel(row.type)}</div>
                      {row.actorName ? <div className="admin-bookings__cell-sub">Инициатор: {row.actorName}</div> : null}
                    </td>
                    <td className="admin-table__cell">
                      {row.amountKzt > 0 ? "+" : ""}
                      {formatMoneyKzt(row.amountKzt)}
                    </td>
                    <td className="admin-table__cell">{formatMoneyKzt(row.balanceAfterKzt)}</td>
                    <td className="admin-table__cell">
                      {row.note ?? "—"}
                      {row.bookingId ? <div className="admin-bookings__cell-sub">Бронь: {row.bookingId}</div> : null}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </AdminPageShell>
  );
}
