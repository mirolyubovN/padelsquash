import Link from "next/link";
import { BookingFormPreview } from "@/src/components/booking-form-preview";
import { PageHero } from "@/src/components/page-hero";
import { featureItems, homePageContent } from "@/src/lib/content/site-data";

export default function Home() {
  return (
    <div className="home-page">
      <PageHero
        eyebrow={homePageContent.hero.eyebrow}
        title={homePageContent.hero.title}
        description={homePageContent.hero.description}
      />

      <section className="home-page__hero-panel">
        <div className="home-page__hero-copy">
          <p className="home-page__lead">
            {homePageContent.lead}
          </p>
          <div className="home-page__actions">
            <Link href="/book" className="home-page__primary-button">
              Забронировать
            </Link>
            <Link href="/prices" className="home-page__secondary-button">
              Смотреть цены
            </Link>
          </div>
          <ul className="home-page__stats">
            {homePageContent.stats.map((stat) => (
              <li key={stat.label} className="home-page__stat">
                <span className="home-page__stat-value">{stat.value}</span>
                <span className="home-page__stat-label">{stat.label}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="home-page__hero-card">
          <p className="home-page__hero-card-title">{homePageContent.highlightsTitle}</p>
          <ul className="home-page__hero-card-list">
            {homePageContent.highlights.map((item) => (
              <li key={item} className="home-page__hero-card-item">
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="feature-grid" aria-labelledby="feature-grid-title">
        <h2 id="feature-grid-title" className="feature-grid__title">
          {homePageContent.featuresTitle}
        </h2>
        <div className="feature-grid__list">
          {featureItems.map((feature) => (
            <article key={feature.title} className="feature-grid__item">
              <h3 className="feature-grid__item-title">{feature.title}</h3>
              <p className="feature-grid__item-text">{feature.text}</p>
            </article>
          ))}
        </div>
      </section>

      <BookingFormPreview />
    </div>
  );
}
