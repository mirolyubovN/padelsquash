"use client";

import { useEffect, useMemo, useRef, useState } from "react";

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
}

interface LocationOption {
  id: string;
  slug: string;
  name: string;
}

interface SlotOption {
  startTime: string;
  endTime: string;
  availableCourtIds: string[];
}

interface CreateBookingActionResult {
  error: string;
  holdId?: string;
  shortfallKzt?: number;
  currentBalanceKzt?: number;
  amountRequiredKzt?: number;
}

interface CreateBookingFormProps {
  sports: SportOption[];
  services: ServiceOption[];
  instructors: InstructorOption[];
  locations: LocationOption[];
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
  createAction: (formData: FormData) => Promise<CreateBookingActionResult | void>;
}

function getTodayDate(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function formatMoneyKzt(amount?: number): string | null {
  if (!Number.isFinite(amount)) {
    return null;
  }

  return `${Number(amount).toLocaleString("ru-KZ")} KZT`;
}

export function CreateBookingForm({
  sports,
  services,
  instructors,
  locations,
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
  createAction,
}: CreateBookingFormProps) {
  const [locationSlug, setLocationSlug] = useState(initialLocationSlug ?? defaultLocationSlug);
  const [sportSlug, setSportSlug] = useState(initialSportSlug ?? sports[0]?.slug ?? "");
  const [serviceCode, setServiceCode] = useState(initialServiceCode ?? "");
  const [instructorId, setInstructorId] = useState("");
  const [date, setDate] = useState(initialDate ?? getTodayDate());
  const [slots, setSlots] = useState<SlotOption[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string>(initialStartTime ?? "");
  const [preferredCourtId, setPreferredCourtId] = useState(initialCourtId ?? "");
  const [customerName, setCustomerName] = useState(initialCustomerName ?? "");
  const [customerPhone, setCustomerPhone] = useState(initialCustomerPhone ?? "");
  const [customerEmail, setCustomerEmail] = useState(initialCustomerEmail ?? "");
  const [activeHoldId, setActiveHoldId] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [shortfallKzt, setShortfallKzt] = useState<number | null>(null);
  const [currentBalanceKzt, setCurrentBalanceKzt] = useState<number | null>(null);
  const [amountRequiredKzt, setAmountRequiredKzt] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const didInitializeSportRef = useRef(false);

  const servicesForSport = useMemo(
    () => services.filter((service) => service.sportSlug === sportSlug),
    [services, sportSlug],
  );
  const resolvedService = servicesForSport.find((service) => service.code === serviceCode) ?? servicesForSport[0] ?? null;
  const needsInstructor = resolvedService?.requiresInstructor ?? false;
  const instructorsForSport = instructors.filter((instructor) => instructor.sportSlugs.includes(sportSlug));
  const selectedLocation = locations.find((location) => location.slug === locationSlug) ?? locations[0];
  const walletTopUpHref = useMemo(() => {
    const params = new URLSearchParams();
    if (customerEmail.trim()) {
      params.set("customerEmail", customerEmail.trim().toLowerCase());
    }
    const query = params.toString();
    return query ? `/admin/wallet?${query}` : "/admin/wallet";
  }, [customerEmail]);

  function clearHoldState() {
    setActiveHoldId("");
    setShortfallKzt(null);
    setCurrentBalanceKzt(null);
    setAmountRequiredKzt(null);
  }

  useEffect(() => {
    const fallbackService =
      servicesForSport.find((service) => service.code === initialServiceCode) ?? servicesForSport[0] ?? null;
    setServiceCode(fallbackService?.code ?? "");
    setInstructorId("");
    setSlots([]);
    if (didInitializeSportRef.current) {
      setSelectedSlot("");
      setPreferredCourtId("");
    } else {
      didInitializeSportRef.current = true;
    }
    setSubmitError(null);
    clearHoldState();
  }, [sportSlug, servicesForSport, initialServiceCode]);

  useEffect(() => {
    if (!resolvedService) {
      const first = servicesForSport[0];
      if (first) {
        setServiceCode(first.code);
      }
    }
  }, [resolvedService, servicesForSport]);

  useEffect(() => {
    if (!resolvedService || !date || !selectedLocation) {
      setSlots([]);
      return;
    }
    if (needsInstructor && !instructorId) {
      setSlots([]);
      return;
    }

    let cancelled = false;
    setSlotsLoading(true);
    setSlotsError(null);
    setSlots([]);

    const params = new URLSearchParams({
      serviceId: resolvedService.code,
      location: locationSlug,
      date,
      durationMin: "60",
    });
    if (needsInstructor && instructorId) {
      params.set("instructorId", instructorId);
    }

    fetch(`/api/availability?${params.toString()}`)
      .then((res) => res.json())
      .then((data: { slots?: SlotOption[]; error?: string }) => {
        if (cancelled) {
          return;
        }
        if (data.error) {
          setSlotsError(data.error);
        } else {
          setSlots(data.slots ?? []);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSlotsError("Не удалось загрузить слоты");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setSlotsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [resolvedService, date, locationSlug, instructorId, needsInstructor, selectedLocation]);

  useEffect(() => {
    if (!initialStartTime || selectedSlot || slots.length === 0) {
      return;
    }

    const matchingSlot = slots.find((slot) => slot.startTime === initialStartTime);
    if (!matchingSlot) {
      return;
    }

    if (preferredCourtId && !matchingSlot.availableCourtIds.includes(preferredCourtId)) {
      return;
    }

    setSelectedSlot(initialStartTime);
  }, [initialStartTime, preferredCourtId, selectedSlot, slots]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!resolvedService) {
      return;
    }
    if (!selectedSlot) {
      setSubmitError("Выберите временной слот");
      return;
    }

    const form = e.currentTarget;
    const formData = new FormData(form);
    formData.set("locationSlug", locationSlug);
    formData.set("serviceCode", resolvedService.code);
    formData.set("date", date);
    formData.set("startTime", selectedSlot);
    formData.set("customerName", customerName);
    formData.set("customerPhone", customerPhone);
    formData.set("customerEmail", customerEmail.trim().toLowerCase());
    if (activeHoldId) {
      formData.set("holdId", activeHoldId);
    }
    if (needsInstructor) {
      formData.set("instructorId", instructorId);
    }

    const slot = slots.find((item) => item.startTime === selectedSlot);
    if (slot) {
      const resolvedCourtId =
        preferredCourtId && slot.availableCourtIds.includes(preferredCourtId)
          ? preferredCourtId
          : slot.availableCourtIds[0];
      if (resolvedCourtId) {
        formData.set("courtId", resolvedCourtId);
      }
    } else if (preferredCourtId) {
      formData.set("courtId", preferredCourtId);
    }

    setSubmitting(true);
    setSubmitError(null);
    try {
      const result = await createAction(formData);
      if (result && "error" in result && result.error) {
        setSubmitError(result.error);
        setActiveHoldId(result.holdId ?? "");
        setShortfallKzt(result.shortfallKzt ?? null);
        setCurrentBalanceKzt(result.currentBalanceKzt ?? null);
        setAmountRequiredKzt(result.amountRequiredKzt ?? null);
      } else {
        setSuccess(true);
      }
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Ошибка создания бронирования");
      clearHoldState();
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className="admin-create-booking__success" role="status">
        <p className="admin-create-booking__success-title">Бронирование создано</p>
        <div className="admin-create-booking__success-actions">
          <a href="/admin/bookings" className="admin-form__submit">
            К списку бронирований
          </a>
          <button
            type="button"
            className="admin-bookings__action-button"
            onClick={() => {
              setSuccess(false);
              setSelectedSlot(initialStartTime ?? "");
              setSlots([]);
              setDate(initialDate ?? getTodayDate());
              setSubmitError(null);
              clearHoldState();
            }}
          >
            Создать ещё
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="admin-create-booking__form">
      {locations.length > 1 ? (
        <div className="admin-form__group">
          <label className="admin-form__label" htmlFor="cb-location">Локация</label>
          <select
            id="cb-location"
            className="admin-form__field"
            value={locationSlug}
            onChange={(e) => {
              setLocationSlug(e.target.value);
              setSubmitError(null);
              clearHoldState();
              setPreferredCourtId("");
              setSelectedSlot("");
            }}
          >
            {locations.map((location) => (
              <option key={location.id} value={location.slug}>{location.name}</option>
            ))}
          </select>
        </div>
      ) : null}

      <div className="admin-form__group">
        <label className="admin-form__label">Вид спорта</label>
        <div className="admin-create-booking__sport-tabs">
          {sports.map((sport) => (
            <button
              key={sport.slug}
              type="button"
              className={`admin-create-booking__sport-tab${sportSlug === sport.slug ? " admin-create-booking__sport-tab--active" : ""}`}
              onClick={() => setSportSlug(sport.slug)}
            >
              {sport.name}
            </button>
          ))}
        </div>
      </div>

      {servicesForSport.length > 1 ? (
        <div className="admin-form__group">
          <label className="admin-form__label">Тип услуги</label>
          <div className="admin-create-booking__sport-tabs">
            {servicesForSport.map((service) => (
              <button
                key={service.code}
                type="button"
                className={`admin-create-booking__sport-tab${serviceCode === service.code ? " admin-create-booking__sport-tab--active" : ""}`}
                onClick={() => {
                  setServiceCode(service.code);
                  setInstructorId("");
                  setSlots([]);
                  setSelectedSlot("");
                  setPreferredCourtId("");
                  setSubmitError(null);
                  clearHoldState();
                }}
              >
                {service.name}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {needsInstructor ? (
        <div className="admin-form__group">
          <label className="admin-form__label" htmlFor="cb-instructor">Тренер</label>
          <select
            id="cb-instructor"
            className="admin-form__field"
            value={instructorId}
            onChange={(e) => {
              setInstructorId(e.target.value);
              setSubmitError(null);
              clearHoldState();
            }}
            required
          >
            <option value="">— выберите тренера —</option>
            {instructorsForSport.map((instructor) => (
              <option key={instructor.id} value={instructor.id}>{instructor.name}</option>
            ))}
          </select>
        </div>
      ) : null}

      <div className="admin-form__group">
        <label className="admin-form__label" htmlFor="cb-date">Дата</label>
        <input
          id="cb-date"
          type="date"
          className="admin-form__field"
          min={getTodayDate()}
          value={date}
          onChange={(e) => {
            setDate(e.target.value);
            setSubmitError(null);
            clearHoldState();
            setSelectedSlot("");
            setPreferredCourtId(initialCourtId ?? "");
          }}
          required
        />
      </div>

      <div className="admin-form__group">
        <label className="admin-form__label">Время</label>
        {slotsLoading ? (
          <p className="admin-create-booking__slots-hint">Загрузка слотов...</p>
        ) : slotsError ? (
          <p className="admin-create-booking__slots-error">{slotsError}</p>
        ) : slots.length === 0 && selectedSlot && preferredCourtId ? (
          <div className="admin-create-booking__slots">
            <button type="button" className="admin-create-booking__slot admin-create-booking__slot--active">
              {selectedSlot} · выбранный корт
            </button>
          </div>
        ) : slots.length === 0 ? (
          <p className="admin-create-booking__slots-hint">
            {needsInstructor && !instructorId ? "Сначала выберите тренера" : "Нет доступных слотов на эту дату"}
          </p>
        ) : (
          <div className="admin-create-booking__slots">
            {slots.map((slot) => {
              const keepsPreferredCourt = preferredCourtId ? slot.availableCourtIds.includes(preferredCourtId) : true;
              return (
                <button
                  key={slot.startTime}
                  type="button"
                  className={`admin-create-booking__slot${selectedSlot === slot.startTime ? " admin-create-booking__slot--active" : ""}`}
                  onClick={() => {
                    setSelectedSlot(slot.startTime);
                    setSubmitError(null);
                    clearHoldState();
                  }}
                >
                  {slot.startTime}
                  {preferredCourtId && keepsPreferredCourt ? " · выбранный корт" : ""}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <fieldset className="admin-create-booking__fieldset">
        <legend className="admin-form__label">Клиент</legend>
        <div className="admin-form__group">
          <label className="admin-form__label" htmlFor="cb-name">Имя</label>
          <input
            id="cb-name"
            name="customerName"
            className="admin-form__field"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            required
            placeholder="Иван Иванов"
          />
        </div>
        <div className="admin-form__group">
          <label className="admin-form__label" htmlFor="cb-phone">Телефон</label>
          <input
            id="cb-phone"
            name="customerPhone"
            className="admin-form__field"
            value={customerPhone}
            onChange={(e) => setCustomerPhone(e.target.value)}
            required
            placeholder="+7 700 000 0000"
          />
        </div>
        <div className="admin-form__group">
          <label className="admin-form__label" htmlFor="cb-email">Email</label>
          <input
            id="cb-email"
            name="customerEmail"
            type="email"
            className="admin-form__field"
            value={customerEmail}
            onChange={(e) => {
              setCustomerEmail(e.target.value);
              setSubmitError(null);
              clearHoldState();
            }}
            required
            placeholder="ivan@example.com"
          />
        </div>
      </fieldset>

      <div className="admin-form__group">
        <label className="admin-form__label">Оплата</label>
        <div className="admin-create-booking__slots-hint">
          Все новые бронирования списываются с баланса клиента. Для наличной оплаты сначала начислите сумму в разделе баланса, затем повторите создание брони.
        </div>
        <div className="admin-form__actions">
          <a href={walletTopUpHref} target="_blank" rel="noreferrer" className="admin-bookings__action-button">
            Открыть баланс клиента
          </a>
        </div>
        {activeHoldId ? (
          <p className="admin-create-booking__slots-hint">
            Слот удержан за клиентом на время пополнения. После начисления баланса повторите отправку этой формы без смены даты, времени и email.
          </p>
        ) : null}
        {amountRequiredKzt !== null || currentBalanceKzt !== null || shortfallKzt !== null ? (
          <p className="admin-create-booking__slots-hint">
            {amountRequiredKzt !== null ? `Нужно на бронь: ${formatMoneyKzt(amountRequiredKzt)}. ` : ""}
            {currentBalanceKzt !== null ? `Сейчас на балансе: ${formatMoneyKzt(currentBalanceKzt)}. ` : ""}
            {shortfallKzt !== null ? `Не хватает: ${formatMoneyKzt(shortfallKzt)}.` : ""}
          </p>
        ) : null}
      </div>

      {submitError ? (
        <p className="admin-create-booking__error" role="alert">{submitError}</p>
      ) : null}

      <button
        type="submit"
        className="admin-form__submit"
        disabled={submitting || !selectedSlot}
      >
        {submitting ? "Создание..." : activeHoldId ? "Повторить после пополнения" : "Создать бронирование"}
      </button>
    </form>
  );
}
