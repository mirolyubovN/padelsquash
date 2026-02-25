import Link from "next/link";
import { homePageContent, siteConfig } from "@/src/lib/content/site-data";
import { getHomepageData } from "@/src/lib/public/homepage";

export const dynamic = "force-dynamic";

function formatMoneyPerHour(amount: number): string {
  return `${amount.toLocaleString("ru-KZ")} тенге/час`;
}

export default async function Home() {
  const homepageData = await getHomepageData();

  return (
    <div className="home-page home-overview">
      <section className="home-overview__hero" aria-labelledby="home-hero-title">
        <div className="home-overview__hero-media" aria-hidden="true">
          <div className="home-overview__hero-photo" />
          <div className="home-overview__hero-overlay" />
        </div>
        <div className="home-overview__hero-content">
          <p className="home-overview__eyebrow">{homePageContent.hero.eyebrow}</p>
          <h1 id="home-hero-title" className="home-overview__title">
            {homePageContent.hero.title}
          </h1>
          <p className="home-overview__description">{homePageContent.hero.description}</p>
          <Link href="/book" className="home-overview__hero-cta">
            {homePageContent.primaryActionLabel}
          </Link>
        </div>
      </section>

      <section className="home-overview__pricing" aria-labelledby="home-pricing-title">
        <div className="home-overview__section-head">
          <h2 id="home-pricing-title" className="home-overview__section-title">
            {homePageContent.pricingTitle}
          </h2>
          <p className="home-overview__section-text">{homePageContent.pricingSubtitle}</p>
        </div>

        <div className="home-overview__sports-grid">
          {homepageData.sports.map((sport) => (
            <article key={sport.sport} className={`home-overview__sport-card home-overview__sport-card--${sport.sport}`}>
              <div className="home-overview__sport-head">
                <h3 className="home-overview__sport-title">{sport.title}</h3>
              </div>
              <div className="home-overview__simple-prices">
                {sport.prices.map((bucket) => (
                  <div key={bucket.code} className="home-overview__simple-price-line">
                    <div className="home-overview__simple-price-head">
                      <span className="home-overview__simple-price-label">{bucket.label}</span>
                      <span className="home-overview__simple-price-time">{bucket.timeRange}</span>
                    </div>
                    <div className="home-overview__simple-price-value">
                      {formatMoneyPerHour(bucket.price)}
                    </div>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="home-overview__equipment-banner" aria-label="Что включено в стоимость">
        <p>{homePageContent.equipmentBanner}</p>
      </section>

      <section className="home-overview__placeholder-grid" aria-label="FAQ и правила бронирования">
        <article className="home-overview__placeholder-card">
          <h2 className="home-overview__section-title">{homePageContent.faqTitle}</h2>
          <p className="home-overview__section-text">{homePageContent.faqPlaceholder}</p>
        </article>
        <article className="home-overview__placeholder-card">
          <h2 className="home-overview__section-title">{homePageContent.rulesTitle}</h2>
          <p className="home-overview__section-text">{homePageContent.rulesPlaceholder}</p>
        </article>
      </section>

      <section className="home-overview__about" aria-labelledby="home-about-title">
        <div className="home-overview__section-head">
          <h2 id="home-about-title" className="home-overview__section-title">
            {homePageContent.aboutClubTitle}
          </h2>
          <p className="home-overview__section-text">{homePageContent.aboutClubDescription}</p>
        </div>

        <div className="home-overview__about-grid">
          {homepageData.clubGroups.map((group) => (
            <article key={group.sport} className="home-overview__about-card">
              <div className="home-overview__about-card-head">
                <h3 className="home-overview__sport-title">{group.title}</h3>
                <span className="home-overview__about-count">{group.count} корта(ов)</span>
              </div>
              <p className="home-overview__section-text">{group.description}</p>
              <div className="home-overview__gallery">
                {group.courts.map((court) => (
                  <div key={court.id} className={`home-overview__gallery-item home-overview__gallery-item--${group.sport}`}>
                    <div className="home-overview__gallery-photo" aria-hidden="true" />
                    <div className="home-overview__gallery-caption">
                      <span className="home-overview__gallery-title">{court.name}</span>
                      <span className="home-overview__gallery-sub">
                        {court.notes?.trim() || "Фото и описание будут добавлены позже"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="home-overview__placeholder-card" aria-labelledby="home-club-rules-title">
        <h2 id="home-club-rules-title" className="home-overview__section-title">
          {homePageContent.clubRulesTitle}
        </h2>
        <p className="home-overview__section-text">{homePageContent.clubRulesPlaceholder}</p>
      </section>

      <section className="home-overview__socials" aria-labelledby="home-socials-title">
        <div className="home-overview__section-head">
          <h2 id="home-socials-title" className="home-overview__section-title">
            {homePageContent.socialsTitle}
          </h2>
          <p className="home-overview__section-text">{homePageContent.socialsSubtitle}</p>
        </div>
        <div className="home-overview__social-links">
          {siteConfig.socialLinks.map((link) => (
            <Link key={link.label} href={link.href} className="home-overview__social-link" target="_blank" rel="noreferrer">
              <span className="home-overview__social-badge" aria-hidden="true">
                {link.label === "Instagram" ? "IG" : link.label === "Telegram" ? "TG" : "WA"}
              </span>
              <span>{link.label}</span>
            </Link>
          ))}
          <Link href={`tel:${siteConfig.phone.replace(/[^\d+]/g, "")}`} className="home-overview__social-link">
            <span className="home-overview__social-badge" aria-hidden="true">
              PH
            </span>
            <span>{siteConfig.phone}</span>
          </Link>
        </div>
      </section>

      <div className="home-overview__sticky-cta">
        <Link href="/book" className="home-overview__sticky-cta-button">
          Онлайн запись
        </Link>
      </div>
    </div>
  );
}
