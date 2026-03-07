import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/src/lib/prisma";
import { AdminPageShell } from "@/src/components/admin/admin-page-shell";
import { assertAdmin, assertSuperAdmin } from "@/src/lib/auth/guards";
import { buildAccountSetupPath, createAccountSetupToken, userNeedsPasswordSetup } from "@/src/lib/auth/account-setup";
import { canManagePricing } from "@/src/lib/auth/roles";
import { siteConfig } from "@/src/lib/content/site-data";
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

function formatMoneyKzt(amount: number): string {
  return `${amount.toLocaleString("ru-KZ")} ₸`;
}

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
  searchParams: Promise<{ error?: string; success?: string; customerEmail?: string; q?: string }>;
}) {
  const session = await assertAdmin();
  const params = await searchParams;
  const [headerStore, data] = await Promise.all([headers(), getAdminWalletPageData(30, params.q)]);
  const canManageBonusProgram = canManagePricing(session.user.role);
  const prefilledCustomerEmail = params.customerEmail?.trim().toLowerCase() ?? "";
  const customerQuery = params.q?.trim() ?? "";
  const requestOrigin = getRequestOrigin(headerStore);

  const selectedCustomerForAccess = prefilledCustomerEmail
    ? await prisma.user.findUnique({
        where: { email: prefilledCustomerEmail },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          passwordHash: true,
        },
      })
    : null;

  const customerNeedsPasswordSetup = selectedCustomerForAccess
    ? userNeedsPasswordSetup(selectedCustomerForAccess.passwordHash)
    : false;

  const accountSetupUrl =
    selectedCustomerForAccess && customerNeedsPasswordSetup
      ? new URL(
          buildAccountSetupPath(
            createAccountSetupToken({
              userId: selectedCustomerForAccess.id,
              email: selectedCustomerForAccess.email,
              passwordHash: selectedCustomerForAccess.passwordHash,
            }),
          ),
          requestOrigin,
        ).toString()
      : null;

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

    try {
      const existing = await prisma.user.findUnique({
        where: { email },
        select: { id: true, role: true },
      });

      if (existing) {
        if (existing.role !== "customer") {
          redirect("/admin/wallet?error=customer_failed");
        }

        redirect(`/admin/wallet?success=customer_exists&customerEmail=${encodeURIComponent(email)}`);
      }

      await prisma.user.create({
        data: {
          name: fullName,
          email,
          phone,
          passwordHash: "admin-created-customer-placeholder",
          role: "customer",
        },
      });
    } catch {
      redirect("/admin/wallet?error=customer_failed");
    }

    revalidateWalletDependencies();
    redirect(`/admin/wallet?success=customer_created&customerEmail=${encodeURIComponent(email)}`);
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
      {errorMessage ? (
        <p className="account-history__message account-history__message--error" role="alert">
          {errorMessage}
        </p>
      ) : null}
      {successMessage ? (
        <p className="account-history__message account-history__message--success" role="status">
          {successMessage}
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
                placeholder="Имя, email или телефон"
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
                data.customers.map((customer) => (
                  <tr key={customer.id} className="admin-table__row">
                    <td className="admin-table__cell">
                      <div>{customer.name}</div>
                      <div className="admin-bookings__cell-sub">{customer.email}</div>
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
                        <a
                          href={`/admin/wallet?customerEmail=${encodeURIComponent(customer.email)}#wallet-adjustment`}
                          className="admin-bookings__action-button"
                        >
                          Пополнить баланс
                        </a>
                        <a
                          href={`/admin/bookings/create?customerEmail=${encodeURIComponent(customer.email)}`}
                          className="admin-bookings__action-button"
                        >
                          Создать бронь
                        </a>
                        {customer.needsPasswordSetup ? (
                          <a
                            href={`/admin/wallet?customerEmail=${encodeURIComponent(customer.email)}#wallet-account-setup`}
                            className="admin-bookings__action-button"
                          >
                            Ссылка доступа
                          </a>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))
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

      {selectedCustomerForAccess ? (
        <section className="admin-section" id="wallet-account-setup">
          <div className="admin-section__head">
            <h2 className="admin-section__title">Доступ в аккаунт</h2>
            <p className="admin-section__description">
              После создания клиента отправьте ему ссылку активации. Клиент сам задаст пароль и сможет войти в личный кабинет.
            </p>
          </div>
          {accountSetupUrl ? (
            <div className="admin-form admin-form--panel">
              <div className="admin-form__panel-grid">
                <div className="admin-form__group">
                  <label className="admin-form__label" htmlFor="wallet-account-setup-link">
                    Ссылка активации
                  </label>
                  <input
                    id="wallet-account-setup-link"
                    className="admin-form__field"
                    value={accountSetupUrl}
                    readOnly
                  />
                </div>
              </div>
              <div className="admin-form__actions">
                <a href={accountSetupUrl} target="_blank" rel="noreferrer" className="admin-form__submit">
                  Открыть ссылку
                </a>
              </div>
            </div>
          ) : (
            <p className="account-history__message account-history__message--success">
              Аккаунт {selectedCustomerForAccess.name} уже активирован. Клиент может войти по email и паролю.
            </p>
          )}
        </section>
      ) : null}

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
