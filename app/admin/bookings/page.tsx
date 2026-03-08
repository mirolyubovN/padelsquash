import { revalidatePath } from "next/cache";
import Link from "next/link";
import { AdminPageShell } from "@/src/components/admin/admin-page-shell";
import {
  type AdminBookingSort,
  type AdminBookingStatus,
  ADMIN_BOOKING_STATUS_LABELS,
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

type BookingActionName = "cancelled" | "completed" | "no_show";

function normalizeSearchParams(params: {
  bookingId?: string;
  customerEmail?: string;
  q?: string;
  status?: string;
  sport?: string;
  dateFrom?: string;
  dateTo?: string;
  sort?: string;
  page?: string;
}): {
  bookingId?: string;
  customerEmail?: string;
  q?: string;
  status?: AdminBookingStatus;
  sport?: string;
  dateFrom?: string;
  dateTo?: string;
  sort: AdminBookingSort;
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
  const sort: AdminBookingSort = params.sort === "date_desc" ? "date_desc" : "date_asc";

  return {
    bookingId: params.bookingId?.trim() || undefined,
    customerEmail: params.customerEmail?.trim().toLowerCase() || undefined,
    q: params.q?.trim() || undefined,
    status,
    sport,
    dateFrom: params.dateFrom || undefined,
    dateTo: params.dateTo || undefined,
    sort,
    page,
  };
}

function buildBookingsUrl(filters: {
  bookingId?: string;
  customerEmail?: string;
  q?: string;
  status?: string;
  sport?: string;
  dateFrom?: string;
  dateTo?: string;
  sort?: AdminBookingSort;
  page?: number;
}) {
  const params = new URLSearchParams();
  if (filters.bookingId) params.set("bookingId", filters.bookingId);
  if (filters.customerEmail) params.set("customerEmail", filters.customerEmail);
  if (filters.q) params.set("q", filters.q);
  if (filters.status) params.set("status", filters.status);
  if (filters.sport) params.set("sport", filters.sport);
  if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
  if (filters.dateTo) params.set("dateTo", filters.dateTo);
  if (filters.sort && filters.sort !== "date_asc") params.set("sort", filters.sort);
  if (filters.page && filters.page > 1) params.set("page", String(filters.page));
  const query = params.toString();
  return query ? `/admin/bookings?${query}` : "/admin/bookings";
}

export default async function AdminBookingsPage({
  searchParams,
}: {
  searchParams: Promise<{
    bookingId?: string;
    customerEmail?: string;
    q?: string;
    status?: string;
    sport?: string;
    dateFrom?: string;
    dateTo?: string;
    sort?: string;
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
      bookingId: params.bookingId,
      customerEmail: params.customerEmail,
      q: params.q,
      status: params.status,
      sport: params.sport,
      dateFrom: params.dateFrom,
      dateTo: params.dateTo,
      sort: params.sort,
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

    if (action === "cancelled" || action === "completed" || action === "no_show") {
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
        {params.bookingId ? <input type="hidden" name="bookingId" value={params.bookingId} /> : null}
        {params.customerEmail ? <input type="hidden" name="customerEmail" value={params.customerEmail} /> : null}
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
              placeholder="Имя или телефон"
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
          <div className="admin-form__group">
            <label htmlFor="admin-bookings-sort" className="admin-form__label">
              Сортировка
            </label>
            <select id="admin-bookings-sort" name="sort" className="admin-form__field" defaultValue={params.sort}>
              <option value="date_asc">По дате: ближайшие сначала</option>
              <option value="date_desc">По дате: дальние сначала</option>
            </select>
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
        {params.customerEmail ? <p className="admin-list-toolbar__meta">Клиент: {params.customerEmail}</p> : null}
        <p className="admin-list-toolbar__meta">
          Найдено: {bookings.total}. Страница {bookings.page} из {bookings.totalPages}.
        </p>
        {params.bookingId ? <p className="admin-list-toolbar__meta">Показана бронь: {params.bookingId}</p> : null}
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
              <th className="admin-table__cell admin-table__cell--head">Действия</th>
            </tr>
          </thead>
          <tbody>
            {bookings.rows.length === 0 ? (
              <tr className="admin-table__row">
                <td className="admin-table__cell" colSpan={canSeeRevenue ? 7 : 6}>
                  Бронирований пока нет.
                </td>
              </tr>
            ) : (
              bookings.rows.map((row) => (
                <tr key={row.id} id={`booking-${row.id}`} className="admin-table__row">
                    <td className="admin-table__cell">
                      <div className="admin-bookings__cell-title">
                        <Link href={`/admin/clients/${row.customerId}`}>
                          {row.customerName}
                        </Link>
                      </div>
                      <div className="admin-bookings__cell-sub">
                        <Link href={`/admin/clients/${row.customerId}`}>
                          {row.customerEmail}
                        </Link>
                      </div>
                    <div className="admin-bookings__cell-sub">{row.customerPhone}</div>
                  </td>
                  <td className="admin-table__cell">
                    <div className="admin-bookings__cell-title">{row.serviceName}</div>
                    <div className="admin-bookings__cell-sub">
                      {row.serviceCode} · {row.serviceSportName}
                    </div>
                    {row.courtLabels.length > 0 && (
                      <div className="admin-bookings__cell-sub">Корт: {row.courtLabels.join(", ")}</div>
                    )}
                    {row.instructorLabels.length > 0 && (
                      <div className="admin-bookings__cell-sub">Тренер: {row.instructorLabels.join(", ")}</div>
                    )}
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
                  {canSeeRevenue ? (
                    <td className="admin-table__cell">
                      <div className="admin-bookings__cell-title">{row.amountKzt}</div>
                      {row.pricingBreakdownLines.length > 0 && (
                        <div className="admin-bookings__cell-sub">{row.pricingBreakdownLines[0]}</div>
                      )}
                    </td>
                  ) : null}
                  <td className="admin-table__cell">
                    {row.status === "pending_payment" || row.status === "confirmed" ? (
                      <form action={bookingAction} className="admin-bookings__actions">
                        <input type="hidden" name="bookingId" value={row.id} />
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
                              Неявка
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
          Вперёд
        </Link>
      </div>
    </AdminPageShell>
  );
}
