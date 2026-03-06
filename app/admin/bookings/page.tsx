import { revalidatePath } from "next/cache";
import Link from "next/link";
import { AdminPageShell } from "@/src/components/admin/admin-page-shell";
import {
  type AdminBookingStatus,
  ADMIN_BOOKING_STATUS_LABELS,
  ADMIN_PAYMENT_STATUS_LABELS,
  confirmPlaceholderPaymentByBookingId,
  getAdminBookings,
  setBookingStatus,
} from "@/src/lib/admin/bookings";
import { getAdminSportOptions } from "@/src/lib/admin/resources";
import { assertAdmin } from "@/src/lib/auth/guards";
import { canViewRevenue } from "@/src/lib/auth/roles";
import { buildPageMetadata } from "@/src/lib/seo/metadata";

export const metadata = buildPageMetadata({
  title: "Админ: бронирования | Padel & Squash KZ",
  description: "Управление бронированиями клуба: фильтры, поиск, статусы, детали оплаты и изменение статуса записи.",
  path: "/admin/bookings",
  noIndex: true,
});

export const dynamic = "force-dynamic";

type BookingActionName = "cancelled" | "completed" | "no_show" | "confirm_payment";

function normalizeSearchParams(params: {
  q?: string;
  status?: string;
  sport?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: string;
}): {
  q?: string;
  status?: AdminBookingStatus;
  sport?: string;
  dateFrom?: string;
  dateTo?: string;
  page: number;
} {
  const pageRaw = Number(params.page ?? "1");
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? Math.floor(pageRaw) : 1;
  const status =
    params.status === "pending_payment" ||
    params.status === "confirmed" ||
    params.status === "cancelled" ||
    params.status === "completed" ||
    params.status === "no_show"
      ? params.status
      : undefined;
  const sport = params.sport?.trim() || undefined;

  return {
    q: params.q?.trim() || undefined,
    status,
    sport,
    dateFrom: params.dateFrom || undefined,
    dateTo: params.dateTo || undefined,
    page,
  };
}

function buildBookingsUrl(filters: {
  q?: string;
  status?: string;
  sport?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
}) {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.status) params.set("status", filters.status);
  if (filters.sport) params.set("sport", filters.sport);
  if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
  if (filters.dateTo) params.set("dateTo", filters.dateTo);
  if (filters.page && filters.page > 1) params.set("page", String(filters.page));
  const query = params.toString();
  return query ? `/admin/bookings?${query}` : "/admin/bookings";
}

