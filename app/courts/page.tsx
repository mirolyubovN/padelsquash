import { PageHero } from "@/src/components/page-hero";
import { courtItems, courtsPageContent } from "@/src/lib/content/site-data";

export const metadata = {
  title: "Корты | Padel & Squash KZ",
};

export default function CourtsPage() {
  return (
    <div className="listing-page">
      <PageHero
        eyebrow={courtsPageContent.hero.eyebrow}
        title={courtsPageContent.hero.title}
        description={courtsPageContent.hero.description}
      />

      <section className="card-grid" aria-label="Список кортов">
        {courtItems.map((court) => (
          <article key={court.id} className="card-grid__item">
            <div className="card-grid__badge">{court.sport}</div>
            <h2 className="card-grid__title">{court.name}</h2>
            <p className="card-grid__text">{court.description}</p>
            <ul className="tag-list">
              {court.features.map((feature) => (
                <li key={feature} className="tag-list__item">
                  {feature}
                </li>
              ))}
            </ul>
          </article>
        ))}
      </section>
    </div>
  );
}
