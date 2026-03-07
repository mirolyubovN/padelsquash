import Link from "next/link";
import { homePageContent, siteConfig } from "@/src/lib/content/site-data";
import { getHomepageData } from "@/src/lib/public/homepage";
import { buildPageMetadata } from "@/src/lib/seo/metadata";
import { ScrollAnimationInit } from "@/src/components/scroll-animation-init";
import { FaqAccordion } from "@/src/components/faq-accordion";

export const metadata = buildPageMetadata({
  title: "Главная | Padel & Squash KZ",
  description:
    "Падел и сквош в Алматы: бронируйте корты и тренировки онлайн, выбирайте удобное время и управляйте записями в личном кабинете.",
  path: "/",
});

export const dynamic = "force-dynamic";

function formatPrice(amount: number): string {
  return `${amount.toLocaleString("ru-KZ")} ₸`;
}

// Maps sport slug -> picsum seed for placeholder photos.
const SPORT_PHOTOS: Record<string, string> = {
  padel: "padel-court-game",
  squash: "squash-court-sport",
  tennis: "tennis-court-play",
};

const galleryPhotos = [
  { seed: "padel-court-main", alt: "Падел-корт", caption: "Падел" },
  { seed: "squash-court-view", alt: "Сквош-корт", caption: "Сквош" },
  { seed: "sports-training-session", alt: "Тренировка", caption: "Тренировки" },
  { seed: "padel-players-action", alt: "Игроки на паделе", caption: "Падел" },
  { seed: "squash-match-action", alt: "Матч в сквоше", caption: "Сквош" },
  { seed: "sports-club-lobby", alt: "Клуб", caption: "Клуб" },
];

function IconInstagram() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

function IconTelegram() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M22 2L11 13" />
      <path d="M22 2L15 22l-4-9-9-4 20-7z" />
    </svg>
  );
}

function IconWhatsApp() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  );
}

function IconPhone() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.28h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 9a16 16 0 0 0 6 6l1.08-.96a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 21.72 16.92z" />
    </svg>
  );
}

function getSocialIcon(label: string) {
  if (label === "Instagram") return <IconInstagram />;
  if (label === "Telegram") return <IconTelegram />;
  if (label === "WhatsApp") return <IconWhatsApp />;
  return <IconPhone />;
}

