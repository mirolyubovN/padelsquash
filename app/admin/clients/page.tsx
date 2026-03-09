import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { randomUUID } from "node:crypto";
import Link from "next/link";
import { prisma } from "@/src/lib/prisma";
import { AdminEditModal } from "@/src/components/admin/admin-edit-modal";
import { AdminPageShell } from "@/src/components/admin/admin-page-shell";
import { assertAdmin } from "@/src/lib/auth/guards";
import { buildAccountSetupPath, createAccountSetupToken } from "@/src/lib/auth/account-setup";
import { siteConfig } from "@/src/lib/content/site-data";
import { formatMoneyKzt } from "@/src/lib/format/money";
import { buildPageMetadata } from "@/src/lib/seo/metadata";
import { getAdminWalletPageData } from "@/src/lib/wallet/queries";
import { adjustUserWalletByEmail } from "@/src/lib/wallet/service";

export const metadata = buildPageMetadata({
  title: "Админ: клиенты | Padel & Squash KZ",
  description: "Список клиентов, управление балансом, регистрация новых клиентов.",
  path: "/admin/clients",
  noIndex: true,
});

export const dynamic = "force-dynamic";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("ru-KZ");
}

function getRequestOrigin(headerStore: Headers): string {
  const host = headerStore.get("x-forwarded-host") ?? headerStore.get("host");
  if (!host) return siteConfig.siteUrl;
  const proto = headerStore.get("x-forwarded-proto") ?? (host.includes("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export default async function AdminClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; success?: string; error?: string }>;
}) {
  const session = await assertAdmin();
  const params = await searchParams;
  const [headerStore, data] = await Promise.all([headers(), getAdminWalletPageData(30, params.q)]);
  const customerQuery = params.q?.trim() ?? "";
  const requestOrigin = getRequestOrigin(headerStore);

  const successMessage =
    params.success === "adjusted"
      ? "Баланс клиента обновлен."
      : params.success === "customer_created"
        ? "Клиент создан."
        : params.success === "customer_exists"
          ? "Клиент уже существует."
          : params.success === "customer_updated"
            ? "Данные клиента сохранены."
            : params.success === "password_reset"
              ? "Пароль клиента сброшен."
              : null;

  const errorMessage =
    params.error === "adjust_failed"
      ? "Не удалось обновить баланс."
      : params.error === "customer_failed"
        ? "Не удалось создать клиента."
        : params.error === "customer_update_failed"
          ? "Не удалось обновить данные клиента."
          : params.error === "customer_email_taken"
            ? "Этот email уже используется другим аккаунтом."
            : params.error === "password_reset_failed"
              ? "Не удалось сбросить пароль."
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
      redirect(`/admin/clients?error=adjust_failed&q=${encodeURIComponent(customerEmail)}`);
    }
    revalidatePath("/admin/clients");
    revalidatePath("/account");
    redirect(`/admin/clients?success=adjusted&q=${encodeURIComponent(customerEmail)}`);
  }

  async function createCustomerAction(formData: FormData) {
    "use server";
    await assertAdmin();
    const firstName = String(formData.get("firstName") ?? "").trim();
    const lastName = String(formData.get("lastName") ?? "").trim();
    const phone = String(formData.get("phone") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    const fullName = `${firstName} ${lastName}`.trim();
    if (!firstName || !lastName || !phone || !email) redirect("/admin/clients?error=customer_failed");

    let existing: { id: string; role: string } | null = null;
    try {
      existing = await prisma.user.findUnique({ where: { email }, select: { id: true, role: true } });
    } catch {
      redirect("/admin/clients?error=customer_failed");
    }

    if (existing) {
      if (existing.role !== "customer") redirect("/admin/clients?error=customer_failed");
      redirect(`/admin/clients?success=customer_exists&q=${encodeURIComponent(email)}`);
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
      redirect("/admin/clients?error=customer_failed");
    }

    revalidatePath("/admin/clients");
    redirect(`/admin/clients?success=customer_created&q=${encodeURIComponent(email)}`);
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
      redirect(`/admin/clients?error=customer_update_failed&q=${encodeURIComponent(fallbackEmail)}`);
    }

    let customer: { id: string; email: string } | null = null;
    try {
      customer = await prisma.user.findFirst({ where: { id: customerId, role: "customer" }, select: { id: true, email: true } });
    } catch {
      redirect(`/admin/clients?error=customer_update_failed&q=${encodeURIComponent(fallbackEmail)}`);
    }
    if (!customer) redirect(`/admin/clients?error=customer_update_failed&q=${encodeURIComponent(fallbackEmail)}`);

    const emailOwner = await prisma.user.findUnique({ where: { email: nextEmail }, select: { id: true } }).catch(() => null);
    if (emailOwner && emailOwner.id !== customer.id) {
      redirect(`/admin/clients?error=customer_email_taken&q=${encodeURIComponent(customer.email)}`);
    }

    try {
      await prisma.user.update({
        where: { id: customer.id },
        data: { email: nextEmail, phone: nextPhone, emailVerifiedAt: new Date(), phoneVerifiedAt: new Date() },
      });
    } catch {
      redirect(`/admin/clients?error=customer_update_failed&q=${encodeURIComponent(customer.email)}`);
    }

    revalidatePath("/admin/clients");
    redirect(`/admin/clients?success=customer_updated&q=${encodeURIComponent(nextEmail)}`);
  }

  async function resetCustomerPasswordAction(formData: FormData) {
    "use server";
    await assertAdmin();
    const customerId = String(formData.get("customerId") ?? "").trim();
    const currentEmail = String(formData.get("currentEmail") ?? "").trim().toLowerCase();
    if (!customerId) redirect("/admin/clients?error=password_reset_failed");

    let customer: { id: string; email: string } | null = null;
    try {
      customer = await prisma.user.findFirst({ where: { id: customerId, role: "customer" }, select: { id: true, email: true } });
    } catch {
      redirect(`/admin/clients?error=password_reset_failed&q=${encodeURIComponent(currentEmail)}`);
    }
    if (!customer) redirect(`/admin/clients?error=password_reset_failed&q=${encodeURIComponent(currentEmail)}`);

    try {
      await prisma.user.update({ where: { id: customer.id }, data: { passwordHash: `admin-reset-${randomUUID()}` } });
    } catch {
      redirect(`/admin/clients?error=password_reset_failed&q=${encodeURIComponent(customer.email)}`);
    }

    revalidatePath("/admin/clients");
    redirect(`/admin/clients?success=password_reset&q=${encodeURIComponent(customer.email)}`);
  }

  return (
    <AdminPageShell
      title="Клиенты"
      description="Список клиентов, управление балансом и доступом."
    >
      {errorMessage ? (
        <p className="account-history__message account-history__message--error" role="alert">{errorMessage}</p>
      ) : null}
      {successMessage ? (
        <p className="account-history__message account-history__message--success" role="status">{successMessage}</p>
      ) : null}

      <section className="admin-section">
        <form method="get" className="admin-filters">
          <div className="admin-filters__grid">
            <div className="admin-form__group">
              <label className="admin-form__label" htmlFor="clients-query">Поиск</label>
              <input
                id="clients-query"
                name="q"
                className="admin-form__field"
                defaultValue={customerQuery}
                placeholder="Имя или телефон"
              />
            </div>
          </div>
          <div className="admin-filters__actions">
            <button type="submit" className="admin-form__submit">Найти</button>
            <a href="/admin/clients" className="admin-bookings__action-button">Сбросить</a>
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
                  <td className="admin-table__cell" colSpan={6}>Клиенты не найдены.</td>
                </tr>
              ) : (
                data.customers.map((customer) => {
                  const needsSetup = customer.needsPasswordSetup;
                  const setupUrl = needsSetup
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
                        <div><Link href={`/admin/clients/${customer.id}`}>{customer.name}</Link></div>
                        <div className="admin-bookings__cell-sub"><Link href={`/admin/clients/${customer.id}`}>{customer.email}</Link></div>
                        <div className="admin-bookings__cell-sub">{customer.phone}</div>
                      </td>
                      <td className="admin-table__cell">{formatMoneyKzt(customer.balanceKzt)}</td>
                      <td className="admin-table__cell">{customer.bookingsCount}</td>
                      <td className="admin-table__cell">{needsSetup ? "Нет пароля" : "Активирован"}</td>
                      <td className="admin-table__cell">{formatDate(customer.createdAtIso)}</td>
                      <td className="admin-table__cell">
                        <div className="admin-bookings__actions">
                          <AdminEditModal triggerLabel="Пополнить баланс" title={`Баланс: ${customer.name}`}>
                            <form action={adjustBalanceAction} className="admin-form admin-form--panel">
                              <div className="admin-form__panel-grid">
                                <div className="admin-form__group">
                                  <label className="admin-form__label">Email клиента</label>
                                  <input name="customerEmail" type="email" className="admin-form__field" defaultValue={customer.email} required />
                                </div>
                                <div className="admin-form__group">
                                  <label className="admin-form__label">Сумма, KZT</label>
                                  <input name="amountKzt" type="number" min="1" step="1" className="admin-form__field" required />
                                </div>
                                <div className="admin-form__group">
                                  <label className="admin-form__label">Действие</label>
                                  <select name="direction" className="admin-form__field" defaultValue="credit">
                                    <option value="credit">Начислить</option>
                                    <option value="debit">Списать</option>
                                  </select>
                                </div>
                                <div className="admin-form__group">
                                  <label className="admin-form__label">Комментарий</label>
                                  <input name="note" className="admin-form__field" placeholder="Например: оплата в клубе" />
                                </div>
                              </div>
                              <div className="admin-form__actions">
                                <button type="submit" className="admin-form__submit">Провести операцию</button>
                              </div>
                            </form>
                          </AdminEditModal>
                          <Link href={`/admin/bookings/create?customerEmail=${encodeURIComponent(customer.email)}`} className="admin-bookings__action-button">
                            Создать бронь
                          </Link>
                          <Link href={`/admin/clients/${customer.id}`} className="admin-bookings__action-button">
                            Профиль
                          </Link>
                          <AdminEditModal triggerLabel="Управлять" title={`Клиент: ${customer.name}`}>
                            <form action={updateCustomerContactsAction} className="admin-form admin-form--panel">
                              <input type="hidden" name="customerId" value={customer.id} />
                              <input type="hidden" name="currentEmail" value={customer.email} />
                              <div className="admin-form__panel-grid">
                                <div className="admin-form__group">
                                  <label className="admin-form__label">Email</label>
                                  <input name="email" type="email" className="admin-form__field" defaultValue={customer.email} required />
                                </div>
                                <div className="admin-form__group">
                                  <label className="admin-form__label">Телефон</label>
                                  <input name="phone" className="admin-form__field" defaultValue={customer.phone} required />
                                </div>
                              </div>
                              <div className="admin-form__actions">
                                <button type="submit" className="admin-form__submit">Сохранить данные</button>
                              </div>
                            </form>
                            <form action={resetCustomerPasswordAction} className="admin-form admin-form--panel">
                              <input type="hidden" name="customerId" value={customer.id} />
                              <input type="hidden" name="currentEmail" value={customer.email} />
                              <p className="admin-bookings__cell-sub">Сброс пароля отключает текущий пароль клиента.</p>
                              <div className="admin-form__actions">
                                <button type="submit" className="admin-bookings__action-button admin-bookings__action-button--danger">
                                  Сбросить пароль
                                </button>
                              </div>
                            </form>
                          </AdminEditModal>
                          {needsSetup && setupUrl ? (
                            <AdminEditModal triggerLabel="Ссылка доступа" title={`Доступ: ${customer.name}`}>
                              <div className="admin-form admin-form--panel">
                                <div className="admin-form__panel-grid">
                                  <div className="admin-form__group">
                                    <label className="admin-form__label">Ссылка активации</label>
                                    <input className="admin-form__field" value={setupUrl} readOnly />
                                  </div>
                                </div>
                                <div className="admin-form__actions">
                                  <a href={setupUrl} target="_blank" rel="noreferrer" className="admin-form__submit">Открыть ссылку</a>
                                </div>
                              </div>
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
            Быстрая регистрация клиента из админки для наличной оплаты и ручных бронирований.
          </p>
        </div>
        <form action={createCustomerAction} className="admin-form admin-form--panel">
          <div className="admin-form__panel-grid">
            <div className="admin-form__group">
              <label className="admin-form__label" htmlFor="client-first-name">Имя</label>
              <input id="client-first-name" name="firstName" className="admin-form__field" required />
            </div>
            <div className="admin-form__group">
              <label className="admin-form__label" htmlFor="client-last-name">Фамилия</label>
              <input id="client-last-name" name="lastName" className="admin-form__field" required />
            </div>
            <div className="admin-form__group">
              <label className="admin-form__label" htmlFor="client-phone">Телефон</label>
              <input id="client-phone" name="phone" className="admin-form__field" required />
            </div>
            <div className="admin-form__group">
              <label className="admin-form__label" htmlFor="client-email">Email</label>
              <input id="client-email" name="email" type="email" className="admin-form__field" required />
            </div>
          </div>
          <div className="admin-form__actions">
            <button type="submit" className="admin-form__submit">Создать клиента</button>
          </div>
        </form>
      </section>
    </AdminPageShell>
  );
}
