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
import { t } from "@/src/lib/i18n";
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
  if (type === "topup") return t("admin.wallet.transaction.topup");
  if (type === "bonus") return t("admin.wallet.transaction.bonus");
  if (type === "admin_credit") return t("admin.wallet.transaction.adminCredit");
  if (type === "admin_debit") return t("admin.wallet.transaction.adminDebit");
  if (type === "booking_charge") return t("admin.wallet.transaction.bookingCharge");
  if (type === "booking_refund") return t("admin.wallet.transaction.bookingRefund");
  if (type === "event_charge") return t("admin.wallet.transaction.eventCharge");
  if (type === "event_refund") return t("admin.wallet.transaction.eventRefund");
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
    sp.success === "adjusted" ? t("admin.clientProfile.success.adjusted") :
    sp.success === "updated" ? t("admin.clientProfile.success.updated") :
    sp.success === "password_reset" ? t("admin.clientProfile.success.passwordReset") :
    sp.success === "booking_paid_wallet" ? t("admin.clientProfile.success.bookingPaidWallet") :
    sp.success === "booking_paid_manual" ? t("admin.clientProfile.success.bookingPaidManual") :
    sp.success === "booking_cancelled" ? t("admin.clientProfile.success.bookingCancelled") : null;
  const errorMessage =
    sp.error === "adjust_failed" ? t("admin.clientProfile.error.adjustFailed") :
    sp.error === "update_failed" ? t("admin.clientProfile.error.updateFailed") :
    sp.error === "email_taken" ? t("admin.clientProfile.error.emailTaken") :
    sp.error === "password_reset_failed" ? t("admin.clientProfile.error.passwordResetFailed") :
    sp.error === "booking_wallet_insufficient" ? t("admin.clientProfile.error.bookingWalletInsufficient") :
    sp.error === "booking_action_failed" ? t("admin.clientProfile.error.bookingActionFailed") : null;

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
      title={t("admin.clientProfile.title", { name: customer.name })}
      description={t("admin.clientProfile.description")}
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
            <h2 className="admin-section__title">{t("admin.clientProfile.info.title")}</h2>
          </div>
          <div className="admin-form admin-form--panel">
            <div className="admin-form__panel-grid">
              <div className="admin-form__group">
                <label className="admin-form__label">Email</label>
                <input className="admin-form__field" value={customer.email} readOnly />
              </div>
              <div className="admin-form__group">
                <label className="admin-form__label">{t("admin.common.phone")}</label>
                <input className="admin-form__field" value={customer.phone} readOnly />
              </div>
              <div className="admin-form__group">
                <label className="admin-form__label">{t("admin.common.balance")}</label>
                <input className="admin-form__field" value={customer.balanceKzt} readOnly />
              </div>
              <div className="admin-form__group">
                <label className="admin-form__label">{t("admin.clientProfile.info.accountStatus")}</label>
                <input className="admin-form__field" value={customer.needsPasswordSetup ? t("admin.clientProfile.info.noPasswordInactive") : t("admin.common.activated")} readOnly />
              </div>
              <div className="admin-form__group">
                <label className="admin-form__label">{t("admin.clientProfile.info.customerSince")}</label>
                <input className="admin-form__field" value={formatDateTime(customer.createdAtIso)} readOnly />
              </div>
            </div>
            <div className="admin-form__actions">
              <Link href={`/admin/bookings/create?customerEmail=${encodeURIComponent(customer.email)}`} className="admin-bookings__action-button">
                {t("admin.common.createBooking")}
              </Link>
              {setupUrl ? (
                <a href={setupUrl} target="_blank" rel="noreferrer" className="admin-bookings__action-button">
                  {t("admin.common.activationLink")}
                </a>
              ) : null}
            </div>
          </div>
        </section>

        <section className="admin-section">
          <div className="admin-section__head">
            <h2 className="admin-section__title">{t("admin.clientProfile.adjust.title")}</h2>
            <p className="admin-section__description">
              {t("admin.clientProfile.adjust.description")}
            </p>
          </div>
          <form action={adjustBalanceAction} className="admin-form admin-form--panel">
            <div className="admin-form__panel-grid">
              <div className="admin-form__group">
                <label className="admin-form__label" htmlFor="cp-amount">{t("admin.common.amountKzt")}</label>
                <input id="cp-amount" name="amountKzt" type="number" min="1" step="1" className="admin-form__field" required />
              </div>
              <div className="admin-form__group">
                <label className="admin-form__label" htmlFor="cp-direction">{t("admin.common.action")}</label>
                <select id="cp-direction" name="direction" className="admin-form__field" defaultValue="credit">
                  <option value="credit">{t("admin.common.credit")}</option>
                  <option value="debit">{t("admin.common.debit")}</option>
                </select>
              </div>
              <div className="admin-form__group">
                <label className="admin-form__label" htmlFor="cp-note">{t("admin.common.comment")}</label>
                <input id="cp-note" name="note" className="admin-form__field" placeholder={t("admin.common.notePlaceholder")} />
              </div>
            </div>
            <div className="admin-form__actions">
              <button type="submit" className="admin-form__submit">{t("admin.common.runOperation")}</button>
            </div>
          </form>
        </section>

        <section className="admin-section">
          <div className="admin-section__head">
            <h2 className="admin-section__title">{t("admin.clientProfile.contacts.title")}</h2>
          </div>
          <form action={updateContactsAction} className="admin-form admin-form--panel">
            <div className="admin-form__panel-grid">
              <div className="admin-form__group">
                <label className="admin-form__label" htmlFor="cp-email">Email</label>
                <input id="cp-email" name="email" type="email" className="admin-form__field" defaultValue={customer.email} required />
              </div>
              <div className="admin-form__group">
                <label className="admin-form__label" htmlFor="cp-phone">{t("admin.common.phone")}</label>
                <input id="cp-phone" name="phone" className="admin-form__field" defaultValue={customer.phone} required />
              </div>
            </div>
            <div className="admin-form__actions">
              <button type="submit" className="admin-form__submit">{t("admin.common.save")}</button>
            </div>
          </form>
        </section>

        <section className="admin-section">
          <div className="admin-section__head">
            <h2 className="admin-section__title">{t("admin.common.resetPassword")}</h2>
            <p className="admin-section__description">{t("admin.clientProfile.passwordReset.description")}</p>
          </div>
          <form action={resetPasswordAction} className="admin-form admin-form--panel">
            <div className="admin-form__actions">
              <button type="submit" className="admin-bookings__action-button admin-bookings__action-button--danger">
                {t("admin.common.resetPassword")}
              </button>
            </div>
          </form>
        </section>
      </div>

      <div className="admin-list-toolbar">
        <p className="admin-list-toolbar__meta">{t("admin.clientProfile.metrics.total", { count: customer.totalBookings })}</p>
        <p className="admin-list-toolbar__meta">{t("admin.clientProfile.metrics.active", { count: customer.upcomingBookings })}</p>
        <p className="admin-list-toolbar__meta">{t("admin.clientProfile.metrics.completed", { count: customer.completedBookings })}</p>
        <p className="admin-list-toolbar__meta">{t("admin.clientProfile.metrics.cancelled", { count: customer.cancelledBookings })}</p>
      </div>

      <section className="admin-section">
        <div className="admin-section__head">
          <h2 className="admin-section__title">{t("admin.clientProfile.bookings.title")}</h2>
        </div>
        <div className="admin-table">
          <table className="admin-table__table">
            <thead>
              <tr className="admin-table__row">
                <th className="admin-table__cell admin-table__cell--head">{t("admin.clientProfile.bookings.service")}</th>
                <th className="admin-table__cell admin-table__cell--head">{t("admin.common.dateTime")}</th>
                <th className="admin-table__cell admin-table__cell--head">{t("admin.common.status")}</th>
                <th className="admin-table__cell admin-table__cell--head">{t("admin.common.payment")}</th>
                <th className="admin-table__cell admin-table__cell--head">{t("admin.common.amount")}</th>
                <th className="admin-table__cell admin-table__cell--head">{t("admin.common.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {customer.bookings.length === 0 ? (
                <tr className="admin-table__row">
                  <td className="admin-table__cell" colSpan={6}>{t("admin.clientProfile.bookings.empty")}</td>
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
                        <div className="admin-bookings__cell-sub">{t("admin.common.courtList", { courts: booking.courtLabels.join(", ") })}</div>
                      ) : null}
                      {booking.instructorLabels.length > 0 ? (
                        <div className="admin-bookings__cell-sub">{t("admin.common.trainerList", { trainers: booking.instructorLabels.join(", ") })}</div>
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
                              {t("admin.clientProfile.bookings.payWallet")}
                            </button>
                          </form>
                          <form action={bookingAction}>
                            <input type="hidden" name="bookingId" value={booking.id} />
                            <button type="submit" name="action" value="pay_manual" className="admin-bookings__action-button">
                              {t("admin.clientProfile.bookings.payManual")}
                            </button>
                          </form>
                          <AdminConfirmActionForm
                            action={bookingAction}
                            hiddenFields={{ bookingId: booking.id, action: "cancelled" }}
                            triggerLabel={t("admin.common.cancel")}
                            triggerClassName="admin-bookings__action-button admin-bookings__action-button--danger"
                            title={t("admin.clientProfile.bookings.cancelConfirmTitle")}
                            description={t("admin.clientProfile.bookings.cancelConfirmDescription")}
                            confirmLabel={t("admin.clientProfile.bookings.cancelConfirmLabel")}
                          />
                        </div>
                      ) : booking.status === "confirmed" ? (
                        <div className="admin-bookings__actions">
                          <AdminConfirmActionForm
                            action={bookingAction}
                            hiddenFields={{ bookingId: booking.id, action: "cancelled" }}
                            triggerLabel={t("admin.common.cancel")}
                            triggerClassName="admin-bookings__action-button admin-bookings__action-button--danger"
                            title={t("admin.clientProfile.bookings.cancelConfirmTitle")}
                            description={t("admin.clientProfile.bookings.cancelConfirmDescription")}
                            confirmLabel={t("admin.clientProfile.bookings.cancelConfirmLabel")}
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
          <h2 className="admin-section__title">{t("admin.clientProfile.wallet.title")}</h2>
        </div>
        <div className="admin-table">
          <table className="admin-table__table">
            <thead>
              <tr className="admin-table__row">
                <th className="admin-table__cell admin-table__cell--head">{t("admin.common.date")}</th>
                <th className="admin-table__cell admin-table__cell--head">{t("admin.common.type")}</th>
                <th className="admin-table__cell admin-table__cell--head">{t("admin.common.amount")}</th>
                <th className="admin-table__cell admin-table__cell--head">{t("admin.wallet.table.balanceAfter")}</th>
                <th className="admin-table__cell admin-table__cell--head">{t("admin.common.comment")}</th>
              </tr>
            </thead>
            <tbody>
              {customer.walletTransactions.length === 0 ? (
                <tr className="admin-table__row">
                  <td className="admin-table__cell" colSpan={5}>{t("admin.wallet.empty")}</td>
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