export default async function Home() {
  const homepageData = await getHomepageData();

  const totalCourts = homepageData.clubGroups.reduce((sum, group) => sum + group.count, 0);

  const dynamicStats = [
    { value: String(totalCourts), label: "кортов" },
    { value: "24/7", label: "онлайн-запись" },
    { value: "6+", label: "вариантов тренировок" },
    { value: "Абая 120", label: "адрес" },
  ];

  return (
    <>
      <ScrollAnimationInit />
      <div className="home-overview">
        {/* HERO */}
        <section className="home-overview__hero" aria-labelledby="home-hero-title">
          <img
            className="home-overview__hero-img"
            src="https://picsum.photos/seed/padel-court-hero/1920/1080"
            alt=""
            aria-hidden="true"
          />
          <div className="home-overview__hero-overlay" aria-hidden="true" />

          <div className="home-overview__hero-content">
            <div className="home-overview__wrap">
              <p className="home-overview__hero-eyebrow">{homePageContent.hero.eyebrow}</p>
              <h1 id="home-hero-title" className="home-overview__hero-title">
                {homepageData.clubGroups.map((group) => group.sportName).join(" и ")}
                <br />
                один клуб
              </h1>
              <p className="home-overview__hero-desc">{homePageContent.hero.description}</p>
              <div className="home-overview__hero-actions">
                <Link href="/book" className="home-overview__hero-cta">
                  {homePageContent.primaryActionLabel}
                </Link>
                <Link href="/prices" className="home-overview__hero-cta-ghost">
                  Посмотреть цены
                </Link>
              </div>
              <div className="home-overview__hero-tags" aria-hidden="true">
                {homepageData.clubGroups.map((group, index) => (
                  <span key={group.sport}>
                    <span className="home-overview__hero-tag home-overview__hero-tag--lit">{group.sportName}</span>
                    {index < homepageData.clubGroups.length - 1 && <span className="home-overview__hero-tag"> • </span>}
                  </span>
                ))}
                <span className="home-overview__hero-tag">в Алматы</span>
              </div>
            </div>
          </div>
        </section>

        {/* SPORTS PANELS */}
        {homepageData.clubGroups.length > 0 && (
          <section className="home-overview__sports" aria-label="Виды спорта">
            <div className="home-overview__wrap">
              <div className="home-overview__section-head" data-reveal>
                <p className="home-overview__label">Два спорта в одном клубе</p>
                <h2 className="home-overview__heading home-overview__heading--light">
                  {homepageData.clubGroups.length === 1
                    ? homepageData.clubGroups[0].sportName
                    : `${homepageData.clubGroups.map((group) => group.sportName).join(" и ")} — один клуб`}
                </h2>
              </div>
              <div className="home-overview__panels">
                {homepageData.clubGroups.map((group, index) => {
                  const photoSeed = SPORT_PHOTOS[group.sport] ?? `sport-court-${group.sport}`;
                  return (
                    <div
                      key={group.sport}
                      className="home-overview__panel"
                      data-sport={group.sportName.toUpperCase()}
                      data-reveal
                      data-delay={String(index + 1)}
                    >
                      <img
                        className="home-overview__panel-img"
                        src={`https://picsum.photos/seed/${photoSeed}/900/650`}
                        alt={group.sportName}
                      />
                      <div className="home-overview__panel-overlay" aria-hidden="true" />
                      <div className="home-overview__panel-body">
                        <span className="home-overview__panel-badge">{group.sportName}</span>
                        <h3 className="home-overview__panel-name">{group.sportName}</h3>
                        <p className="home-overview__panel-desc">{group.description}</p>
                        <ul className="home-overview__panel-tags">
                          <li className="home-overview__panel-tag">{group.count} {group.count === 1 ? "корт" : "корта"}</li>
                          {group.courts.slice(0, 3).map((court) => (
                            <li key={court.id} className="home-overview__panel-tag">{court.name}</li>
                          ))}
                        </ul>
                        <Link href={`/book?sport=${group.sport}`} className="home-overview__panel-cta">
                          Забронировать -&gt;
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* STATS STRIP */}
        <div className="home-overview__stats" aria-label="Факты о клубе">
          <div className="home-overview__wrap">
            <div className="home-overview__stats-inner">
              {dynamicStats.map((stat, index) => (
                <div key={stat.label} className="home-overview__stat" data-reveal data-delay={String(index + 1)}>
                  <span className="home-overview__stat-value">{stat.value}</span>
                  <span className="home-overview__stat-label">{stat.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* PRICING */}
        <section className="home-overview__pricing" aria-labelledby="home-pricing-title">
          <div className="home-overview__wrap">
            <div className="home-overview__section-head" data-reveal>
              <p className="home-overview__label">Тарифы</p>
              <h2 id="home-pricing-title" className="home-overview__heading">
                {homePageContent.pricingTitle}
              </h2>
              <p className="home-overview__subtext">{homePageContent.pricingSubtitle}</p>
            </div>

            <div className="home-overview__price-grid">
              {homepageData.sports.map((sport, index) => (
                <div
                  key={sport.sport}
                  className="home-overview__price-card"
                  data-reveal
                  data-delay={String(index + 1)}
                >
                  <div className="home-overview__price-card-head">
                    <h3 className="home-overview__price-card-name">{sport.title}</h3>
                  </div>
                  <div className="home-overview__price-card-body">
                    {sport.prices.map((bucket) => (
                      <div key={bucket.code} className="home-overview__price-row">
                        <div className="home-overview__price-meta">
                          <span className="home-overview__price-label">{bucket.label}</span>
                          <span className="home-overview__price-time">{bucket.timeRange}</span>
                        </div>
                        <span className="home-overview__price-value">{formatPrice(bucket.price)}/час</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <p className="home-overview__equipment-note" data-reveal>
              {homePageContent.equipmentBanner}
            </p>

            <div className="home-overview__pricing-footer" data-reveal>
              <Link href="/prices" className="home-overview__text-link">
                Смотреть цены -&gt;
              </Link>
              <Link href="/book" className="home-overview__btn-primary">
                Забронировать
              </Link>
            </div>
          </div>
        </section>

        {/* GALLERY */}
        <section className="home-overview__gallery" aria-labelledby="home-gallery-title">
          <div className="home-overview__wrap">
            <div className="home-overview__section-head" data-reveal>
              <p className="home-overview__label">Атмосфера</p>
              <h2 id="home-gallery-title" className="home-overview__heading">Фото клуба</h2>
            </div>
            <div className="home-overview__gallery-grid">
              {galleryPhotos.map((photo, index) => (
                <div
                  key={photo.seed}
                  className="home-overview__gallery-item"
                  data-reveal
                  data-delay={String((index % 3) + 1)}
                >
                  <img
                    className="home-overview__gallery-photo"
                    src={`https://picsum.photos/seed/${photo.seed}/800/600`}
                    alt={photo.alt}
                    loading="lazy"
                  />
                  <span className="home-overview__gallery-caption">{photo.caption}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="home-overview__faq" aria-labelledby="home-faq-title">
          <div className="home-overview__wrap">
            <div className="home-overview__section-head" data-reveal>
              <p className="home-overview__label">FAQ</p>
              <h2 id="home-faq-title" className="home-overview__heading">{homePageContent.faqTitle}</h2>
              <p className="home-overview__subtext">{homePageContent.faqSubtitle}</p>
            </div>
            <FaqAccordion items={homePageContent.faqItems} />
          </div>
        </section>

        {/* CONTACT / CTA */}
        <section className="home-overview__contact" aria-labelledby="home-contact-title">
          <div className="home-overview__wrap">
            <div className="home-overview__contact-inner">
              <div data-reveal>
                <p className="home-overview__label home-overview__label--dim">Связаться</p>
                <h2 id="home-contact-title" className="home-overview__contact-headline">
                  Запишитесь
                  <br />
                  <span>сегодня</span>
                </h2>
              </div>
              <div data-reveal data-delay="2">
                <div className="home-overview__contact-links">
                  {siteConfig.socialLinks.map((link) => (
                    <Link
                      key={link.label}
                      href={link.href}
                      className="home-overview__contact-link"
                      target="_blank"
                      rel="noreferrer"
                    >
                      <span className="home-overview__contact-badge">{getSocialIcon(link.label)}</span>
                      <span>{link.label}</span>
                    </Link>
                  ))}
                  <Link href={`tel:${siteConfig.phone.replace(/[^\d+]/g, "")}`} className="home-overview__contact-link">
                    <span className="home-overview__contact-badge">
                      <IconPhone />
                    </span>
                    <span>{siteConfig.phone}</span>
                  </Link>
                </div>
                <Link href="/book" className="home-overview__contact-cta">
                  {homePageContent.primaryActionLabel}
                </Link>
              </div>
            </div>
          </div>
        </section>

        <div className="home-overview__sticky-cta">
          <Link href="/book" className="home-overview__sticky-cta-button">
            Онлайн запись
          </Link>
        </div>
      </div>
    </>
  );
}
