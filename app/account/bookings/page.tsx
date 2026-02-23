import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { PageHero } from "@/src/components/page-hero";
import { cancelCustomerBooking, getAccountBookings } from "@/src/lib/account/bookings";
import { requireAuthenticatedUser } from "@/src/lib/auth/guards";
import { getSafeCustomerFreeCancellationHours } from "@/src/lib/bookings/policy";

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
        description={`Список ваших бронирований из БД. Бесплатная отмена доступна не позднее чем за ${freeCancellationHours} часов до начала и только для активных статусов.`}
      />

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
          <div className="admin-table">
            <table className="admin-table__table">
              <thead>
                <tr className="admin-table__row">
                  <th className="admin-table__cell admin-table__cell--head">Услуга</th>
                  <th className="admin-table__cell admin-table__cell--head">Дата / время</th>
                  <th className="admin-table__cell admin-table__cell--head">Статус</th>
                  <th className="admin-table__cell admin-table__cell--head">Оплата</th>
                  <th className="admin-table__cell admin-table__cell--head">Сумма</th>
                  <th className="admin-table__cell admin-table__cell--head">Отмена</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((row) => (
                  <tr key={row.id} className="admin-table__row">
                    <td className="admin-table__cell">
                      <div className="admin-bookings__cell-title">{row.serviceName}</div>
                      <div className="admin-bookings__cell-sub">{row.serviceCode}</div>
                    </td>
                    <td className="admin-table__cell">
                      <div className="admin-bookings__cell-title">{row.date}</div>
                      <div className="admin-bookings__cell-sub">{row.timeRange}</div>
                    </td>
                    <td className="admin-table__cell">
                      <span className="admin-bookings__chip">{row.statusLabel}</span>
                    </td>
                    <td className="admin-table__cell">
                      <span className="admin-bookings__chip admin-bookings__chip--muted">
                        {row.paymentStatusLabel}
                      </span>
                    </td>
                    <td className="admin-table__cell">{row.amountKzt}</td>
                    <td className="admin-table__cell">
                      {row.canCancel ? (
                        <form action={cancelAction} className="admin-bookings__actions">
                          <input type="hidden" name="bookingId" value={row.id} />
                          <button
                            type="submit"
                            className="admin-bookings__action-button admin-bookings__action-button--primary"
                          >
                            Отменить
                          </button>
                        </form>
                      ) : (
                        <div className="account-history__cancel-meta">
                          <div>{row.cancelBlockedReason ?? "Отмена недоступна"}</div>
                          {row.cancellationDeadlineText ? (
                            <div className="admin-bookings__cell-sub">
                              До: {row.cancellationDeadlineText}
                            </div>
                          ) : null}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
