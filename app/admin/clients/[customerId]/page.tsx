import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { randomUUID } from "node:crypto";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminPageShell } from "@/src/components/admin/admin-page-shell";
import { AdminConfirmActionForm } from "@/src/components/admin/admin-confirm-action-form";
import { getAdminCustomerProfile } from "@/src/lib/admin/customers";
import { markBookingPaid, setBookingStatus } from "@/src/lib/admin/bookings";
import { assertAdmin } from "@/src/lib/auth/guards";
import { buildAccountSetupPath, createAccountSetupToken } from "@/src/lib/auth/account-setup";
import { siteConfig } from "@/src/lib/content/site-data";
import { prisma } from "@/src/lib/prisma";
import { adjustUserWalletByEmail } from "@/src/lib/wallet/service";
import { buildPageMetadata } from "@/src/lib/seo/metadata";

export const metadata = buildPageMetadata({
  title: "Клиент | Админ",
  description: "Карточка клиента: баланс, история бронирований и управление аккаунтом.",
  path: "/admin/clients",
  noIndex: true,
});

export const dynamic = "force-dynamic";

type CustomerBookingActionName = "pay_wallet" | "pay_manual" | "cancelled";

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("ru-KZ");
}

function getRequestOrigin(headerStore: Headers): string {
  const host = headerStore.get("x-forwarded-host") ?? headerStore.get("host");
  if (!host) return siteConfig.siteUrl;
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

export default async function AdminCustomerPage({
  params,
  searchParams,
}: {
  params: Promise<{ customerId: string }>;
  searchParams: Promise<{ success?: string; error?: string }>;
}) {
  await assertAdmin();
  const { customerId } = await params;
  const sp = await searchParams;
  const [customer, headerStore] = await Promise.all([
    getAdminCustomerProfile(customerId),
    headers(),
  ]);

  if (!customer) notFound();

  const requestOrigin = getRequestOrigin(headerStore);
  const setupUrl = customer.needsPasswordSetup
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

  const successMessage =
    sp.success === "adjusted" ? "Баланс обновлен." :
    sp.success === "updated" ? "Данные клиента сохранены." :
    sp.success === "password_reset" ? "Пароль сброшен." :
    sp.success === "booking_paid_wallet" ? "Бронь оплачена с баланса клиента." :
    sp.success === "booking_paid_manual" ? "Бронь отмечена как оплаченная вручную (нал/карта)." :
    sp.success === "booking_cancelled" ? "Бронь отменена." : null;
  const errorMessage =
    sp.error === "adjust_failed" ? "Не удалось обновить баланс." :
    sp.error === "update_failed" ? "Не удалось обновить данные." :
    sp.error === "email_taken" ? "Этот email уже используется." :
    sp.error === "password_reset_failed" ? "Не удалось сбросить пароль." :
    sp.error === "booking_wallet_insufficient" ? "Недостаточно средств на балансе клиента для оплаты этой брони." :
    sp.error === "booking_action_failed" ? "Не удалось выполнить действие по брони." : null;

  async function adjustBalanceAction(formData: FormData) {
    "use server";
    const actionSession = await assertAdmin();
    const amountKzt = Number(formData.get("amountKzt") ?? 0);
    const direction = String(formData.get("direction") ?? "credit");
    const note = String(formData.get("note") ?? "").trim() || undefined;
    try {
      await adjustUserWalletByEmail({
        customerEmail: customer!.email,
        amountKzt,
        direction: direction === "debit" ? "debit" : "credit",
        actorUserId: actionSession.user.id,
        note,
      });
    } catch {
      redirect(`/admin/clients/${customerId}?error=adjust_failed`);
    }
    revalidatePath(`/admin/clients/${customerId}`);
    revalidatePath("/account");
    redirect(`/admin/clients/${customerId}?success=adjusted`);
  }

  async function updateContactsAction(formData: FormData) {
    "use server";
    await assertAdmin();
    const nextEmail = String(formData.get("email") ?? "").trim().toLowerCase();
    const nextPhone = String(formData.get("phone") ?? "").trim();
    if (!nextEmail || !nextPhone || !nextEmail.includes("@")) {
      redirect(`/admin/clients/${customerId}?error=update_failed`);
    }
    const emailOwner = await prisma.user.findUnique({ where: { email: nextEmail }, select: { id: true } }).catch(() => null);
    if (emailOwner && emailOwner.id !== customerId) {
      redirect(`/admin/clients/${customerId}?error=email_taken`);
    }
    try {
      await prisma.user.update({
        where: { id: customerId },
        data: { email: nextEmail, phone: nextPhone, emailVerifiedAt: new Date(), phoneVerifiedAt: new Date() },
      });
    } catch {
      redirect(`/admin/clients/${customerId}?error=update_failed`);
    }
    revalidatePath(`/admin/clients/${customerId}`);
    redirect(`/admin/clients/${customerId}?success=updated`);
  }

  async function resetPasswordAction() {
    "use server";
    await assertAdmin();
    try {
      await prisma.user.update({ where: { id: customerId }, data: { passwordHash: `admin-reset-${randomUUID()}` } });
    } catch {
      redirect(`/admin/clients/${customerId}?error=password_reset_failed`);
    }
    revalidatePath(`/admin/clients/${customerId}`);
    redirect(`/admin/clients/${customerId}?success=password_reset`);
  }

  async function bookingAction(formData: FormData) {
    "use server";
    const actionSession = await assertAdmin();
    const bookingId = String(formData.get("bookingId") ?? "");
    const action = String(formData.get("action") ?? "") as CustomerBookingActionName;

    if (!bookingId || (action !== "pay_wallet" && action !== "pay_manual" && action !== "cancelled")) {
      redirect(`/admin/clients/${customerId}?error=booking_action_failed`);
    }

    const booking = await prisma.booking.findFirst({
      where: {
        id: bookingId,
        customerId,
      },
      select: {
        id: true,
      },
    });

    if (!booking) {
      redirect(`/admin/clients/${customerId}?error=booking_action_failed`);
    }

    try {
      if (action === "pay_wallet") {
        await markBookingPaid({ bookingId, method: "wallet" });
      } else if (action === "pay_manual") {
        await markBookingPaid({ bookingId, method: "cash" });
      } else {
        await setBookingStatus({
          bookingId,
          status: "cancelled",
          actorUserId: actionSession.user.id,
        });
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes("Недостаточно средств")) {
        redirect(`/admin/clients/${customerId}?error=booking_wallet_insufficient`);
      }
      redirect(`/admin/clients/${customerId}?error=booking_action_failed`);
    }

    revalidatePath(`/admin/clients/${customerId}`);
    revalidatePath("/admin/clients");
    revalidatePath("/admin/bookings");
    revalidatePath("/admin");
    revalidatePath("/account");
    revalidatePath("/account/bookings");

    if (action === "pay_wallet") {
      redirect(`/admin/clients/${customerId}?success=booking_paid_wallet`);
    }

    if (action === "pay_manual") {
      redirect(`/admin/clients/${customerId}?success=booking_paid_manual`);
    }

    redirect(`/admin/clients/${customerId}?success=booking_cancelled`);
  }

  return (
    <AdminPageShell
      title={`Клиент: ${customer.name}`}
      description="Карточка клиента с балансом, бронированиями и управлением аккаунтом."
    >
      {errorMessage ? (
        <p className="account-history__message account-history__message--error" role="alert">{errorMessage}</p>
      ) : null}
      {successMessage ? (
        <p className="account-history__message account-history__message--success" role="status">{successMessage}</p>
      ) : null}

      <div className="admin-client-profile">
        <section className="admin-section">
          <div className="admin-section__head">
            <h2 className="admin-section__title">Информация</h2>
          </div>
          <div className="admin-form admin-form--panel">
            <div className="admin-form__panel-grid">
              <div className="admin-form__group">
                <label className="admin-form__label">Email</label>
                <input className="admin-form__field" value={customer.email} readOnly />
              </div>
              <div className="admin-form__group">
                <label className="admin-form__label">Телефон</label>
                <input className="admin-form__field" value={customer.phone} readOnly />
              </div>
              <div className="admin-form__group">
                <label className="admin-form__label">Баланс</label>
                <input className="admin-form__field" value={customer.balanceKzt} readOnly />
              </div>
              <div className="admin-form__group">
                <label className="admin-form__label">Статус аккаунта</label>
                <input className="admin-form__field" value={customer.needsPasswordSetup ? "Нет пароля (не активирован)" : "Активирован"} readOnly />
              </div>
              <div className="admin-form__group">
                <label className="admin-form__label">Клиент с</label>
                <input className="admin-form__field" value={formatDateTime(customer.createdAtIso)} readOnly />
              </div>
            </div>
            <div className="admin-form__actions">
              <Link href={`/admin/bookings/create?customerEmail=${encodeURIComponent(customer.email)}`} className="admin-bookings__action-button">
                Создать бронь
              </Link>
              {setupUrl ? (
                <a href={setupUrl} target="_blank" rel="noreferrer" className="admin-bookings__action-button">
                  Ссылка активации
                </a>
              ) : null}
            </div>
          </div>
        </section>

        <section className="admin-section">
          <div className="admin-section__head">
            <h2 className="admin-section__title">Ручная корректировка баланса</h2>
            <p className="admin-section__description">
              Используйте только для внесения или списания денег вне конкретной брони. Для оплаты брони с баланса
              применяйте кнопки в таблице бронирований ниже, чтобы отмена вернула средства автоматически.
            </p>
          </div>
          <form action={adjustBalanceAction} className="admin-form admin-form--panel">
            <div className="admin-form__panel-grid">
              <div className="admin-form__group">
                <label className="admin-form__label" htmlFor="cp-amount">Сумма, KZT</label>
                <input id="cp-amount" name="amountKzt" type="number" min="1" step="1" className="admin-form__field" required />
              </div>
              <div className="admin-form__group">
                <label className="admin-form__label" htmlFor="cp-direction">Действие</label>
                <select id="cp-direction" name="direction" className="admin-form__field" defaultValue="credit">
                  <option value="credit">Начислить</option>
                  <option value="debit">Списать</option>
                </select>
              </div>
              <div className="admin-form__group">
                <label className="admin-form__label" htmlFor="cp-note">Комментарий</label>
                <input id="cp-note" name="note" className="admin-form__field" placeholder="Например: оплата в клубе" />
              </div>
            </div>
            <div className="admin-form__actions">
              <button type="submit" className="admin-form__submit">Провести операцию</button>
            </div>
          </form>
        </section>

        <section className="admin-section">
          <div className="admin-section__head">
            <h2 className="admin-section__title">Изменить контакты</h2>
          </div>
          <form action={updateContactsAction} className="admin-form admin-form--panel">
            <div className="admin-form__panel-grid">
              <div className="admin-form__group">
                <label className="admin-form__label" htmlFor="cp-email">Email</label>
                <input id="cp-email" name="email" type="email" className="admin-form__field" defaultValue={customer.email} required />
              </div>
              <div className="admin-form__group">
                <label className="admin-form__label" htmlFor="cp-phone">Телефон</label>
                <input id="cp-phone" name="phone" className="admin-form__field" defaultValue={customer.phone} required />
              </div>
            </div>
            <div className="admin-form__actions">
              <button type="submit" className="admin-form__submit">Сохранить</button>
            </div>
          </form>
        </section>

        <section className="admin-section">
          <div className="admin-section__head">
            <h2 className="admin-section__title">Сброс пароля</h2>
            <p className="admin-section__description">Отключает текущий пароль. После сброса появится новая ссылка активации.</p>
          </div>
          <form action={resetPasswordAction} className="admin-form admin-form--panel">
            <div className="admin-form__actions">
              <button type="submit" className="admin-bookings__action-button admin-bookings__action-button--danger">
                Сбросить пароль
              </button>
            </div>
          </form>
        </section>
      </div>

      <div className="admin-list-toolbar">
        <p className="admin-list-toolbar__meta">Всего: {customer.totalBookings}</p>
        <p className="admin-list-toolbar__meta">Активных: {customer.upcomingBookings}</p>
        <p className="admin-list-toolbar__meta">Завершённых: {customer.completedBookings}</p>
        <p className="admin-list-toolbar__meta">Отмен: {customer.cancelledBookings}</p>
        <p className="admin-list-toolbar__meta">Неявок: {customer.noShowBookings}</p>
      </div>

      <section className="admin-section">
        <div className="admin-section__head">
          <h2 className="admin-section__title">Бронирования</h2>
        </div>
        <div className="admin-table">
          <table className="admin-table__table">
            <thead>
              <tr className="admin-table__row">
                <th className="admin-table__cell admin-table__cell--head">Услуга</th>
                <th className="admin-table__cell admin-table__cell--head">Дата / время</th>
                <th className="admin-table__cell admin-table__cell--head">Статус</th>
                <th className="admin-table__cell admin-table__cell--head">Оплата</th>
                <th className="admin-table__cell admin-table__cell--head">Сумма</th>
                <th className="admin-table__cell admin-table__cell--head">Действия</th>
              </tr>
            </thead>
            <tbody>
              {customer.bookings.length === 0 ? (
                <tr className="admin-table__row">
                  <td className="admin-table__cell" colSpan={6}>У клиента пока нет бронирований.</td>
                </tr>
              ) : (
                customer.bookings.map((booking) => (
                  <tr key={booking.id} className="admin-table__row">
                    <td className="admin-table__cell">
                      <div className="admin-bookings__cell-title">
                        <Link href={`/admin/bookings?bookingId=${booking.id}`}>{booking.serviceName}</Link>
                      </div>
                      <div className="admin-bookings__cell-sub">{booking.sportName}</div>
                      {booking.courtLabels.length > 0 ? (
                        <div className="admin-bookings__cell-sub">Корт: {booking.courtLabels.join(", ")}</div>
                      ) : null}
                      {booking.instructorLabels.length > 0 ? (
                        <div className="admin-bookings__cell-sub">Тренер: {booking.instructorLabels.join(", ")}</div>
                      ) : null}
                    </td>
                    <td className="admin-table__cell">
                      <div className="admin-bookings__cell-title">{booking.date}</div>
                      <div className="admin-bookings__cell-sub">{booking.time}</div>
                    </td>
                    <td className="admin-table__cell">
                      <span className={`admin-bookings__chip admin-bookings__chip--status-${booking.status.replaceAll("_", "-")}`}>
                        {booking.statusLabel}
                      </span>
                    </td>
                    <td className="admin-table__cell">
                      <span className={`admin-bookings__chip admin-bookings__chip--payment-${booking.paymentStatus.replaceAll("_", "-")}`}>
                        {booking.paymentStatusLabel}
                      </span>
                    </td>
                    <td className="admin-table__cell">{booking.amountKzt}</td>
                    <td className="admin-table__cell">
                      {booking.status === "pending_payment" ? (
                        <div className="admin-bookings__actions">
                          <form action={bookingAction}>
                            <input type="hidden" name="bookingId" value={booking.id} />
                            <button type="submit" name="action" value="pay_wallet" className="admin-bookings__action-button">
                              Списать с баланса
                            </button>
                          </form>
                          <form action={bookingAction}>
                            <input type="hidden" name="bookingId" value={booking.id} />
                            <button type="submit" name="action" value="pay_manual" className="admin-bookings__action-button">
                              Оплачено вручную (нал/карта)
                            </button>
                          </form>
                          <AdminConfirmActionForm
                            action={bookingAction}
                            hiddenFields={{ bookingId: booking.id, action: "cancelled" }}
                            triggerLabel="Отменить"
                            triggerClassName="admin-bookings__action-button admin-bookings__action-button--danger"
                            title="Подтвердите отмену"
                            description="Бронирование будет отменено. Если оплата была с баланса через кнопки брони, средства вернутся клиенту."
                            confirmLabel="Да, отменить"
                          />
                        </div>
                      ) : booking.status === "confirmed" ? (
                        <div className="admin-bookings__actions">
                          <AdminConfirmActionForm
                            action={bookingAction}
                            hiddenFields={{ bookingId: booking.id, action: "cancelled" }}
                            triggerLabel="Отменить"
                            triggerClassName="admin-bookings__action-button admin-bookings__action-button--danger"
                            title="Подтвердите отмену"
                            description="Бронирование будет отменено. Если оплата была с баланса через кнопки брони, средства вернутся клиенту."
                            confirmLabel="Да, отменить"
                          />
                        </div>
                      ) : (
                        <span className="admin-bookings__cell-sub">—</span>
                      )}
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
          <h2 className="admin-section__title">Операции по кошельку</h2>
        </div>
        <div className="admin-table">
          <table className="admin-table__table">
            <thead>
              <tr className="admin-table__row">
                <th className="admin-table__cell admin-table__cell--head">Дата</th>
                <th className="admin-table__cell admin-table__cell--head">Тип</th>
                <th className="admin-table__cell admin-table__cell--head">Сумма</th>
                <th className="admin-table__cell admin-table__cell--head">Баланс после</th>
                <th className="admin-table__cell admin-table__cell--head">Комментарий</th>
              </tr>
            </thead>
            <tbody>
              {customer.walletTransactions.length === 0 ? (
                <tr className="admin-table__row">
                  <td className="admin-table__cell" colSpan={5}>Операций пока нет.</td>
                </tr>
              ) : (
                customer.walletTransactions.map((row) => (
                  <tr key={row.id} className="admin-table__row">
                    <td className="admin-table__cell">{formatDateTime(row.createdAtIso)}</td>
                    <td className="admin-table__cell">{getWalletTypeLabel(row.type)}</td>
                    <td className="admin-table__cell">{row.amountKzt}</td>
                    <td className="admin-table__cell">{row.balanceAfterKzt}</td>
                    <td className="admin-table__cell">{row.note}</td>
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
