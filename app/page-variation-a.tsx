import Link from "next/link";
import type { ReactNode } from "react";
import { homePageContent, siteConfig } from "@/src/lib/content/site-data";
import { getHomepageData } from "@/src/lib/public/homepage";
import { buildPageMetadata } from "@/src/lib/seo/metadata";
import { ScrollAnimationInit } from "@/src/components/scroll-animation-init";
import { FaqAccordion } from "@/src/components/faq-accordion";

export const metadata = buildPageMetadata({
  title: "Главная | Padel & Squash KZ",
  description:
    "Теннис, падел и сквош в Алматы: бронируйте корты и тренировки онлайн, выбирайте удобное время и управляйте записями в личном кабинете.",
  path: "/",
});

export const dynamic = "force-dynamic";

function formatPrice(amount: number): string {
  return `${amount.toLocaleString("ru-KZ")} ₸`;
}

const SPORT_PHOTOS: Record<string, string> = {
  padel: "padel-court-game",
  squash: "squash-court-sport",
  tennis: "tennis-court-play",
};

const SPORT_INFO_ROUTES: Record<string, string> = {
  padel: "/sports/padel",
  squash: "/sports/squash",
  tennis: "/sports/tennis",
};

const SPORT_ICONS: Record<string, ReactNode> = {
  tennis: (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
      <circle cx="16" cy="16" r="12" />
      <path d="M8 5.5C12 10 12 22 8 26.5" />
      <path d="M24 5.5C20 10 20 22 24 26.5" />
      <path d="M4 16h24" />
    </svg>
  ),
  padel: (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
      <rect x="8" y="2" width="16" height="22" rx="8" />
      <line x1="16" y1="24" x2="16" y2="30" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="20" cy="12" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="16" cy="17" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  ),
  squash: (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
      <ellipse cx="14" cy="12" rx="10" ry="10" />
      <line x1="21" y1="19" x2="30" y2="30" strokeWidth="2.5" />
    </svg>
  ),
};

