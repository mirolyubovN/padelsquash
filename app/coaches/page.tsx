import { PageHero } from "@/src/components/page-hero";
import { coachItems, coachesPageContent } from "@/src/lib/content/site-data";

export const metadata = {
  title: "Тренеры | Padel & Squash KZ",
};

export default function CoachesPage() {
  return (
    <div className="listing-page">
      <PageHero
        eyebrow={coachesPageContent.hero.eyebrow}
        title={coachesPageContent.hero.title}
        description={coachesPageContent.hero.description}
      />

      <section className="card-grid" aria-label="Список тренеров">
        {coachItems.map((coach) => (
          <article key={coach.id} className="card-grid__item">
            <div className="card-grid__badge">{coach.sport}</div>
            <h2 className="card-grid__title">{coach.name}</h2>
            <p className="card-grid__meta">Стаж: {coach.experience}</p>
            <p className="card-grid__text">{coach.bio}</p>
            <p className="card-grid__meta">Формат: {coach.format}</p>
          </article>
        ))}
      </section>
    </div>
  );
}
