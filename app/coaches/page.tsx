import Link from "next/link";
import { PageHero } from "@/src/components/page-hero";
import { prisma } from "@/src/lib/prisma";
import { coachesPageContent } from "@/src/lib/content/site-data";
import { buildPageMetadata } from "@/src/lib/seo/metadata";

export const metadata = buildPageMetadata({
  title: "Тренеры | Padel & Squash KZ",
  description: "Тренеры по паделу и сквошу в Алматы: индивидуальные и парные занятия, стоимость за час и запись онлайн через форму бронирования.",
  path: "/coaches",
});

export default async function CoachesPage() {
  const dbInstructors = await prisma.instructor.findMany({
    where: { active: true },
    select: {
      id: true,
      name: true,
      bio: true,
      photoUrl: true,
      instructorSports: {
        orderBy: [{ sport: { sortOrder: "asc" } }, { sport: { name: "asc" } }],
        select: {
          pricePerHour: true,
          sport: {
            select: {
              slug: true,
              name: true,
            },
          },
        },
      },
    },
    orderBy: [{ name: "asc" }],
  });
  const formatMoneyKzt = (amount: number) => `${amount.toLocaleString("ru-KZ")} ₸`;
  const getCoachBookingHref = (sports: Array<{ slug: string }>) => {
    const preferredSport = sports[0]?.slug ?? "padel";
    return `/book?sport=${preferredSport}&service=training`;
  };

  return (
    <div className="listing-page">
      <PageHero
        eyebrow={coachesPageContent.hero.eyebrow}
        title={coachesPageContent.hero.title}
        description={coachesPageContent.hero.description}
      />

      <section className="card-grid" aria-label="Список тренеров">
        {dbInstructors.length === 0 ? (
          <article className="coach-card">
            <p className="card-grid__text">
              Информация о тренерах скоро появится.
            </p>
            <div className="card-grid__actions">
              <Link href="/book?sport=padel&service=training" className="card-grid__button">
                {coachesPageContent.bookingLabel}
              </Link>
            </div>
          </article>
        ) : (
          dbInstructors.map((coach) => (
            <article key={coach.id} className="coach-card">
              {coach.photoUrl ? (
                <div className="coach-card__avatar coach-card__avatar--photo" aria-hidden="true">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={coach.photoUrl} alt="" className="coach-card__avatar-img" />
                </div>
              ) : (
                <div
                  className={`coach-card__avatar coach-card__avatar--${coach.instructorSports.some((item) => item.sport.slug === "squash") && !coach.instructorSports.some((item) => item.sport.slug === "padel") ? "squash" : "padel"}`}
                  aria-hidden="true"
                >
                  {coach.name
                    .split(" ")
                    .map((part) => part[0])
                    .slice(0, 2)
                    .join("")}
                </div>
              )}
              <div className="tag-list" aria-label="Виды спорта">
                {coach.instructorSports.map((item) => (
                  <span key={`${coach.id}-${item.sport.slug}`} className="card-grid__badge">
                    {item.sport.name}
                  </span>
                ))}
              </div>
              <div className="coach-card__head">
                <h2 className="card-grid__title">{coach.name}</h2>
              </div>
              {coach.bio?.trim() ? <p className="card-grid__text">{coach.bio}</p> : null}
              <p className="coach-card__price">
                {coach.instructorSports.length > 0
                  ? `от ${formatMoneyKzt(
                      Math.min(...coach.instructorSports.map((item) => Number(item.pricePerHour))),
                    )} / час`
                  : "Цена уточняется"}
              </p>
              <div className="card-grid__actions">
                <Link href={getCoachBookingHref(coach.instructorSports.map((item) => item.sport))} className="card-grid__button">
                  {coachesPageContent.bookingLabel}
                </Link>
              </div>
            </article>
          ))
        )}
      </section>
    </div>
  );
}
