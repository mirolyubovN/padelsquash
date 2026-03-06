"use client";

import { useEffect, useState } from "react";

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

interface CreateBookingFormProps {
  sports: SportOption[];
  services: ServiceOption[];
  instructors: InstructorOption[];
  locations: LocationOption[];
  defaultLocationSlug: string;
  createAction: (formData: FormData) => Promise<{ error?: string } | void>;
}

function getTodayDate(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function CreateBookingForm({
  sports,
  services,
  instructors,
  locations,
  defaultLocationSlug,
  createAction,
}: CreateBookingFormProps) {
  const [locationSlug, setLocationSlug] = useState(defaultLocationSlug);
  const [sportSlug, setSportSlug] = useState(sports[0]?.slug ?? "");
  const [serviceCode, setServiceCode] = useState("");
  const [instructorId, setInstructorId] = useState("");
  const [date, setDate] = useState(getTodayDate());
  const [slots, setSlots] = useState<SlotOption[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string>("");
  const [paymentStatus, setPaymentStatus] = useState<"pending" | "cash" | "free">("pending");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const servicesForSport = services.filter((s) => s.sportSlug === sportSlug);
  const resolvedService = servicesForSport.find((s) => s.code === serviceCode) ?? servicesForSport[0] ?? null;
  const needsInstructor = resolvedService?.requiresInstructor ?? false;
  const instructorsForSport = instructors.filter((i) => i.sportSlugs.includes(sportSlug));
  const selectedLocation = locations.find((l) => l.slug === locationSlug) ?? locations[0];

  // Auto-select service when sport changes
  useEffect(() => {
    const first = services.find((s) => s.sportSlug === sportSlug);
    setServiceCode(first?.code ?? "");
    setInstructorId("");
    setSlots([]);
    setSelectedSlot("");
  }, [sportSlug, services]);

  // Auto-select service when serviceCode externally cleared
  useEffect(() => {
    if (!resolvedService) {
      const first = servicesForSport[0];
      if (first) setServiceCode(first.code);
    }
  }, [resolvedService, servicesForSport]);

  // Fetch slots when date/service/instructor/location are ready
  useEffect(() => {
    if (!resolvedService || !date || !selectedLocation) {
      setSlots([]);
      setSelectedSlot("");
      return;
    }
    if (needsInstructor && !instructorId) {
      setSlots([]);
      setSelectedSlot("");
      return;
    }

    let cancelled = false;
    setSlotsLoading(true);
    setSlotsError(null);
    setSlots([]);
    setSelectedSlot("");

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
        if (cancelled) return;
        if (data.error) {
          setSlotsError(data.error);
        } else {
          setSlots(data.slots ?? []);
        }
      })
      .catch(() => {
        if (!cancelled) setSlotsError("Не удалось загрузить слоты");
      })
      .finally(() => {
        if (!cancelled) setSlotsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [resolvedService, date, locationSlug, instructorId, needsInstructor, selectedLocation]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!resolvedService) return;
    if (!selectedSlot) { setSubmitError("Выберите временной слот"); return; }

    const form = e.currentTarget;
    const formData = new FormData(form);
    formData.set("locationSlug", locationSlug);
    formData.set("serviceCode", resolvedService.code);
    formData.set("date", date);
    formData.set("startTime", selectedSlot);
    formData.set("paymentStatus", paymentStatus);
    if (needsInstructor) formData.set("instructorId", instructorId);

    const slot = slots.find((s) => s.startTime === selectedSlot);
    if (slot?.availableCourtIds[0]) {
      formData.set("courtId", slot.availableCourtIds[0]);
    }

    setSubmitting(true);
    setSubmitError(null);
    try {
      const result = await createAction(formData);
      if (result && "error" in result && result.error) {
        setSubmitError(result.error);
      } else {
        setSuccess(true);
      }
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Ошибка создания бронирования");
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
              setSelectedSlot("");
              setSlots([]);
              setDate(getTodayDate());
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
      {/* Location */}
      {locations.length > 1 ? (
        <div className="admin-form__group">
          <label className="admin-form__label" htmlFor="cb-location">Локация</label>
          <select
            id="cb-location"
            className="admin-form__field"
            value={locationSlug}
            onChange={(e) => setLocationSlug(e.target.value)}
          >
            {locations.map((loc) => (
              <option key={loc.id} value={loc.slug}>{loc.name}</option>
            ))}
          </select>
        </div>
      ) : null}

      {/* Sport */}
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

      {/* Service type */}
      {servicesForSport.length > 1 ? (
        <div className="admin-form__group">
          <label className="admin-form__label">Тип услуги</label>
          <div className="admin-create-booking__sport-tabs">
            {servicesForSport.map((svc) => (
              <button
                key={svc.code}
                type="button"
                className={`admin-create-booking__sport-tab${serviceCode === svc.code ? " admin-create-booking__sport-tab--active" : ""}`}
                onClick={() => {
                  setServiceCode(svc.code);
                  setInstructorId("");
                  setSlots([]);
                  setSelectedSlot("");
                }}
              >
                {svc.name}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {/* Instructor (if needed) */}
      {needsInstructor ? (
        <div className="admin-form__group">
          <label className="admin-form__label" htmlFor="cb-instructor">Тренер</label>
          <select
            id="cb-instructor"
            className="admin-form__field"
            value={instructorId}
            onChange={(e) => setInstructorId(e.target.value)}
            required
          >
            <option value="">— выберите тренера —</option>
            {instructorsForSport.map((inst) => (
              <option key={inst.id} value={inst.id}>{inst.name}</option>
            ))}
          </select>
        </div>
      ) : null}

      {/* Date */}
      <div className="admin-form__group">
        <label className="admin-form__label" htmlFor="cb-date">Дата</label>
        <input
          id="cb-date"
          type="date"
          className="admin-form__field"
          min={getTodayDate()}
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
        />
      </div>

      {/* Time slots */}
      <div className="admin-form__group">
        <label className="admin-form__label">Время</label>
        {slotsLoading ? (
          <p className="admin-create-booking__slots-hint">Загрузка слотов...</p>
        ) : slotsError ? (
          <p className="admin-create-booking__slots-error">{slotsError}</p>
        ) : slots.length === 0 ? (
          <p className="admin-create-booking__slots-hint">
            {needsInstructor && !instructorId ? "Сначала выберите тренера" : "Нет доступных слотов на эту дату"}
          </p>
        ) : (
          <div className="admin-create-booking__slots">
            {slots.map((slot) => (
              <button
                key={slot.startTime}
                type="button"
                className={`admin-create-booking__slot${selectedSlot === slot.startTime ? " admin-create-booking__slot--active" : ""}`}
                onClick={() => setSelectedSlot(slot.startTime)}
              >
                {slot.startTime}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Customer */}
      <fieldset className="admin-create-booking__fieldset">
        <legend className="admin-form__label">Клиент</legend>
        <div className="admin-form__group">
          <label className="admin-form__label" htmlFor="cb-name">Имя</label>
          <input id="cb-name" name="customerName" className="admin-form__field" required placeholder="Иван Иванов" />
        </div>
        <div className="admin-form__group">
          <label className="admin-form__label" htmlFor="cb-phone">Телефон</label>
          <input id="cb-phone" name="customerPhone" className="admin-form__field" required placeholder="+7 700 000 0000" />
        </div>
        <div className="admin-form__group">
          <label className="admin-form__label" htmlFor="cb-email">Email</label>
          <input id="cb-email" name="customerEmail" type="email" className="admin-form__field" required placeholder="ivan@example.com" />
        </div>
      </fieldset>

      {/* Payment */}
      <div className="admin-form__group">
        <label className="admin-form__label">Оплата</label>
        <div className="admin-create-booking__sport-tabs">
          {(
            [
              { value: "pending", label: "Ожидает оплаты" },
              { value: "cash", label: "Наличные (оплачено)" },
              { value: "free", label: "Бесплатно" },
            ] as const
          ).map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={`admin-create-booking__sport-tab${paymentStatus === opt.value ? " admin-create-booking__sport-tab--active" : ""}`}
              onClick={() => setPaymentStatus(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {submitError ? (
        <p className="admin-create-booking__error" role="alert">{submitError}</p>
      ) : null}

      <button
        type="submit"
        className="admin-form__submit"
        disabled={submitting || !selectedSlot}
      >
        {submitting ? "Создание..." : "Создать бронирование"}
      </button>
    </form>
  );
}
