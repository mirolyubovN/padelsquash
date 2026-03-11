"use client";

import { useMemo, useState, useTransition } from "react";
import type { RescheduleBookingResult } from "@/src/lib/bookings/reschedule";
import { toVenueIsoDate } from "@/src/lib/time/venue-timezone";

interface AdminRescheduleModalProps {
  bookingId: string;
  serviceName: string;
  currentDate: string; // YYYY-MM-DD (from startAtIso)
  currentTime: string;
  currentCourtId?: string;
  currentCourtLabel?: string;
  serviceCode: string;
  locationSlug: string;
  courtNamesById: Record<string, string>;
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
  serviceName,
  currentDate,
  currentTime,
  currentCourtId,
  currentCourtLabel,
  serviceCode,
  locationSlug,
  courtNamesById,
  requiresCourt,
  rescheduleAction,
}: AdminRescheduleModalProps) {
  const todayVenueDate = toVenueIsoDate(new Date());
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(currentDate < todayVenueDate ? todayVenueDate : currentDate);
  const [slots, setSlots] = useState<AvailableSlot[]>([]);
  const [selectedStartTime, setSelectedStartTime] = useState<string | null>(null);
  const [selectedCourtId, setSelectedCourtId] = useState<string | undefined>(undefined);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slotsError, setSlotsError] = useState<string | null>(null);
  const [result, setResult] = useState<RescheduleBookingResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const timetableColumns = useMemo(() => {
    const ids = new Set<string>();
    for (const slot of slots) {
      for (const courtId of slot.availableCourtIds) {
        ids.add(courtId);
      }
    }
    return Array.from(ids).map((courtId, index) => ({
      id: courtId,
      label: courtNamesById[courtId] ?? `Корт ${index + 1}`,
    }));
  }, [courtNamesById, slots]);

  async function fetchSlots(newDate: string) {
    setLoadingSlots(true);
    setSlotsError(null);
    setSlots([]);
    setSelectedStartTime(null);
    setSelectedCourtId(undefined);
    try {
      const params = new URLSearchParams({
        serviceId: serviceCode,
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
    if (/^\d{4}-\d{2}-\d{2}$/.test(newDate) && newDate >= todayVenueDate) {
      void fetchSlots(newDate);
      return;
    }
    setSlots([]);
    setSelectedStartTime(null);
    setSelectedCourtId(undefined);
    setSlotsError(newDate ? "Нельзя переносить бронирование на прошедшую дату." : null);
  }

  function handleOpen() {
    setOpen(true);
    setResult(null);
    setError(null);
    const startDate = currentDate < todayVenueDate ? todayVenueDate : currentDate;
    setDate(startDate);
    void fetchSlots(startDate);
  }

  function handleConfirm() {
    if (!selectedStartTime) return;
    setError(null);
    startTransition(async () => {
      try {
        const res = await rescheduleAction({
          bookingId,
          newDate: date,
          newStartTime: selectedStartTime,
          newCourtId: requiresCourt ? selectedCourtId : undefined,
        });
        setResult(res);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Ошибка при переносе");
      }
    });
  }

  const selectedCellKey =
    selectedStartTime && selectedCourtId ? `${selectedStartTime}|${selectedCourtId}` : null;
  const selectedCourtLabel = selectedCourtId
    ? timetableColumns.find((column) => column.id === selectedCourtId)?.label ??
      courtNamesById[selectedCourtId] ??
      "Корт"
    : null;
  const resolvedCurrentCourtLabel = currentCourtId
    ? courtNamesById[currentCourtId] ?? currentCourtLabel ?? "Корт"
    : currentCourtLabel;

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
                  <div className="admin-reschedule-modal__summary">
                    <div className="admin-reschedule-modal__summary-row">
                      <span>Бронь</span>
                      <strong>{serviceName}</strong>
                    </div>
                    <div className="admin-reschedule-modal__summary-row">
                      <span>Сейчас</span>
                      <strong>
                        {currentDate} · {currentTime}
                        {resolvedCurrentCourtLabel ? ` · ${resolvedCurrentCourtLabel}` : ""}
                      </strong>
                    </div>
                    {selectedStartTime && (!requiresCourt || selectedCourtLabel) ? (
                      <div className="admin-reschedule-modal__summary-row">
                        <span>Будет</span>
                        <strong>
                          {date} · {selectedStartTime}
                          {requiresCourt && selectedCourtLabel ? ` · ${selectedCourtLabel}` : ""}
                        </strong>
                      </div>
                    ) : null}
                  </div>

                  <div className="admin-form__group">
                    <label className="admin-form__label">Новая дата</label>
                    <input
                      type="date"
                      className="admin-form__field"
                      min={todayVenueDate}
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
                      <label className="admin-form__label">Время и корт</label>
                      <div className="booking-flow__timetable-wrapper admin-reschedule-modal__timetable">
                        <table className="booking-flow__timetable">
                          <thead>
                            <tr>
                              <th className="booking-flow__timetable-time-header">Время</th>
                              {timetableColumns.map((column) => (
                                <th key={column.id} className="booking-flow__timetable-col-header">
                                  <span className="booking-flow__timetable-col-name">{column.label}</span>
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {slots.map((slot) => (
                              <tr key={slot.startTime} className="booking-flow__timetable-row">
                                <td className="booking-flow__timetable-time-cell">
                                  <span className="booking-flow__timetable-time-label admin-create-booking__slot-time">
                                    {slot.startTime}-{slot.endTime}
                                  </span>
                                </td>
                                {timetableColumns.map((column) => {
                                  const available = slot.availableCourtIds.includes(column.id);
                                  const active = selectedCellKey === `${slot.startTime}|${column.id}`;
                                  return (
                                    <td key={column.id} className="booking-flow__timetable-cell-wrapper">
                                      <button
                                        type="button"
                                        disabled={!available}
                                        className={`booking-flow__timetable-cell admin-create-booking__slot${
                                          active
                                            ? " booking-flow__timetable-cell--selected admin-create-booking__slot--active"
                                            : available
                                              ? " booking-flow__timetable-cell--available"
                                              : " booking-flow__timetable-cell--unavailable"
                                        }`}
                                        onClick={() => {
                                          if (!available) return;
                                          setSelectedStartTime(slot.startTime);
                                          setSelectedCourtId(column.id);
                                        }}
                                      >
                                        {active ? "✓" : available ? column.label : null}
                                      </button>
                                    </td>
                                  );
                                })}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      {selectedStartTime && selectedCourtId ? (
                        <p className="booking-flow__slots-hint">
                          Выбрано: {selectedStartTime} · {selectedCourtLabel ?? "Корт"}
                        </p>
                      ) : null}
                    </div>
                  ) : date ? (
                    <p className="admin-bookings__cell-sub">Нет доступных слотов на эту дату.</p>
                  ) : null}

                  {error ? (
                    <p style={{ color: "#b91c1c", fontSize: "0.875rem" }}>{error}</p>
                  ) : null}
                </div>

                <div className="account-dialog__actions">
                  <button
                    type="button"
                    className="admin-bookings__action-button admin-bookings__action-button--danger"
                    disabled={!selectedStartTime || (requiresCourt && !selectedCourtId) || isPending}
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
