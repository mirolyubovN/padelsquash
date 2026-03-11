"use client";

import { AdminConfirmActionForm } from "@/src/components/admin/admin-confirm-action-form";
import { AdminEditModal } from "@/src/components/admin/admin-edit-modal";
import { AdminRescheduleModal } from "@/src/components/admin/admin-reschedule-modal";
import { ADMIN_BOOKING_STATUS_LABELS, type AdminBookingRow } from "@/src/lib/admin/booking-types";
import type { RescheduleBookingResult } from "@/src/lib/bookings/reschedule";

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
  return (
    <AdminEditModal
      triggerLabel="Управлять"
      title={`Бронь: ${row.serviceName}`}
      triggerClassName="admin-bookings__action-button admin-bookings__action-button--primary"
    >
      <div className="admin-bookings__manage-modal">
        <section className="admin-bookings__manage-section admin-bookings__manage-section--summary">
          <div className="admin-bookings__manage-summary-grid">
            <div>
              <p className="admin-bookings__manage-kicker">Клиент</p>
              <p className="admin-bookings__manage-value">{row.customerName}</p>
              <p className="admin-bookings__manage-sub">{row.customerPhone}</p>
            </div>
            <div>
              <p className="admin-bookings__manage-kicker">Сеанс</p>
              <p className="admin-bookings__manage-value">{row.date} · {row.time}</p>
              <p className="admin-bookings__manage-sub">{row.serviceName}</p>
            </div>
            <div>
              <p className="admin-bookings__manage-kicker">Оплата</p>
              <p className="admin-bookings__manage-value">{row.amountKzt}</p>
              <p className="admin-bookings__manage-sub">{row.pricingBreakdownLines.join(" · ") || "Без разбивки"}</p>
            </div>
          </div>
          {resolvedCourtLabels.length > 0 ? (
            <p className="admin-bookings__manage-meta">Корт: {resolvedCourtLabels.join(", ")}</p>
          ) : null}
          {row.instructorLabels.length > 0 ? (
            <p className="admin-bookings__manage-meta">Тренер: {row.instructorLabels.join(", ")}</p>
          ) : null}
        </section>

        <section className="admin-bookings__manage-section">
          <h4 className="admin-bookings__manage-title">Быстрые действия</h4>
          {(row.status === "pending_payment" || row.status === "confirmed") ? (
            <div className="admin-bookings__manage-actions">
              {row.status === "pending_payment" ? (
                <>
                  <form action={bookingAction} className="admin-bookings__manage-action-form">
                    <input type="hidden" name="bookingId" value={row.id} />
                    <button type="submit" name="action" value="pay_wallet" className="admin-bookings__action-button">
                      Списать с баланса
                    </button>
                  </form>
                  <form action={bookingAction} className="admin-bookings__manage-action-form">
                    <input type="hidden" name="bookingId" value={row.id} />
                    <button type="submit" name="action" value="pay_manual" className="admin-bookings__action-button">
                      Оплачено вручную
                    </button>
                  </form>
                </>
              ) : null}

              {row.status === "confirmed" ? (
                <>
                  <form action={bookingAction} className="admin-bookings__manage-action-form">
                    <input type="hidden" name="bookingId" value={row.id} />
                    <button type="submit" name="action" value="completed" className="admin-bookings__action-button">
                      Завершено
                    </button>
                  </form>
                  <form action={bookingAction} className="admin-bookings__manage-action-form">
                    <input type="hidden" name="bookingId" value={row.id} />
                    <button type="submit" name="action" value="no_show" className="admin-bookings__action-button">
                      Неявка
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
                  triggerLabel="Отменить"
                  triggerClassName="admin-bookings__action-button admin-bookings__action-button--danger"
                  title="Подтвердите отмену"
                  description="Бронирование будет отменено. Если оплата была с баланса — средства вернутся клиенту."
                  confirmLabel="Да, отменить"
                />
              </div>
            </div>
          ) : (
            <p className="admin-bookings__manage-empty">
              Для этой брони быстрые действия недоступны. Используйте корректировку ниже, если нужно исправить статус вручную.
            </p>
          )}
        </section>

        <section className="admin-bookings__manage-section">
          <h4 className="admin-bookings__manage-title">Корректировка</h4>
          <div className="admin-bookings__edit-modal">
            <form action={bookingAction} className="admin-bookings__edit-form">
              <input type="hidden" name="bookingId" value={row.id} />
              <label className="admin-bookings__edit-label" htmlFor={`booking-status-${row.id}`}>
                Статус брони
              </label>
              <select
                id={`booking-status-${row.id}`}
                name="nextStatus"
                aria-label="Статус брони"
                defaultValue={row.status}
                className="admin-form__field admin-bookings__edit-field"
              >
                {Object.entries(ADMIN_BOOKING_STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
              <button type="submit" name="action" value="set_status" className="admin-bookings__action-button">
                Сохранить статус
              </button>
            </form>

            <form action={bookingAction} className="admin-bookings__edit-form">
              <input type="hidden" name="bookingId" value={row.id} />
              <label className="admin-bookings__edit-label" htmlFor={`booking-payment-${row.id}`}>
                Статус оплаты
              </label>
              <select
                id={`booking-payment-${row.id}`}
                name="nextPaymentState"
                aria-label="Статус оплаты"
                defaultValue={defaultPaymentStateForRow(row)}
                className="admin-form__field admin-bookings__edit-field"
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
        </section>

        <section className="admin-bookings__manage-section">
          <h4 className="admin-bookings__manage-title">История изменений</h4>
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
            <p className="admin-bookings__manage-empty">Изменений по этой брони пока нет.</p>
          )}
        </section>
      </div>
    </AdminEditModal>
  );
}
