"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { AdminConfirmActionForm } from "@/src/components/admin/admin-confirm-action-form";
import { AdminRescheduleModal } from "@/src/components/admin/admin-reschedule-modal";
import { ADMIN_BOOKING_STATUS_LABELS, type AdminBookingRow, type AdminBookingStatus } from "@/src/lib/admin/booking-types";
import type { RescheduleBookingResult } from "@/src/lib/bookings/reschedule";

function defaultPaymentStateForRow(row: AdminBookingRow) {
  if (row.paymentStatus === "paid" && row.paymentProvider === "wallet") return "paid_wallet";
  if (row.paymentStatus === "refunded") return "refunded_manual";
  if (row.paymentStatus === "paid") return "paid_manual";
  return "unpaid_manual";
}

interface AdminBookingsTableProps {
  rows: AdminBookingRow[];
  canSeeRevenue: boolean;
  bookingAction: (formData: FormData) => Promise<void>;
  bulkAction: (ids: string[], status: AdminBookingStatus) => Promise<{ updated: number; failed: number; total: number }>;
  rescheduleAction: (args: {
    bookingId: string;
    newDate: string;
    newStartTime: string;
    newCourtId?: string;
  }) => Promise<RescheduleBookingResult>;
}

export function AdminBookingsTable({ rows, canSeeRevenue, bookingAction, bulkAction, rescheduleAction }: AdminBookingsTableProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkResult, setBulkResult] = useState<string | null>(null);
  const [bulkDialog, setBulkDialog] = useState<{ status: AdminBookingStatus; label: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const allActionableIds = rows
    .filter((r) => r.status === "confirmed" || r.status === "pending_payment")
    .map((r) => r.id);
  const allSelected = allActionableIds.length > 0 && allActionableIds.every((id) => selectedIds.has(id));

  function toggleRow(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(allActionableIds));
    }
  }

  function openBulkDialog(status: AdminBookingStatus, label: string) {
    setBulkResult(null);
    setBulkDialog({ status, label });
  }

  function executeBulk() {
    if (!bulkDialog) return;
    const ids = Array.from(selectedIds);
    const { status } = bulkDialog;
    setBulkDialog(null);
    startTransition(async () => {
      const result = await bulkAction(ids, status);
      setSelectedIds(new Set());
      setBulkResult(`Обновлено ${result.updated} из ${result.total} бронирований.${result.failed > 0 ? ` Ошибка: ${result.failed}.` : ""}`);
    });
  }

  const colSpan = canSeeRevenue ? 8 : 7;

  return (
    <>
      {bulkResult ? (
        <p className="account-history__message account-history__message--success" role="status">
          {bulkResult}
        </p>
      ) : null}

      <div className="admin-table">
        <table className="admin-table__table">
          <thead>
            <tr className="admin-table__row">
              <th className="admin-table__cell admin-table__cell--head admin-bookings__checkbox-cell">
                <input
                  type="checkbox"
                  className="admin-bookings__checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  aria-label="Выбрать все"
                  disabled={allActionableIds.length === 0}
                />
              </th>
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
            {rows.length === 0 ? (
              <tr className="admin-table__row">
                <td className="admin-table__cell" colSpan={colSpan}>
                  Бронирований пока нет.
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const actionable = row.status === "confirmed" || row.status === "pending_payment";
                return (
                  <tr key={row.id} id={`booking-${row.id}`} className="admin-table__row">
                    <td className="admin-table__cell admin-bookings__checkbox-cell">
                      <input
                        type="checkbox"
                        className="admin-bookings__checkbox"
                        checked={selectedIds.has(row.id)}
                        onChange={() => toggleRow(row.id)}
                        aria-label={`Выбрать бронирование ${row.id}`}
                        disabled={!actionable}
                      />
                    </td>
                    <td className="admin-table__cell">
                      <div className="admin-bookings__cell-title">
                        <Link href={`/admin/clients/${row.customerId}`}>{row.customerName}</Link>
                      </div>
                      <div className="admin-bookings__cell-sub">
                        <Link href={`/admin/clients/${row.customerId}`}>{row.customerEmail}</Link>
                      </div>
                      <div className="admin-bookings__cell-sub">{row.customerPhone}</div>
                    </td>
                    <td className="admin-table__cell">
                      <div className="admin-bookings__cell-title">{row.serviceName}</div>
                      <div className="admin-bookings__cell-sub">{row.serviceCode} · {row.serviceSportName}</div>
                      {row.courtLabels.length > 0 ? (
                        <div className="admin-bookings__cell-sub">Корт: {row.courtLabels.join(", ")}</div>
                      ) : null}
                      {row.instructorLabels.length > 0 ? (
                        <div className="admin-bookings__cell-sub">Тренер: {row.instructorLabels.join(", ")}</div>
                      ) : null}
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
                      <span className={`admin-bookings__chip admin-bookings__chip--payment-${row.paymentStatus.replaceAll("_", "-")}`}>
                        {row.paymentStatusLabel}
                      </span>
                    </td>
                    {canSeeRevenue ? (
                      <td className="admin-table__cell">
                        <div className="admin-bookings__cell-title">{row.amountKzt}</div>
                        {row.pricingBreakdownLines.length > 0 ? (
                          <div className="admin-bookings__cell-sub">{row.pricingBreakdownLines[0]}</div>
                        ) : null}
                      </td>
                    ) : null}
                    <td className="admin-table__cell">
                      {row.status === "pending_payment" ? (
                        <div className="admin-bookings__actions">
                          <form action={bookingAction}>
                            <input type="hidden" name="bookingId" value={row.id} />
                            <button type="submit" name="action" value="pay_wallet" className="admin-bookings__action-button">
                              Списать с баланса
                            </button>
                          </form>
                          <form action={bookingAction}>
                            <input type="hidden" name="bookingId" value={row.id} />
                            <button type="submit" name="action" value="pay_manual" className="admin-bookings__action-button">
                              Оплачено вручную (нал/карта)
                            </button>
                          </form>
                          <AdminConfirmActionForm
                            action={bookingAction}
                            hiddenFields={{ bookingId: row.id, action: "cancelled" }}
                            triggerLabel="Отменить"
                            triggerClassName="admin-bookings__action-button admin-bookings__action-button--danger"
                            title="Подтвердите отмену"
                            description="Бронирование будет отменено. Если оплата была с баланса — средства вернутся клиенту."
                            confirmLabel="Да, отменить"
                          />
                        </div>
                      ) : row.status === "confirmed" ? (
                        <div className="admin-bookings__actions">
                          <form action={bookingAction}>
                            <input type="hidden" name="bookingId" value={row.id} />
                            <button type="submit" name="action" value="completed" className="admin-bookings__action-button">
                              Завершено
                            </button>
                          </form>
                          <form action={bookingAction}>
                            <input type="hidden" name="bookingId" value={row.id} />
                            <button type="submit" name="action" value="no_show" className="admin-bookings__action-button">
                              Неявка
                            </button>
                          </form>
                          <AdminRescheduleModal
                            bookingId={row.id}
                            currentDate={row.dateIso}
                            currentTime={row.time.split(" - ")[0]}
                            currentCourtId={row.courtIds[0]}
                            serviceId={row.serviceId}
                            locationSlug={row.locationSlug}
                            requiresCourt={row.requiresCourt}
                            rescheduleAction={rescheduleAction}
                          />
                          <AdminConfirmActionForm
                            action={bookingAction}
                            hiddenFields={{ bookingId: row.id, action: "cancelled" }}
                            triggerLabel="Отменить"
                            triggerClassName="admin-bookings__action-button admin-bookings__action-button--danger"
                            title="Подтвердите отмену"
                            description="Бронирование будет отменено. Если оплата была с баланса — средства вернутся клиенту."
                            confirmLabel="Да, отменить"
                          />
                        </div>
                      ) : (
                        <span className="admin-bookings__no-actions">—</span>
                      )}
                      <details className="admin-bookings__details">
                        <summary className="admin-bookings__details-summary">Исправить</summary>
                        <div className="admin-bookings__details-body">
                          <form action={bookingAction} className="admin-bookings__details-form">
                            <input type="hidden" name="bookingId" value={row.id} />
                            <label className="admin-bookings__details-label"><span>Статус брони</span></label>
                            <select
                              name="nextStatus"
                              aria-label="Статус брони"
                              defaultValue={row.status}
                              className="admin-form__field admin-bookings__details-field"
                            >
                              {Object.entries(ADMIN_BOOKING_STATUS_LABELS).map(([value, label]) => (
                                <option key={value} value={value}>{label}</option>
                              ))}
                            </select>
                            <button type="submit" name="action" value="set_status" className="admin-bookings__action-button">
                              Сохранить статус
                            </button>
                          </form>
                          <form action={bookingAction} className="admin-bookings__details-form">
                            <input type="hidden" name="bookingId" value={row.id} />
                            <label className="admin-bookings__details-label"><span>Статус оплаты</span></label>
                            <select
                              name="nextPaymentState"
                              aria-label="Статус оплаты"
                              defaultValue={defaultPaymentStateForRow(row)}
                              className="admin-form__field admin-bookings__details-field"
                            >
                              <option value="unpaid_manual">Не оплачено</option>
                              <option value="paid_manual">Оплачено вручную (нал/карта)</option>
                              <option value="paid_wallet">Оплачено с баланса</option>
                              <option value="refunded_manual">Возврат</option>
                            </select>
                            <button type="submit" name="action" value="set_payment" className="admin-bookings__action-button">
                              Сохранить оплату
                            </button>
                          </form>
                        </div>
                      </details>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Bulk action bar */}
      {selectedIds.size > 0 ? (
        <div className="admin-bookings__bulk-bar" role="region" aria-label="Массовые действия">
          <span className="admin-bookings__bulk-count">Выбрано: {selectedIds.size}</span>
          <div className="admin-bookings__bulk-actions">
            <button
              type="button"
              className="admin-bookings__action-button"
              onClick={() => openBulkDialog("completed", "Завершить")}
              disabled={isPending}
            >
              Завершить
            </button>
            <button
              type="button"
              className="admin-bookings__action-button"
              onClick={() => openBulkDialog("no_show", "Неявка")}
              disabled={isPending}
            >
              Неявка
            </button>
            <button
              type="button"
              className="admin-bookings__action-button admin-bookings__action-button--danger"
              onClick={() => openBulkDialog("cancelled", "Отменить")}
              disabled={isPending}
            >
              Отменить
            </button>
            <button
              type="button"
              className="admin-bookings__action-button"
              onClick={() => setSelectedIds(new Set())}
              disabled={isPending}
            >
              Сбросить
            </button>
          </div>
          {isPending ? <span className="admin-bookings__bulk-loading">Обновляем...</span> : null}
        </div>
      ) : null}

      {/* Bulk confirmation dialog */}
      {bulkDialog ? (
        <div className="account-dialog__backdrop" role="presentation" onClick={() => setBulkDialog(null)}>
          <div
            className="account-dialog"
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="account-dialog__title">Подтвердите действие</h3>
            <p className="account-dialog__text">
              {bulkDialog.status === "cancelled"
                ? `Отменить ${selectedIds.size} бронирование(й)? Оплаченные с баланса — вернутся клиентам.`
                : `Установить статус «${bulkDialog.label}» для ${selectedIds.size} бронирование(й)?`}
            </p>
            <div className="account-dialog__actions">
              <button
                type="button"
                className="admin-bookings__action-button admin-bookings__action-button--danger"
                onClick={executeBulk}
              >
                {bulkDialog.label}
              </button>
              <button
                type="button"
                className="admin-bookings__action-button"
                onClick={() => setBulkDialog(null)}
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
