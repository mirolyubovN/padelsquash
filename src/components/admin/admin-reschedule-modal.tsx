"use client";

import { useState, useTransition } from "react";
import type { RescheduleBookingResult } from "@/src/lib/bookings/reschedule";

interface AdminRescheduleModalProps {
  bookingId: string;
  currentDate: string; // YYYY-MM-DD (from startAtIso)
  currentTime: string; // HH:MM
  currentCourtId?: string;
  serviceId: string;
  locationSlug: string;
  requiresCourt: boolean;
  rescheduleAction: (args: {
    bookingId: string;
    newDate: string;
    newStartTime: string;
    newCourtId?: string;
  }) => Promise<RescheduleBookingResult>;
}

interface AvailableSlot {
  startTime: string;
  endTime: string;
  availableCourtIds: string[];
}

export function AdminRescheduleModal({
  bookingId,
  currentDate,
  currentTime,
  currentCourtId,
  serviceId,
  locationSlug,
  requiresCourt,
  rescheduleAction,
}: AdminRescheduleModalProps) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(currentDate);
  const [slots, setSlots] = useState<AvailableSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [selectedCourtId, setSelectedCourtId] = useState<string | undefined>(currentCourtId);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slotsError, setSlotsError] = useState<string | null>(null);
  const [result, setResult] = useState<RescheduleBookingResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function fetchSlots(newDate: string) {
    setLoadingSlots(true);
    setSlotsError(null);
    setSlots([]);
    setSelectedSlot(null);
    try {
      const params = new URLSearchParams({
        serviceId,
        location: locationSlug,
        date: newDate,
        durationMin: "60",
      });
      const res = await fetch(`/api/availability?${params.toString()}`);
      const payload = (await res.json().catch(() => null)) as { slots?: AvailableSlot[] } | null;
      if (!res.ok || !payload?.slots) {
        setSlotsError("Не удалось загрузить доступные слоты");
        return;
      }
      setSlots(payload.slots);
    } catch {
      setSlotsError("Ошибка при загрузке доступности");
    } finally {
      setLoadingSlots(false);
    }
  }

  function handleDateChange(newDate: string) {
    setDate(newDate);
    if (/^\d{4}-\d{2}-\d{2}$/.test(newDate)) {
      void fetchSlots(newDate);
    }
  }

  function handleOpen() {
    setOpen(true);
    setResult(null);
    setError(null);
    setDate(currentDate);
    void fetchSlots(currentDate);
  }

  function handleConfirm() {
    if (!selectedSlot) return;
    setError(null);
    startTransition(async () => {
      try {
        const res = await rescheduleAction({
          bookingId,
          newDate: date,
          newStartTime: selectedSlot,
          newCourtId: requiresCourt ? selectedCourtId : undefined,
        });
        setResult(res);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Ошибка при переносе");
      }
    });
  }

  const slot = slots.find((s) => s.startTime === selectedSlot);
  const courtOptions = slot?.availableCourtIds ?? [];

  return (
    <>
      <button type="button" className="admin-bookings__action-button" onClick={handleOpen}>
        Перенести
      </button>

      {open ? (
        <div className="account-dialog__backdrop" role="presentation" onClick={() => setOpen(false)}>
          <div
            className="account-dialog admin-reschedule-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Перенос бронирования"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="account-dialog__title">Перенос бронирования</h3>

            {result ? (
              <div>
                <p className="account-dialog__text" style={{ color: "#15803d" }}>
                  Бронирование перенесено на {result.newDate}.
                  {result.priceDiff > 0
                    ? ` Доплата: ${result.priceDiff} ₸.`
                    : result.priceDiff < 0
                      ? ` Возврат: ${Math.abs(result.priceDiff)} ₸.`
                      : ""}
                </p>
                <div className="account-dialog__actions">
                  <button type="button" className="admin-bookings__action-button" onClick={() => setOpen(false)}>
                    Закрыть
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="admin-reschedule-modal__form">
                  <div className="admin-form__group">
                    <label className="admin-form__label">Новая дата</label>
                    <input
                      type="date"
                      className="admin-form__field"
                      value={date}
                      onChange={(e) => handleDateChange(e.target.value)}
                    />
                  </div>

                  {loadingSlots ? (
                    <p className="admin-bookings__cell-sub">Загружаем доступность...</p>
                  ) : slotsError ? (
                    <p className="admin-bookings__cell-sub" style={{ color: "#b91c1c" }}>{slotsError}</p>
                  ) : slots.length > 0 ? (
                    <div className="admin-form__group">
                      <label className="admin-form__label">Время</label>
                      <div className="admin-reschedule-modal__slots">
                        {slots.map((s) => (
                          <button
                            key={s.startTime}
                            type="button"
                            className={`admin-reschedule-modal__slot${selectedSlot === s.startTime ? " admin-reschedule-modal__slot--selected" : ""}`}
                            onClick={() => {
                              setSelectedSlot(s.startTime);
                              setSelectedCourtId(
                                s.availableCourtIds.includes(currentCourtId ?? "")
                                  ? currentCourtId
                                  : s.availableCourtIds[0],
                              );
                            }}
                          >
                            {s.startTime}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : date ? (
                    <p className="admin-bookings__cell-sub">Нет доступных слотов на эту дату.</p>
                  ) : null}

                  {requiresCourt && slot && courtOptions.length > 1 ? (
                    <div className="admin-form__group">
                      <label className="admin-form__label">Корт</label>
                      <select
                        className="admin-form__field"
                        value={selectedCourtId ?? ""}
                        onChange={(e) => setSelectedCourtId(e.target.value || undefined)}
                      >
                        {courtOptions.map((courtId) => (
                          <option key={courtId} value={courtId}>{courtId}</option>
                        ))}
                      </select>
                    </div>
                  ) : null}

                  {error ? (
                    <p style={{ color: "#b91c1c", fontSize: "0.875rem" }}>{error}</p>
                  ) : null}
                </div>

                <div className="account-dialog__actions">
                  <button
                    type="button"
                    className="admin-bookings__action-button admin-bookings__action-button--danger"
                    disabled={!selectedSlot || isPending}
                    onClick={handleConfirm}
                  >
                    {isPending ? "Переносим..." : "Подтвердить перенос"}
                  </button>
                  <button
                    type="button"
                    className="admin-bookings__action-button"
                    onClick={() => setOpen(false)}
                    disabled={isPending}
                  >
                    Отмена
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
