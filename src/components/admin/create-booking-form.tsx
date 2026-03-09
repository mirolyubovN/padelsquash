"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { formatMoneyKzt as formatMoneyKztValue } from "@/src/lib/format/money";
import { resolvePricingTier } from "@/src/lib/pricing/engine";

type PricingTier = "morning" | "day" | "evening_weekend";
type CourtPriceMatrix = Record<string, Record<PricingTier, number>>;
type PaymentMode = "auto" | "wallet" | "cash";

interface SportOption {
  id: string;
  slug: string;
  name: string;
}

interface ServiceOption {
  code: string;
  name: string;
  sportSlug: string;
  requiresInstructor: boolean;
}

interface InstructorOption {
  id: string;
  name: string;
  sportSlugs: string[];
  sportPrices: Record<string, number>;
}

interface LocationOption {
  id: string;
  slug: string;
  name: string;
}

interface CourtOption {
  id: string;
  name: string;
  sportSlug: string;
  locationSlug: string;
}

interface SlotOption {
  startTime: string;
  endTime: string;
  availableCourtIds: string[];
}

interface SelectedSlotCourt {
  startTime: string;
  courtId: string;
  holdId?: string;
}

interface CreatedBookingSummaryItem {
  bookingId: string;
  startTime: string;
  courtId: string;
  amountKzt: number;
  bookingStatus: string;
  paymentStatus: string;
}

interface CustomerSearchItem {
  id: string;
  name: string;
  phone: string;
  email: string;
  balanceKzt: number;
}

export interface CreateBookingActionResult {
  error?: string;
  warning?: string;
  holdId?: string;
  insufficientSlotKey?: string;
  shortfallKzt?: number;
  currentBalanceKzt?: number;
  amountRequiredKzt?: number;
  successCount?: number;
  totalCount?: number;
  groupTotalKzt?: number;
  groupPaidKzt?: number;
  groupRemainingKzt?: number;
  createdSessions?: CreatedBookingSummaryItem[];
}

interface CreateBookingFormProps {
  sports: SportOption[];
  services: ServiceOption[];
  instructors: InstructorOption[];
  courtPricesByLocation: Record<string, CourtPriceMatrix>;
  locations: LocationOption[];
  courts: CourtOption[];
  defaultLocationSlug: string;
  initialLocationSlug?: string;
  initialSportSlug?: string;
  initialServiceCode?: string;
  initialDate?: string;
  initialStartTime?: string;
  initialCourtId?: string;
  initialCustomerName?: string;
  initialCustomerPhone?: string;
  initialCustomerEmail?: string;
  initialCustomerBalanceKzt?: number | null;
  createAction: (formData: FormData) => Promise<CreateBookingActionResult>;
}

interface SuccessSummary {
  successCount: number;
  totalCount: number;
  groupTotalKzt?: number;
  groupPaidKzt?: number;
  groupRemainingKzt?: number;
  warning?: string;
  createdSessions: CreatedBookingSummaryItem[];
}

function getTodayDate() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function formatMoneyKzt(amount?: number | null) {
  if (!Number.isFinite(amount)) return "—";
  return formatMoneyKztValue(Number(amount));
}

function slotKey(startTime: string, courtId: string) {
  return `${startTime}|${courtId}`;
}

const PREFILL_PLACEHOLDER_COURT_ID = "__prefill__";

