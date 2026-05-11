"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { AdminBookingActionsModal } from "@/src/components/admin/admin-booking-actions-modal";
import { type AdminBookingRow, type AdminBookingStatus } from "@/src/lib/admin/booking-types";
import type { RescheduleBookingResult } from "@/src/lib/bookings/reschedule";
import { t } from "@/src/lib/i18n";

function resolveCourtLabel(
  courtId: string,
  fallbackLabel: string | undefined,
  index: number,
  courtNamesById: Record<string, string>,
) {
  const mappedLabel = courtNamesById[courtId];
  if (mappedLabel) return mappedLabel;
  if (fallbackLabel && fallbackLabel !== courtId) return fallbackLabel;
  return t("admin.common.courtNumber", { number: index + 1 });
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
      setBulkResult(
        t("admin.bookings.bulkResult", { updated: result.updated, total: result.total }) +
          (result.failed > 0 ? t("admin.bookings.bulkResultFailed", { failed: result.failed }) : ""),
      );
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
                  aria-label={t("admin.bookings.selectAll")}
                  disabled={allActionableIds.length === 0}
                />
              </th>
              <th className="admin-table__cell admin-table__cell--head">{t("admin.bookings.table.customer")}</th>
              <th className="admin-table__cell admin-table__cell--head">{t("admin.bookings.table.service")}</th>
              <th className="admin-table__cell admin-table__cell--head">{t("admin.bookings.table.dateTime")}</th>
              <th className="admin-table__cell admin-table__cell--head">{t("admin.bookings.table.status")}</th>
              <th className="admin-table__cell admin-table__cell--head">{t("admin.bookings.table.payment")}</th>
              {canSeeRevenue ? <th className="admin-table__cell admin-table__cell--head">{t("admin.bookings.table.amount")}</th> : null}
              <th className="admin-table__cell admin-table__cell--head">{t("admin.bookings.table.actions")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr className="admin-table__row">
                <td className="admin-table__cell" colSpan={colSpan}>
                  {t("admin.bookings.empty")}
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
                        aria-label={t("admin.bookings.selectBooking", { id: row.id })}
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
                        <div className="admin-bookings__cell-sub">{t("admin.common.courtList", { courts: resolvedCourtLabels.join(", ") })}</div>
                      ) : null}
                      {row.instructorLabels.length > 0 ? (
                        <div className="admin-bookings__cell-sub">{t("admin.common.trainerList", { trainers: row.instructorLabels.join(", ") })}</div>
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
        <div className="admin-bookings__bulk-bar" role="region" aria-label={t("admin.bookings.bulkActionsLabel")}>
          <span className="admin-bookings__bulk-count">{t("admin.bookings.selectedCount", { count: selectedIds.size })}</span>
          <div className="admin-bookings__bulk-actions">
            <button
              type="button"
              className="admin-bookings__action-button"
              onClick={() => openBulkDialog("completed", t("admin.bookings.actions.complete"))}
              disabled={isPending}
            >
              {t("admin.bookings.actions.complete")}
            </button>
            <button
              type="button"
              className="admin-bookings__action-button"
              onClick={() => openBulkDialog("no_show", t("admin.bookings.actions.noShow"))}
              disabled={isPending}
            >
              {t("admin.bookings.actions.noShow")}
            </button>
            <button
              type="button"
              className="admin-bookings__action-button admin-bookings__action-button--danger"
              onClick={() => openBulkDialog("cancelled", t("admin.bookings.actions.cancel"))}
              disabled={isPending}
            >
              {t("admin.bookings.actions.cancel")}
            </button>
            <button
              type="button"
              className="admin-bookings__action-button"
              onClick={() => setSelectedIds(new Set())}
              disabled={isPending}
            >
              {t("admin.bookings.actions.reset")}
            </button>
          </div>
          {isPending ? <span className="admin-bookings__bulk-loading">{t("admin.bookings.bulkLoading")}</span> : null}
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
            <h3 className="account-dialog__title">{t("admin.bookings.confirmBulkTitle")}</h3>
            <p className="account-dialog__text">
              {bulkDialog.status === "cancelled"
                ? t("admin.bookings.confirmBulkCancel", { count: selectedIds.size })
                : t("admin.bookings.confirmBulkStatus", { label: bulkDialog.label, count: selectedIds.size })}
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
                {t("admin.common.cancel")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
