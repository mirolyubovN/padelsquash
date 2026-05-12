"use client";

import { AdminConfirmActionForm } from "@/src/components/admin/admin-confirm-action-form";
import { AdminEditModal } from "@/src/components/admin/admin-edit-modal";
import { AdminRescheduleModal } from "@/src/components/admin/admin-reschedule-modal";
import { ADMIN_BOOKING_STATUS_LABELS, type AdminBookingRow } from "@/src/lib/admin/booking-types";
import type { RescheduleBookingResult } from "@/src/lib/bookings/reschedule";
import { t } from "@/src/lib/i18n";

function defaultPaymentStateForRow(row: AdminBookingRow) {
  if (row.paymentStatus === "paid" && row.paymentProvider === "wallet") return "paid_wallet";
  if (row.paymentStatus === "refunded") return "refunded_manual";
  if (row.paymentStatus === "paid") return "paid_manual";
  return "unpaid_manual";
}

interface AdminBookingActionsModalProps {
  row: AdminBookingRow;
  resolvedCourtLabels: string[];
  courtNamesById: Record<string, string>;
  bookingAction: (formData: FormData) => Promise<void>;
  rescheduleAction: (args: {
    bookingId: string;
    newDate: string;
    newStartTime: string;
    newCourtId?: string;
  }) => Promise<RescheduleBookingResult>;
}

