import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { PageHero } from "@/src/components/page-hero";
import { AccountCancelBookingForm } from "@/src/components/account/account-cancel-booking-form";
import { AccountTabs } from "@/src/components/account/account-tabs";
import { cancelCustomerBooking, getAccountBookings } from "@/src/lib/account/bookings";
import { requireAuthenticatedUser } from "@/src/lib/auth/guards";
import { getSafeCustomerFreeCancellationHours } from "@/src/lib/bookings/policy";
import { buildPageMetadata } from "@/src/lib/seo/metadata";

export const metadata = buildPageMetadata({
  title: "Мои бронирования | Padel & Squash KZ",
  description: "Список предстоящих и прошедших бронирований клиента со статусами оплаты и возможностью отмены.",
  path: "/account/bookings",
  noIndex: true,
});

export const dynamic = "force-dynamic";

export default async function AccountBookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const freeCancellationHours = getSafeCustomerFreeCancellationHours();
  const session = await requireAuthenticatedUser("/account/bookings");
  const params = await searchParams;
  const bookings = await getAccountBookings(session.user.id, 100);
  const now = new Date();

  const upcomingBookings = bookings.filter((row) => new Date(row.startAtIso) >= now);
  const pastBookings = bookings.filter((row) => new Date(row.startAtIso) < now);

  const errorMessage =
    params.error === "cancel_not_allowed"
      ? `Отмена недоступна: правило ${freeCancellationHours} часов или текущий статус брони.`
      : params.error === "cancel_failed"
        ? "Не удалось отменить бронирование."
        : null;

  const successMessage =
    params.success === "cancelled" ? "Бронирование отменено." : null;

  async function cancelAction(formData: FormData) {
    "use server";
    const actionSession = await requireAuthenticatedUser("/account/bookings");
    const bookingId = String(formData.get("bookingId") ?? "");

    if (!bookingId) {
      redirect("/account/bookings?error=cancel_failed");
    }

    let errorCode: "cancel_not_allowed" | "cancel_failed" | null = null;
    try {
      await cancelCustomerBooking({
        userId: actionSession.user.id,
        bookingId,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (message.includes("час") || message.includes("нельзя") || message.includes("already")) {
        errorCode = "cancel_not_allowed";
      } else {
        errorCode = "cancel_failed";
      }
    }

    if (errorCode) {
      redirect(`/account/bookings?error=${errorCode}`);
    }

    revalidatePath("/account");
    revalidatePath("/account/bookings");
    revalidatePath("/admin/bookings");
    redirect("/account/bookings?success=cancelled");
  }

  return (
    <div className="account-page">
      <PageHero
        eyebrow="Личный кабинет"
        title="История бронирований"
        description={`История ваших бронирований и статусов. Бесплатная отмена доступна не позднее чем за ${freeCancellationHours} часов до начала и только для активных статусов.`}
      />

      <AccountTabs active="bookings" />

      <section className="account-history">
        {errorMessage ? (
          <p className="account-history__message account-history__message--error" role="alert">
            {errorMessage}
          </p>
        ) : null}
        {successMessage ? (
          <p className="account-history__message account-history__message--success">{successMessage}</p>
        ) : null}

        {bookings.length === 0 ? (
          <div className="account-history__empty">
            Бронирований пока нет. После создания брони с вашим email и входа в аккаунт записи появятся здесь.
          </div>
        ) : (
          <>
            {[
              { key: "upcoming", title: "Предстоящие", rows: upcomingBookings },
              { key: "past", title: "Прошедшие и архив", rows: pastBookings },
            ].map((section) =>
              section.rows.length > 0 ? (
                <div key={section.key} className="account-history__section">
                  <div className="account-history__section-head">
                    <h2 className="account-history__section-title">{section.title}</h2>
                    <span className="account-history__section-count">{section.rows.length}</span>
                  </div>

                  <div className="account-history__card-list">
                    {section.rows.map((row) => (
                      <article key={row.id} className="account-history__card">
                        <div className="account-history__card-head">
                          <div>
                            <p className="account-history__card-title">{row.serviceName}</p>
                            <p className="account-history__card-sub">{row.serviceCode}</p>
                          </div>
                          <p className="account-history__card-price">{row.amountKzt}</p>
                        </div>

                        <div className="account-history__card-grid">
                          <div className="account-history__card-item">
                            <span className="account-history__card-label">Дата</span>
                            <span className="account-history__card-value">{row.date}</span>
                          </div>
                          <div className="account-history__card-item">
                            <span className="account-history__card-label">Время</span>
                            <span className="account-history__card-value">{row.timeRange}</span>
                          </div>
                          <div className="account-history__card-item">
                            <span className="account-history__card-label">Статус</span>
                            <span
                              className={`account-history__badge account-history__badge--status-${row.status.replaceAll("_", "-")}`}
                            >
                              {row.statusLabel}
                            </span>
                          </div>
                          <div className="account-history__card-item">
                            <span className="account-history__card-label">Оплата</span>
                            <span
                              className={`account-history__badge account-history__badge--payment-${row.paymentStatus.replaceAll("_", "-")}`}
                            >
                              {row.paymentStatusLabel}
                            </span>
                          </div>
                        </div>

                        <div className="account-history__card-actions">
                          {row.canCancel ? (
                            <AccountCancelBookingForm
                              bookingId={row.id}
                              cancellationDeadlineText={row.cancellationDeadlineText}
                              action={cancelAction}
                            />
                          ) : (
                            <div className="account-history__cancel-meta">
                              <div>{row.cancelBlockedReason ?? "Отмена недоступна"}</div>
                              {row.cancellationDeadlineText ? (
                                <div className="admin-bookings__cell-sub">До: {row.cancellationDeadlineText}</div>
                              ) : null}
                            </div>
                          )}
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              ) : null,
            )}
          </>
        )}
      </section>
    </div>
  );
}
