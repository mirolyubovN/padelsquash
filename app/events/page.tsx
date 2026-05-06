import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { PublicEventCard, type PublicEventCardGroup } from "@/src/components/events/public-event-card";
import { PageHero } from "@/src/components/page-hero";
import {
  cancelCustomerEventRegistration,
  EventRegistrationError,
  getPublicEventGroups,
  registerCustomerForEvent,
} from "@/src/lib/events/service";
import { canAccessAdminPortal, normalizeRole } from "@/src/lib/auth/roles";
import { formatDateInVenueTimezone, formatTimeInVenueTimezone } from "@/src/lib/time/venue-timezone";
import { buildPageMetadata } from "@/src/lib/seo/metadata";

export const metadata = buildPageMetadata({
  title: "События | Padel & Squash KZ",
  description: "Клубные дни, групповые тренировки и события клуба с онлайн-записью.",
  path: "/events",
});

export const dynamic = "force-dynamic";

function eventTimeLabel(startAt: Date, endAt: Date): string {
  return `${formatDateInVenueTimezone(startAt)}, ${formatTimeInVenueTimezone(startAt)}-${formatTimeInVenueTimezone(endAt)}`;
}

function eventShortTimeLabel(startAt: Date, endAt: Date): string {
  return `${formatTimeInVenueTimezone(startAt)}-${formatTimeInVenueTimezone(endAt)}`;
}

function priceLabel(priceMinKzt: number, priceMaxKzt: number): string {
  if (priceMinKzt === priceMaxKzt) {
    return `${priceMinKzt.toLocaleString("ru-KZ")} ₸`;
  }
  return `${priceMinKzt.toLocaleString("ru-KZ")}-${priceMaxKzt.toLocaleString("ru-KZ")} ₸`;
}

function singlePriceLabel(priceKzt: number): string {
  return `${priceKzt.toLocaleString("ru-KZ")} ₸`;
}

function errorMessage(code?: string): string | null {
  if (code === "full") return "Мест на событие больше нет.";
  if (code === "balance") return "Недостаточно средств на балансе. Пополните баланс и попробуйте снова.";
  if (code === "registered") return "Вы уже записаны на это событие.";
  if (code === "unavailable") return "Событие недоступно для записи.";
  if (code === "customer") return "Запись доступна только клиентскому аккаунту.";
  if (code === "cancel_failed") return "Не удалось отменить запись на событие.";
  if (code === "failed") return "Не удалось записаться на событие.";
  return null;
}

function mapRegistrationError(error: unknown): string {
  if (error instanceof EventRegistrationError) {
    if (error.code === "EVENT_FULL") return "full";
    if (error.code === "INSUFFICIENT_WALLET_BALANCE") return "balance";
    if (error.code === "ALREADY_REGISTERED") return "registered";
    if (error.code === "CUSTOMER_REQUIRED") return "customer";
    return "unavailable";
  }
  return "failed";
}

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string }>;
}) {
  const [session, params] = await Promise.all([auth(), searchParams]);
  const role = normalizeRole(session?.user?.role);
  const customerId = session?.user?.id && !canAccessAdminPortal(role) ? session.user.id : undefined;
  const eventGroups = await getPublicEventGroups(customerId);
  const publicEventGroups: PublicEventCardGroup[] = eventGroups.map((eventGroup) => ({
    id: eventGroup.id,
    isRecurring: eventGroup.isRecurring,
    title: eventGroup.title,
    description: eventGroup.description,
    nearestLabel: eventTimeLabel(eventGroup.startsAt, eventGroup.endsAt),
    priceLabel: priceLabel(eventGroup.priceMinKzt, eventGroup.priceMaxKzt),
    sportName: eventGroup.sportName,
    courtNames: eventGroup.courtNames,
    level: eventGroup.level,
    instructorName: eventGroup.instructorName,
    locationName: eventGroup.locationName,
    occurrences: eventGroup.occurrences.map((event) => ({
      id: event.id,
      dateLabel: formatDateInVenueTimezone(event.startsAt),
      timeLabel: eventShortTimeLabel(event.startsAt, event.endsAt),
      priceLabel: singlePriceLabel(event.priceKzt),
      spotsLeft: event.spotsLeft,
      capacity: event.capacity,
      isRegistered: event.isRegistered,
    })),
  }));
  const message =
    params.success === "registered"
      ? "Вы записаны на событие. Оплата списана с баланса."
      : params.success === "cancelled"
        ? "Запись отменена. Если событие было оплачено с баланса, возврат уже выполнен."
        : null;
  const error = errorMessage(params.error);

  async function registerAction(formData: FormData) {
    "use server";
    const actionSession = await auth();
    if (!actionSession?.user?.id) {
      redirect("/login?next=%2Fevents");
    }

    const actionRole = normalizeRole(actionSession.user.role);
    if (canAccessAdminPortal(actionRole)) {
      redirect("/events?error=customer");
    }

    const eventId = String(formData.get("eventId") ?? "");
    if (!eventId) {
      redirect("/events?error=failed");
    }

    try {
      await registerCustomerForEvent({
        eventId,
        customerId: actionSession.user.id,
      });
    } catch (registrationError) {
      redirect(`/events?error=${mapRegistrationError(registrationError)}`);
    }

    revalidatePath("/events");
    revalidatePath("/account");
    redirect("/events?success=registered");
  }

  async function cancelAction(formData: FormData) {
    "use server";
    const actionSession = await auth();
    if (!actionSession?.user?.id) {
      redirect("/login?next=%2Fevents");
    }

    const actionRole = normalizeRole(actionSession.user.role);
    if (canAccessAdminPortal(actionRole)) {
      redirect("/events?error=customer");
    }

    const eventId = String(formData.get("eventId") ?? "");
    if (!eventId) {
      redirect("/events?error=cancel_failed");
    }

    try {
      await cancelCustomerEventRegistration({
        eventId,
        customerId: actionSession.user.id,
      });
    } catch {
      redirect("/events?error=cancel_failed");
    }

    revalidatePath("/events");
    revalidatePath("/account");
    redirect("/events?success=cancelled");
  }

  return (
    <div className="events-page">
      <PageHero
        eyebrow="События"
        title="Клубные дни и групповые тренировки"
        description="Выбирайте формат, смотрите свободные места и записывайтесь онлайн. Оплата проходит с баланса аккаунта."
      />

      {message ? (
        <p className="contact-form__message contact-form__message--success" role="status">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="contact-form__message contact-form__message--error" role="alert">
          {error}
        </p>
      ) : null}

      {eventGroups.length === 0 ? (
        <section className="rule-list">
          <h2 className="rule-list__title">Пока нет опубликованных событий</h2>
          <p className="card-grid__text">
            Администратор добавит клубные дни и групповые тренировки в расписание. Пока можно записаться на обычную игру или тренировку.
          </p>
          <div className="card-grid__actions">
            <Link href="/book" className="card-grid__button">Забронировать корт</Link>
          </div>
        </section>
      ) : (
        <section className="card-grid" aria-label="Список событий">
          {publicEventGroups.map((eventGroup) => (
            <PublicEventCard
              key={eventGroup.id}
              eventGroup={eventGroup}
              registerAction={registerAction}
              cancelAction={cancelAction}
            />
          ))}
        </section>
      )}
    </div>
  );
}
