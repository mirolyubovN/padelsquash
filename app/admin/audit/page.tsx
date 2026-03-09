import Link from "next/link";
import { AdminPageShell } from "@/src/components/admin/admin-page-shell";
import { assertAdmin } from "@/src/lib/auth/guards";
import { prisma } from "@/src/lib/prisma";
import { buildPageMetadata } from "@/src/lib/seo/metadata";

export const metadata = buildPageMetadata({
  title: "Журнал действий | Padel & Squash KZ",
  description: "Аудит-лог административных действий: отмены, изменения статусов, удаления ресурсов и корректировки кошелька.",
  path: "/admin/audit",
  noIndex: true,
});

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

const ACTION_LABELS: Record<string, string> = {
  "booking.cancel": "Отмена бронирования",
  "booking.status_change": "Изменение статуса брони",
  "booking.payment_change": "Изменение статуса оплаты",
  "court.create": "Создание корта",
  "court.update": "Редактирование корта",
  "court.delete": "Удаление корта",
  "court.toggle_active": "Вкл/Выкл корта",
  "instructor.create": "Создание тренера",
  "instructor.update": "Редактирование тренера",
  "instructor.delete": "Удаление тренера",
  "instructor.toggle_active": "Вкл/Выкл тренера",
  "sport.create": "Создание вида спорта",
  "sport.update": "Редактирование вида спорта",
  "sport.delete": "Удаление вида спорта",
  "wallet.admin_credit": "Пополнение баланса (адм.)",
  "wallet.admin_debit": "Списание баланса (адм.)",
};

const ENTITY_LABELS: Record<string, string> = {
  booking: "Бронирование",
  court: "Корт",
  instructor: "Тренер",
  sport: "Вид спорта",
  wallet: "Кошелёк",
};

export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams: Promise<{
    entityType?: string;
    action?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: string;
  }>;
}) {
  await assertAdmin();
  const params = await searchParams;

  const page = Math.max(1, Number(params.page ?? "1") || 1);
  const entityType = params.entityType?.trim() || undefined;
  const action = params.action?.trim() || undefined;
  const dateFrom = params.dateFrom || undefined;
  const dateTo = params.dateTo || undefined;

  const where = {
    ...(entityType ? { entityType } : {}),
    ...(action ? { action } : {}),
    ...(dateFrom || dateTo
      ? {
          createdAt: {
            ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
            ...(dateTo ? { lte: new Date(dateTo + "T23:59:59Z") } : {}),
          },
        }
      : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.auditLog.count({ where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function buildUrl(overrides: Record<string, string | number | undefined>) {
    const p = new URLSearchParams();
    const merged = { entityType, action, dateFrom, dateTo, page, ...overrides };
    if (merged.entityType) p.set("entityType", merged.entityType as string);
    if (merged.action) p.set("action", merged.action as string);
    if (merged.dateFrom) p.set("dateFrom", merged.dateFrom as string);
    if (merged.dateTo) p.set("dateTo", merged.dateTo as string);
    if (merged.page && Number(merged.page) > 1) p.set("page", String(merged.page));
    const qs = p.toString();
    return qs ? `/admin/audit?${qs}` : "/admin/audit";
  }

  return (
    <AdminPageShell
      title="Журнал действий"
      description="Все административные действия с фильтрами по типу, действию и дате."
    >
      <form method="get" className="admin-filters">
        <div className="admin-filters__grid">
          <div className="admin-form__group">
            <label htmlFor="audit-entity" className="admin-form__label">Тип объекта</label>
            <select id="audit-entity" name="entityType" className="admin-form__field" defaultValue={entityType ?? ""}>
              <option value="">Все</option>
              {Object.entries(ENTITY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
          <div className="admin-form__group">
            <label htmlFor="audit-action" className="admin-form__label">Действие</label>
            <select id="audit-action" name="action" className="admin-form__field" defaultValue={action ?? ""}>
              <option value="">Все</option>
              {Object.entries(ACTION_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
          <div className="admin-form__group">
            <label htmlFor="audit-date-from" className="admin-form__label">С даты</label>
            <input id="audit-date-from" name="dateFrom" type="date" className="admin-form__field" defaultValue={dateFrom ?? ""} />
          </div>
          <div className="admin-form__group">
            <label htmlFor="audit-date-to" className="admin-form__label">По дату</label>
            <input id="audit-date-to" name="dateTo" type="date" className="admin-form__field" defaultValue={dateTo ?? ""} />
          </div>
        </div>
        <div className="admin-filters__actions">
          <button type="submit" className="admin-form__submit">Применить</button>
          <Link href="/admin/audit" className="admin-bookings__action-button">Сбросить</Link>
        </div>
      </form>

      <div className="admin-list-toolbar">
        <p className="admin-list-toolbar__meta">Найдено: {total}. Страница {page} из {totalPages}.</p>
      </div>

      <div className="admin-table">
        <table className="admin-table__table">
          <thead>
            <tr className="admin-table__row">
              <th className="admin-table__cell admin-table__cell--head">Когда</th>
              <th className="admin-table__cell admin-table__cell--head">Действие</th>
              <th className="admin-table__cell admin-table__cell--head">Объект</th>
              <th className="admin-table__cell admin-table__cell--head">ID объекта</th>
              <th className="admin-table__cell admin-table__cell--head">Детали</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr className="admin-table__row">
                <td className="admin-table__cell" colSpan={5}>Записей пока нет.</td>
              </tr>
            ) : (
              rows.map((row) => {
                const createdAt = new Date(row.createdAt);
                const dateStr = createdAt.toLocaleDateString("ru-KZ", {
                  timeZone: "Asia/Almaty",
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                });
                const timeStr = createdAt.toLocaleTimeString("ru-KZ", {
                  timeZone: "Asia/Almaty",
                  hour: "2-digit",
                  minute: "2-digit",
                });
                const detailStr = row.detail ? JSON.stringify(row.detail, null, 0) : "—";

                return (
                  <tr key={row.id} className="admin-table__row">
                    <td className="admin-table__cell">
                      <div className="admin-bookings__cell-title">{dateStr}</div>
                      <div className="admin-bookings__cell-sub">{timeStr}</div>
                    </td>
                    <td className="admin-table__cell">
                      <div className="admin-bookings__cell-title">
                        {ACTION_LABELS[row.action] ?? row.action}
                      </div>
                    </td>
                    <td className="admin-table__cell">
                      {ENTITY_LABELS[row.entityType] ?? row.entityType}
                    </td>
                    <td className="admin-table__cell">
                      <div className="admin-bookings__cell-sub" style={{ fontFamily: "monospace", fontSize: "0.7rem" }}>
                        {row.entityId}
                      </div>
                    </td>
                    <td className="admin-table__cell">
                      <div className="admin-bookings__cell-sub" style={{ fontFamily: "monospace", fontSize: "0.7rem", whiteSpace: "pre-wrap", maxWidth: "20rem" }}>
                        {detailStr}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="admin-pagination">
        <Link
          href={buildUrl({ page: Math.max(1, page - 1) })}
          className={`admin-pagination__link${page <= 1 ? " admin-pagination__link--disabled" : ""}`}
          aria-disabled={page <= 1}
        >
          Назад
        </Link>
        <span className="admin-pagination__meta">Страница {page} / {totalPages}</span>
        <Link
          href={buildUrl({ page: Math.min(totalPages, page + 1) })}
          className={`admin-pagination__link${page >= totalPages ? " admin-pagination__link--disabled" : ""}`}
          aria-disabled={page >= totalPages}
        >
          Вперёд
        </Link>
      </div>
    </AdminPageShell>
  );
}
