import { formatMoneyKzt } from "@/src/lib/format/money";
import { prisma } from "@/src/lib/prisma";
import { isoToVenueTimezoneParts } from "@/src/lib/time/venue-timezone";
import { sendEmailMessage } from "@/src/lib/notifications/email";
import { sendTelegramMessage } from "@/src/lib/notifications/telegram";

type BookingNotificationEvent = "created" | "cancelled";
type CancellationSource = "customer" | "admin" | "trainer";

interface BookingNotificationContext {
  bookingId: string;
  serviceName: string;
  serviceCode: string;
  sportName: string;
  startAt: Date;
  endAt: Date;
  priceTotalKzt: number;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  locationName: string;
  courtLabels: string[];
  instructorIds: string[];
  instructorLabels: string[];
}

interface NotificationRecipient {
  id: string;
  name: string;
  email: string;
  telegramChatId: string | null;
}

function buildCancellationSourceLabel(source: CancellationSource): string {
  if (source === "admin") return "администратором";
  if (source === "trainer") return "тренером";
  return "клиентом";
}

function buildSharedLines(context: BookingNotificationContext): string[] {
  const start = isoToVenueTimezoneParts(context.startAt);
  const end = isoToVenueTimezoneParts(context.endAt);
  const resourceLines = [
    context.courtLabels.length > 0 ? `Корт: ${context.courtLabels.join(", ")}` : null,
    context.instructorLabels.length > 0 ? `Тренер: ${context.instructorLabels.join(", ")}` : null,
  ].filter((line): line is string => Boolean(line));

  return [
    `Бронь: #${context.bookingId}`,
    `Дата: ${start.date} ${start.time} - ${end.time}`,
    `Услуга: ${context.serviceName} (${context.serviceCode}, ${context.sportName})`,
    `Локация: ${context.locationName}`,
    ...resourceLines,
    `Клиент: ${context.customerName} · ${context.customerPhone} · ${context.customerEmail}`,
    `Сумма: ${formatMoneyKzt(context.priceTotalKzt)}`,
  ];
}

function buildAdminMessage(args: {
  event: BookingNotificationEvent;
  context: BookingNotificationContext;
  cancelledBy?: CancellationSource;
}): { subject: string; text: string } {
  const title =
    args.event === "created"
      ? "Новая бронь"
      : `Бронь отменена (${buildCancellationSourceLabel(args.cancelledBy ?? "customer")})`;

  return {
    subject: `${title}: #${args.context.bookingId}`,
    text: [title, "", ...buildSharedLines(args.context)].join("\n"),
  };
}

function buildTrainerMessage(args: {
  event: BookingNotificationEvent;
  context: BookingNotificationContext;
  cancelledBy?: CancellationSource;
}): { subject: string; text: string } {
  const title =
    args.event === "created"
      ? "Создана новая тренировка с вашим участием"
      : `Тренировка отменена (${buildCancellationSourceLabel(args.cancelledBy ?? "customer")})`;

  return {
    subject: `${title}: #${args.context.bookingId}`,
    text: [title, "", ...buildSharedLines(args.context)].join("\n"),
  };
}

async function deliverToRecipient(recipient: NotificationRecipient, payload: { subject: string; text: string }) {
  await Promise.all([
    sendEmailMessage({
      to: recipient.email,
      subject: payload.subject,
      text: payload.text,
    }),
    recipient.telegramChatId
      ? sendTelegramMessage({
          chatId: recipient.telegramChatId,
          text: payload.text,
        })
      : Promise.resolve(false),
  ]);
}

