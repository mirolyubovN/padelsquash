import { revalidatePath } from "next/cache";
import Link from "next/link";
import { AdminPageShell } from "@/src/components/admin/admin-page-shell";
import { AdminBookingsTable } from "@/src/components/admin/admin-bookings-table";
import {
  type AdminBookingSort,
  type AdminBookingStatus,
  ADMIN_BOOKING_STATUS_LABELS,
  bulkSetBookingStatus,
  getAdminBookings,
  markBookingPaid,
  setBookingPaymentState,
  setBookingStatus,
} from "@/src/lib/admin/bookings";
import { rescheduleBooking } from "@/src/lib/bookings/reschedule";
import { logAuditEvent } from "@/src/lib/audit/log";
import { getAdminCourts, getAdminSportOptions } from "@/src/lib/admin/resources";
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

type BookingActionName =
  | "cancelled"
  | "completed"
  | "no_show"
  | "pay_wallet"
  | "pay_manual"
  | "set_status"
  | "set_payment";


function isAdminBookingStatus(value: string): value is AdminBookingStatus {
  return (
    value === "pending_payment" ||
    value === "confirmed" ||
    value === "cancelled" ||
    value === "completed" ||
    value === "no_show"
  );
}

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
  const [bookings, sportOptions, courts] = await Promise.all([
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
    getAdminCourts(),
  ]);
  const courtNamesById = Object.fromEntries(courts.map((court) => [court.id, court.name]));

  async function bookingAction(formData: FormData) {
    "use server";
    const session = await assertAdmin();

    const bookingId = String(formData.get("bookingId") ?? "");
    const action = String(formData.get("action") ?? "") as BookingActionName;
    const nextStatus = String(formData.get("nextStatus") ?? "");
    const nextPaymentState = String(formData.get("nextPaymentState") ?? "");

    if (!bookingId) {
      throw new Error("bookingId обязателен");
    }

    if (action === "cancelled" || action === "completed" || action === "no_show") {
      await setBookingStatus({ bookingId, status: action, actorUserId: session.user.id });
    } else if (action === "set_status") {
      if (!isAdminBookingStatus(nextStatus)) {
        throw new Error("Некорректный статус бронирования");
      }
      await setBookingStatus({ bookingId, status: nextStatus, actorUserId: session.user.id });
    } else if (action === "pay_wallet") {
      await markBookingPaid({ bookingId, method: "wallet", actorUserId: session.user.id });
    } else if (action === "pay_manual") {
      await markBookingPaid({ bookingId, method: "cash", actorUserId: session.user.id });
    } else if (action === "set_payment") {
      if (
        nextPaymentState !== "unpaid_manual" &&
        nextPaymentState !== "paid_manual" &&
        nextPaymentState !== "paid_wallet" &&
        nextPaymentState !== "refunded_manual"
      ) {
        throw new Error("Некорректный статус оплаты");
      }

      await setBookingPaymentState({
        bookingId,
        state: nextPaymentState,
        actorUserId: session.user.id,
      });
    } else {
      throw new Error("Неизвестное действие");
    }

    revalidatePath("/admin/bookings");
    revalidatePath("/admin");
  }

  async function bulkUpdateAction(ids: string[], status: AdminBookingStatus) {
    "use server";
    const session = await assertAdmin();
    const result = await bulkSetBookingStatus({ bookingIds: ids, status, actorUserId: session.user.id });
    revalidatePath("/admin/bookings");
    revalidatePath("/admin");
    return result;
  }

  async function rescheduleAction(args: {
    bookingId: string;
    newDate: string;
    newStartTime: string;
    newCourtId?: string;
  }) {
    "use server";
    const session = await assertAdmin();
    const result = await rescheduleBooking({ ...args, actorUserId: session.user.id });
    await logAuditEvent({
      actorUserId: session.user.id,
      action: "booking.status_change",
      entityType: "booking",
      entityId: args.bookingId,
      detail: { event: "reschedule", newDate: args.newDate, newStartTime: args.newStartTime, priceDiff: result.priceDiff },
    });
    revalidatePath("/admin/bookings");
    revalidatePath("/admin/calendar");
    return result;
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

      <AdminBookingsTable
        rows={bookings.rows}
        courtNamesById={courtNamesById}
        canSeeRevenue={canSeeRevenue}
        bookingAction={bookingAction}
        bulkAction={bulkUpdateAction}
        rescheduleAction={rescheduleAction}
      />

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
