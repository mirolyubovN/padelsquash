"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { resolvePricingTier } from "@/src/lib/pricing/engine";

type Sport = "padel" | "squash";
type ServiceKind = "court" | "training";
type PricingTier = "morning" | "day" | "evening_weekend";

interface ServiceOption {
  id: string;
  name: string;
  sport: Sport;
  requiresCourt: boolean;
  requiresInstructor: boolean;
}

interface InstructorOption {
  id: string;
  name: string;
  sport: Sport;
  prices: Record<PricingTier, number>;
}

type CourtPriceMatrix = Record<Sport, Record<PricingTier, number>>;

interface SlotOption {
  startTime: string;
  endTime: string;
  availableCourtIds: string[];
  availableInstructorIds: string[];
}

interface AvailabilityPayload {
  meta: {
    source: string;
    timezone: string;
  };
  service: {
    id: string;
    name: string;
    sport: Sport;
    requiresCourt: boolean;
    requiresInstructor: boolean;
  };
  date: string;
  slots: SlotOption[];
}

interface BookingApiSuccessPayload {
  message: string;
  source: "db" | "demo-fallback";
  note?: string;
  data: {
    booking: {
      id: string;
      status: string;
      priceTotal: number;
      currency: string;
    };
    payment: {
      provider: string;
      status: string;
    };
  };
}

interface LiveBookingFormProps {
  services: ServiceOption[];
  courtNames: Record<string, string>;
  instructors: InstructorOption[];
  courtPrices: CourtPriceMatrix;
  isAuthenticated: boolean;
  initialCustomer?: {
    name?: string;
    email?: string;
    phone?: string;
  };
}

interface CourtTimeslotRow {
  key: string;
  courtId: string;
  startTime: string;
  endTime: string;
  instructorIds: string[];
}

