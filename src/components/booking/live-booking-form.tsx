"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { resolvePricingTier } from "@/src/lib/pricing/engine";

type ServiceKind = "court" | "training";
type PricingTier = "morning" | "day" | "evening_weekend";

interface ServiceOption {
  id: string;
  name: string;
  sport: string;
  sportName?: string;
  requiresCourt: boolean;
  requiresInstructor: boolean;
}

interface InstructorOption {
  id: string;
  name: string;
  sports: string[];
  sportPrices: Record<string, number>;
}

type CourtPriceMatrix = Record<string, Record<PricingTier, number>>;

interface SlotOption {
  startTime: string;
  endTime: string;
  availableCourtIds: string[];
  availableInstructorIds?: string[];
}

interface AvailabilityPayload {
  meta: { source: string; timezone: string };
  service: {
    id: string;
    name: string;
    sport: string;
    requiresCourt: boolean;
    requiresInstructor: boolean;
  };
  date: string;
  slots: SlotOption[];
}

interface BookingApiSuccessPayload {
  message: string;
  source: "db" | "demo-fallback";
  data: {
    booking: {
      id: string;
      status: string;
      priceTotal: number;
      currency: string;
      resources?: Array<{ resourceType: "court" | "instructor"; resourceId: string }>;
    };
    payment: { provider: string; status: string };
  };
}

interface BookingSuccessSession {
  date: string;
  startTime: string;
  endTime: string;
  courtLabel: string;
  trainerName?: string;
  amount: number;
  currency: string;
}

interface BookingSuccessSummary {
  sessions: BookingSuccessSession[];
  totalAmount: number;
  currency: string;
}

interface SelectedCell {
  timeKey: string;
  resourceId: string;
}

export interface LiveBookingFormProps {
  locations: Array<{ id: string; slug: string; name: string; address: string }>;
  selectedLocationSlug: string;
  services: ServiceOption[];
  courtNames: Record<string, string>;
  instructors: InstructorOption[];
  courtPrices: CourtPriceMatrix;
  isAuthenticated: boolean;
  initialCustomer?: { name?: string; email?: string; phone?: string };
}

// ── Helpers ────────────────────────────────────────────────────────────

