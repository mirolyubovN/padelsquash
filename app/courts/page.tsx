import Link from "next/link";
import { PageHero } from "@/src/components/page-hero";
import { courtItems, courtsPageContent } from "@/src/lib/content/site-data";
import { buildPageMetadata } from "@/src/lib/seo/metadata";

export const metadata = buildPageMetadata({
  title: "Корты | Padel & Squash KZ",
  description: "Корты для падела и сквоша в одном клубе: описание площадок, особенности покрытия и быстрый переход к онлайн-бронированию.",
  path: "/courts",
});

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
            <div className={`visual-placeholder visual-placeholder--${court.sportQuery}`} aria-hidden="true">
              <div className="visual-placeholder__label">{court.sport}</div>
              <div className="visual-placeholder__title">{court.name}</div>
            </div>
            <div className="card-grid__badge">{court.sport}</div>
            <h2 className="card-grid__title">{court.name}</h2>
            <p className="card-grid__meta">{court.capacity}</p>
            <p className="card-grid__text">{court.description}</p>
            <ul className="tag-list">
              {court.features.map((feature) => (
                <li key={feature} className="tag-list__item">
                  {feature}
                </li>
              ))}
            </ul>
            <div className="card-grid__actions">
              <Link href={`/book?sport=${court.sportQuery}`} className="card-grid__button">
                Забронировать
              </Link>
            </div>
          </article>
        ))}
      </section>

      <div className="listing-page__footer-actions">
        <Link href="/prices" className="listing-page__link-button">
          {courtsPageContent.pricesLinkLabel}
        </Link>
      </div>
    </div>
  );
}