export default async function AdminBookingsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    status?: string;
    sport?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: string;
  }>;
}) {
  const session = await assertAdmin();
  const canSeeRevenue = canViewRevenue(session.user.role);
  const params = normalizeSearchParams(await searchParams);
  const [bookings, sportOptions] = await Promise.all([
    getAdminBookings({
      page: params.page,
      pageSize: 20,
      q: params.q,
      status: params.status,
      sport: params.sport,
      dateFrom: params.dateFrom,
      dateTo: params.dateTo,
    }),
    getAdminSportOptions(),
  ]);

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
      description={
        canSeeRevenue
          ? "Поиск, фильтры, пагинация и действия по бронированиям с деталями клиентов, ресурсов и цены."
          : "Поиск, фильтры, пагинация и действия по бронированиям."
      }
    >
      <form method="get" className="admin-filters">
        <div className="admin-filters__grid">
          <div className="admin-form__group">
            <label htmlFor="admin-bookings-q" className="admin-form__label">
              Поиск (клиент)
            </label>
            <input
              id="admin-bookings-q"
              name="q"
              className="admin-form__field"
              defaultValue={params.q ?? ""}
              placeholder="Имя или email"
            />
          </div>
          <div className="admin-form__group">
            <label htmlFor="admin-bookings-status" className="admin-form__label">
              Статус брони
            </label>
            <select
              id="admin-bookings-status"
              name="status"
              className="admin-form__field"
              defaultValue={params.status ?? ""}
            >
              <option value="">Все</option>
              {Object.entries(ADMIN_BOOKING_STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div className="admin-form__group">
            <label htmlFor="admin-bookings-sport" className="admin-form__label">
              Спорт
            </label>
            <select
              id="admin-bookings-sport"
              name="sport"
              className="admin-form__field"
              defaultValue={params.sport ?? ""}
            >
              <option value="">Все</option>
              {sportOptions.map((sport) => (
                <option key={sport.id} value={sport.slug}>
                  {sport.name}
                </option>
              ))}
            </select>
          </div>
          <div className="admin-form__group">
            <label htmlFor="admin-bookings-date-from" className="admin-form__label">
              С даты
            </label>
            <input
              id="admin-bookings-date-from"
              name="dateFrom"
              type="date"
              className="admin-form__field"
              defaultValue={params.dateFrom ?? ""}
            />
          </div>
          <div className="admin-form__group">
            <label htmlFor="admin-bookings-date-to" className="admin-form__label">
              По дату
            </label>
            <input
              id="admin-bookings-date-to"
              name="dateTo"
              type="date"
              className="admin-form__field"
              defaultValue={params.dateTo ?? ""}
            />
          </div>
        </div>
        <div className="admin-filters__actions">
          <button type="submit" className="admin-form__submit">
            Применить
          </button>
          <Link href="/admin/bookings" className="admin-bookings__action-button">
            Сбросить
          </Link>
        </div>
      </form>

      <div className="admin-list-toolbar">
        <p className="admin-list-toolbar__meta">
          Найдено: {bookings.total}. Страница {bookings.page} из {bookings.totalPages}.
        </p>
      </div>

      <div className="admin-table">
        <table className="admin-table__table">
          <thead>
            <tr className="admin-table__row">
              <th className="admin-table__cell admin-table__cell--head">Клиент</th>
              <th className="admin-table__cell admin-table__cell--head">Услуга</th>
              <th className="admin-table__cell admin-table__cell--head">Дата / время</th>
              <th className="admin-table__cell admin-table__cell--head">Статус</th>
              <th className="admin-table__cell admin-table__cell--head">Оплата</th>
              {canSeeRevenue ? <th className="admin-table__cell admin-table__cell--head">Сумма</th> : null}
              <th className="admin-table__cell admin-table__cell--head">Детали</th>
              <th className="admin-table__cell admin-table__cell--head">Действия</th>
            </tr>
          </thead>
          <tbody>
            {bookings.rows.length === 0 ? (
              <tr className="admin-table__row">
                <td className="admin-table__cell" colSpan={canSeeRevenue ? 8 : 7}>
                  Бронирований пока нет.
                </td>
              </tr>
            ) : (
              bookings.rows.map((row) => (
                <tr key={row.id} className="admin-table__row">
                  <td className="admin-table__cell">
                    <div className="admin-bookings__cell-title">{row.customerName}</div>
                    <div className="admin-bookings__cell-sub">{row.customerEmail}</div>
                    <div className="admin-bookings__cell-sub">{row.customerPhone}</div>
                  </td>
                  <td className="admin-table__cell">
                    <div className="admin-bookings__cell-title">{row.serviceName}</div>
                    <div className="admin-bookings__cell-sub">
                      {row.serviceCode} · {row.serviceSportName}
                    </div>
                  </td>
                  <td className="admin-table__cell">
                    <div className="admin-bookings__cell-title">{row.date}</div>
                    <div className="admin-bookings__cell-sub">{row.time}</div>
                  </td>
                  <td className="admin-table__cell">
                    <span className={`admin-bookings__chip admin-bookings__chip--status-${row.status.replaceAll("_", "-")}`}>
                      {row.statusLabel}
                    </span>
                  </td>
                  <td className="admin-table__cell">
                    <span
                      className={`admin-bookings__chip admin-bookings__chip--payment-${row.paymentStatus.replaceAll("_", "-")}`}
                    >
                      {row.paymentStatusLabel}
                    </span>
                  </td>
                  {canSeeRevenue ? <td className="admin-table__cell">{row.amountKzt}</td> : null}
                  <td className="admin-table__cell">
                    <details className="admin-bookings__details">
                      <summary className="admin-bookings__details-summary">Показать</summary>
                      <div className="admin-bookings__details-body">
                        <div className="admin-bookings__details-row">
                          <span>Корт</span>
                          <span>{row.courtLabels.length > 0 ? row.courtLabels.join(", ") : "—"}</span>
                        </div>
                        <div className="admin-bookings__details-row">
                          <span>Тренер</span>
                          <span>{row.instructorLabels.length > 0 ? row.instructorLabels.join(", ") : "—"}</span>
                        </div>
                        <div className="admin-bookings__details-row">
                          <span>Оплата</span>
                          <span>{ADMIN_PAYMENT_STATUS_LABELS[row.paymentStatus]} · {row.paymentProvider}</span>
                        </div>
                        {canSeeRevenue && row.pricingBreakdownLines.length > 0 ? (
                          <div className="admin-bookings__details-breakdown">
                            {row.pricingBreakdownLines.map((line) => (
                              <div key={`${row.id}-${line}`} className="admin-bookings__cell-sub">
                                {line}
                              </div>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    </details>
                  </td>
                  <td className="admin-table__cell">
                    {row.status === "pending_payment" || row.status === "confirmed" ? (
                      <form action={bookingAction} className="admin-bookings__actions">
                        <input type="hidden" name="bookingId" value={row.id} />
                        {row.status === "pending_payment" ? (
                          <button
                            type="submit"
                            name="action"
                            value="confirm_payment"
                            className="admin-bookings__action-button admin-bookings__action-button--primary"
                          >
                            Принять оплату
                          </button>
                        ) : null}
                        {row.status === "confirmed" ? (
                          <>
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
                          </>
                        ) : null}
                        <button
                          type="submit"
                          name="action"
                          value="cancelled"
                          className="admin-bookings__action-button admin-bookings__action-button--danger"
                        >
                          Отменить
                        </button>
                      </form>
                    ) : (
                      <span className="admin-bookings__no-actions">—</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="admin-pagination">
        <Link
          href={buildBookingsUrl({ ...params, page: Math.max(1, bookings.page - 1) })}
          className={`admin-pagination__link${bookings.page <= 1 ? " admin-pagination__link--disabled" : ""}`}
          aria-disabled={bookings.page <= 1}
        >
          Назад
        </Link>
        <span className="admin-pagination__meta">
          Страница {bookings.page} / {bookings.totalPages}
        </span>
        <Link
          href={buildBookingsUrl({ ...params, page: Math.min(bookings.totalPages, bookings.page + 1) })}
          className={`admin-pagination__link${bookings.page >= bookings.totalPages ? " admin-pagination__link--disabled" : ""}`}
          aria-disabled={bookings.page >= bookings.totalPages}
        >
          Вперед
        </Link>
      </div>
    </AdminPageShell>
  );
}