function getTodayDate(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function addDays(dateIso: string, days: number): string {
  const d = new Date(`${dateIso}T00:00:00`);
  d.setDate(d.getDate() + days);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function detectServiceKind(service: ServiceOption): ServiceKind {
  return service.requiresInstructor ? "training" : "court";
}

function getSportLabel(slug: string): string {
  if (slug === "padel") return "Падел";
  if (slug === "squash") return "Сквош";
  return slug;
}

function formatMoneyKzt(amount: number): string {
  return `${amount.toLocaleString("ru-KZ")} ₸`;
}

function formatCourtLabel(courtId: string, courtNames: Record<string, string>): string {
  return courtNames[courtId] ?? courtId;
}

function getSlotKey(slot: Pick<SlotOption, "startTime" | "endTime">): string {
  return `${slot.startTime}|${slot.endTime}`;
}

async function fetchAvailability(
  location: string,
  serviceId: string,
  date: string,
  instructorId?: string,
): Promise<AvailabilityPayload> {
  const params = new URLSearchParams({ location, serviceId, date, durationMin: "60" });
  if (instructorId) params.set("instructorId", instructorId);
  const res = await fetch(`/api/availability?${params.toString()}`, { cache: "no-store" });
  const payload = (await res.json().catch(() => null)) as AvailabilityPayload | { error?: string } | null;
  if (!res.ok) {
    throw new Error(
      payload && "error" in payload && payload.error ? payload.error : "Не удалось получить доступность",
    );
  }
  return payload as AvailabilityPayload;
}

// ── Component ──────────────────────────────────────────────────────────

export function LiveBookingForm({
  locations,
  selectedLocationSlug,
  services,
  courtNames,
  instructors,
  courtPrices,
  isAuthenticated,
  initialCustomer,
}: LiveBookingFormProps) {
  // Build sport → { court, training } matrix
  const serviceMatrix = useMemo(() => {
    const result: Record<string, Partial<Record<ServiceKind, ServiceOption>>> = {};
    for (const svc of services) {
      const kind = detectServiceKind(svc);
      if (!result[svc.sport]) result[svc.sport] = {};
      if (!result[svc.sport][kind]) result[svc.sport][kind] = svc;
    }
    return result;
  }, [services]);

  const sportOptions = useMemo(
    () =>
      Object.entries(serviceMatrix).map(([slug, kinds]) => ({
        slug,
        label: kinds.court?.sportName ?? kinds.training?.sportName ?? getSportLabel(slug),
      })),
    [serviceMatrix],
  );

  const firstSport = sportOptions[0]?.slug ?? "padel";
  const initialKind: ServiceKind = serviceMatrix[firstSport]?.court ? "court" : "training";

  // Core state
  const [sport, setSport] = useState(firstSport);
  const [serviceKind, setServiceKind] = useState<ServiceKind>(initialKind);
  const [selectedInstructorId, setSelectedInstructorId] = useState("");
  const [date, setDate] = useState<string>(getTodayDate);
  const [availability, setAvailability] = useState<AvailabilityPayload | null>(null);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [availabilityError, setAvailabilityError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [autoDateMessage, setAutoDateMessage] = useState<string | null>(null);
  const [autoSearchKey, setAutoSearchKey] = useState("");
  const [selectedCells, setSelectedCells] = useState<SelectedCell[]>([]);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitWarning, setSubmitWarning] = useState<string | null>(null);
  const [submitSuccessSummary, setSubmitSuccessSummary] = useState<BookingSuccessSummary | null>(null);

  const hasRestoredFromUrlRef = useRef(false);
  const skipInitialUrlSyncRef = useRef(true);

  // Derived
  const resolvedService = serviceMatrix[sport]?.[serviceKind] ?? null;
  const availableKindsForSport = serviceMatrix[sport] ?? {};
  const trainersForSport = useMemo(
    () => instructors.filter((i) => i.sports.includes(sport)),
    [instructors, sport],
  );
  const selectedTrainer = selectedInstructorId
    ? (instructors.find((i) => i.id === selectedInstructorId) ?? null)
    : null;
  const selectedTrainerPrice = selectedTrainer?.sportPrices[sport] ?? 0;
  const hasLocationStep = locations.length > 1;
  const selectedLocation = locations.find((l) => l.slug === selectedLocationSlug) ?? locations[0];

  // Restore URL params on mount
  useEffect(() => {
    if (hasRestoredFromUrlRef.current || typeof window === "undefined") return;
    hasRestoredFromUrlRef.current = true;

    const p = new URLSearchParams(window.location.search);
    const sportParam = p.get("sport");
    const serviceParam = p.get("service");
    const dateParam = p.get("date");
    const instructorParam = p.get("instructor");

    if (sportParam && serviceMatrix[sportParam]) setSport(sportParam);
    if (serviceParam === "court" || serviceParam === "training") setServiceKind(serviceParam);
    if (dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam) && dateParam >= getTodayDate()) {
      setDate(dateParam);
    }
    if (instructorParam) setSelectedInstructorId(instructorParam);
  }, [serviceMatrix]);

  // Sync URL params on state changes
  useEffect(() => {
    if (!hasRestoredFromUrlRef.current || typeof window === "undefined") return;
    if (skipInitialUrlSyncRef.current) { skipInitialUrlSyncRef.current = false; return; }

    const p = new URLSearchParams(window.location.search);
    if (selectedLocationSlug) p.set("location", selectedLocationSlug); else p.delete("location");
    p.set("sport", sport);
    p.set("service", serviceKind);
    p.set("date", date);
    if (serviceKind === "training" && selectedInstructorId) p.set("instructor", selectedInstructorId);
    else p.delete("instructor");

    const next = `${window.location.pathname}?${p.toString()}`;
    if (next !== `${window.location.pathname}${window.location.search}`) {
      window.history.replaceState(window.history.state, "", next);
    }
  }, [selectedLocationSlug, sport, serviceKind, date, selectedInstructorId]);

  // Auto-fix service kind if unavailable for new sport
  useEffect(() => {
    if (!resolvedService) {
      if (availableKindsForSport.court) setServiceKind("court");
      else if (availableKindsForSport.training) setServiceKind("training");
    }
  }, [availableKindsForSport, resolvedService]);

  // Clear selection when context changes
  useEffect(() => {
    setSelectedCells([]);
    setSelectedInstructorId("");
    setSubmitError(null);
    setSubmitWarning(null);
    setSubmitSuccessSummary(null);
    setAutoDateMessage(null);
    setAutoSearchKey("");
  }, [sport, serviceKind]);

  // Clear cells when instructor changes
  useEffect(() => {
    setSelectedCells([]);
    setSubmitError(null);
    setSubmitWarning(null);
    setAutoDateMessage(null);
    setAutoSearchKey("");
  }, [selectedInstructorId]);

  useEffect(() => {
    setSelectedCells([]);
    setSubmitError(null);
    setSubmitWarning(null);
    setAutoDateMessage(null);
    setAutoSearchKey("");
  }, [date]);

  // Fetch availability
  useEffect(() => {
    if (!resolvedService || !date) { setAvailability(null); return; }
    if (resolvedService.requiresInstructor && !selectedInstructorId) { setAvailability(null); return; }

    const svc = resolvedService;
    const instrId = svc.requiresInstructor ? selectedInstructorId : undefined;
    let cancelled = false;

    async function load() {
      setAvailabilityLoading(true);
      setAvailabilityError(null);
      try {
        const payload = await fetchAvailability(selectedLocationSlug, svc.id, date, instrId);
        if (!cancelled) setAvailability(payload);
      } catch (err) {
        if (!cancelled) {
          setAvailability(null);
          setAvailabilityError(err instanceof Error ? err.message : "Ошибка запроса доступности");
        }
      } finally {
        if (!cancelled) setAvailabilityLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [resolvedService, date, reloadKey, selectedLocationSlug, selectedInstructorId]);

  // Auto-advance to nearest date with slots
  useEffect(() => {
    if (!resolvedService || availabilityLoading || availabilityError || !availability) return;
    if (availability.slots.length > 0) return;
    if (resolvedService.requiresInstructor && !selectedInstructorId) return;

    const key = `${resolvedService.id}:${date}:${selectedInstructorId}`;
    if (autoSearchKey === key) return;

    const svc = resolvedService;
    const instrId = svc.requiresInstructor ? selectedInstructorId : undefined;
    let cancelled = false;
    setAutoSearchKey(key);

    async function findNext() {
      for (let i = 1; i <= 14; i++) {
        const next = addDays(date, i);
        try {
          const result = await fetchAvailability(selectedLocationSlug, svc.id, next, instrId);
          if (cancelled) return;
          if (result.slots.length > 0) {
            setAutoDateMessage(`На ${date} слотов нет. Показана ближайшая дата: ${next}.`);
            setDate(next);
            return;
          }
        } catch { if (cancelled) return; }
      }
      if (!cancelled) setAutoDateMessage("Нет доступных слотов в ближайшие 14 дней.");
    }
    void findNext();
    return () => { cancelled = true; };
  }, [resolvedService, availabilityLoading, availabilityError, availability, date, autoSearchKey, selectedLocationSlug, selectedInstructorId]);

  // Available time slots
  const availableTimeSlots = useMemo(
    () => [...(availability?.slots ?? [])].sort((a, b) => a.startTime.localeCompare(b.startTime)),
    [availability],
  );

  // Timetable columns — always courts (for both court rental and training)
  const timetableColumns = useMemo(() => {
    if (availableTimeSlots.length === 0) return [];
    const seen = new Set<string>();
    const ids: string[] = [];
    for (const slot of availableTimeSlots) {
      for (const id of slot.availableCourtIds) {
        if (!seen.has(id)) { seen.add(id); ids.push(id); }
      }
    }
    return ids.map((id) => ({ id, label: courtNames[id] ?? id }));
  }, [availableTimeSlots, courtNames]);

  // Validate selected cells when availability changes (resourceId is always a courtId)
  useEffect(() => {
    setSelectedCells((prev) => {
      if (!prev.length) return prev;
      const valid = prev.filter((cell) => {
        const slot = availableTimeSlots.find((s) => getSlotKey(s) === cell.timeKey);
        return slot ? slot.availableCourtIds.includes(cell.resourceId) : false;
      });
      return valid.length !== prev.length ? valid : prev;
    });
  }, [availableTimeSlots]);

  function toggleCell(timeKey: string, resourceId: string) {
    setSelectedCells((prev) => {
      const exists = prev.some((c) => c.timeKey === timeKey && c.resourceId === resourceId);
      return exists
        ? prev.filter((c) => !(c.timeKey === timeKey && c.resourceId === resourceId))
        : [...prev, { timeKey, resourceId }];
    });
  }

  // Price preview
  const pricePreview = useMemo(() => {
    if (!resolvedService || selectedCells.length === 0) return null;
    const lines = selectedCells
      .map((cell) => {
        const slot = availableTimeSlots.find((s) => getSlotKey(s) === cell.timeKey);
        if (!slot) return null;
        const tier = resolvePricingTier(date, slot.startTime);
        const courtPrice = courtPrices[sport]?.[tier] ?? 0;
        const trainerPrice = serviceKind === "training" ? selectedTrainerPrice : 0;
        const courtLabel = courtNames[cell.resourceId] ?? cell.resourceId;
        const label =
          serviceKind === "court"
            ? `${slot.startTime}–${slot.endTime} · ${courtLabel}`
            : `${slot.startTime}–${slot.endTime} · ${courtLabel}${selectedTrainer ? ` · ${selectedTrainer.name}` : ""}`;
        return { key: `${cell.timeKey}:${cell.resourceId}`, label, total: courtPrice + trainerPrice };
      })
      .filter(Boolean) as Array<{ key: string; label: string; total: number }>;
    if (lines.length === 0) return null;
    return { lines, total: lines.reduce((s, l) => s + l.total, 0) };
  }, [resolvedService, selectedCells, availableTimeSlots, date, courtPrices, sport, serviceKind, selectedTrainerPrice, selectedTrainer, courtNames]);

  // Booking return URL (for auth redirect)
  const bookingReturnToPath = useMemo(() => {
    const p = new URLSearchParams();
    if (selectedLocationSlug) p.set("location", selectedLocationSlug);
    p.set("sport", sport);
    p.set("service", serviceKind);
    p.set("date", date);
    if (serviceKind === "training" && selectedInstructorId) p.set("instructor", selectedInstructorId);
    return `/book?${p.toString()}`;
  }, [selectedLocationSlug, sport, serviceKind, date, selectedInstructorId]);

  // Submit
  async function submitBooking() {
    if (!resolvedService || selectedCells.length === 0 || !isAuthenticated) return;

    setSubmitLoading(true);
    setSubmitError(null);
    setSubmitWarning(null);

    const totalAttempts = selectedCells.length;
    const booked: BookingSuccessSession[] = [];
    const failed: string[] = [];

    for (const cell of selectedCells) {
      const slot = availableTimeSlots.find((s) => getSlotKey(s) === cell.timeKey);
      if (!slot) { failed.push(`${cell.timeKey}: слот недоступен`); continue; }

      const courtId = cell.resourceId;
      const instructorId = serviceKind === "training" ? selectedInstructorId : undefined;

      if (!courtId) { failed.push(`${slot.startTime}: нет свободного корта`); continue; }

      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceId: resolvedService.id,
          location: selectedLocationSlug,
          date,
          startTime: slot.startTime,
          durationMin: 60,
          courtId,
          instructorId,
          customer: {
            name: initialCustomer?.name ?? "",
            email: initialCustomer?.email ?? "",
            phone: initialCustomer?.phone ?? "",
          },
        }),
      });

      const payload = (await res.json().catch(() => null)) as BookingApiSuccessPayload | { error?: string } | null;

      if (!res.ok || (payload && "source" in payload && (payload as BookingApiSuccessPayload).source === "demo-fallback")) {
        const msg = payload && "error" in payload && payload.error ? payload.error : "Не удалось создать бронирование";
        const label = `${slot.startTime} (${courtNames[courtId] ?? courtId}${serviceKind === "training" && selectedTrainer ? ` · ${selectedTrainer.name}` : ""})`;
        failed.push(`${label}: ${msg}`);
        continue;
      }

      const ok = payload as BookingApiSuccessPayload;
      const assignedCourtId =
        ok.data.booking.resources?.find((r) => r.resourceType === "court")?.resourceId ?? courtId;
      const trainerName = serviceKind === "training" ? (selectedTrainer?.name ?? undefined) : undefined;
      booked.push({
        date,
        startTime: slot.startTime,
        endTime: slot.endTime,
        courtLabel: formatCourtLabel(assignedCourtId, courtNames),
        trainerName,
        amount: ok.data.booking.priceTotal,
        currency: ok.data.booking.currency,
      });
    }

    setSubmitLoading(false);

    if (booked.length === 0) {
      setSubmitError(failed[0] ?? "Не удалось создать бронирование");
      return;
    }

    setSubmitSuccessSummary({
      sessions: booked,
      totalAmount: booked.reduce((s, b) => s + b.amount, 0),
      currency: booked[0]?.currency ?? "KZT",
    });
    setSelectedCells([]);
    if (failed.length > 0) {
      setSubmitWarning(`${booked.length} из ${totalAttempts} бронирований создано. Ошибка: ${failed[0]}`);
    }
    setReloadKey((k) => k + 1);
  }

  // ── Render ────────────────────────────────────────────────────────────

  const showConfirm = submitSuccessSummary !== null || selectedCells.length > 0;

  return (
    <section className="booking-flow" aria-labelledby="booking-flow-title">
      <h1 id="booking-flow-title" className="booking-flow__title">
        Забронировать
      </h1>

      {/* ── Location (only if multiple) ── */}
      {hasLocationStep ? (
        <div className="booking-flow__section">
          <p className="booking-flow__section-label">Локация</p>
          <div className="booking-flow__tabs">
            {locations.map((loc) => (
              <Link
                key={loc.id}
                href={`/book?location=${encodeURIComponent(loc.slug)}`}
                className={`booking-flow__tab${selectedLocationSlug === loc.slug ? " booking-flow__tab--active" : ""}`}
              >
                {loc.name}
              </Link>
            ))}
          </div>
          {selectedLocation ? (
            <p className="booking-flow__section-hint">{selectedLocation.address}</p>
          ) : null}
        </div>
      ) : null}

      {/* ── Step 1: What ── */}
      <div className="booking-flow__section">
        <p className="booking-flow__section-label">Шаг 1 — Что бронируем</p>

        {/* Sport tabs */}
        <div className="booking-flow__tabs" role="group" aria-label="Вид спорта">
          {sportOptions.map((opt) => (
            <button
              key={opt.slug}
              type="button"
              className={`booking-flow__tab${sport === opt.slug ? " booking-flow__tab--active" : ""}`}
              onClick={() => setSport(opt.slug)}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Service kind toggle */}
        <div className="booking-flow__toggle" role="group" aria-label="Тип занятия">
          {(["court", "training"] as const).map((kind) => {
            const available = Boolean(availableKindsForSport[kind]);
            return (
              <button
                key={kind}
                type="button"
                disabled={!available}
                className={`booking-flow__toggle-btn${serviceKind === kind ? " booking-flow__toggle-btn--active" : ""}${!available ? " booking-flow__toggle-btn--disabled" : ""}`}
                onClick={() => setServiceKind(kind)}
              >
                {kind === "court" ? "Аренда корта" : "Тренировка с тренером"}
              </button>
            );
          })}
        </div>

        {/* Trainer selection — only for training */}
        {serviceKind === "training" ? (
          <div className="booking-flow__trainers">
            {trainersForSport.length === 0 ? (
              <p className="booking-flow__section-hint">Для этого спорта тренеры пока не добавлены.</p>
            ) : (
              <>
                <p className="booking-flow__section-hint">Выберите тренера:</p>
                <div className="booking-flow__trainer-grid">
                  {trainersForSport.map((trainer) => (
                    <button
                      key={trainer.id}
                      type="button"
                      className={`booking-flow__trainer-card${selectedInstructorId === trainer.id ? " booking-flow__trainer-card--selected" : ""}`}
                      onClick={() => setSelectedInstructorId(trainer.id)}
                    >
                      <span className="booking-flow__trainer-avatar" aria-hidden="true">
                        {trainer.name.split(" ").map((p) => p[0]).slice(0, 2).join("")}
                      </span>
                      <span className="booking-flow__trainer-info">
                        <span className="booking-flow__trainer-name">{trainer.name}</span>
                        <span className="booking-flow__trainer-price">
                          {formatMoneyKzt(trainer.sportPrices[sport] ?? 0)} / час
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        ) : null}
      </div>

      {/* ── Step 2: When ── */}
      <div className="booking-flow__section">
        <p className="booking-flow__section-label">Шаг 2 — Выберите дату и время</p>

        <input
          id="booking-date-live"
          type="date"
          className="booking-flow__date-input"
          min={getTodayDate()}
          value={date}
          onChange={(e) => setDate(e.target.value)}
          aria-label="Дата бронирования"
        />

        {autoDateMessage ? (
          <p className="booking-flow__section-hint booking-flow__section-hint--info">{autoDateMessage}</p>
        ) : null}

        {/* Timetable / loading / error states */}
        {!resolvedService ? (
          <p className="booking-flow__section-hint">Выберите спорт и тип услуги выше.</p>
        ) : serviceKind === "training" && !selectedInstructorId ? (
          <p className="booking-flow__section-hint">Выберите тренера, чтобы увидеть доступное время.</p>
        ) : availabilityLoading ? (
          <div className="booking-flow__slots-skeleton" aria-hidden="true">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div key={n} className="booking-flow__slot-skeleton" />
            ))}
          </div>
        ) : availabilityError ? (
          <div className="booking-flow__error" role="alert">
            {availabilityError}
            <button
              type="button"
              className="booking-flow__retry"
              onClick={() => setReloadKey((k) => k + 1)}
            >
              Повторить
            </button>
          </div>
        ) : availableTimeSlots.length === 0 ? (
          <p className="booking-flow__section-hint">Нет доступного времени на эту дату.</p>
        ) : timetableColumns.length === 0 ? (
          <p className="booking-flow__section-hint">Нет доступных кортов на эту дату.</p>
        ) : (
          <>
            <p className="booking-flow__slots-hint">
              {selectedCells.length > 0
                ? `Выбрано: ${selectedCells.length} ${selectedCells.length === 1 ? "сеанс" : selectedCells.length < 5 ? "сеанса" : "сеансов"}`
                : "Выберите корт и время — можно несколько"}
            </p>

            <div className="booking-flow__timetable-wrapper">
              <table className="booking-flow__timetable">
                <thead>
                  <tr>
                    <th className="booking-flow__timetable-time-header">Время</th>
                    {timetableColumns.map((col) => (
                      <th key={col.id} className="booking-flow__timetable-col-header">
                        <span className="booking-flow__timetable-col-name">{col.label}</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {availableTimeSlots.map((slot) => {
                    const timeKey = getSlotKey(slot);
                    const tier = resolvePricingTier(date, slot.startTime);
                    const courtPrice = courtPrices[sport]?.[tier] ?? 0;
                    return (
                      <tr key={timeKey} className="booking-flow__timetable-row">
                        <td className="booking-flow__timetable-time-cell">
                          <span className="booking-flow__timetable-time-label">
                            {slot.startTime}–{slot.endTime}
                          </span>
                          <span className="booking-flow__timetable-time-price">
                            {formatMoneyKzt(serviceKind === "training" ? courtPrice + selectedTrainerPrice : courtPrice)}
                          </span>
                        </td>
                        {timetableColumns.map((col) => {
                          const isAvailable = slot.availableCourtIds.includes(col.id);
                          const isSelected = selectedCells.some(
                            (c) => c.timeKey === timeKey && c.resourceId === col.id,
                          );
                          const cellPrice =
                            serviceKind === "training" ? courtPrice + selectedTrainerPrice : null;
                          return (
                            <td key={col.id} className="booking-flow__timetable-cell-wrapper">
                              <button
                                type="button"
                                disabled={!isAvailable}
                                className={`booking-flow__timetable-cell${
                                  isSelected
                                    ? " booking-flow__timetable-cell--selected"
                                    : isAvailable
                                    ? " booking-flow__timetable-cell--available"
                                    : " booking-flow__timetable-cell--unavailable"
                                }`}
                                onClick={() => isAvailable && toggleCell(timeKey, col.id)}
                                aria-label={`${slot.startTime}–${slot.endTime}, ${col.label}${!isAvailable ? " — занято" : ""}`}
                                aria-pressed={isSelected}
                              >
                                {isSelected
                                  ? "✓"
                                  : isAvailable && cellPrice !== null
                                  ? formatMoneyKzt(cellPrice)
                                  : null}
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* ── Step 3: Confirm ── */}
      {showConfirm ? (
        <div className="booking-flow__section">
          <p className="booking-flow__section-label">Шаг 3 — Подтверждение</p>

          {/* Success state */}
          {submitSuccessSummary ? (
            <div className="booking-flow__success" role="status">
              <p className="booking-flow__success-title">Бронирование создано</p>
              <div className="booking-flow__success-sessions">
                {submitSuccessSummary.sessions.map((s) => (
                  <div key={`${s.date}-${s.startTime}-${s.courtLabel}`} className="booking-flow__success-row">
                    <span>
                      {s.date}, {s.startTime}–{s.endTime} · {s.courtLabel}
                      {s.trainerName ? ` · ${s.trainerName}` : ""}
                    </span>
                    <span>{formatMoneyKzt(s.amount)}</span>
                  </div>
                ))}
              </div>
              <p className="booking-flow__success-total">
                Итого: <strong>{formatMoneyKzt(submitSuccessSummary.totalAmount)}</strong>
              </p>
              <Link href="/account/bookings" className="booking-flow__account-link">
                Открыть личный кабинет →
              </Link>
            </div>
          ) : (
            <>
              {/* Price breakdown */}
              {pricePreview ? (
                <div className="booking-flow__breakdown">
                  {pricePreview.lines.map((line) => (
                    <div key={line.key} className="booking-flow__breakdown-row">
                      <span>{line.label}</span>
                      <span>{formatMoneyKzt(line.total)}</span>
                    </div>
                  ))}
                  <div className="booking-flow__breakdown-row booking-flow__breakdown-row--total">
                    <span>Итого</span>
                    <span>{formatMoneyKzt(pricePreview.total)}</span>
                  </div>
                </div>
              ) : null}

              {/* Auth gate or submit */}
              {!isAuthenticated ? (
                <div className="booking-flow__auth-gate">
                  <p className="booking-flow__auth-gate-text">
                    Войдите или зарегистрируйтесь, чтобы завершить бронирование
                  </p>
                  <div className="booking-flow__auth-gate-actions">
                    <Link
                      href={`/login?next=${encodeURIComponent(bookingReturnToPath)}`}
                      className="booking-flow__auth-btn booking-flow__auth-btn--primary"
                    >
                      Войти
                    </Link>
                    <Link
                      href={`/register?next=${encodeURIComponent(bookingReturnToPath)}`}
                      className="booking-flow__auth-btn"
                    >
                      Зарегистрироваться
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="booking-flow__submit-area">
                  {initialCustomer?.name ? (
                    <p className="booking-flow__section-hint">
                      Бронирование для: <strong>{initialCustomer.name}</strong>
                      {initialCustomer.phone ? ` · ${initialCustomer.phone}` : ""}
                    </p>
                  ) : null}

                  {submitWarning ? (
                    <p className="booking-flow__warning" role="status">{submitWarning}</p>
                  ) : null}
                  {submitError ? (
                    <p className="booking-flow__error-inline" role="alert">{submitError}</p>
                  ) : null}

                  <button
                    type="button"
                    className={`booking-flow__submit${submitLoading ? " booking-flow__submit--loading" : ""}`}
                    disabled={submitLoading}
                    onClick={() => void submitBooking()}
                  >
                    {submitLoading ? "Создаём бронирование..." : "Забронировать"}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      ) : null}
    </section>
  );
}
