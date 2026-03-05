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
  meta: {
    source: string;
    timezone: string;
  };
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
  note?: string;
  data: {
    booking: {
      id: string;
      status: string;
      priceTotal: number;
      currency: string;
      resources?: Array<{
        resourceType: "court" | "instructor";
        resourceId: string;
      }>;
    };
    payment: {
      provider: string;
      status: string;
    };
  };
}

interface BookingSuccessSessionSummary {
  sport: string;
  serviceKind: ServiceKind;
  date: string;
  startTime: string;
  endTime: string;
  courtLabel: string;
  trainerName?: string;
  amount: number;
  currency: string;
}

interface BookingSuccessSummary {
  sessions: BookingSuccessSessionSummary[];
  totalAmount: number;
  currency: string;
}

interface LiveBookingFormProps {
  locations: Array<{
    id: string;
    slug: string;
    name: string;
    address: string;
  }>;
  selectedLocationSlug: string;
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

type EditableStepId = "sport" | "service" | "trainer" | "datetime";

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

function getSportLabel(slug: string): string {
  if (slug === "padel") return "Падел";
  if (slug === "squash") return "Сквош";
  return slug;
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

function getSlotKey(slot: Pick<SlotOption, "startTime" | "endTime">): string {
  return `${slot.startTime}|${slot.endTime}`;
}

async function fetchAvailability(
  location: string,
  serviceId: string,
  date: string,
  instructorId?: string,
): Promise<AvailabilityPayload> {
  const params = new URLSearchParams({
    location,
    serviceId,
    date,
    durationMin: "60",
  });
  if (instructorId) {
    params.set("instructorId", instructorId);
  }

  const response = await fetch(`/api/availability?${params.toString()}`, {
    method: "GET",
    cache: "no-store",
  });

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
  locations,
  selectedLocationSlug,
  services,
  courtNames,
  instructors,
  courtPrices,
  isAuthenticated,
  initialCustomer,
}: LiveBookingFormProps) {
  const hasRestoredFromUrlRef = useRef(false);
  const skipInitialUrlSyncRef = useRef(true);
  const pendingTrainerIdFromUrlRef = useRef<string | null>(null);
  const pendingSlotTimesFromUrlRef = useRef<string[] | null>(null);
  const serviceMatrix = useMemo(() => {
    const result: Record<string, Partial<Record<ServiceKind, ServiceOption>>> = {};
    for (const service of services) {
      const kind = detectServiceKind(service);
      if (!result[service.sport]) {
        result[service.sport] = {};
      }
      if (!result[service.sport][kind]) {
        result[service.sport][kind] = service;
      }
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
  const sportLabelsBySlug = useMemo(
    () => Object.fromEntries(sportOptions.map((option) => [option.slug, option.label])),
    [sportOptions],
  );

  const firstSportSlug = sportOptions[0]?.slug ?? services[0]?.sport ?? "padel";
  const initialSport =
    serviceMatrix[firstSportSlug]?.court || serviceMatrix[firstSportSlug]?.training
      ? firstSportSlug
      : Object.keys(serviceMatrix)[0] ?? firstSportSlug;
  const initialKind: ServiceKind = serviceMatrix[initialSport]?.court
    ? "court"
    : serviceMatrix[initialSport]?.training
      ? "training"
      : "court";

  const [sport, setSport] = useState<string>(initialSport);
  const [serviceKind, setServiceKind] = useState<ServiceKind>(initialKind);
  const [date, setDate] = useState<string>(getTodayDate);
  const [availability, setAvailability] = useState<AvailabilityPayload | null>(null);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [availabilityError, setAvailabilityError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [autoDateMessage, setAutoDateMessage] = useState<string | null>(null);
  const [autoSearchKey, setAutoSearchKey] = useState<string>("");

  const [selectedSlotKeys, setSelectedSlotKeys] = useState<string[]>([]);
  const [selectedInstructorId, setSelectedInstructorId] = useState("");

  const [customerName, setCustomerName] = useState(initialCustomer?.name ?? "");
  const [customerEmail, setCustomerEmail] = useState(initialCustomer?.email ?? "");
  const [customerPhone, setCustomerPhone] = useState(initialCustomer?.phone ?? "");
  const [showCustomerEditor, setShowCustomerEditor] = useState(false);
  const [customerEditorName, setCustomerEditorName] = useState(initialCustomer?.name ?? "");
  const [customerEditorEmail, setCustomerEditorEmail] = useState(initialCustomer?.email ?? "");
  const [customerEditorPhone, setCustomerEditorPhone] = useState(initialCustomer?.phone ?? "");
  const [customerEditorError, setCustomerEditorError] = useState<string | null>(null);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitWarning, setSubmitWarning] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<BookingApiSuccessPayload | null>(null);
  const [submitSuccessSummary, setSubmitSuccessSummary] = useState<BookingSuccessSummary | null>(null);
  const [editingStepId, setEditingStepId] = useState<EditableStepId | null>(null);

  const hasLocationStep = locations.length > 1;
  const selectedLocation =
    locations.find((location) => location.slug === selectedLocationSlug) ?? locations[0] ?? null;

  const resolvedService = serviceMatrix[sport]?.[serviceKind] ?? null;
  const availableKindsForSport = useMemo(() => serviceMatrix[sport] ?? {}, [serviceMatrix, sport]);
  const instructorsById = useMemo(
    () => Object.fromEntries(instructors.map((instructor) => [instructor.id, instructor])),
    [instructors],
  );
  const getSportDisplayLabel = (slug: string) => sportLabelsBySlug[slug] ?? getSportLabel(slug);
  const trainersForSport = useMemo(
    () => instructors.filter((instructor) => instructor.sports.includes(sport)),
    [instructors, sport],
  );

  useEffect(() => {
    if (serviceMatrix[sport]) {
      return;
    }
    const nextSport = Object.keys(serviceMatrix)[0];
    if (nextSport) {
      setSport(nextSport);
    }
  }, [serviceMatrix, sport]);

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
    if (hasRestoredFromUrlRef.current || typeof window === "undefined") {
      return;
    }
    hasRestoredFromUrlRef.current = true;

    const params = new URLSearchParams(window.location.search);
    const sportParam = params.get("sport");
    const serviceParam = params.get("service");
    const dateParam = params.get("date");
    const trainerParam = params.get("instructor");
    const timeParams = params.getAll("time");
    const timesParam = params.get("times");

    if (sportParam && serviceMatrix[sportParam]) {
      setSport(sportParam);
    }
    if (serviceParam === "court" || serviceParam === "training") {
      setServiceKind(serviceParam);
    }
    if (dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
      setDate(dateParam);
    }
    if (trainerParam) {
      pendingTrainerIdFromUrlRef.current = trainerParam;
    }
    const restoredTimes = [
      ...timeParams,
      ...(timesParam ? timesParam.split(",") : []),
    ]
      .map((value) => value.trim())
      .filter((value) => /^\d{2}:\d{2}$/.test(value));
    if (restoredTimes.length > 0) {
      pendingSlotTimesFromUrlRef.current = Array.from(new Set(restoredTimes));
    }
  }, [serviceMatrix]);

  useEffect(() => {
    setSelectedSlotKeys([]);
    setSelectedInstructorId("");
    setSubmitError(null);
    setSubmitWarning(null);
    setSubmitSuccess(null);
    setSubmitSuccessSummary(null);
    setAutoDateMessage(null);
    setAutoSearchKey("");
    setEditingStepId(null);
  }, [sport, serviceKind]);

  useEffect(() => {
    setSelectedSlotKeys([]);
    setSubmitError(null);
    setSubmitWarning(null);
    setSubmitSuccess(null);
    setSubmitSuccessSummary(null);
    setAutoDateMessage(null);
    setAutoSearchKey("");
    setEditingStepId(null);
  }, [date]);

  useEffect(() => {
    if (!resolvedService || !date) {
      setAvailability(null);
      return;
    }
    if (resolvedService.requiresInstructor && !selectedInstructorId) {
      setAvailability(null);
      setAvailabilityError(null);
      setAvailabilityLoading(false);
      return;
    }
    const service = resolvedService;

    let cancelled = false;

    async function load() {
      setAvailabilityLoading(true);
      setAvailabilityError(null);
      try {
        const payload = await fetchAvailability(
          selectedLocationSlug,
          service.id,
          date,
          service.requiresInstructor ? selectedInstructorId : undefined,
        );
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
  }, [resolvedService, date, reloadKey, selectedInstructorId, selectedLocationSlug]);

  useEffect(() => {
    const pendingTimes = pendingSlotTimesFromUrlRef.current;
    if (!pendingTimes || !availability) {
      return;
    }

    const availableSlotsByStart = new Map(
      availability.slots.map((slot) => [slot.startTime, getSlotKey(slot)]),
    );
    const restoredKeys = pendingTimes
      .map((time) => availableSlotsByStart.get(time))
      .filter((value): value is string => Boolean(value));

    if (restoredKeys.length > 0) {
      setSelectedSlotKeys(Array.from(new Set(restoredKeys)));
    }
    pendingSlotTimesFromUrlRef.current = null;
  }, [availability]);

  useEffect(() => {
    if (!resolvedService || availabilityLoading || availabilityError || !availability) {
      return;
    }

    if (availability.slots.length > 0) {
      return;
    }

    if (resolvedService.requiresInstructor && !selectedInstructorId) {
      return;
    }

    const key = `${resolvedService.id}:${date}:${selectedInstructorId || ""}`;
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
          const nextAvailability = await fetchAvailability(
            selectedLocationSlug,
            service.id,
            nextDate,
            service.requiresInstructor ? selectedInstructorId : undefined,
          );
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
  }, [
    resolvedService,
    availabilityLoading,
    availabilityError,
    availability,
    date,
    autoSearchKey,
    selectedInstructorId,
    selectedLocationSlug,
  ]);

  const availableTimeSlots = useMemo(() => {
    if (!availability) return [];
    return [...availability.slots].sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [availability]);

  const selectedSlots = useMemo(() => {
    if (!selectedSlotKeys.length) return [] as SlotOption[];
    const selectedSet = new Set(selectedSlotKeys);
    return availableTimeSlots.filter((slot) => selectedSet.has(getSlotKey(slot)));
  }, [availableTimeSlots, selectedSlotKeys]);

  useEffect(() => {
    if (!selectedSlotKeys.length) {
      return;
    }
    const availableKeys = new Set(availableTimeSlots.map((slot) => getSlotKey(slot)));
    setSelectedSlotKeys((previous) => previous.filter((key) => availableKeys.has(key)));
  }, [availableTimeSlots, selectedSlotKeys.length]);

  useEffect(() => {
    if (serviceKind !== "training") {
      setSelectedInstructorId("");
      return;
    }

    const pendingTrainerId = pendingTrainerIdFromUrlRef.current;
    if (pendingTrainerId) {
      const pendingTrainerExists = trainersForSport.some((trainer) => trainer.id === pendingTrainerId);
      if (pendingTrainerExists) {
        setSelectedInstructorId(pendingTrainerId);
        pendingTrainerIdFromUrlRef.current = null;
        return;
      }
    }

    const stillAvailable = trainersForSport.some((trainer) => trainer.id === selectedInstructorId);
    if (stillAvailable) return;

    setSelectedInstructorId("");
  }, [serviceKind, trainersForSport, selectedInstructorId]);

  const selectedTrainer = selectedInstructorId ? instructorsById[selectedInstructorId] ?? null : null;
  const selectedTrainerPricePerHour = selectedTrainer ? selectedTrainer.sportPrices[sport] ?? 0 : 0;
  const sportStepNumber = hasLocationStep ? 2 : 1;
  const serviceStepNumber = sportStepNumber + 1;
  const trainerStepNumber = serviceStepNumber + 1;
  const dateStepNumber = serviceKind === "training" ? trainerStepNumber + 1 : serviceStepNumber + 1;
  const timeStepNumber = dateStepNumber + 1;
  const accountStepNumber = timeStepNumber + 1;
  const reviewStepNumber = accountStepNumber + 1;
  const requiresAccountForBooking = true;
  const bookingReturnToPath = useMemo(() => {
    const trainerIdForUrl =
      serviceKind === "training" ? selectedInstructorId || pendingTrainerIdFromUrlRef.current || "" : "";
    const params = new URLSearchParams();
    if (selectedLocationSlug) {
      params.set("location", selectedLocationSlug);
    }
    params.set("sport", sport);
    params.set("service", serviceKind);
    params.set("date", date);
    if (trainerIdForUrl) {
      params.set("instructor", trainerIdForUrl);
    }
    const selectedStartTimes = selectedSlots.map((slot) => slot.startTime);
    if (selectedStartTimes.length > 0) {
      for (const time of selectedStartTimes) {
        params.append("time", time);
      }
    }
    return `/book?${params.toString()}`;
  }, [selectedLocationSlug, sport, serviceKind, date, selectedInstructorId, selectedSlots]);

  const stepperItems = useMemo(() => {
    const slotChosen = selectedSlotKeys.length > 0;
    const dateChosen = Boolean(date);
    const baseItems =
      serviceKind === "training"
        ? [
            { id: "sport", label: "Спорт", ready: true },
            { id: "service", label: "Услуга", ready: Boolean(resolvedService) },
            { id: "trainer", label: "Тренер", ready: Boolean(selectedInstructorId) },
            { id: "date", label: "Дата", ready: dateChosen },
            { id: "time", label: "Время", ready: slotChosen },
            { id: "account", label: "Аккаунт", ready: slotChosen && isAuthenticated },
            { id: "confirm", label: "Подтверждение", ready: Boolean(submitSuccess) },
          ]
        : [
            { id: "sport", label: "Спорт", ready: true },
            { id: "service", label: "Услуга", ready: Boolean(resolvedService) },
            { id: "date", label: "Дата", ready: dateChosen },
            { id: "time", label: "Время", ready: slotChosen },
            { id: "account", label: "Аккаунт", ready: slotChosen && isAuthenticated },
            { id: "confirm", label: "Подтверждение", ready: Boolean(submitSuccess) },
          ];
    const items = hasLocationStep
      ? [{ id: "location", label: "Локация", ready: Boolean(selectedLocation) }, ...baseItems]
      : baseItems;

    const currentIndex = items.findIndex((item) => !item.ready);
    const activeIndex = currentIndex === -1 ? items.length - 1 : currentIndex;

    return items.map((item, index) => ({
      ...item,
      state: index < activeIndex ? ("completed" as const) : index === activeIndex ? ("current" as const) : ("pending" as const),
      stepNumber: index + 1,
    }));
  }, [
    hasLocationStep,
    selectedLocation,
    serviceKind,
    resolvedService,
    selectedInstructorId,
    selectedSlotKeys.length,
    isAuthenticated,
    submitSuccess,
    date,
  ]);

  useEffect(() => {
    if (!hasRestoredFromUrlRef.current || typeof window === "undefined") {
      return;
    }
    if (skipInitialUrlSyncRef.current) {
      skipInitialUrlSyncRef.current = false;
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const trainerIdForUrl =
      serviceKind === "training" ? selectedInstructorId || pendingTrainerIdFromUrlRef.current || "" : "";
    if (selectedLocationSlug) {
      params.set("location", selectedLocationSlug);
    } else {
      params.delete("location");
    }
    params.set("sport", sport);
    params.set("service", serviceKind);
    params.set("date", date);

    if (trainerIdForUrl) {
      params.set("instructor", trainerIdForUrl);
    } else {
      params.delete("instructor");
    }
    params.delete("time");
    params.delete("times");
    for (const slot of selectedSlots) {
      params.append("time", slot.startTime);
    }

    const nextUrl = `${window.location.pathname}?${params.toString()}`;
    const currentUrl = `${window.location.pathname}${window.location.search}`;
    if (nextUrl !== currentUrl) {
      window.history.replaceState(window.history.state, "", nextUrl);
    }
  }, [selectedLocationSlug, sport, serviceKind, date, selectedInstructorId, selectedSlots]);

  const pricePreview = useMemo(() => {
    if (!resolvedService || selectedSlots.length === 0) return null;

    const slotLines = selectedSlots.map((slot) => {
      const tier = resolvePricingTier(date, slot.startTime);
      const courtPrice = courtPrices[sport]?.[tier] ?? 0;
      const instructorPrice = serviceKind === "training" ? selectedTrainerPricePerHour : 0;
      return {
        key: getSlotKey(slot),
        startTime: slot.startTime,
        endTime: slot.endTime,
        tier,
        courtPrice,
        instructorPrice,
        total: courtPrice + instructorPrice,
      };
    });

    return {
      slotLines,
      total: slotLines.reduce((sum, line) => sum + line.total, 0),
      selectedCount: slotLines.length,
    };
  }, [resolvedService, selectedSlots, date, courtPrices, sport, serviceKind, selectedTrainerPricePerHour]);

  function openCustomerEditor() {
    setCustomerEditorName(customerName);
    setCustomerEditorEmail(customerEmail);
    setCustomerEditorPhone(customerPhone);
    setCustomerEditorError(null);
    setShowCustomerEditor(true);
  }

  function saveCustomerEditor() {
    const nextName = customerEditorName.trim();
    const nextEmail = customerEditorEmail.trim();
    const nextPhone = customerEditorPhone.trim();

    if (!nextName || !nextEmail || !nextPhone) {
      setCustomerEditorError("Заполните имя, email и телефон.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nextEmail)) {
      setCustomerEditorError("Введите корректный email.");
      return;
    }

    setCustomerName(nextName);
    setCustomerEmail(nextEmail);
    setCustomerPhone(nextPhone);
    setCustomerEditorError(null);
    setShowCustomerEditor(false);
  }

  async function submitBooking() {
    if (!resolvedService) {
      setSubmitError("Выберите спорт и услугу.");
      return;
    }
    if (selectedSlots.length === 0) {
      setSubmitError("Выберите хотя бы один слот.");
      return;
    }
    if (requiresAccountForBooking && !isAuthenticated) {
      setSubmitError("Для бронирования требуется вход в зарегистрированный аккаунт.");
      return;
    }
    if (!customerName.trim() || !customerEmail.trim() || !customerPhone.trim()) {
      setSubmitError("Заполните имя, email и телефон.");
      return;
    }
    if (resolvedService.requiresInstructor && !selectedTrainer) {
      setSubmitError("Выберите тренера.");
      return;
    }

    setSubmitLoading(true);
    setSubmitError(null);
    setSubmitWarning(null);
    setSubmitSuccess(null);
    setSubmitSuccessSummary(null);

    try {
      const sessionsToBook = [...selectedSlots].sort((a, b) => a.startTime.localeCompare(b.startTime));
      const bookedSessions: BookingSuccessSessionSummary[] = [];
      const failedSlots: string[] = [];
      let lastSuccessPayload: BookingApiSuccessPayload | null = null;

      for (const slot of sessionsToBook) {
        const fallbackCourtId = slot.availableCourtIds[0];
        if (!fallbackCourtId) {
          failedSlots.push(`${slot.startTime} - ${slot.endTime}: нет свободного корта`);
          continue;
        }

        const response = await fetch("/api/bookings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            serviceId: resolvedService.id,
            location: selectedLocationSlug,
            date,
            startTime: slot.startTime,
            durationMin: 60,
            courtId: fallbackCourtId,
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
          const errorMessage =
            payload && typeof payload === "object" && "error" in payload && payload.error
              ? payload.error
              : "Не удалось создать бронирование";
          failedSlots.push(`${slot.startTime} - ${slot.endTime}: ${errorMessage}`);
          continue;
        }

        const successPayload = payload as BookingApiSuccessPayload;
        if (successPayload.source === "demo-fallback") {
          failedSlots.push(`${slot.startTime} - ${slot.endTime}: Не удалось подтвердить бронирование`);
          continue;
        }

        const assignedCourtId =
          successPayload.data.booking.resources?.find((resource) => resource.resourceType === "court")?.resourceId ??
          fallbackCourtId;

        bookedSessions.push({
          sport,
          serviceKind,
          date,
          startTime: slot.startTime,
          endTime: slot.endTime,
          courtLabel: formatCourtLabel(assignedCourtId, courtNames),
          trainerName: serviceKind === "training" ? selectedTrainer?.name : undefined,
          amount: successPayload.data.booking.priceTotal,
          currency: successPayload.data.booking.currency,
        });
        lastSuccessPayload = successPayload;
      }

      if (bookedSessions.length === 0) {
        throw new Error(failedSlots[0] ?? "Не удалось создать бронирование");
      }

      const summaryCurrency = bookedSessions[0]?.currency ?? "KZT";
      setSubmitSuccessSummary({
        sessions: bookedSessions,
        totalAmount: bookedSessions.reduce((sum, session) => sum + session.amount, 0),
        currency: summaryCurrency,
      });
      setSubmitSuccess(lastSuccessPayload);
      if (failedSlots.length > 0) {
        setSubmitWarning(
          `${bookedSessions.length} из ${sessionsToBook.length} бронирований созданы. ${failedSlots[0]}`,
        );
      }
      setReloadKey((value) => value + 1);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Ошибка создания брони");
    } finally {
      setSubmitLoading(false);
    }
  }

  const noServiceForChoice = !resolvedService;
  const hasSelectedSlot = selectedSlots.length > 0;
  const canShowDateTimeStep = serviceKind !== "training" || Boolean(selectedInstructorId);
  const collapseCompletedSteps = hasSelectedSlot;
  const showSportEditor = !collapseCompletedSteps || editingStepId === "sport";
  const showServiceEditor = !collapseCompletedSteps || editingStepId === "service";
  const showTrainerEditor =
    serviceKind === "training" && (!collapseCompletedSteps || editingStepId === "trainer");
  const showDateTimeEditor = canShowDateTimeStep && (!collapseCompletedSteps || editingStepId === "datetime");
  const selectedSportLabel = getSportDisplayLabel(sport);
  const selectedDateTimeSummary = hasSelectedSlot
    ? `${date} · ${selectedSlots.map((slot) => `${slot.startTime} - ${slot.endTime}`).join(", ")}`
    : date;
  const selectedDateTimeSub = hasSelectedSlot
    ? `Выбрано слотов: ${selectedSlots.length}. Корт назначается автоматически.`
    : null;

  return (
    <section className="booking-flow" aria-labelledby="booking-flow-title">
      <h2 id="booking-flow-title" className="booking-flow__title">
        Онлайн-бронирование
      </h2>

      <ol className="booking-live__stepper" aria-label="Шаги бронирования">
        {stepperItems.map((step) => (
          <li key={step.id} className={`booking-live__stepper-item booking-live__stepper-item--${step.state}`}>
            <span className="booking-live__stepper-badge" aria-hidden="true">
              {step.stepNumber}
            </span>
            <span className="booking-live__stepper-label">{step.label}</span>
          </li>
        ))}
      </ol>

      <div className="booking-flow__panel">
        {!isAuthenticated ? (
          <div className="booking-live__message booking-live__message--warning" role="note">
            <p>Для бронирования необходим аккаунт.</p>
            <div className="booking-live__links">
              <Link
                href={`/register?next=${encodeURIComponent(bookingReturnToPath)}`}
                className="booking-live__link"
              >
                Зарегистрироваться
              </Link>
              <Link href={`/login?next=${encodeURIComponent(bookingReturnToPath)}`} className="booking-live__link">
                Войти
              </Link>
            </div>
          </div>
        ) : null}

        {hasLocationStep && selectedLocation ? (
          <div className="booking-live__step booking-live__step--animated">
            <p className="booking-live__step-title">1. Выберите локацию</p>
            <div className="booking-live__choice-list">
              {locations.map((location) => (
                <Link
                  key={location.id}
                  href={`/book?location=${encodeURIComponent(location.slug)}`}
                  className={`booking-live__choice-button${selectedLocationSlug === location.slug ? " booking-live__choice-button--active" : ""}`}
                >
                  {location.name}
                </Link>
              ))}
            </div>
            <p className="booking-live__helper">{selectedLocation.address}</p>
          </div>
        ) : null}

        {showSportEditor ? (
          <div className="booking-live__step booking-live__step--animated">
            <p className="booking-live__step-title">{sportStepNumber}. Выберите спорт</p>
            <div className="booking-live__choice-list">
              {sportOptions.map((item) => (
                <button
                  key={item.slug}
                  type="button"
                  className={`booking-live__choice-button${sport === item.slug ? " booking-live__choice-button--active" : ""}`}
                  onClick={() => {
                    setEditingStepId(null);
                    setSport(item.slug);
                  }}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="booking-live__step-summary booking-live__step--animated">
            <div className="booking-live__step-summary-content">
              <p className="booking-live__step-summary-title">{sportStepNumber}. Спорт</p>
              <p className="booking-live__step-summary-value">{selectedSportLabel}</p>
            </div>
            <button
              type="button"
              className="booking-live__link"
              onClick={() => setEditingStepId("sport")}
            >
              Изменить
            </button>
          </div>
        )}

        {showServiceEditor ? (
          <div className="booking-live__step booking-live__step--animated">
            <p className="booking-live__step-title">{serviceStepNumber}. Выберите услугу</p>
            <div className="booking-live__choice-list">
              {(["court", "training"] as const).map((kind) => {
                const available = Boolean(serviceMatrix[sport]?.[kind]);
                return (
                  <button
                    key={kind}
                    type="button"
                    disabled={!available}
                    className={`booking-live__choice-button${serviceKind === kind ? " booking-live__choice-button--active" : ""}`}
                    onClick={() => {
                      setEditingStepId(null);
                      setServiceKind(kind);
                    }}
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
        ) : (
          <div className="booking-live__step-summary booking-live__step--animated">
            <div className="booking-live__step-summary-content">
              <p className="booking-live__step-summary-title">{serviceStepNumber}. Услуга</p>
              <p className="booking-live__step-summary-value">{getServiceKindLabel(serviceKind)}</p>
              {resolvedService ? (
                <p className="booking-live__step-summary-sub">{resolvedService.name}</p>
              ) : null}
            </div>
            <button
              type="button"
              className="booking-live__link"
              onClick={() => setEditingStepId("service")}
            >
              Изменить
            </button>
          </div>
        )}

        {serviceKind === "training" ? (
          showTrainerEditor ? (
            <div className="booking-live__step booking-live__step--animated">
              <p className="booking-live__step-title">{trainerStepNumber}. Выберите тренера</p>
              {trainersForSport.length === 0 ? (
                <div className="booking-live__empty">Для выбранного спорта пока нет доступных тренеров.</div>
              ) : (
                <div className="booking-live__trainer-list">
                  {trainersForSport.map((trainer) => (
                    <button
                      key={trainer.id}
                      type="button"
                      className={`booking-live__trainer-button${selectedInstructorId === trainer.id ? " booking-live__trainer-button--selected" : ""}`}
                      onClick={() => {
                        pendingTrainerIdFromUrlRef.current = null;
                        setEditingStepId(null);
                        setSelectedInstructorId(trainer.id);
                      }}
                    >
                      <span className="booking-live__trainer-head">
                        <span className="booking-live__trainer-avatar" aria-hidden="true">
                          {trainer.name
                            .split(" ")
                            .map((part) => part[0])
                            .slice(0, 2)
                            .join("")}
                        </span>
                        <span className="booking-live__trainer-meta">
                          <span className="booking-live__trainer-name">{trainer.name}</span>
                          <span className="booking-live__trainer-tags">
                            {trainer.sports.map((trainerSport) => (
                              <span key={`${trainer.id}-${trainerSport}`} className="booking-live__trainer-tag">
                                {getSportDisplayLabel(trainerSport)}
                              </span>
                            ))}
                          </span>
                        </span>
                      </span>
                      <span className="booking-live__trainer-price">
                        {formatMoneyKzt(trainer.sportPrices[sport] ?? 0)} / час
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="booking-live__step-summary booking-live__step--animated">
              <div className="booking-live__step-summary-content">
                <p className="booking-live__step-summary-title">{trainerStepNumber}. Тренер</p>
                <p className="booking-live__step-summary-value">
                  {selectedTrainer ? selectedTrainer.name : "Не выбран"}
                </p>
                {selectedTrainer ? (
                  <p className="booking-live__step-summary-sub">
                    {formatMoneyKzt(selectedTrainerPricePerHour)} / час
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                className="booking-live__link"
                onClick={() => setEditingStepId("trainer")}
              >
                Изменить
              </button>
            </div>
          )
        ) : null}

        {showDateTimeEditor ? (
          <>
            <div className="booking-live__step booking-live__step--animated">
              <div className="booking-live__date-head">
                <p className="booking-live__step-title">{dateStepNumber}. Выберите дату</p>
                <div className="booking-flow__group booking-live__date-group">
                  <label className="booking-flow__label" htmlFor="booking-date-live">
                    Дата
                  </label>
                  <input
                    id="booking-date-live"
                    type="date"
                    className="booking-flow__field"
                    value={date}
                    onChange={(event) => {
                      setEditingStepId(null);
                      setDate(event.target.value);
                    }}
                  />
                </div>
              </div>
              {autoDateMessage ? <p className="booking-live__helper">{autoDateMessage}</p> : null}
            </div>

            <div className="booking-live__step booking-live__step--animated">
              <p className="booking-live__step-title">{timeStepNumber}. Выберите время</p>
              <p className="booking-live__helper">
                Можно выбрать несколько слотов. Корт будет назначен автоматически при подтверждении.
              </p>

              {noServiceForChoice ? (
                <div className="booking-live__empty">Сначала выберите доступную услугу.</div>
              ) : serviceKind === "training" && !selectedInstructorId ? (
                <div className="booking-live__empty">Сначала выберите тренера, чтобы показать доступное время.</div>
              ) : availabilityLoading ? (
                <div className="booking-live__availability-skeleton" aria-hidden="true">
                  <div className="booking-live__availability-skeleton-head" />
                  <div className="booking-live__availability-skeleton-group">
                    <div className="booking-live__availability-skeleton-line booking-live__availability-skeleton-line--wide" />
                    <div className="booking-live__availability-skeleton-slots">
                      <div className="booking-live__availability-skeleton-slot" />
                      <div className="booking-live__availability-skeleton-slot" />
                      <div className="booking-live__availability-skeleton-slot" />
                    </div>
                  </div>
                  <div className="booking-live__availability-skeleton-group">
                    <div className="booking-live__availability-skeleton-line" />
                    <div className="booking-live__availability-skeleton-slots">
                      <div className="booking-live__availability-skeleton-slot" />
                      <div className="booking-live__availability-skeleton-slot" />
                    </div>
                  </div>
                </div>
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
                        {selectedSlotKeys.length > 0
                          ? `Выбрано: ${selectedSlotKeys.length} ${selectedSlotKeys.length === 1 ? "слот" : selectedSlotKeys.length < 5 ? "слота" : "слотов"}`
                          : "Выберите один или несколько слотов"}
                      </p>
                    </div>
                  </div>

                  {availableTimeSlots.length === 0 ? (
                    <div className="booking-live__empty">
                      Нет доступного времени на выбранную дату. Попробуйте другую дату.
                    </div>
                  ) : (
                    <div className="booking-live__slots-inline">
                      {availableTimeSlots.map((slot) => {
                        const slotKey = getSlotKey(slot);
                        const isSelected = selectedSlotKeys.includes(slotKey);
                        const tier = resolvePricingTier(date, slot.startTime);
                        const courtPrice = courtPrices[sport]?.[tier] ?? 0;
                        const trainerPrice = serviceKind === "training" ? selectedTrainerPricePerHour : 0;
                        const slotTotal = courtPrice + trainerPrice;

                        return (
                          <button
                            key={slotKey}
                            type="button"
                            className={`booking-live__slot-button${isSelected ? " booking-live__slot-button--selected" : ""}`}
                            onClick={() => {
                              setEditingStepId(null);
                              setSelectedSlotKeys((previous) =>
                                previous.includes(slotKey)
                                  ? previous.filter((key) => key !== slotKey)
                                  : [...previous, slotKey],
                              );
                            }}
                          >
                            <span className="booking-live__slot-time">
                              {slot.startTime} - {slot.endTime}
                            </span>
                            <span className="booking-live__slot-tags">
                              <span className="booking-live__slot-tag">{getTierLabel(tier)}</span>
                              <span className="booking-live__slot-tag">
                                {slot.availableCourtIds.length} {slot.availableCourtIds.length === 1 ? "корт" : slot.availableCourtIds.length < 5 ? "корта" : "кортов"}
                              </span>
                            </span>
                            <span className="booking-live__slot-meta">
                              {serviceKind === "training" && selectedTrainer
                                ? `Тренер: ${selectedTrainer.name}`
                                : "Корт назначается автоматически"}
                            </span>
                            <span className="booking-live__slot-price">{formatMoneyKzt(slotTotal)}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          </>
        ) : hasSelectedSlot ? (
          <div className="booking-live__step-summary booking-live__step--animated">
            <div className="booking-live__step-summary-content">
              <p className="booking-live__step-summary-title">{dateStepNumber}. Дата и время</p>
              <p className="booking-live__step-summary-value">{selectedDateTimeSummary}</p>
              {selectedDateTimeSub ? (
                <p className="booking-live__step-summary-sub">{selectedDateTimeSub}</p>
              ) : null}
              {pricePreview ? (
                <p className="booking-live__step-summary-sub">
                  Тарифы:{" "}
                  {Array.from(new Set(pricePreview.slotLines.map((line) => getTierLabel(line.tier)))).join(", ")}
                </p>
              ) : null}
            </div>
            <button
              type="button"
              className="booking-live__link"
              onClick={() => setEditingStepId("datetime")}
            >
              Изменить
            </button>
          </div>
        ) : null}

        {hasSelectedSlot ? (
          <div className="booking-live__customer">
            <p className="booking-live__section-title">
              {accountStepNumber}. {isAuthenticated ? "Данные аккаунта" : "Войти или зарегистрироваться"}
            </p>
            {!isAuthenticated ? (
              <div className="booking-live__account-box">
                <p className="booking-live__helper">
                  Для оформления бронирования войдите в аккаунт или зарегистрируйтесь.
                </p>
                <div className="booking-live__links">
                  <Link
                    href={`/register?next=${encodeURIComponent(bookingReturnToPath)}`}
                    className="booking-live__link"
                  >
                    Регистрация
                  </Link>
                  <Link href={`/login?next=${encodeURIComponent(bookingReturnToPath)}`} className="booking-live__link">
                    Войти
                  </Link>
                </div>
              </div>
            ) : (
              <div className="booking-live__account-box">
                <div className="booking-live__account-grid">
                  <div className="booking-live__account-row">
                    <span className="booking-live__account-label">Имя</span>
                    <span className="booking-live__account-value">{customerName || "Не указано"}</span>
                  </div>
                  <div className="booking-live__account-row">
                    <span className="booking-live__account-label">Email</span>
                    <span className="booking-live__account-value">{customerEmail || "Не указано"}</span>
                  </div>
                  <div className="booking-live__account-row">
                    <span className="booking-live__account-label">Телефон</span>
                    <span className="booking-live__account-value">{customerPhone || "Не указано"}</span>
                  </div>
                </div>
                <div className="booking-live__links">
                  <button type="button" className="booking-live__link" onClick={openCustomerEditor}>
                    Изменить данные
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : null}

        {hasSelectedSlot && pricePreview ? (
          <div className="booking-live__summary">
            <p className="booking-live__section-title">{reviewStepNumber}. Проверка и подтверждение</p>
            <p className="booking-live__summary-line">
              {getSportDisplayLabel(sport)} / {getServiceKindLabel(serviceKind)} / {date}
            </p>
            <p className="booking-live__summary-sub">
              Выбрано слотов: {pricePreview.selectedCount}. Корт назначается автоматически при создании каждой брони.
            </p>
            {serviceKind === "training" && selectedTrainer ? (
              <p className="booking-live__summary-sub">Тренер: {selectedTrainer.name}</p>
            ) : null}
            <div className="booking-live__price-breakdown">
              {pricePreview.slotLines.map((line) => (
                <div key={line.key} className="booking-live__price-row">
                  <span>
                    {line.startTime} - {line.endTime} ({getTierLabel(line.tier)})
                  </span>
                  <span>{formatMoneyKzt(line.total)}</span>
                </div>
              ))}
              <div className="booking-live__price-row booking-live__price-row--total">
                <span>Итого за {pricePreview.selectedCount} {pricePreview.selectedCount === 1 ? "слот" : pricePreview.selectedCount < 5 ? "слота" : "слотов"}</span>
                <span>{formatMoneyKzt(pricePreview.total)}</span>
              </div>
            </div>
          </div>
        ) : null}

        {hasSelectedSlot ? (
          <div className="booking-live__actions">
            <button
              type="button"
              className={`booking-live__button booking-live__button--accent${submitLoading ? " booking-live__button--loading" : ""}`}
              onClick={() => {
                void submitBooking();
              }}
              disabled={
                submitLoading ||
                selectedSlots.length === 0 ||
                !resolvedService ||
                (requiresAccountForBooking && !isAuthenticated) ||
                (resolvedService.requiresInstructor && !selectedTrainer)
              }
            >
              {submitLoading ? "Создаем бронирования..." : "Забронировать"}
            </button>
            <span className="booking-live__helper">
              {isAuthenticated
                ? "Проверьте выбранные слоты и данные аккаунта перед подтверждением."
                : "Сначала войдите или зарегистрируйтесь, затем вернитесь к бронированию."}
            </span>
          </div>
        ) : null}

        {submitWarning ? (
          <div className="booking-live__message booking-live__message--warning" role="status">
            {submitWarning}
          </div>
        ) : null}

        {submitError ? (
          <div className="booking-live__message booking-live__message--error" role="alert">
            {submitError}
          </div>
        ) : null}

        {submitSuccess && submitSuccessSummary ? (
          <div className="booking-live__message booking-live__message--success" role="status">
            <p className="booking-live__result-title">Бронирование создано</p>
            <p className="booking-live__result-line">
              <strong>
                {getSportDisplayLabel(sport)} / {getServiceKindLabel(serviceKind)}
              </strong>
            </p>
            <div className="booking-live__price-breakdown">
              {submitSuccessSummary.sessions.map((session) => (
                <div key={`${session.date}-${session.startTime}`} className="booking-live__price-row">
                  <span>
                    {session.date}, {session.startTime} - {session.endTime}
                    <br />
                    Корт: {session.courtLabel}
                    {session.trainerName ? ` · Тренер: ${session.trainerName}` : ""}
                  </span>
                  <span>{formatMoneyKzt(session.amount)}</span>
                </div>
              ))}
            </div>
            <p className="booking-live__result-line">
              Сумма:{" "}
              <strong>
                {submitSuccessSummary.totalAmount.toLocaleString("ru-KZ")}{" "}
                {submitSuccessSummary.currency === "KZT" ? "₸" : submitSuccessSummary.currency}
              </strong>
            </p>
            <p className="booking-live__result-line">
              Бронирование подтверждено. Детали доступны в личном кабинете.
            </p>
            <div className="booking-live__links">
              <Link href="/account/bookings" className="booking-live__link">
                Открыть личный кабинет
              </Link>
            </div>
          </div>
        ) : null}

        {showCustomerEditor ? (
          <div
            className="booking-live__modal-backdrop"
            role="presentation"
            onClick={() => setShowCustomerEditor(false)}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="booking-customer-editor-title"
              className="booking-live__modal"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="booking-live__modal-head">
                <h3 id="booking-customer-editor-title" className="booking-live__modal-title">
                  Изменить данные для бронирования
                </h3>
                <button
                  type="button"
                  className="booking-live__modal-close"
                  onClick={() => setShowCustomerEditor(false)}
                  aria-label="Закрыть окно"
                >
                  Закрыть
                </button>
              </div>
              <div className="booking-flow__grid">
                <div className="booking-flow__group">
                  <label className="booking-flow__label" htmlFor="customer-name-live">
                    Имя
                  </label>
                  <input
                    id="customer-name-live"
                    className="booking-flow__field"
                    value={customerEditorName}
                    onChange={(event) => setCustomerEditorName(event.target.value)}
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
                    value={customerEditorEmail}
                    onChange={(event) => setCustomerEditorEmail(event.target.value)}
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
                    value={customerEditorPhone}
                    onChange={(event) => setCustomerEditorPhone(event.target.value)}
                  />
                </div>
              </div>
              {customerEditorError ? (
                <div className="booking-live__message booking-live__message--error" role="alert">
                  {customerEditorError}
                </div>
              ) : null}
              <div className="booking-live__modal-actions">
                <button
                  type="button"
                  className="booking-live__button booking-live__button--accent"
                  onClick={saveCustomerEditor}
                >
                  Сохранить
                </button>
                <button
                  type="button"
                  className="booking-live__button"
                  onClick={() => setShowCustomerEditor(false)}
                >
                  Отмена
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
