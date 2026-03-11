"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { AdminBookingActionsModal } from "@/src/components/admin/admin-booking-actions-modal";
import { type AdminBookingRow, type AdminBookingStatus } from "@/src/lib/admin/booking-types";
import type { RescheduleBookingResult } from "@/src/lib/bookings/reschedule";

function resolveCourtLabel(
  courtId: string,
  fallbackLabel: string | undefined,
  index: number,
  courtNamesById: Record<string, string>,
) {
  const mappedLabel = courtNamesById[courtId];
  if (mappedLabel) return mappedLabel;
  if (fallbackLabel && fallbackLabel !== courtId) return fallbackLabel;
  return `Корт ${index + 1}`;
}

interface AdminBookingsTableProps {
  rows: AdminBookingRow[];
  courtNamesById: Record<string, string>;
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

export function AdminBookingsTable({
  rows,
  courtNamesById,
  canSeeRevenue,
  bookingAction,
  bulkAction,
  rescheduleAction,
}: AdminBookingsTableProps) {
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
                const resolvedCourtLabels = row.courtIds.map((courtId, index) =>
                  resolveCourtLabel(courtId, row.courtLabels[index], index, courtNamesById),
                );
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
                      {resolvedCourtLabels.length > 0 ? (
                        <div className="admin-bookings__cell-sub">Корт: {resolvedCourtLabels.join(", ")}</div>
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
                          <div className="admin-bookings__price-lines">
                            {row.pricingBreakdownLines.map((line) => (
                              <div key={line} className="admin-bookings__cell-sub">{line}</div>
                            ))}
                          </div>
                        ) : null}
                      </td>
                    ) : null}
                    <td className="admin-table__cell">
                      <AdminBookingActionsModal
                        row={row}
                        resolvedCourtLabels={resolvedCourtLabels}
                        courtNamesById={courtNamesById}
                        bookingAction={bookingAction}
                        rescheduleAction={rescheduleAction}
                      />
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