const galleryPhotos = [
  { seed: "tennis-serve-action", alt: "Теннис", caption: "Теннис" },
  { seed: "padel-court-main", alt: "Падел-корт", caption: "Падел" },
  { seed: "squash-court-view", alt: "Сквош-корт", caption: "Сквош" },
  { seed: "sports-training-session", alt: "Тренировка", caption: "Тренировки" },
  { seed: "padel-players-action", alt: "Игроки на паделе", caption: "Падел" },
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

type HomeVariationAProps = {
  paletteClassName?: string;
};

export default async function Home({ paletteClassName }: HomeVariationAProps = {}) {
  const homepageData = await getHomepageData();
  const totalCourts = homepageData.clubGroups.reduce((sum, group) => sum + group.count, 0);
  const pricingBuckets = homepageData.sports[0]?.prices ?? [];

  const dynamicStats = [
    { value: String(totalCourts), label: "кортов" },
    { value: "3", label: "вида спорта" },
    { value: "24/7", label: "онлайн-запись" },
  ];

  return (
    <>
      <ScrollAnimationInit />
      <div className={`ho${paletteClassName ? ` ${paletteClassName}` : ""}`}>
        {/* ── HERO ── */}
        <section className="ho__hero" aria-labelledby="home-hero-title">
          <img
            className="ho__hero-bg"
            src="https://picsum.photos/seed/racquet-sports-hero/1920/1080"
            alt=""
            aria-hidden="true"
          />
          <div className="ho__hero-overlay" aria-hidden="true" />
          <div className="ho__hero-slash" aria-hidden="true" />

          <div className="ho__hero-content">
            <div className="ho__wrap">
              <div className="ho__hero-grid">
                <div className="ho__hero-left">
                  <p className="ho__hero-eyebrow">{homePageContent.hero.eyebrow}</p>
                  <h1 id="home-hero-title" className="ho__hero-title">
                    <span className="ho__hero-title-line">Теннис</span>
                    <span className="ho__hero-title-line">Падел</span>
                    <span className="ho__hero-title-line ho__hero-title-line--accent">Сквош</span>
                  </h1>
                  <p className="ho__hero-desc">{homePageContent.hero.description}</p>
                  <div className="ho__hero-actions">
                    <Link href="/book" className="ho__btn ho__btn--accent">
                      {homePageContent.primaryActionLabel}
                    </Link>
                    <Link href="/prices" className="ho__btn ho__btn--ghost">
                      Посмотреть цены
                    </Link>
                  </div>
                </div>
                <div className="ho__hero-right">
                  <div className="ho__hero-sport-stack">
                    {homepageData.clubGroups.map((group, index) => (
                      <div key={group.sport} className="ho__hero-sport-chip" data-index={index}>
                        <span className="ho__hero-sport-icon">
                          {SPORT_ICONS[group.sport] ?? null}
                        </span>
                        <span className="ho__hero-sport-name">{group.sportName}</span>
                        <span className="ho__hero-sport-count">{group.count} {group.count === 1 ? "корт" : "корта"}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="ho__hero-scroll" aria-hidden="true">
            <span className="ho__hero-scroll-line" />
          </div>
        </section>

        {/* ── SPORTS CARDS ── */}
        {homepageData.clubGroups.length > 0 && (
          <section className="ho__sports" aria-label="Виды спорта">
            <div className="ho__wrap">
              <div className="ho__section-head" data-reveal>
                <span className="ho__tag">Три спорта — один клуб</span>
                <h2 className="ho__h2">
                  Выберите свой спорт
                </h2>
              </div>
              <div className="ho__sport-cards">
                {homepageData.clubGroups.map((group, index) => {
                  const photoSeed = SPORT_PHOTOS[group.sport] ?? `sport-court-${group.sport}`;
                  return (
                    <div
                      key={group.sport}
                      className="ho__sport-card"
                      data-sport={group.sport}
                      data-reveal
                      data-delay={String(index + 1)}
                    >
                      <div className="ho__sport-card-visual">
                        <img
                          className="ho__sport-card-img"
                          src={`https://picsum.photos/seed/${photoSeed}/900/650`}
                          alt={group.sportName}
                        />
                        <div className="ho__sport-card-skrim" aria-hidden="true" />
                        <span className="ho__sport-card-num">{String(index + 1).padStart(2, "0")}</span>
                      </div>
                      <div className="ho__sport-card-body">
                        <h3 className="ho__sport-card-name">{group.sportName}</h3>
                        <div className="ho__sport-card-meta">
                          <span className="ho__sport-card-courts">{group.count} {group.count === 1 ? "корт" : "корта"}</span>
                        </div>
                        <div className="ho__sport-card-actions">
                          <Link href={`/book?sport=${group.sport}`} className="ho__sport-card-cta">
                            <span>Забронировать</span>
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                              <path d="M3 8h10M9 4l4 4-4 4" />
                            </svg>
                          </Link>
                          {SPORT_INFO_ROUTES[group.sport] ? (
                            <Link href={SPORT_INFO_ROUTES[group.sport]} className="ho__sport-card-info-link">
                              Про {group.sportName.toLowerCase()}
                            </Link>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* ── STATS ── */}
        <section className="ho__stats" aria-label="Факты о клубе">
          <div className="ho__stats-skew" aria-hidden="true" />
          <div className="ho__wrap">
            <div className="ho__stats-grid">
              {dynamicStats.map((stat, index) => (
                <div key={stat.label} className="ho__stat" data-reveal data-delay={String(index + 1)}>
                  <span className="ho__stat-val">{stat.value}</span>
                  <span className="ho__stat-lbl">{stat.label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── PRICING ── */}
        <section className="ho__pricing" aria-labelledby="home-pricing-title">
          <div className="ho__wrap">
            <div className="ho__section-head" data-reveal>
              <span className="ho__tag">Тарифы</span>
              <h2 id="home-pricing-title" className="ho__h2">
                {homePageContent.pricingTitle}
              </h2>
              <p className="ho__sub">{homePageContent.pricingSubtitle}</p>
            </div>

            <div className="ho__tariff-table-wrap" data-reveal>
              <table className="ho__tariff-table">
                <thead>
                  <tr>
                    <th className="ho__tariff-th ho__tariff-th--period">Период</th>
                    {homepageData.sports.map((sport) => (
                      <th key={sport.sport} className="ho__tariff-th">
                        <span className="ho__tariff-sport">
                          {SPORT_ICONS[sport.sport] ?? null}
                          {sport.title}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pricingBuckets.map((bucket, rowIndex) => (
                    <tr key={bucket.code} className="ho__tariff-row">
                      <td className="ho__tariff-td ho__tariff-td--period">
                        <span className="ho__tariff-label">{bucket.label}</span>
                        <span className="ho__tariff-time">{bucket.timeRange}</span>
                      </td>
                      {homepageData.sports.map((sport) => (
                        <td key={`${sport.sport}-${bucket.code}`} className="ho__tariff-td">
                          <span className="ho__tariff-amount">
                            {formatPrice(sport.prices[rowIndex]?.price ?? 0)}
                          </span>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="ho__tariff-actions" data-reveal>
              <Link href="/book" className="ho__btn ho__btn--accent">
                Забронировать
              </Link>
            </div>

            <p className="ho__equipment-note" data-reveal>
              {homePageContent.equipmentBanner}
            </p>
          </div>
        </section>

        {/* ── GALLERY ── */}
        <section className="ho__gallery" aria-labelledby="home-gallery-title">
          <div className="ho__wrap">
            <div className="ho__section-head" data-reveal>
              <span className="ho__tag">Атмосфера</span>
              <h2 id="home-gallery-title" className="ho__h2">Фото клуба</h2>
            </div>
            <div className="ho__gallery-grid">
              {galleryPhotos.map((photo, index) => (
                <div
                  key={photo.seed}
                  className="ho__gallery-cell"
                  data-reveal
                  data-delay={String((index % 3) + 1)}
                >
                  <img
                    className="ho__gallery-img"
                    src={`https://picsum.photos/seed/${photo.seed}/800/600`}
                    alt={photo.alt}
                    loading="lazy"
                  />
                  <div className="ho__gallery-label">{photo.caption}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── FAQ ── */}
        <section className="ho__faq" aria-labelledby="home-faq-title">
          <div className="ho__wrap">
            <div className="ho__section-head" data-reveal>
              <span className="ho__tag">FAQ</span>
              <h2 id="home-faq-title" className="ho__h2">{homePageContent.faqTitle}</h2>
              <p className="ho__sub">{homePageContent.faqSubtitle}</p>
            </div>
            <FaqAccordion items={homePageContent.faqItems} />
          </div>
        </section>

        {/* ── CONTACT / CTA ── */}
        <section className="ho__contact" aria-labelledby="home-contact-title">
          <div className="ho__wrap">
            <div className="ho__contact-grid">
              <div data-reveal>
                <span className="ho__tag ho__tag--dim">Связаться</span>
                <h2 id="home-contact-title" className="ho__contact-title">
                  Запишитесь<br /><span>сегодня</span>
                </h2>
              </div>
              <div data-reveal data-delay="2">
                <div className="ho__contact-links">
                  {siteConfig.socialLinks.map((link) => (
                    <Link
                      key={link.label}
                      href={link.href}
                      className="ho__contact-link"
                      target="_blank"
                      rel="noreferrer"
                    >
                      <span className="ho__contact-badge">{getSocialIcon(link.label)}</span>
                      <span>{link.label}</span>
                    </Link>
                  ))}
                  <Link href={`tel:${siteConfig.phone.replace(/[^\d+]/g, "")}`} className="ho__contact-link">
                    <span className="ho__contact-badge"><IconPhone /></span>
                    <span>{siteConfig.phone}</span>
                  </Link>
                </div>
                <Link href="/book" className="ho__btn ho__btn--accent ho__btn--full">
                  {homePageContent.primaryActionLabel}
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ── STICKY MOBILE CTA ── */}
        <div className="ho__sticky-cta">
          <Link href="/book" className="ho__sticky-cta-btn">
            Онлайн запись
          </Link>
        </div>
      </div>
    </>
  );
}
