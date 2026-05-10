import { prisma } from "@/src/lib/prisma";
import { isoToVenueTimezoneParts } from "@/src/lib/time/venue-timezone";
import { sendTelegramMessage } from "@/src/lib/notifications/telegram";
import { resolveCommonChatRecipient } from "@/src/lib/notifications/telegram-channels";
import { shouldDmTrainersForEvent } from "@/src/lib/notifications/trainer-dm-policy";

type EventNotificationEvent = "registered" | "cancelled";

interface EventNotificationContext {
  eventId: string;
  eventTitle: string;
  startsAt: Date;
  endsAt: Date;
  sportName: string | null;
  locationName: string | null;
  courtNames: string[];
  instructorId: string | null;
  instructorName: string | null;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
}

function buildTitle(event: EventNotificationEvent): string {
  return event === "registered" ? "Новая запись на событие" : "Запись на событие отменена";
}

function buildMessage(input: { event: EventNotificationEvent; context: EventNotificationContext }): string {
  const start = isoToVenueTimezoneParts(input.context.startsAt);
  const end = isoToVenueTimezoneParts(input.context.endsAt);
  return [
    buildTitle(input.event),
    "",
    `Событие: ${input.context.eventTitle}`,
    `Дата: ${start.date} ${start.time} - ${end.time}`,
    input.context.sportName ? `Спорт: ${input.context.sportName}` : null,
    input.context.locationName ? `Локация: ${input.context.locationName}` : null,
    input.context.courtNames.length > 0 ? `Корты: ${input.context.courtNames.join(", ")}` : null,
    input.context.instructorName ? `Тренер: ${input.context.instructorName}` : null,
    `Клиент: ${input.context.customerName} · ${input.context.customerPhone} · ${input.context.customerEmail}`,
  ].filter((line): line is string => Boolean(line)).join("\n");
}

async function loadEventRegistrationContext(registrationId: string): Promise<EventNotificationContext | null> {
  const registration = await prisma.eventRegistration.findUnique({
    where: { id: registrationId },
    select: {
      customer: {
        select: {
          name: true,
          phone: true,
          email: true,
        },
      },
      event: {
        select: {
          id: true,
          title: true,
          startsAt: true,
          endsAt: true,
          sport: { select: { name: true } },
          location: { select: { name: true } },
          instructorId: true,
          instructor: { select: { name: true } },
          courts: {
            select: {
              court: { select: { name: true } },
            },
          },
        },
      },
    },
  });

  if (!registration) return null;

  return {
    eventId: registration.event.id,
    eventTitle: registration.event.title,
    startsAt: registration.event.startsAt,
    endsAt: registration.event.endsAt,
    sportName: registration.event.sport?.name ?? null,
    locationName: registration.event.location?.name ?? null,
    courtNames: registration.event.courts.map((row) => row.court.name),
    instructorId: registration.event.instructorId,
    instructorName: registration.event.instructor?.name ?? null,
    customerName: registration.customer.name,
    customerPhone: registration.customer.phone,
    customerEmail: registration.customer.email,
  };
}

async function resolveTrainerChat(instructorId: string | null): Promise<string | null> {
  if (!instructorId) return null;
  const user = await prisma.user.findFirst({
    where: {
      role: "trainer",
      active: true,
      instructorId,
      telegramChatId: { not: null },
    },
    select: { telegramChatId: true },
  });
  return user?.telegramChatId ?? null;
}

async function notifyEventRegistration(input: { registrationId: string; event: EventNotificationEvent }) {
  const context = await loadEventRegistrationContext(input.registrationId);
  if (!context) return;

  const message = buildMessage({ event: input.event, context });
  const [commonChat, trainerChatId] = await Promise.all([
    resolveCommonChatRecipient(),
    resolveTrainerChat(context.instructorId),
  ]);

  if (commonChat) {
    await sendTelegramMessage({ chatId: commonChat.chatId, text: message });
  }

  if (
    trainerChatId &&
    shouldDmTrainersForEvent({
      event: input.event === "registered" ? "created" : "cancelled",
      bookingStartAt: context.startsAt,
      now: new Date(),
    })
  ) {
    await sendTelegramMessage({ chatId: trainerChatId, text: message });
  }
}

export async function notifyEventRegistrationCreated(args: { registrationId: string }) {
  try {
    await notifyEventRegistration({ registrationId: args.registrationId, event: "registered" });
  } catch (error) {
    console.error("[notifications] Failed to deliver event-registration notification", {
      registrationId: args.registrationId,
      error,
    });
  }
}

export async function notifyEventRegistrationCancelled(args: { registrationId: string }) {
  try {
    await notifyEventRegistration({ registrationId: args.registrationId, event: "cancelled" });
  } catch (error) {
    console.error("[notifications] Failed to deliver event-registration-cancelled notification", {
      registrationId: args.registrationId,
      error,
    });
  }
}

export async function notifyClubEventCancelled(args: { eventId: string }) {
  try {
    const event = await prisma.clubEvent.findUnique({
      where: { id: args.eventId },
      select: {
        title: true,
        startsAt: true,
        endsAt: true,
        instructorId: true,
        instructor: { select: { name: true } },
      },
    });
    if (!event) return;

    const start = isoToVenueTimezoneParts(event.startsAt);
    const end = isoToVenueTimezoneParts(event.endsAt);
    const message = [
      "Событие отменено",
      "",
      `Событие: ${event.title}`,
      `Дата: ${start.date} ${start.time} - ${end.time}`,
      event.instructor?.name ? `Тренер: ${event.instructor.name}` : null,
    ].filter((line): line is string => Boolean(line)).join("\n");

    const [commonChat, trainerChatId] = await Promise.all([
      resolveCommonChatRecipient(),
      resolveTrainerChat(event.instructorId),
    ]);
    if (commonChat) {
      await sendTelegramMessage({ chatId: commonChat.chatId, text: message });
    }
    if (trainerChatId && shouldDmTrainersForEvent({ event: "cancelled", bookingStartAt: event.startsAt, now: new Date() })) {
      await sendTelegramMessage({ chatId: trainerChatId, text: message });
    }
  } catch (error) {
    console.error("[notifications] Failed to deliver event-cancelled notification", {
      eventId: args.eventId,
      error,
    });
  }
}
