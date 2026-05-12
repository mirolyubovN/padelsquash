"use client";

import { useMemo, useState, useTransition } from "react";
import type { RescheduleBookingResult } from "@/src/lib/bookings/reschedule";
import { toVenueIsoDate } from "@/src/lib/time/venue-timezone";
import { useModal } from "@/src/hooks/use-modal";
import { Dialog } from "@/src/components/ui/dialog";
import { TimeSlotTimetable } from "@/src/components/booking/time-slot-timetable";
import { t } from "@/src/lib/i18n";

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
  const { open, show, hide } = useModal();
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
      label: courtNamesById[courtId] ?? t("admin.common.courtNumber", { number: index + 1 }),
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
        setSlotsError(t("admin.reschedule.loadSlotsFailed"));
        return;
      }
      setSlots(payload.slots);
    } catch {
      setSlotsError(t("admin.reschedule.loadAvailabilityError"));
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
    setSlotsError(newDate ? t("admin.reschedule.pastDateError") : null);
  }

  function handleOpen() {
    show();
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
        setError(err instanceof Error ? err.message : t("admin.reschedule.submitError"));
      }
    });
  }

  const selectedCellKey =
    selectedStartTime && selectedCourtId ? `${selectedStartTime}|${selectedCourtId}` : null;
  const selectedCourtLabel = selectedCourtId
    ? timetableColumns.find((column) => column.id === selectedCourtId)?.label ??
      courtNamesById[selectedCourtId] ??
      t("admin.common.court")
    : null;
  const resolvedCurrentCourtLabel = currentCourtId
    ? courtNamesById[currentCourtId] ?? currentCourtLabel ?? t("admin.common.court")
    : currentCourtLabel;

  return (
    <>
      <button type="button" className="admin-bookings__action-button" onClick={handleOpen}>
        {t("admin.reschedule.trigger")}
      </button>

      <Dialog open={open} onClose={hide} title={t("admin.reschedule.title")} className="admin-reschedule-modal">
        {result ? (
          <div>
            <p className="account-dialog__text" style={{ color: "#15803d" }}>
              {t("admin.reschedule.success", { date: result.newDate })}
              {result.priceDiff > 0
                ? t("admin.reschedule.surcharge", { amount: result.priceDiff })
                : result.priceDiff < 0
                  ? t("admin.reschedule.refund", { amount: Math.abs(result.priceDiff) })
                  : ""}
            </p>
            <div className="account-dialog__actions">
              <button type="button" className="admin-bookings__action-button" onClick={hide}>
                {t("admin.common.close")}
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="admin-reschedule-modal__form">
              <div className="admin-reschedule-modal__summary">
                <div className="admin-reschedule-modal__summary-row">
                  <span>{t("admin.reschedule.booking")}</span>
                  <strong>{serviceName}</strong>
                </div>
                <div className="admin-reschedule-modal__summary-row">
                  <span>{t("admin.reschedule.now")}</span>
                  <strong>
                    {currentDate} · {currentTime}
                    {resolvedCurrentCourtLabel ? ` · ${resolvedCurrentCourtLabel}` : ""}
                  </strong>
                </div>
                {selectedStartTime && (!requiresCourt || selectedCourtLabel) ? (
                  <div className="admin-reschedule-modal__summary-row">
                    <span>{t("admin.reschedule.willBe")}</span>
                    <strong>
                      {date} · {selectedStartTime}
                      {requiresCourt && selectedCourtLabel ? ` · ${selectedCourtLabel}` : ""}
                    </strong>
                  </div>
                ) : null}
              </div>

              <div className="admin-form__group">
                <label className="admin-form__label">{t("admin.reschedule.newDate")}</label>
                <input
                  type="date" lang="ru-RU"
                  className="admin-form__field"
                  min={todayVenueDate}
                  value={date}
                  onChange={(e) => handleDateChange(e.target.value)}
                />
              </div>

              {loadingSlots ? (
                <p className="admin-bookings__cell-sub">{t("admin.reschedule.loadingAvailability")}</p>
              ) : slotsError ? (
                <p className="admin-bookings__cell-sub" style={{ color: "#b91c1c" }}>{slotsError}</p>
              ) : slots.length > 0 ? (
                <div className="admin-form__group">
                  <label className="admin-form__label">{t("admin.reschedule.timeAndCourt")}</label>
                  <TimeSlotTimetable
                    slots={slots}
                    columns={timetableColumns}
                    isSelected={(startTime, colId) => selectedCellKey === `${startTime}|${colId}`}
                    onCellClick={(startTime, colId) => {
                      setSelectedStartTime(startTime);
                      setSelectedCourtId(colId);
                    }}
                    wrapperClassName="admin-reschedule-modal__timetable"
                    cellClassName="admin-create-booking__slot"
                    getCellContent={(_slot, col, selected, available) =>
                      selected ? "✓" : available ? col.label : null
                    }
                  />
                  {selectedStartTime && selectedCourtId ? (
                    <p className="booking-flow__slots-hint">
                      {t("admin.reschedule.selectedSlot", { time: selectedStartTime, court: selectedCourtLabel ?? t("admin.common.court") })}
                    </p>
                  ) : null}
                </div>
              ) : date ? (
                <p className="admin-bookings__cell-sub">{t("admin.reschedule.noSlots")}</p>
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
                {isPending ? t("admin.reschedule.submitting") : t("admin.reschedule.confirm")}
              </button>
              <button
                type="button"
                className="admin-bookings__action-button"
                onClick={hide}
                disabled={isPending}
              >
                {t("admin.common.cancel")}
              </button>
            </div>
          </>
        )}
      </Dialog>
    </>
  );
}