function getTodayDate(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function addDays(dateIso: string, days: number): string {
  const date = new Date(`${dateIso}T00:00:00`);
  date.setDate(date.getDate() + days);
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function detectServiceKind(service: ServiceOption): ServiceKind {
  return service.requiresInstructor ? "training" : "court";
}

function getSportLabel(sport: Sport): string {
  return sport === "padel" ? "Падел" : "Сквош";
}

function getServiceKindLabel(kind: ServiceKind): string {
  return kind === "training" ? "Тренировка" : "Аренда корта";
}

function getTierLabel(tier: PricingTier): string {
  if (tier === "morning") return "Утро";
  if (tier === "day") return "День";
  return "Вечер / выходные";
}

function formatMoneyKzt(amount: number): string {
  return `${amount.toLocaleString("ru-KZ")} ₸`;
}

function formatCourtLabel(courtId: string, courtNames: Record<string, string>): string {
  return courtNames[courtId] ?? courtId;
}

async function fetchAvailability(serviceId: string, date: string): Promise<AvailabilityPayload> {
  const response = await fetch(
    `/api/availability?serviceId=${encodeURIComponent(serviceId)}&date=${encodeURIComponent(date)}&durationMin=60`,
    { method: "GET", cache: "no-store" },
  );

  const payload = (await response.json().catch(() => null)) as
    | AvailabilityPayload
    | { error?: string }
    | null;

  if (!response.ok) {
    throw new Error(
      payload && typeof payload === "object" && "error" in payload && payload.error
        ? payload.error
        : "Не удалось получить доступность",
    );
  }

  return payload as AvailabilityPayload;
}

export function LiveBookingForm({
  services,
  courtNames,
  instructors,
  courtPrices,
  isAuthenticated,
  initialCustomer,
}: LiveBookingFormProps) {
  const serviceMatrix = useMemo(() => {
    const result: Record<Sport, Partial<Record<ServiceKind, ServiceOption>>> = {
      padel: {},
      squash: {},
    };
    for (const service of services) {
      const kind = detectServiceKind(service);
      if (!result[service.sport][kind]) {
        result[service.sport][kind] = service;
      }
    }
    return result;
  }, [services]);

  const initialSport: Sport = serviceMatrix.padel.court || serviceMatrix.padel.training ? "padel" : "squash";
  const initialKind: ServiceKind = serviceMatrix[initialSport].court ? "court" : "training";

  const [sport, setSport] = useState<Sport>(initialSport);
  const [serviceKind, setServiceKind] = useState<ServiceKind>(initialKind);
  const [date, setDate] = useState<string>(getTodayDate);
  const [availability, setAvailability] = useState<AvailabilityPayload | null>(null);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [availabilityError, setAvailabilityError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [autoDateMessage, setAutoDateMessage] = useState<string | null>(null);
  const [autoSearchKey, setAutoSearchKey] = useState<string>("");

  const [selectedSlotKey, setSelectedSlotKey] = useState("");
  const [selectedInstructorId, setSelectedInstructorId] = useState("");

  const [customerName, setCustomerName] = useState(initialCustomer?.name ?? "");
  const [customerEmail, setCustomerEmail] = useState(initialCustomer?.email ?? "");
  const [customerPhone, setCustomerPhone] = useState(initialCustomer?.phone ?? "");
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<BookingApiSuccessPayload | null>(null);

  const resolvedService = serviceMatrix[sport][serviceKind] ?? null;
  const availableKindsForSport = serviceMatrix[sport];
  const instructorsById = useMemo(
    () => Object.fromEntries(instructors.map((instructor) => [instructor.id, instructor])),
    [instructors],
  );

  useEffect(() => {
    if (!resolvedService) {
      if (availableKindsForSport.court) {
        setServiceKind("court");
      } else if (availableKindsForSport.training) {
        setServiceKind("training");
      }
    }
  }, [availableKindsForSport, resolvedService]);

  useEffect(() => {
    setSelectedSlotKey("");
    setSelectedInstructorId("");
    setSubmitError(null);
    setSubmitSuccess(null);
    setAutoDateMessage(null);
    setAutoSearchKey("");
  }, [sport, serviceKind, date]);

  useEffect(() => {
    if (!resolvedService || !date) {
      setAvailability(null);
      return;
    }
    const service = resolvedService;

    let cancelled = false;

    async function load() {
      setAvailabilityLoading(true);
      setAvailabilityError(null);
      try {
        const payload = await fetchAvailability(service.id, date);
        if (!cancelled) {
          setAvailability(payload);
        }
      } catch (error) {
        if (!cancelled) {
          setAvailability(null);
          setAvailabilityError(error instanceof Error ? error.message : "Ошибка запроса доступности");
        }
      } finally {
        if (!cancelled) {
          setAvailabilityLoading(false);
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [resolvedService, date, reloadKey]);

  useEffect(() => {
    if (!resolvedService || availabilityLoading || availabilityError || !availability) {
      return;
    }

    if (availability.slots.length > 0) {
      return;
    }

    const key = `${resolvedService.id}:${date}`;
    const service = resolvedService;
    if (autoSearchKey === key) {
      return;
    }

    let cancelled = false;
    setAutoSearchKey(key);

    async function findNearestDate() {
      for (let i = 1; i <= 14; i += 1) {
          const nextDate = addDays(date, i);
          try {
            const nextAvailability = await fetchAvailability(service.id, nextDate);
          if (cancelled) return;
          if (nextAvailability.slots.length > 0) {
            setAutoDateMessage(`На ${date} слотов нет. Показана ближайшая дата: ${nextDate}.`);
            setDate(nextDate);
            return;
          }
        } catch {
          if (cancelled) return;
        }
      }
      if (!cancelled) {
        setAutoDateMessage("Не найдено доступных слотов в ближайшие 14 дней.");
      }
    }

    void findNearestDate();
    return () => {
      cancelled = true;
    };
  }, [resolvedService, availabilityLoading, availabilityError, availability, date, autoSearchKey]);

  const expandedTimeslots = useMemo<CourtTimeslotRow[]>(() => {
    if (!availability) return [];

    const rows: CourtTimeslotRow[] = [];
    for (const slot of availability.slots) {
      for (const courtId of slot.availableCourtIds) {
        rows.push({
          key: `${courtId}|${slot.startTime}`,
          courtId,
          startTime: slot.startTime,
          endTime: slot.endTime,
          instructorIds: slot.availableInstructorIds,
        });
      }
    }

    rows.sort((a, b) => {
      const labelA = formatCourtLabel(a.courtId, courtNames);
      const labelB = formatCourtLabel(b.courtId, courtNames);
      if (labelA === labelB) return a.startTime.localeCompare(b.startTime);
      return labelA.localeCompare(labelB, "ru");
    });

    return rows;
  }, [availability, courtNames]);

  const timeslotsByCourt = useMemo(() => {
    const map = new Map<string, CourtTimeslotRow[]>();
    for (const row of expandedTimeslots) {
      if (!map.has(row.courtId)) map.set(row.courtId, []);
      map.get(row.courtId)?.push(row);
    }
    return Array.from(map.entries());
  }, [expandedTimeslots]);

  const selectedSlot = useMemo(
    () => expandedTimeslots.find((row) => row.key === selectedSlotKey) ?? null,
    [expandedTimeslots, selectedSlotKey],
  );

  const availableTrainerOptions = useMemo(() => {
    if (!selectedSlot || serviceKind !== "training") {
      return [] as InstructorOption[];
    }

    return selectedSlot.instructorIds
      .map((id) => instructorsById[id])
      .filter((item): item is InstructorOption => Boolean(item))
      .filter((item) => item.sport === sport);
  }, [selectedSlot, serviceKind, instructorsById, sport]);

  useEffect(() => {
    if (serviceKind !== "training") {
      setSelectedInstructorId("");
      return;
    }

    if (!selectedSlot) {
      setSelectedInstructorId("");
      return;
    }

    const stillAvailable = availableTrainerOptions.some((trainer) => trainer.id === selectedInstructorId);
    if (stillAvailable) return;

    setSelectedInstructorId(availableTrainerOptions[0]?.id ?? "");
  }, [serviceKind, selectedSlot, availableTrainerOptions, selectedInstructorId]);

  const selectedTrainer = selectedInstructorId ? instructorsById[selectedInstructorId] ?? null : null;

  const pricePreview = useMemo(() => {
    if (!resolvedService || !selectedSlot) return null;

    const tier = resolvePricingTier(date, selectedSlot.startTime);
    const courtPrice = courtPrices[sport]?.[tier] ?? 0;
    const instructorPrice =
      serviceKind === "training" && selectedTrainer ? selectedTrainer.prices[tier] : 0;

    return {
      tier,
      courtPrice,
      instructorPrice,
      total: courtPrice + instructorPrice,
    };
  }, [resolvedService, selectedSlot, date, courtPrices, sport, serviceKind, selectedTrainer]);

  async function submitBooking() {
    if (!resolvedService) {
      setSubmitError("Выберите спорт и услугу.");
      return;
    }
    if (!selectedSlot) {
      setSubmitError("Выберите таймслот.");
      return;
    }
    if (!customerName.trim() || !customerEmail.trim() || !customerPhone.trim()) {
      setSubmitError("Заполните имя, email и телефон.");
      return;
    }
    if (serviceKind === "court" && !isAuthenticated) {
      setSubmitError("Для бронирования корта требуется вход в зарегистрированный аккаунт.");
      return;
    }
    if (resolvedService.requiresInstructor && !selectedTrainer) {
      setSubmitError("Выберите тренера.");
      return;
    }

    setSubmitLoading(true);
    setSubmitError(null);
    setSubmitSuccess(null);

    try {
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceId: resolvedService.id,
          date,
          startTime: selectedSlot.startTime,
          durationMin: 60,
          courtId: selectedSlot.courtId,
          instructorId: resolvedService.requiresInstructor ? selectedTrainer?.id : undefined,
          customer: {
            name: customerName.trim(),
            email: customerEmail.trim(),
            phone: customerPhone.trim(),
          },
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | BookingApiSuccessPayload
        | { error?: string }
        | null;

      if (!response.ok) {
        throw new Error(
          payload && typeof payload === "object" && "error" in payload && payload.error
            ? payload.error
            : "Не удалось создать бронирование",
        );
      }

      setSubmitSuccess(payload as BookingApiSuccessPayload);
      setReloadKey((value) => value + 1);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Ошибка создания брони");
    } finally {
      setSubmitLoading(false);
    }
  }

  const noServiceForChoice = !resolvedService;

  return (
    <section className="booking-flow" aria-labelledby="booking-flow-title">
      <h2 id="booking-flow-title" className="booking-flow__title">
        Онлайн-бронирование
      </h2>

      <div className="booking-flow__panel">
        <div className="booking-live__step">
          <p className="booking-live__step-title">1. Выберите спорт</p>
          <div className="booking-live__choice-list">
            {(["padel", "squash"] as const).map((item) => (
              <button
                key={item}
                type="button"
                className={`booking-live__choice-button${sport === item ? " booking-live__choice-button--active" : ""}`}
                onClick={() => setSport(item)}
              >
                {getSportLabel(item)}
              </button>
            ))}
          </div>
        </div>

        <div className="booking-live__step">
          <p className="booking-live__step-title">2. Выберите услугу</p>
          <div className="booking-live__choice-list">
            {(["court", "training"] as const).map((kind) => {
              const available = Boolean(serviceMatrix[sport][kind]);
              return (
                <button
                  key={kind}
                  type="button"
                  disabled={!available}
                  className={`booking-live__choice-button${serviceKind === kind ? " booking-live__choice-button--active" : ""}`}
                  onClick={() => setServiceKind(kind)}
                >
                  {getServiceKindLabel(kind)}
                </button>
              );
            })}
          </div>
          <p className="booking-live__helper">
            {resolvedService
              ? `Услуга: ${resolvedService.name}`
              : "Для этого спорта выбранный тип услуги пока не настроен."}
          </p>
        </div>

        <div className="booking-live__step">
          <div className="booking-live__date-head">
            <p className="booking-live__step-title">3. Выберите дату и таймслот (по кортам)</p>
            <div className="booking-flow__group booking-live__date-group">
              <label className="booking-flow__label" htmlFor="booking-date-live">
                Дата
              </label>
              <input
                id="booking-date-live"
                type="date"
                className="booking-flow__field"
                value={date}
                onChange={(event) => setDate(event.target.value)}
              />
            </div>
          </div>

          {autoDateMessage ? <p className="booking-live__helper">{autoDateMessage}</p> : null}

          {noServiceForChoice ? (
            <div className="booking-live__empty">Сначала выберите доступную услугу.</div>
          ) : availabilityLoading ? (
            <div className="booking-live__empty">Загружаем таймслоты...</div>
          ) : availabilityError ? (
            <div className="booking-live__message booking-live__message--error" role="alert">
              {availabilityError}
              <div className="booking-live__links">
                <button
                  type="button"
                  className="booking-live__link"
                  onClick={() => setReloadKey((value) => value + 1)}
                >
                  Повторить
                </button>
              </div>
            </div>
          ) : availability ? (
            <div className="booking-live__availability">
              <div className="booking-live__availability-head">
                <div>
                  <p className="booking-live__availability-title">
                    {availability.date}: {availability.service.name}
                  </p>
                  <p className="booking-live__availability-sub">
                    Источник: {availability.meta.source}, таймзона: {availability.meta.timezone}
                  </p>
                </div>
                <span className="admin-bookings__chip">{expandedTimeslots.length} таймслотов</span>
              </div>

              {timeslotsByCourt.length === 0 ? (
                <div className="booking-live__empty">
                  Нет доступных таймслотов на выбранную дату.
                  {serviceKind === "training" ? " Проверьте графики тренеров в админке." : ""}
                </div>
              ) : (
                <div className="booking-live__court-groups">
                  {timeslotsByCourt.map(([courtId, rows]) => (
                    <section key={courtId} className="booking-live__court-group">
                      <div className="booking-live__court-header">
                        <div>
                          <span className="booking-live__court-title">
                            {formatCourtLabel(courtId, courtNames)}
                          </span>
                          {formatCourtLabel(courtId, courtNames) !== courtId ? (
                            <div className="booking-live__court-id">{courtId}</div>
                          ) : null}
                        </div>
                        <span className="booking-live__court-count">{rows.length} слотов</span>
                      </div>
                      <div className="booking-live__slots-inline">
                        {rows.map((row) => (
                          <button
                            key={row.key}
                            type="button"
                            className={`booking-live__slot-button${selectedSlotKey === row.key ? " booking-live__slot-button--selected" : ""}`}
                            onClick={() => setSelectedSlotKey(row.key)}
                          >
                            <span className="booking-live__slot-time">
                              {row.startTime} - {row.endTime}
                            </span>
                            <span className="booking-live__slot-meta">
                              {serviceKind === "training"
                                ? `Тренеров: ${row.instructorIds.length}`
                                : "Свободный корт"}
                            </span>
                          </button>
                        ))}
                      </div>
                    </section>
                  ))}
                </div>
              )}
            </div>
          ) : null}
        </div>

        {serviceKind === "training" && selectedSlot ? (
          <div className="booking-live__step">
            <p className="booking-live__step-title">4. Выберите тренера</p>
            {availableTrainerOptions.length === 0 ? (
              <div className="booking-live__empty">На этот таймслот нет доступных тренеров.</div>
            ) : (
              <div className="booking-live__trainer-list">
                {availableTrainerOptions.map((trainer) => {
                  const tier = resolvePricingTier(date, selectedSlot.startTime);
                  const trainerPrice = trainer.prices[tier];
                  const courtPrice = courtPrices[sport]?.[tier] ?? 0;
                  const total = courtPrice + trainerPrice;
                  return (
                    <button
                      key={trainer.id}
                      type="button"
                      className={`booking-live__trainer-button${selectedInstructorId === trainer.id ? " booking-live__trainer-button--selected" : ""}`}
                      onClick={() => setSelectedInstructorId(trainer.id)}
                    >
                      <span className="booking-live__trainer-name">{trainer.name}</span>
                      <span className="booking-live__trainer-price">
                        Тренер: {formatMoneyKzt(trainerPrice)} • Итого: {formatMoneyKzt(total)}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ) : null}

        {serviceKind === "court" && !isAuthenticated ? (
          <div className="booking-live__message booking-live__message--warning">
            Для бронирования корта требуется зарегистрированный аккаунт.
            <div className="booking-live__links">
              <Link href="/register?next=%2Fbook" className="booking-live__link">
                Регистрация
              </Link>
              <Link href="/login?next=%2Fbook" className="booking-live__link">
                Войти
              </Link>
            </div>
          </div>
        ) : null}

        <div className="booking-live__customer">
          <p className="booking-live__section-title">
            {serviceKind === "training" ? "5. " : "4. "}Данные клиента
          </p>
          <div className="booking-flow__grid">
            <div className="booking-flow__group">
              <label className="booking-flow__label" htmlFor="customer-name-live">
                Имя
              </label>
              <input
                id="customer-name-live"
                className="booking-flow__field"
                value={customerName}
                onChange={(event) => setCustomerName(event.target.value)}
              />
            </div>
            <div className="booking-flow__group">
              <label className="booking-flow__label" htmlFor="customer-email-live">
                Email
              </label>
              <input
                id="customer-email-live"
                type="email"
                className="booking-flow__field"
                value={customerEmail}
                onChange={(event) => setCustomerEmail(event.target.value)}
                readOnly={serviceKind === "court" && isAuthenticated}
              />
            </div>
            <div className="booking-flow__group">
              <label className="booking-flow__label" htmlFor="customer-phone-live">
                Телефон
              </label>
              <input
                id="customer-phone-live"
                type="tel"
                className="booking-flow__field"
                value={customerPhone}
                onChange={(event) => setCustomerPhone(event.target.value)}
              />
            </div>
          </div>
        </div>

        {selectedSlot && pricePreview ? (
          <div className="booking-live__summary">
            <p className="booking-live__section-title">Предпросмотр цены</p>
            <p className="booking-live__summary-line">
              {getSportLabel(sport)} / {getServiceKindLabel(serviceKind)} / {date} /{" "}
              {selectedSlot.startTime} - {selectedSlot.endTime}
            </p>
            <p className="booking-live__summary-sub">
              Корт: {formatCourtLabel(selectedSlot.courtId, courtNames)} ({selectedSlot.courtId})
            </p>
            <p className="booking-live__summary-sub">Период тарифа: {getTierLabel(pricePreview.tier)}</p>
            <div className="booking-live__price-breakdown">
              <div className="booking-live__price-row">
                <span>Корт</span>
                <span>{formatMoneyKzt(pricePreview.courtPrice)}</span>
              </div>
              {serviceKind === "training" ? (
                <div className="booking-live__price-row">
                  <span>Тренер{selectedTrainer ? ` (${selectedTrainer.name})` : ""}</span>
                  <span>
                    {selectedTrainer ? formatMoneyKzt(pricePreview.instructorPrice) : "Выберите тренера"}
                  </span>
                </div>
              ) : null}
              <div className="booking-live__price-row booking-live__price-row--total">
                <span>Итого за 60 минут</span>
                <span>{formatMoneyKzt(pricePreview.total)}</span>
              </div>
            </div>
          </div>
        ) : null}

        <div className="booking-live__actions">
          <button
            type="button"
            className="booking-live__button booking-live__button--accent"
            onClick={() => {
              void submitBooking();
            }}
            disabled={
              submitLoading ||
              !selectedSlot ||
              !resolvedService ||
              (resolvedService.requiresInstructor && !selectedTrainer)
            }
          >
            {submitLoading ? "Создаем бронь..." : "Забронировать"}
          </button>
          <span className="booking-live__helper">
            После бронирования зарегистрируйтесь с тем же email, чтобы увидеть бронь в кабинете.
          </span>
        </div>

        {submitError ? (
          <div className="booking-live__message booking-live__message--error" role="alert">
            {submitError}
          </div>
        ) : null}

        {submitSuccess ? (
          <div className="booking-live__message booking-live__message--success">
            <p className="booking-live__result-title">{submitSuccess.message}</p>
            <p className="booking-live__result-line">
              Бронь: <strong>{submitSuccess.data.booking.id}</strong>, статус:{" "}
              <strong>{submitSuccess.data.booking.status}</strong>
            </p>
            <p className="booking-live__result-line">
              Сумма:{" "}
              <strong>
                {submitSuccess.data.booking.priceTotal.toLocaleString("ru-KZ")}{" "}
                {submitSuccess.data.booking.currency === "KZT" ? "₸" : submitSuccess.data.booking.currency}
              </strong>
              {" • "}Оплата: {submitSuccess.data.payment.status} ({submitSuccess.data.payment.provider})
            </p>
            <div className="booking-live__links">
              <Link href="/register?next=%2Faccount%2Fbookings" className="booking-live__link">
                Регистрация
              </Link>
              <Link href="/login?next=%2Faccount%2Fbookings" className="booking-live__link">
                Войти в кабинет
              </Link>
            </div>
            {submitSuccess.source === "demo-fallback" ? (
              <p className="booking-live__result-line">
                Внимание: использован demo-fallback, бронирование не сохранено в БД.
              </p>
            ) : null}
            {submitSuccess.note ? (
              <p className="booking-live__result-line">Тех. заметка: {submitSuccess.note}</p>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}
