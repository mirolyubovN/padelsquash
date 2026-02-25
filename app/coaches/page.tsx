import Link from "next/link";
import { PageHero } from "@/src/components/page-hero";
import { prisma } from "@/src/lib/prisma";
import { coachesPageContent } from "@/src/lib/content/site-data";

export const metadata = {
  title: "Тренеры | Padel & Squash KZ",
};

export default async function CoachesPage() {
  const dbInstructors = await prisma.instructor.findMany({
    where: { active: true },
    select: {
      id: true,
      name: true,
      bio: true,
      sports: true,
      pricePerHour: true,
    },
    orderBy: [{ name: "asc" }],
  });
  const sportLabel: Record<"padel" | "squash", string> = { padel: "Падел", squash: "Сквош" };
  const formatMoneyKzt = (amount: number) => `${amount.toLocaleString("ru-KZ")} ₸`;

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
              Список тренеров скоро появится. Добавьте тренеров в админ-панели.
            </p>
            <div className="card-grid__actions">
              <Link href="/book" className="card-grid__button">
                {coachesPageContent.bookingLabel}
              </Link>
            </div>
          </article>
        ) : (
          dbInstructors.map((coach) => (
            <article key={coach.id} className="coach-card">
              <div
                className={`coach-card__avatar coach-card__avatar--${coach.sports.includes("squash") && !coach.sports.includes("padel") ? "squash" : "padel"}`}
                aria-hidden="true"
              >
                {coach.name
                  .split(" ")
                  .map((part) => part[0])
                  .slice(0, 2)
                  .join("")}
              </div>
              <div className="tag-list" aria-label="Виды спорта">
                {coach.sports.map((sport) => (
                  <span key={`${coach.id}-${sport}`} className="card-grid__badge">
                    {sportLabel[sport]}
                  </span>
                ))}
              </div>
              <div className="coach-card__head">
                <h2 className="card-grid__title">{coach.name}</h2>
              </div>
              <p className="card-grid__text">
                {coach.bio?.trim() || "Описание тренера будет добавлено позже."}
              </p>
              <p className="coach-card__price">
                {`от ${formatMoneyKzt(Number(coach.pricePerHour))} / час`}
              </p>
              <div className="card-grid__actions">
                <Link href="/book" className="card-grid__button">
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
