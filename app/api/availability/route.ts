import { NextResponse } from "next/server";
import { getAvailabilityContextFromDb } from "@/src/lib/availability/db";
import { generateAvailableSlots } from "@/src/lib/availability/engine";
import {
  demoCourtIds,
  demoExceptions,
  demoExistingBookings,
  demoInstructorIds,
  demoInstructorSchedules,
  demoOpeningHours,
  demoServices,
} from "@/src/lib/availability/demo";
import { availabilityQuerySchema } from "@/src/lib/validation/booking";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const allowDemoFallback = process.env.ALLOW_DEMO_FALLBACK === "true";
  const url = new URL(request.url);
  const parsed = availabilityQuerySchema.safeParse({
    serviceId: url.searchParams.get("serviceId"),
    date: url.searchParams.get("date"),
    durationMin: url.searchParams.get("durationMin"),
    instructorId: url.searchParams.get("instructorId") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Некорректные параметры запроса",
        details: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  const serializeSlots = (slots: Array<{
    startTime: string;
    endTime: string;
    availableCourtIds: string[];
    availableInstructorIds: string[];
  }>) =>
    parsed.data.instructorId
      ? slots.map((slot) => ({
          startTime: slot.startTime,
          endTime: slot.endTime,
          availableCourtIds: slot.availableCourtIds,
        }))
      : slots;

  let dbErrorMessage: string | null = null;
  try {
    const dbContext = await getAvailabilityContextFromDb({
      serviceCode: parsed.data.serviceId,
      date: parsed.data.date,
    });

    if (dbContext) {
      const slots = generateAvailableSlots({
        date: parsed.data.date,
        durationMin: parsed.data.durationMin,
        service: dbContext.service,
        openingHours: dbContext.openingHours,
        courtIds: dbContext.courtIds,
        instructorIds: dbContext.instructorIds,
        instructorSchedules: dbContext.instructorSchedules,
        exceptions: dbContext.exceptions,
        existingBookings: dbContext.existingBookings,
        requestedInstructorId: parsed.data.instructorId,
      });

      return NextResponse.json({
        meta: {
          source: "db-engine",
          timezone: process.env.APP_TIMEZONE ?? "Asia/Almaty",
          slotGranularityMin: 60,
          durationMin: parsed.data.durationMin,
          sessionPolicy: "fixed_60_min",
        },
        service: dbContext.service,
        date: parsed.data.date,
        slots: serializeSlots(slots),
      });
    }
  } catch (error) {
    dbErrorMessage = error instanceof Error ? error.message : "Ошибка БД";
    if (!allowDemoFallback) {
      return NextResponse.json(
        {
          error: "Не удалось получить доступность из БД",
          details: process.env.NODE_ENV === "development" ? dbErrorMessage : undefined,
        },
        { status: 500 },
      );
    }
  }

  const service = demoServices.find((item) => item.id === parsed.data.serviceId);
  if (!service) {
    return NextResponse.json({ error: "Услуга не найдена" }, { status: 404 });
  }

  const slots = generateAvailableSlots({
    date: parsed.data.date,
    durationMin: parsed.data.durationMin,
    service,
    openingHours: demoOpeningHours,
    courtIds: demoCourtIds.filter((id) => id.startsWith(service.sport)),
    instructorIds: demoInstructorIds,
    instructorSchedules: demoInstructorSchedules,
    exceptions: demoExceptions,
    existingBookings: demoExistingBookings,
    requestedInstructorId: parsed.data.instructorId,
  });

  return NextResponse.json({
    meta: {
      source: "demo-engine",
      fallbackReason: dbErrorMessage ?? "service-not-found-in-db",
      timezone: process.env.APP_TIMEZONE ?? "Asia/Almaty",
      slotGranularityMin: 60,
      durationMin: parsed.data.durationMin,
      sessionPolicy: "fixed_60_min",
    },
    service: {
      id: service.id,
      name: service.name,
      sport: service.sport,
      requiresCourt: service.requiresCourt,
      requiresInstructor: service.requiresInstructor,
    },
    date: parsed.data.date,
    slots: serializeSlots(slots),
  });
}
