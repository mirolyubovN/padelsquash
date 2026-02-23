import { revalidatePath } from "next/cache";
import { AdminPageShell } from "@/src/components/admin/admin-page-shell";
import {
  confirmPlaceholderPaymentByBookingId,
  getAdminBookings,
  setBookingStatus,
} from "@/src/lib/admin/bookings";
import { assertAdmin } from "@/src/lib/auth/guards";

export const dynamic = "force-dynamic";

type BookingActionName = "cancelled" | "completed" | "no_show" | "confirm_payment";

export default async function AdminBookingsPage() {
  await assertAdmin();
  const bookings = await getAdminBookings(100);

  async function bookingAction(formData: FormData) {
    "use server";
    await assertAdmin();

    const bookingId = String(formData.get("bookingId") ?? "");
    const action = String(formData.get("action") ?? "") as BookingActionName;

    if (!bookingId) {
      throw new Error("bookingId обязателен");
    }

    if (action === "confirm_payment") {
      await confirmPlaceholderPaymentByBookingId(bookingId);
    } else if (action === "cancelled" || action === "completed" || action === "no_show") {
      await setBookingStatus({ bookingId, status: action });
    } else {
      throw new Error("Неизвестное действие");
    }

    revalidatePath("/admin/bookings");
  }

  return (
    <AdminPageShell
      title="Бронирования"
      description="Список броней и админ-действия: отмена, завершение, no_show, подтверждение оплаты."
    >
      <div className="admin-table">
        <table className="admin-table__table">
          <thead>
            <tr className="admin-table__row">
              <th className="admin-table__cell admin-table__cell--head">Клиент</th>
              <th className="admin-table__cell admin-table__cell--head">Услуга</th>
              <th className="admin-table__cell admin-table__cell--head">Дата / время</th>
              <th className="admin-table__cell admin-table__cell--head">Статус</th>
              <th className="admin-table__cell admin-table__cell--head">Оплата</th>
              <th className="admin-table__cell admin-table__cell--head">Сумма</th>
              <th className="admin-table__cell admin-table__cell--head">Действия</th>
            </tr>
          </thead>
          <tbody>
            {bookings.length === 0 ? (
              <tr className="admin-table__row">
                <td className="admin-table__cell" colSpan={7}>
                  Бронирований пока нет.
                </td>
              </tr>
            ) : (
              bookings.map((row) => (
                <tr key={row.id} className="admin-table__row">
                  <td className="admin-table__cell">
                    <div className="admin-bookings__cell-title">{row.customerName}</div>
                    <div className="admin-bookings__cell-sub">{row.customerEmail}</div>
                  </td>
                  <td className="admin-table__cell">
                    <div className="admin-bookings__cell-title">{row.serviceName}</div>
                    <div className="admin-bookings__cell-sub">{row.serviceCode}</div>
                  </td>
                  <td className="admin-table__cell">
                    <div className="admin-bookings__cell-title">{row.date}</div>
                    <div className="admin-bookings__cell-sub">{row.time}</div>
                  </td>
                  <td className="admin-table__cell">
                    <span className="admin-bookings__chip">{row.status}</span>
                  </td>
                  <td className="admin-table__cell">
                    <span className="admin-bookings__chip admin-bookings__chip--muted">
                      {row.paymentStatus}
                    </span>
                  </td>
                  <td className="admin-table__cell">{row.amountKzt}</td>
                  <td className="admin-table__cell">
                    <form action={bookingAction} className="admin-bookings__actions">
                      <input type="hidden" name="bookingId" value={row.id} />
                      <button
                        type="submit"
                        name="action"
                        value="cancelled"
                        className="admin-bookings__action-button"
                      >
                        Отмена
                      </button>
                      <button
                        type="submit"
                        name="action"
                        value="completed"
                        className="admin-bookings__action-button"
                      >
                        Завершено
                      </button>
                      <button
                        type="submit"
                        name="action"
                        value="no_show"
                        className="admin-bookings__action-button"
                      >
                        No show
                      </button>
                      {row.status === "pending_payment" ? (
                        <button
                          type="submit"
                          name="action"
                          value="confirm_payment"
                          className="admin-bookings__action-button admin-bookings__action-button--primary"
                        >
                          Подтвердить оплату
                        </button>
                      ) : null}
                    </form>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </AdminPageShell>
  );
}