export function AdminBookingActionsModal({
  row,
  resolvedCourtLabels,
  courtNamesById,
  bookingAction,
  rescheduleAction,
}: AdminBookingActionsModalProps) {
  const defaultPaymentState = defaultPaymentStateForRow(row);

  return (
    <AdminEditModal
      triggerLabel={t("admin.bookings.actions.manage")}
      title={t("admin.bookings.modal.title", { serviceName: row.serviceName })}
      triggerClassName="admin-bookings__action-button admin-bookings__action-button--primary"
    >
      <div className="admin-bookings__manage-modal">
        <section className="admin-bookings__manage-section admin-bookings__manage-section--summary">
          <div className="admin-bookings__manage-summary-grid">
            <div>
              <p className="admin-bookings__manage-kicker">{t("admin.bookings.modal.customer")}</p>
              <p className="admin-bookings__manage-value">{row.customerName}</p>
              <p className="admin-bookings__manage-sub">{row.customerPhone}</p>
            </div>
            <div>
              <p className="admin-bookings__manage-kicker">{t("admin.bookings.modal.session")}</p>
              <p className="admin-bookings__manage-value">{row.date} · {row.time}</p>
              <p className="admin-bookings__manage-sub">{row.serviceName}</p>
            </div>
            <div>
              <p className="admin-bookings__manage-kicker">{t("admin.bookings.modal.payment")}</p>
              <p className="admin-bookings__manage-value">{row.amountKzt}</p>
              <p className="admin-bookings__manage-sub">{row.pricingBreakdownLines.join(" · ") || t("admin.bookings.modal.noBreakdown")}</p>
            </div>
          </div>
          {resolvedCourtLabels.length > 0 ? (
            <p className="admin-bookings__manage-meta">{t("admin.common.courtList", { courts: resolvedCourtLabels.join(", ") })}</p>
          ) : null}
          {row.instructorLabels.length > 0 ? (
            <p className="admin-bookings__manage-meta">{t("admin.common.trainerList", { trainers: row.instructorLabels.join(", ") })}</p>
          ) : null}
        </section>

        <section className="admin-bookings__manage-section">
          <h4 className="admin-bookings__manage-title">{t("admin.bookings.modal.quickActions")}</h4>
          {(row.status === "pending_payment" || row.status === "confirmed") ? (
            <div className="admin-bookings__manage-actions">
              {row.status === "pending_payment" ? (
                <>
                  <form action={bookingAction} className="admin-bookings__manage-action-form">
                    <input type="hidden" name="bookingId" value={row.id} />
                    <button type="submit" name="action" value="pay_wallet" className="admin-bookings__action-button">
                      {t("admin.bookings.actions.payWallet")}
                    </button>
                  </form>
                  <form action={bookingAction} className="admin-bookings__manage-action-form">
                    <input type="hidden" name="bookingId" value={row.id} />
                    <button type="submit" name="action" value="pay_manual" className="admin-bookings__action-button">
                      {t("admin.bookings.actions.payManual")}
                    </button>
                  </form>
                </>
              ) : null}

              {row.status === "confirmed" ? (
                <>
                  <form action={bookingAction} className="admin-bookings__manage-action-form">
                    <input type="hidden" name="bookingId" value={row.id} />
                    <button type="submit" name="action" value="completed" className="admin-bookings__action-button">
                      {t("admin.bookings.actions.completed")}
                    </button>
                  </form>
                  <div className="admin-bookings__manage-action-form">
                    <AdminRescheduleModal
                      bookingId={row.id}
                      serviceName={row.serviceName}
                      currentDate={row.dateIso}
                      currentTime={row.time}
                      currentCourtId={row.courtIds[0]}
                      currentCourtLabel={resolvedCourtLabels[0]}
                      serviceCode={row.serviceCode}
                      locationSlug={row.locationSlug}
                      courtNamesById={courtNamesById}
                      requiresCourt={row.requiresCourt}
                      rescheduleAction={rescheduleAction}
                    />
                  </div>
                </>
              ) : null}

              <div className="admin-bookings__manage-action-form">
                <AdminConfirmActionForm
                  action={bookingAction}
                  hiddenFields={{ bookingId: row.id, action: "cancelled" }}
                  triggerLabel={t("admin.bookings.actions.cancel")}
                  triggerClassName="admin-bookings__action-button admin-bookings__action-button--danger"
                  title={t("admin.bookings.cancelConfirmTitle")}
                  description={
                    row.paymentProvider === "manual" && row.paymentStatus === "paid"
                      ? t("admin.bookings.cancelConfirmDescriptionCashPaid")
                      : t("admin.bookings.cancelConfirmDescription")
                  }
                  confirmLabel={t("admin.bookings.cancelConfirmButton")}
                />
              </div>
            </div>
          ) : (
            <p className="admin-bookings__manage-empty">
              {t("admin.bookings.modal.quickActionsUnavailable")}
            </p>
          )}
        </section>

        <section className="admin-bookings__manage-section">
          <h4 className="admin-bookings__manage-title">{t("admin.bookings.modal.adjustment")}</h4>
          <div className="admin-bookings__edit-modal">
            <form action={bookingAction} className="admin-bookings__edit-form">
              <input type="hidden" name="bookingId" value={row.id} />
              <label className="admin-bookings__edit-label" htmlFor={`booking-status-${row.id}`}>
                {t("admin.bookings.fields.bookingStatus")}
              </label>
              <select
                id={`booking-status-${row.id}`}
                name="nextStatus"
                aria-label={t("admin.bookings.fields.bookingStatus")}
                defaultValue={row.status}
                className="admin-form__field admin-bookings__edit-field"
              >
                {Object.entries(ADMIN_BOOKING_STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
              <button type="submit" name="action" value="set_status" className="admin-bookings__action-button">
                {t("admin.bookings.actions.saveStatus")}
              </button>
            </form>

            <form action={bookingAction} className="admin-bookings__edit-form">
              <input type="hidden" name="bookingId" value={row.id} />
              <label className="admin-bookings__edit-label" htmlFor={`booking-payment-${row.id}`}>
                {t("admin.bookings.fields.paymentStatus")}
              </label>
              <select
                id={`booking-payment-${row.id}`}
                name="nextPaymentState"
                aria-label={t("admin.bookings.fields.paymentStatus")}
                defaultValue={defaultPaymentState}
                className="admin-form__field admin-bookings__edit-field"
              >
                <option value="unpaid_manual">{t("admin.bookings.paymentOptions.unpaidManual")}</option>
                <option value="paid_manual">{t("admin.bookings.paymentOptions.paidManual")}</option>
                {defaultPaymentState === "paid_wallet" ? (
                  <option value="paid_wallet">{t("admin.bookings.paymentOptions.paidWallet")}</option>
                ) : null}
                <option value="refunded_manual">{t("admin.bookings.paymentOptions.refundedManual")}</option>
              </select>
              <button type="submit" name="action" value="set_payment" className="admin-bookings__action-button">
                {t("admin.bookings.actions.savePayment")}
              </button>
            </form>
          </div>
        </section>

        <section className="admin-bookings__manage-section">
          <h4 className="admin-bookings__manage-title">{t("admin.bookings.modal.history")}</h4>
          {row.historyItems.length > 0 ? (
            <div className="admin-bookings__history-list">
              {row.historyItems.map((item) => (
                <article key={item.id} className="admin-bookings__history-item">
                  <div className="admin-bookings__history-head">
                    <p className="admin-bookings__history-title">{item.actionLabel}</p>
                    <p className="admin-bookings__history-time">{item.occurredAtLabel}</p>
                  </div>
                  <p className="admin-bookings__history-actor">{item.actorLabel}</p>
                  {item.detailSummary ? (
                    <p className="admin-bookings__history-detail">{item.detailSummary}</p>
                  ) : null}
                </article>
              ))}
            </div>
          ) : (
            <p className="admin-bookings__manage-empty">{t("admin.bookings.modal.noHistory")}</p>
          )}
        </section>
      </div>
    </AdminEditModal>
  );
}