async function loadBookingNotificationContext(bookingId: string): Promise<BookingNotificationContext | null> {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: {
      id: true,
      startAt: true,
      endAt: true,
      priceTotal: true,
      customer: {
        select: {
          name: true,
          email: true,
          phone: true,
        },
      },
      service: {
        select: {
          name: true,
          code: true,
          sport: {
            select: {
              name: true,
            },
          },
        },
      },
      location: {
        select: {
          name: true,
        },
      },
      resources: {
        select: {
          resourceType: true,
          resourceId: true,
        },
      },
    },
  });

  if (!booking) {
    return null;
  }

  const courtIds = booking.resources
    .filter((resource) => resource.resourceType === "court")
    .map((resource) => resource.resourceId);
  const instructorIds = booking.resources
    .filter((resource) => resource.resourceType === "instructor")
    .map((resource) => resource.resourceId);

  const [courts, instructors] = await Promise.all([
    courtIds.length > 0
      ? prisma.court.findMany({
          where: {
            id: { in: courtIds },
          },
          select: {
            id: true,
            name: true,
          },
        })
      : Promise.resolve([]),
    instructorIds.length > 0
      ? prisma.instructor.findMany({
          where: {
            id: { in: instructorIds },
          },
          select: {
            id: true,
            name: true,
          },
        })
      : Promise.resolve([]),
  ]);

  const courtNames = new Map(courts.map((court) => [court.id, court.name]));
  const instructorNames = new Map(instructors.map((instructor) => [instructor.id, instructor.name]));

  return {
    bookingId: booking.id,
    serviceName: booking.service.name,
    serviceCode: booking.service.code,
    sportName: booking.service.sport.name,
    startAt: booking.startAt,
    endAt: booking.endAt,
    priceTotalKzt: Number(booking.priceTotal),
    customerName: booking.customer.name,
    customerEmail: booking.customer.email,
    customerPhone: booking.customer.phone,
    locationName: booking.location.name,
    courtLabels: courtIds.map((id) => courtNames.get(id) ?? id),
    instructorIds,
    instructorLabels: instructorIds.map((id) => instructorNames.get(id) ?? id),
  };
}

async function resolveAdminRecipients(): Promise<NotificationRecipient[]> {
  return prisma.user.findMany({
    where: {
      role: {
        in: ["admin", "super_admin"],
      },
    },
    select: {
      id: true,
      name: true,
      email: true,
      telegramChatId: true,
    },
  });
}

async function resolveTrainerRecipients(instructorIds: string[]): Promise<NotificationRecipient[]> {
  if (instructorIds.length === 0) {
    return [];
  }

  return prisma.user.findMany({
    where: {
      role: "trainer",
      instructorId: {
        in: instructorIds,
      },
    },
    select: {
      id: true,
      name: true,
      email: true,
      telegramChatId: true,
    },
  });
}

async function notifyForBookingEvent(args: {
  bookingId: string;
  event: BookingNotificationEvent;
  cancelledBy?: CancellationSource;
}) {
  const context = await loadBookingNotificationContext(args.bookingId);
  if (!context) {
    return;
  }

  const [adminRecipients, trainerRecipients] = await Promise.all([
    resolveAdminRecipients(),
    resolveTrainerRecipients(context.instructorIds),
  ]);

  const adminPayload = buildAdminMessage({
    event: args.event,
    context,
    cancelledBy: args.cancelledBy,
  });
  await Promise.all(adminRecipients.map((recipient) => deliverToRecipient(recipient, adminPayload)));

  if (trainerRecipients.length > 0) {
    const trainerPayload = buildTrainerMessage({
      event: args.event,
      context,
      cancelledBy: args.cancelledBy,
    });
    await Promise.all(trainerRecipients.map((recipient) => deliverToRecipient(recipient, trainerPayload)));
  }
}

export async function notifyBookingCreated(args: { bookingId: string }) {
  try {
    await notifyForBookingEvent({
      bookingId: args.bookingId,
      event: "created",
    });
  } catch (error) {
    console.error("[notifications] Failed to deliver booking-created notifications", {
      bookingId: args.bookingId,
      error,
    });
  }
}

export async function notifyBookingCancelled(args: { bookingId: string; cancelledBy: CancellationSource }) {
  try {
    await notifyForBookingEvent({
      bookingId: args.bookingId,
      event: "cancelled",
      cancelledBy: args.cancelledBy,
    });
  } catch (error) {
    console.error("[notifications] Failed to deliver booking-cancelled notifications", {
      bookingId: args.bookingId,
      cancelledBy: args.cancelledBy,
      error,
    });
  }
}