export function CreateBookingForm(props: CreateBookingFormProps) {
  const {
    sports,
    services,
    instructors,
    courtPricesByLocation,
    locations,
    courts,
    defaultLocationSlug,
    initialLocationSlug,
    initialSportSlug,
    initialServiceCode,
    initialDate,
    initialStartTime,
    initialCourtId,
    initialCustomerName,
    initialCustomerPhone,
    initialCustomerEmail,
    initialCustomerBalanceKzt,
    createAction,
  } = props;

  const initialSelectedCells: SelectedSlotCourt[] =
    initialStartTime
      ? [{ startTime: initialStartTime, courtId: initialCourtId ?? PREFILL_PLACEHOLDER_COURT_ID }]
      : [];

  const [locationSlug, setLocationSlug] = useState(initialLocationSlug ?? defaultLocationSlug);
  const [sportSlug, setSportSlug] = useState(initialSportSlug ?? sports[0]?.slug ?? "");
  const [serviceCode, setServiceCode] = useState(initialServiceCode ?? "");
  const [instructorId, setInstructorId] = useState("");
  const [date, setDate] = useState(initialDate ?? getTodayDate());
  const [slots, setSlots] = useState<SlotOption[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState<string | null>(null);
  const [selectedCells, setSelectedCells] = useState<SelectedSlotCourt[]>(initialSelectedCells);

  const [customerName, setCustomerName] = useState(initialCustomerName ?? "");
  const [customerPhone, setCustomerPhone] = useState(initialCustomerPhone ?? "");
  const [customerEmail, setCustomerEmail] = useState(initialCustomerEmail ?? "");
  const [customerBalanceKzt, setCustomerBalanceKzt] = useState<number | null>(initialCustomerBalanceKzt ?? null);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [customerSearchQuery, setCustomerSearchQuery] = useState("");
  const [customerSearchResults, setCustomerSearchResults] = useState<CustomerSearchItem[]>([]);
  const [customerSearchLoading, setCustomerSearchLoading] = useState(false);
  const [customerSearchError, setCustomerSearchError] = useState<string | null>(null);
  const [customerLookupLoading, setCustomerLookupLoading] = useState(false);
  const [customerLookupError, setCustomerLookupError] = useState<string | null>(null);
  const suppressNextCustomerSearchRef = useRef(false);

  const [paymentMode, setPaymentMode] = useState<PaymentMode>("auto");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitWarning, setSubmitWarning] = useState<string | null>(null);
  const [shortfallKzt, setShortfallKzt] = useState<number | null>(null);
  const [currentBalanceKzt, setCurrentBalanceKzt] = useState<number | null>(null);
  const [amountRequiredKzt, setAmountRequiredKzt] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [successSummary, setSuccessSummary] = useState<SuccessSummary | null>(null);

  const didInitializeSportRef = useRef(false);
  const didApplyInitialSelectionRef = useRef(false);

  const servicesForSport = useMemo(() => services.filter((service) => service.sportSlug === sportSlug), [services, sportSlug]);
  const resolvedService = servicesForSport.find((service) => service.code === serviceCode) ?? servicesForSport[0] ?? null;
  const needsInstructor = resolvedService?.requiresInstructor ?? false;
  const instructorsForSport = useMemo(
    () => instructors.filter((instructor) => instructor.sportSlugs.includes(sportSlug)),
    [instructors, sportSlug],
  );
  const selectedTrainer = instructorsForSport.find((instructor) => instructor.id === instructorId) ?? null;
  const selectedTrainerPrice = selectedTrainer?.sportPrices[sportSlug] ?? 0;
  const courtNames = useMemo(() => new Map(courts.map((court) => [court.id, court.name])), [courts]);
  const activeCourtPrices = useMemo(
    () => courtPricesByLocation[locationSlug] ?? courtPricesByLocation[defaultLocationSlug] ?? {},
    [courtPricesByLocation, locationSlug, defaultLocationSlug],
  );
  const selectedKeys = useMemo(() => new Set(selectedCells.map((cell) => slotKey(cell.startTime, cell.courtId))), [selectedCells]);
  const hasHeldSelection = selectedCells.some((cell) => Boolean(cell.holdId));

  const timetableColumns = useMemo(() => {
    const ids = new Set<string>();
    for (const slot of slots) for (const id of slot.availableCourtIds) ids.add(id);
    return Array.from(ids).map((id) => ({ id, label: courtNames.get(id) ?? id }));
  }, [slots, courtNames]);

  const pricePreview = useMemo(() => {
    if (!resolvedService || selectedCells.length === 0) return null;
    const lines = selectedCells
      .map((cell) => {
        const slot = slots.find((row) => row.startTime === cell.startTime);
        if (!slot) return null;
        const tier = resolvePricingTier(date, slot.startTime);
        const courtPrice = activeCourtPrices[sportSlug]?.[tier] ?? 0;
        const total = courtPrice + (needsInstructor ? selectedTrainerPrice : 0);
        const courtLabel = courtNames.get(cell.courtId) ?? cell.courtId;
        return {
          key: `${cell.startTime}:${cell.courtId}`,
          label: needsInstructor && selectedTrainer
            ? `${slot.startTime}–${slot.endTime} · ${courtLabel} · ${selectedTrainer.name}`
            : `${slot.startTime}–${slot.endTime} · ${courtLabel}`,
          total,
        };
      })
      .filter((line): line is { key: string; label: string; total: number } => Boolean(line));
    if (lines.length === 0) return null;
    return { lines, total: lines.reduce((sum, line) => sum + line.total, 0) };
  }, [resolvedService, selectedCells, slots, date, activeCourtPrices, sportSlug, needsInstructor, selectedTrainerPrice, selectedTrainer, courtNames]);

  const selectedCustomerLocked = Boolean(selectedCustomerId);

  const clearHoldState = useCallback(() => {
    setShortfallKzt(null);
    setCurrentBalanceKzt(null);
    setAmountRequiredKzt(null);
  }, []);

  const resetSelection = useCallback(() => {
    setSelectedCells([]);
    clearHoldState();
    setSubmitError(null);
    setSubmitWarning(null);
  }, [clearHoldState]);

  useEffect(() => {
    const fallback = servicesForSport.find((service) => service.code === initialServiceCode) ?? servicesForSport[0] ?? null;
    setServiceCode(fallback?.code ?? "");
    setInstructorId("");
    setSlots([]);
    didApplyInitialSelectionRef.current = false;
    if (didInitializeSportRef.current) resetSelection();
    else didInitializeSportRef.current = true;
  }, [sportSlug, servicesForSport, initialServiceCode, resetSelection]);

  useEffect(() => {
    if (!resolvedService || !date || (needsInstructor && !instructorId)) {
      setSlots([]);
      return;
    }

    let cancelled = false;
    setSlotsLoading(true);
    setSlotsError(null);
    const params = new URLSearchParams({ serviceId: resolvedService.code, location: locationSlug, date, durationMin: "60" });
    if (needsInstructor && instructorId) params.set("instructorId", instructorId);

    fetch(`/api/availability?${params.toString()}`, { cache: "no-store" })
      .then((res) => res.json())
      .then((payload: { slots?: SlotOption[]; error?: string }) => {
        if (cancelled) return;
        if (payload.error) {
          setSlotsError(payload.error);
          setSlots([]);
        } else {
          setSlots(payload.slots ?? []);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSlotsError("Не удалось загрузить слоты");
          setSlots([]);
        }
      })
      .finally(() => { if (!cancelled) setSlotsLoading(false); });

    return () => { cancelled = true; };
  }, [resolvedService, date, locationSlug, needsInstructor, instructorId]);

  useEffect(() => {
    if (slots.length === 0) return;
    setSelectedCells((prev) =>
      prev.filter((cell) => {
        const isInitialPrefillCell =
          Boolean(initialStartTime) &&
          cell.startTime === initialStartTime &&
          cell.courtId === (initialCourtId ?? PREFILL_PLACEHOLDER_COURT_ID);
        if (isInitialPrefillCell) return true;
        return slots.some((slot) => slot.startTime === cell.startTime && slot.availableCourtIds.includes(cell.courtId));
      }),
    );
  }, [slots, initialStartTime, initialCourtId]);

  const pinnedSelectedCells = useMemo(
    () =>
      selectedCells.filter(
        (cell) => !slots.some((slot) => slot.startTime === cell.startTime && slot.availableCourtIds.includes(cell.courtId)),
      ),
    [selectedCells, slots],
  );

  useEffect(() => {
    if (didApplyInitialSelectionRef.current || !initialStartTime || slots.length === 0) return;
    const slot = slots.find((row) => row.startTime === initialStartTime);
    if (!slot) {
      didApplyInitialSelectionRef.current = true;
      return;
    }
    const courtId = initialCourtId && slot.availableCourtIds.includes(initialCourtId) ? initialCourtId : slot.availableCourtIds[0];
    if (courtId) setSelectedCells((prev) => prev.some((cell) => slotKey(cell.startTime, cell.courtId) === slotKey(initialStartTime, courtId)) ? prev : [...prev, { startTime: initialStartTime, courtId }]);
    didApplyInitialSelectionRef.current = true;
  }, [initialStartTime, initialCourtId, slots]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const query = new URLSearchParams(window.location.search);
    const queryTime = query.get("time");
    const queryCourt = query.get("court");
    if (!queryTime || !/^\d{2}:00$/.test(queryTime)) return;
    setSelectedCells((prev) => {
      if (prev.length > 0) return prev;
      return [{ startTime: queryTime, courtId: queryCourt || PREFILL_PLACEHOLDER_COURT_ID }];
    });
  }, []);

  useEffect(() => {
    if (!initialStartTime) return;
    setSelectedCells((prev) => {
      const hasPlaceholder = prev.some(
        (cell) => cell.startTime === initialStartTime && cell.courtId === PREFILL_PLACEHOLDER_COURT_ID,
      );
      if (!hasPlaceholder) return prev;
      const matchingSlot = slots.find((slot) => slot.startTime === initialStartTime);
      const fallbackCourtId = matchingSlot?.availableCourtIds[0];
      if (!fallbackCourtId) return prev;
      return prev.map((cell) =>
        cell.startTime === initialStartTime && cell.courtId === PREFILL_PLACEHOLDER_COURT_ID
          ? { ...cell, courtId: fallbackCourtId }
          : cell,
      );
    });
  }, [slots, initialStartTime]);

  useEffect(() => {
    const email = customerEmail.trim().toLowerCase();
    if (!email || !email.includes("@")) {
      setCustomerLookupLoading(false);
      setCustomerLookupError(null);
      return;
    }
    let cancelled = false;
    setCustomerLookupLoading(true);
    fetch(`/api/admin/customers/by-email?email=${encodeURIComponent(email)}`, { cache: "no-store" })
      .then((res) => res.json())
      .then((payload: { found?: boolean; customer?: { name: string; phone: string; balanceKzt: number }; error?: string }) => {
        if (cancelled) return;
        if (!payload || payload.error) {
          setCustomerLookupError("Не удалось проверить баланс клиента.");
          return;
        }
        setCustomerLookupError(null);
        if (!payload.found || !payload.customer) {
          setCustomerBalanceKzt(0);
          return;
        }
        setCustomerBalanceKzt(payload.customer.balanceKzt);
        setCustomerName((prev) => (prev.trim() ? prev : payload.customer!.name));
        setCustomerPhone((prev) => (prev.trim() ? prev : payload.customer!.phone));
      })
      .catch(() => { if (!cancelled) setCustomerLookupError("Не удалось проверить баланс клиента."); })
      .finally(() => { if (!cancelled) setCustomerLookupLoading(false); });
    return () => { cancelled = true; };
  }, [customerEmail]);

  useEffect(() => {
    if (suppressNextCustomerSearchRef.current) {
      suppressNextCustomerSearchRef.current = false;
      setCustomerSearchResults([]);
      setCustomerSearchLoading(false);
      setCustomerSearchError(null);
      return;
    }

    const query = customerSearchQuery.trim();
    const digits = query.replace(/\D/g, "");
    if (query.length < 2 && digits.length < 4) {
      setCustomerSearchResults([]);
      setCustomerSearchError(null);
      setCustomerSearchLoading(false);
      return;
    }
    let cancelled = false;
    setCustomerSearchLoading(true);
    fetch(`/api/admin/customers/search?q=${encodeURIComponent(query)}`, { cache: "no-store" })
      .then((res) => res.json())
      .then((payload: { customers?: CustomerSearchItem[]; error?: string }) => {
        if (cancelled) return;
        if (!payload || payload.error) {
          setCustomerSearchError("Не удалось выполнить поиск клиента.");
          setCustomerSearchResults([]);
          return;
        }
        setCustomerSearchError(null);
        setCustomerSearchResults(payload.customers ?? []);
      })
      .catch(() => { if (!cancelled) setCustomerSearchError("Не удалось выполнить поиск клиента."); })
      .finally(() => { if (!cancelled) setCustomerSearchLoading(false); });
    return () => { cancelled = true; };
  }, [customerSearchQuery]);

  function toggleCell(startTime: string, courtId: string) {
    const key = slotKey(startTime, courtId);
    setSelectedCells((prev) => {
      const idx = prev.findIndex((cell) => slotKey(cell.startTime, cell.courtId) === key);
      if (idx >= 0) return prev.filter((_, i) => i !== idx);
      return [...prev, { startTime, courtId }];
    });
    setSubmitError(null);
    setSubmitWarning(null);
    clearHoldState();
  }

  function applyCustomer(customer: CustomerSearchItem) {
    setSelectedCustomerId(customer.id);
    setCustomerName(customer.name);
    setCustomerPhone(customer.phone);
    setCustomerEmail(customer.email);
    setCustomerBalanceKzt(customer.balanceKzt);
    suppressNextCustomerSearchRef.current = true;
    setCustomerSearchResults([]);
    setCustomerSearchQuery(customer.name);
    setCustomerSearchError(null);
  }

  function clearSelectedCustomer() {
    setSelectedCustomerId(null);
    setCustomerName("");
    setCustomerPhone("");
    setCustomerEmail("");
    setCustomerBalanceKzt(null);
    setCustomerSearchQuery("");
    setCustomerSearchResults([]);
    setCustomerSearchError(null);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!resolvedService || selectedCells.length === 0) return;

    let cellsForSubmit = selectedCells.filter((cell) => cell.courtId !== PREFILL_PLACEHOLDER_COURT_ID);

    if (cellsForSubmit.length === 0 && slots.length > 0) {
      const fallbackCourtId = slots[0]?.availableCourtIds[0];
      if (fallbackCourtId) {
        cellsForSubmit = [{ startTime: slots[0].startTime, courtId: fallbackCourtId }];
        setSubmitWarning("Выбранный в календаре слот недоступен. Использован ближайший свободный слот.");
      }
    }

    if (cellsForSubmit.length === 0) {
      setSubmitError("Выберите доступный слот и корт.");
      return;
    }

    const formData = new FormData(event.currentTarget);
    formData.set("locationSlug", locationSlug);
    formData.set("serviceCode", resolvedService.code);
    formData.set("date", date);
    formData.set("customerName", customerName);
    formData.set("customerPhone", customerPhone);
    formData.set("customerEmail", customerEmail.trim().toLowerCase());
    formData.set("paymentMode", paymentMode);
    if (selectedCustomerId) formData.set("customerId", selectedCustomerId);
    if (needsInstructor) formData.set("instructorId", instructorId);
    for (const cell of cellsForSubmit) {
      const key = slotKey(cell.startTime, cell.courtId);
      formData.append("slotCourt", key);
      if (cell.holdId) formData.append("slotHold", `${key}|${cell.holdId}`);
    }

    setSubmitting(true);
    setSubmitError(null);
    setSubmitWarning(null);
    try {
      const result = await createAction(formData);
      setSubmitWarning(result.warning ?? null);
      setShortfallKzt(result.shortfallKzt ?? null);
      setCurrentBalanceKzt(result.currentBalanceKzt ?? null);
      setAmountRequiredKzt(result.amountRequiredKzt ?? null);
      if (result.insufficientSlotKey && result.holdId) {
        const insufficientSlotKey = result.insufficientSlotKey;
        const holdId = result.holdId;
        setSelectedCells((prev) => {
          const updated = prev.map((cell) =>
            slotKey(cell.startTime, cell.courtId) === insufficientSlotKey ? { ...cell, holdId } : cell,
          );
          if (updated.some((cell) => slotKey(cell.startTime, cell.courtId) === insufficientSlotKey)) {
            return updated;
          }
          const [startTime, courtId] = insufficientSlotKey.split("|");
          if (!startTime || !courtId) return updated;
          return [...updated, { startTime, courtId, holdId }];
        });
      }
      if (result.successCount && result.successCount > 0) {
        setSuccessSummary({
          successCount: result.successCount,
          totalCount: result.totalCount ?? result.successCount,
          groupTotalKzt: result.groupTotalKzt,
          groupPaidKzt: result.groupPaidKzt,
          groupRemainingKzt: result.groupRemainingKzt,
          warning: result.warning,
          createdSessions: result.createdSessions ?? [],
        });
      }
      if (result.error) setSubmitError(result.error);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Ошибка создания бронирования");
      clearHoldState();
    } finally {
      setSubmitting(false);
    }
  }

  if (successSummary && !submitError) {
    return (
      <div className="booking-flow" role="status">
        <p className="booking-flow__success-title">
          Создано позиций: {successSummary.successCount} из {successSummary.totalCount}
        </p>
        {successSummary.groupTotalKzt !== undefined ? (
          <div className="booking-flow__breakdown">
            <div className="booking-flow__breakdown-row">
              <span>Итого по бронированию</span>
              <span>{formatMoneyKzt(successSummary.groupTotalKzt)}</span>
            </div>
            <div className="booking-flow__breakdown-row">
              <span>Оплачено сейчас</span>
              <span>{formatMoneyKzt(successSummary.groupPaidKzt ?? 0)}</span>
            </div>
            <div className="booking-flow__breakdown-row booking-flow__breakdown-row--total">
              <span>Осталось к оплате</span>
              <span>{formatMoneyKzt(successSummary.groupRemainingKzt ?? 0)}</span>
            </div>
          </div>
        ) : null}
        <ul className="admin-create-booking__created-list">
          {successSummary.createdSessions.slice(0, 10).map((item) => (
            <li key={item.bookingId} className="admin-create-booking__created-item">
              {item.startTime} · {courtNames.get(item.courtId) ?? item.courtId} · {formatMoneyKzt(item.amountKzt)} ·{" "}
              {item.paymentStatus === "paid" ? "оплачено" : "не оплачено"}
            </li>
          ))}
        </ul>
        <div className="admin-create-booking__success-actions">
          <a href="/admin/bookings" className="admin-form__submit">К списку бронирований</a>
          <button type="button" className="admin-bookings__action-button" onClick={() => { setSuccessSummary(null); resetSelection(); }}>
            Создать ещё
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="booking-flow admin-create-booking__form">
      <h1 className="booking-flow__title">Создать бронирование</h1>

      <div className="booking-flow__section">
        <p className="booking-flow__section-label">Шаг 1 — Что бронируем</p>
        {locations.length > 1 ? (
          <div className="booking-flow__tabs">
            {locations.map((location) => (
              <button key={location.id} type="button" className={`booking-flow__tab${locationSlug === location.slug ? " booking-flow__tab--active" : ""}`} onClick={() => { setLocationSlug(location.slug); resetSelection(); }}>
                {location.name}
              </button>
            ))}
          </div>
        ) : null}

        <div className="booking-flow__tabs">
          {sports.map((sport) => (
            <button key={sport.slug} type="button" className={`booking-flow__tab${sportSlug === sport.slug ? " booking-flow__tab--active" : ""}`} onClick={() => setSportSlug(sport.slug)}>
              {sport.name}
            </button>
          ))}
        </div>

        <div className="booking-flow__toggle">
          {servicesForSport.map((service) => (
            <button key={service.code} type="button" className={`booking-flow__toggle-btn${serviceCode === service.code ? " booking-flow__toggle-btn--active" : ""}`} onClick={() => { setServiceCode(service.code); setInstructorId(""); resetSelection(); }}>
              {service.name}
            </button>
          ))}
        </div>

        {needsInstructor ? (
          <div className="booking-flow__trainer-grid">
            {instructorsForSport.map((trainer) => (
              <button key={trainer.id} type="button" className={`booking-flow__trainer-card${instructorId === trainer.id ? " booking-flow__trainer-card--selected" : ""}`} onClick={() => { setInstructorId(trainer.id); resetSelection(); }}>
                <span className="booking-flow__trainer-avatar">{trainer.name.split(" ").map((part) => part[0]).slice(0, 2).join("")}</span>
                <span className="booking-flow__trainer-info">
                  <span className="booking-flow__trainer-name">{trainer.name}</span>
                  <span className="booking-flow__trainer-price">{formatMoneyKzt(trainer.sportPrices[sportSlug])} / час</span>
                </span>
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div className="booking-flow__section">
        <p className="booking-flow__section-label">Шаг 2 — Дата, время и корт</p>
        <input id="cb-date" type="date" className="booking-flow__date-input" min={getTodayDate()} value={date} onChange={(e) => { setDate(e.target.value); resetSelection(); }} required />
        {selectedCells.length > 0 ? <p className="booking-flow__slots-hint">Выбрано позиций: {selectedCells.length}</p> : null}
        {slotsLoading ? (
          <div className="booking-flow__slots-skeleton">{[1, 2, 3, 4, 5, 6].map((n) => <div key={n} className="booking-flow__slot-skeleton" />)}</div>
        ) : slotsError ? (
          <p className="admin-create-booking__slots-error">{slotsError}</p>
        ) : slots.length === 0 ? (
          <p className="booking-flow__section-hint">{needsInstructor && !instructorId ? "Сначала выберите тренера" : "Нет доступных слотов на эту дату"}</p>
        ) : (
          <>
            {pinnedSelectedCells.length > 0 ? (
              <div className="admin-create-booking__slots">
                {pinnedSelectedCells.map((cell) => (
                  <div key={slotKey(cell.startTime, cell.courtId)} className="admin-create-booking__slot-row">
                    <span className="admin-create-booking__slot-time">{cell.startTime}</span>
                    <button type="button" className="admin-create-booking__slot admin-create-booking__slot--active">
                      {cell.courtId === PREFILL_PLACEHOLDER_COURT_ID ? "Выберите корт" : courtNames.get(cell.courtId) ?? cell.courtId}
                    </button>
                  </div>
                ))}
              </div>
            ) : null}

            <div className="booking-flow__timetable-wrapper">
              <table className="booking-flow__timetable">
                <thead>
                  <tr>
                    <th className="booking-flow__timetable-time-header">Время</th>
                    {timetableColumns.map((column) => <th key={column.id} className="booking-flow__timetable-col-header"><span className="booking-flow__timetable-col-name">{column.label}</span></th>)}
                  </tr>
                </thead>
                <tbody>
                  {slots.map((slot) => {
                    const tier = resolvePricingTier(date, slot.startTime);
                    const courtPrice = activeCourtPrices[sportSlug]?.[tier] ?? 0;
                    const amount = courtPrice + (needsInstructor ? selectedTrainerPrice : 0);
                    return (
                      <tr key={slot.startTime} className="booking-flow__timetable-row">
                        <td className="booking-flow__timetable-time-cell">
                          <span className="booking-flow__timetable-time-label admin-create-booking__slot-time">{slot.startTime}–{slot.endTime}</span>
                          <span className="booking-flow__timetable-time-price">{formatMoneyKzt(amount)}</span>
                        </td>
                        {timetableColumns.map((column) => {
                          const available = slot.availableCourtIds.includes(column.id);
                          const active = selectedKeys.has(slotKey(slot.startTime, column.id));
                          return (
                            <td key={column.id} className="booking-flow__timetable-cell-wrapper">
                              <button type="button" disabled={!available} className={`booking-flow__timetable-cell admin-create-booking__slot${active ? " booking-flow__timetable-cell--selected admin-create-booking__slot--active" : available ? " booking-flow__timetable-cell--available" : " booking-flow__timetable-cell--unavailable"}`} onClick={() => { if (available) toggleCell(slot.startTime, column.id); }}>
                                {active ? "✓" : available ? formatMoneyKzt(amount) : null}
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

      <div className="booking-flow__section">
        <p className="booking-flow__section-label">Шаг 3 — Клиент и подтверждение</p>
        <div className="admin-create-booking__customer-search">
          <label className="admin-form__label" htmlFor="cb-customer-query">Найти клиента (имя или телефон)</label>
          <input
            id="cb-customer-query"
            className="admin-form__field"
            value={customerSearchQuery}
            onChange={(e) => {
              setCustomerSearchQuery(e.target.value);
            }}
            placeholder="Имя или телефон"
          />
          {customerSearchLoading ? <p className="booking-flow__slots-hint">Ищем клиента...</p> : null}
          {customerSearchError ? <p className="admin-create-booking__slots-error">{customerSearchError}</p> : null}
          {customerSearchResults.length > 0 ? (
            <div className="admin-create-booking__customer-results">
              {customerSearchResults.map((customer) => (
                <button
                  key={`${customer.id}:${customer.phone}`}
                  type="button"
                  className="admin-create-booking__customer-result"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => applyCustomer(customer)}
                >
                  <span className="admin-create-booking__customer-result-name">{customer.name}</span>
                  <span className="admin-create-booking__customer-result-meta">{customer.phone} · {customer.email}</span>
                  <span className="admin-create-booking__customer-result-balance">{formatMoneyKzt(customer.balanceKzt)}</span>
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div className="admin-form__panel-grid">
          <div className="admin-form__group">
            <label className="admin-form__label" htmlFor="cb-name">Имя</label>
            <input
              id="cb-name"
              name="customerName"
              className={`admin-form__field${selectedCustomerLocked ? " admin-form__field--locked" : ""}`}
              value={customerName}
              readOnly={selectedCustomerLocked}
              onChange={(e) => {
                if (!selectedCustomerLocked) {
                  setCustomerName(e.target.value);
                }
              }}
              required
            />
          </div>
          <div className="admin-form__group">
            <label className="admin-form__label" htmlFor="cb-phone">Телефон</label>
            <input
              id="cb-phone"
              name="customerPhone"
              className={`admin-form__field${selectedCustomerLocked ? " admin-form__field--locked" : ""}`}
              value={customerPhone}
              readOnly={selectedCustomerLocked}
              onChange={(e) => {
                if (!selectedCustomerLocked) {
                  setCustomerPhone(e.target.value);
                }
              }}
              required
            />
          </div>
          <div className="admin-form__group">
            <label className="admin-form__label" htmlFor="cb-email">Email</label>
            <input
              id="cb-email"
              name="customerEmail"
              type="email"
              className={`admin-form__field${selectedCustomerLocked ? " admin-form__field--locked" : ""}`}
              value={customerEmail}
              readOnly={selectedCustomerLocked}
              onChange={(e) => {
                if (!selectedCustomerLocked) {
                  setCustomerEmail(e.target.value);
                }
              }}
              required
            />
          </div>
        </div>

        {selectedCustomerLocked ? (
          <div className="admin-form__actions">
            <p className="booking-flow__section-hint">
              Данные выбранного клиента можно изменить только в разделе Клиенты.
            </p>
            <button type="button" className="admin-bookings__action-button" onClick={clearSelectedCustomer}>
              Выбрать другого клиента
            </button>
          </div>
        ) : null}

        <div className="booking-flow__section-hint">Баланс клиента: {formatMoneyKzt(customerBalanceKzt)}</div>
        {customerLookupLoading ? <p className="booking-flow__slots-hint">Проверяем баланс клиента...</p> : null}
        {customerLookupError ? <p className="admin-create-booking__slots-error">{customerLookupError}</p> : null}

        <div className="admin-create-booking__payment-options">
          <label className="admin-create-booking__payment-option"><input type="radio" checked={paymentMode === "auto"} onChange={() => setPaymentMode("auto")} /> <span>Авто: списать доступный баланс, остаток оставить неоплаченным</span></label>
          <label className="admin-create-booking__payment-option"><input type="radio" checked={paymentMode === "wallet"} onChange={() => setPaymentMode("wallet")} /> <span>Только баланс клиента</span></label>
          <label className="admin-create-booking__payment-option"><input type="radio" checked={paymentMode === "cash"} onChange={() => setPaymentMode("cash")} /> <span>Оплата в клубе (наличные или карта)</span></label>
        </div>
        {pricePreview ? (
          <div className="booking-flow__breakdown">
            {pricePreview.lines.map((line) => <div key={line.key} className="booking-flow__breakdown-row"><span>{line.label}</span><span>{formatMoneyKzt(line.total)}</span></div>)}
            <div className="booking-flow__breakdown-row booking-flow__breakdown-row--total"><span>Итого</span><span>{formatMoneyKzt(pricePreview.total)}</span></div>
          </div>
        ) : null}

        {amountRequiredKzt !== null || currentBalanceKzt !== null || shortfallKzt !== null ? (
          <p className="booking-flow__section-hint">
            {amountRequiredKzt !== null ? `Нужно на бронь: ${formatMoneyKzt(amountRequiredKzt)}. ` : ""}
            {currentBalanceKzt !== null ? `Сейчас на балансе: ${formatMoneyKzt(currentBalanceKzt)}. ` : ""}
            {shortfallKzt !== null ? `Не хватает: ${formatMoneyKzt(shortfallKzt)}.` : ""}
          </p>
        ) : null}
        {submitWarning ? <p className="booking-flow__warning admin-create-booking__warning" role="status">{submitWarning}</p> : null}
        {submitError ? <p className="booking-flow__error-inline admin-create-booking__error" role="alert">{submitError}</p> : null}
        <button type="submit" className="booking-flow__submit" disabled={submitting || selectedCells.length === 0}>
          {submitting ? "Создание..." : hasHeldSelection && paymentMode === "wallet" ? "Повторить после пополнения" : "Создать бронирования"}
        </button>
      </div>
    </form>
  );
}
