import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminPageShell } from "@/src/components/admin/admin-page-shell";
import { getAdminCustomerProfile } from "@/src/lib/admin/customers";
import { assertAdmin } from "@/src/lib/auth/guards";
import { buildPageMetadata } from "@/src/lib/seo/metadata";

export const metadata = buildPageMetadata({
  title: "Клиент | Админ",
  description: "Карточка клиента: баланс, история бронирований и операции.",
  path: "/admin/clients",
  noIndex: true,
});

export const dynamic = "force-dynamic";

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("ru-KZ");
}

export default async function AdminCustomerPage({
  params,
}: {
  params: Promise<{ customerId: string }>;
}) {
  await assertAdmin();
  const { customerId } = await params;
  const customer = await getAdminCustomerProfile(customerId);

  if (!customer) {
    notFound();
  }

  return (
    <AdminPageShell
      title={`Клиент: ${customer.name}`}
      description="Карточка клиента с балансом, бронированиями и последними операциями по кошельку."
    >
      <section className="admin-section">
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
              <label className="admin-form__label">Клиент с</label>
              <input className="admin-form__field" value={formatDateTime(customer.createdAtIso)} readOnly />
            </div>
          </div>
          <div className="admin-form__actions">
            <Link href={`/admin/bookings/create?customerEmail=${encodeURIComponent(customer.email)}`} className="admin-bookings__action-button">
              Создать бронь
            </Link>
            <Link href={`/admin/wallet?customerEmail=${encodeURIComponent(customer.email)}`} className="admin-bookings__action-button">
              Открыть кошелёк
            </Link>
          </div>
        </div>
      </section>

      <div className="admin-list-toolbar">
        <p className="admin-list-toolbar__meta">Всего бронирований: {customer.totalBookings}</p>
        <p className="admin-list-toolbar__meta">Активных: {customer.upcomingBookings}</p>
        <p className="admin-list-toolbar__meta">Завершённых: {customer.completedBookings}</p>
        <p className="admin-list-toolbar__meta">Отмен: {customer.cancelledBookings}</p>
        <p className="admin-list-toolbar__meta">Неявок: {customer.noShowBookings}</p>
      </div>

      <section className="admin-section">
        <div className="admin-section__head">
          <h2 className="admin-section__title">Бронирования клиента</h2>
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
              </tr>
            </thead>
            <tbody>
              {customer.bookings.length === 0 ? (
                <tr className="admin-table__row">
                  <td className="admin-table__cell" colSpan={5}>
                    У клиента пока нет бронирований.
                  </td>
                </tr>
              ) : (
                customer.bookings.map((booking) => (
                  <tr key={booking.id} className="admin-table__row">
                    <td className="admin-table__cell">
                      <div className="admin-bookings__cell-title">{booking.serviceName}</div>
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
                      <span
                        className={`admin-bookings__chip admin-bookings__chip--payment-${booking.paymentStatus.replaceAll("_", "-")}`}
                      >
                        {booking.paymentStatusLabel}
                      </span>
                    </td>
                    <td className="admin-table__cell">{booking.amountKzt}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="admin-section">
        <div className="admin-section__head">
          <h2 className="admin-section__title">Последние операции по кошельку</h2>
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
                  <td className="admin-table__cell" colSpan={5}>
                    Операций пока нет.
                  </td>
                </tr>
              ) : (
                customer.walletTransactions.map((row) => (
                  <tr key={row.id} className="admin-table__row">
                    <td className="admin-table__cell">{formatDateTime(row.createdAtIso)}</td>
                    <td className="admin-table__cell">{row.type}</td>
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
