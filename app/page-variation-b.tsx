import Link from "next/link";
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

export default async function Home() {
  const homepageData = await getHomepageData();
  const totalCourts = homepageData.clubGroups.reduce((sum, group) => sum + group.count, 0);

  const dynamicStats = [
    { value: String(totalCourts), label: "кортов" },
    { value: "3", label: "вида спорта" },
    { value: "24/7", label: "онлайн-запись" },
    { value: "Абая 120", label: "адрес" },
  ];

  return (
    <>
      <ScrollAnimationInit />
      <div className="hb">
        {/* ── HERO ── */}
        <section className="hb__hero" aria-labelledby="home-hero-title">
          <div className="hb__hero-bg-wrap" aria-hidden="true">
            <img
              className="hb__hero-bg"
              src="https://picsum.photos/seed/racquet-club-hero/1920/1080"
              alt=""
            />
          </div>
          <div className="hb__hero-content">
            <div className="hb__wrap">
              <div className="hb__hero-inner">
                <p className="hb__hero-eyebrow">{homePageContent.hero.eyebrow}</p>
                <h1 id="home-hero-title" className="hb__hero-title">
                  Три ракеточных спорта.<br />
                  <span className="hb__hero-title--thin">Один клуб в Алматы.</span>
                </h1>
                <p className="hb__hero-desc">{homePageContent.hero.description}</p>

                <div className="hb__hero-badges">
                  {homepageData.clubGroups.map((group, index) => (
                    <Link
                      key={group.sport}
                      href={`/book?sport=${group.sport}`}
                      className="hb__hero-badge"
                      data-index={index}
                    >
                      <span className="hb__hero-badge-name">{group.sportName}</span>
                      <span className="hb__hero-badge-count">{group.count}</span>
                    </Link>
                  ))}
                </div>

                <div className="hb__hero-actions">
                  <Link href="/book" className="hb__btn hb__btn--primary">
                    {homePageContent.primaryActionLabel}
                  </Link>
                  <Link href="/prices" className="hb__btn hb__btn--outline">
                    Посмотреть цены
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── SPORT SHOWCASE (horizontal scroll) ── */}
        {homepageData.clubGroups.length > 0 && (
          <section className="hb__showcase" aria-label="Виды спорта">
            <div className="hb__wrap">
              <div className="hb__section-head" data-reveal>
                <span className="hb__eyebrow">Наши спорты</span>
                <h2 className="hb__h2">Выберите свой вид</h2>
              </div>
            </div>
            <div className="hb__showcase-track">
              {homepageData.clubGroups.map((group, index) => {
                const photoSeed = SPORT_PHOTOS[group.sport] ?? `sport-court-${group.sport}`;
                return (
                  <div
                    key={group.sport}
                    className="hb__showcase-card"
                    data-reveal
                    data-delay={String(index + 1)}
                  >
                    <div className="hb__showcase-card-img-wrap">
                      <img
                        className="hb__showcase-card-img"
                        src={`https://picsum.photos/seed/${photoSeed}/720/960`}
                        alt={group.sportName}
                      />
                    </div>
                    <div className="hb__showcase-card-info">
                      <span className="hb__showcase-card-index">{String(index + 1).padStart(2, "0")}</span>
                      <h3 className="hb__showcase-card-name">{group.sportName}</h3>
                      <p className="hb__showcase-card-desc">{group.description}</p>
                      <div className="hb__showcase-card-tags">
                        {group.courts.map((court) => (
                          <span key={court.id} className="hb__showcase-card-tag">{court.name}</span>
                        ))}
                      </div>
                      <Link href={`/book?sport=${group.sport}`} className="hb__showcase-card-cta">
                        Забронировать
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ── STATS ── */}
        <section className="hb__stats" aria-label="Факты о клубе">
          <div className="hb__wrap">
            <div className="hb__stats-row">
              {dynamicStats.map((stat, index) => (
                <div key={stat.label} className="hb__stat" data-reveal data-delay={String(index + 1)}>
                  <span className="hb__stat-value">{stat.value}</span>
                  <span className="hb__stat-label">{stat.label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── PRICING TABLE ── */}
        <section className="hb__pricing" aria-labelledby="home-pricing-title">
          <div className="hb__wrap">
            <div className="hb__section-head" data-reveal>
              <span className="hb__eyebrow">Тарифы</span>
              <h2 id="home-pricing-title" className="hb__h2">
                {homePageContent.pricingTitle}
              </h2>
              <p className="hb__sub">{homePageContent.pricingSubtitle}</p>
            </div>

            <div className="hb__price-table-wrap" data-reveal>
              <table className="hb__price-table">
                <thead>
                  <tr>
                    <th className="hb__price-th hb__price-th--period">Период</th>
                    {homepageData.sports.map((sport) => (
                      <th key={sport.sport} className="hb__price-th">{sport.title}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {homepageData.sports[0]?.prices.map((bucket, rowIndex) => (
                    <tr key={bucket.code} className="hb__price-tr">
                      <td className="hb__price-td hb__price-td--period">
                        <span className="hb__price-td-label">{bucket.label}</span>
                        <span className="hb__price-td-time">{bucket.timeRange}</span>
                      </td>
                      {homepageData.sports.map((sport) => (
                        <td key={sport.sport} className="hb__price-td">
                          <span className="hb__price-td-amount">{formatPrice(sport.prices[rowIndex]?.price ?? 0)}</span>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="hb__equipment-note" data-reveal>
              {homePageContent.equipmentBanner}
            </p>

            <div className="hb__pricing-footer" data-reveal>
              <Link href="/prices" className="hb__text-link">
                Подробнее о ценах
              </Link>
              <Link href="/book" className="hb__btn hb__btn--primary">
                Забронировать
              </Link>
            </div>
          </div>
        </section>

        {/* ── GALLERY ── */}
        <section className="hb__gallery" aria-labelledby="home-gallery-title">
          <div className="hb__wrap">
            <div className="hb__section-head" data-reveal>
              <span className="hb__eyebrow">Атмосфера</span>
              <h2 id="home-gallery-title" className="hb__h2">Фото клуба</h2>
            </div>
            <div className="hb__gallery-grid">
              {galleryPhotos.map((photo, index) => (
                <div
                  key={photo.seed}
                  className="hb__gallery-item"
                  data-reveal
                  data-delay={String((index % 3) + 1)}
                >
                  <img
                    className="hb__gallery-photo"
                    src={`https://picsum.photos/seed/${photo.seed}/800/600`}
                    alt={photo.alt}
                    loading="lazy"
                  />
                  <span className="hb__gallery-caption">{photo.caption}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── FAQ ── */}
        <section className="hb__faq" aria-labelledby="home-faq-title">
          <div className="hb__wrap">
            <div className="hb__faq-layout">
              <div className="hb__section-head" data-reveal>
                <span className="hb__eyebrow">FAQ</span>
                <h2 id="home-faq-title" className="hb__h2">{homePageContent.faqTitle}</h2>
                <p className="hb__sub">{homePageContent.faqSubtitle}</p>
              </div>
              <div data-reveal data-delay="1">
                <FaqAccordion items={homePageContent.faqItems} />
              </div>
            </div>
          </div>
        </section>

        {/* ── CONTACT ── */}
        <section className="hb__contact" aria-labelledby="home-contact-title">
          <div className="hb__wrap">
            <div className="hb__contact-layout">
              <div className="hb__contact-left" data-reveal>
                <span className="hb__eyebrow hb__eyebrow--dim">Связаться</span>
                <h2 id="home-contact-title" className="hb__contact-title">
                  Начните<br />играть<br /><span>сегодня</span>
                </h2>
              </div>
              <div className="hb__contact-right" data-reveal data-delay="2">
                <div className="hb__contact-links">
                  {siteConfig.socialLinks.map((link) => (
                    <Link
                      key={link.label}
                      href={link.href}
                      className="hb__contact-link"
                      target="_blank"
                      rel="noreferrer"
                    >
                      <span className="hb__contact-icon">{getSocialIcon(link.label)}</span>
                      <span>{link.label}</span>
                    </Link>
                  ))}
                  <Link href={`tel:${siteConfig.phone.replace(/[^\d+]/g, "")}`} className="hb__contact-link">
                    <span className="hb__contact-icon"><IconPhone /></span>
                    <span>{siteConfig.phone}</span>
                  </Link>
                </div>
                <Link href="/book" className="hb__btn hb__btn--accent-full">
                  {homePageContent.primaryActionLabel}
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ── STICKY MOBILE CTA ── */}
        <div className="hb__sticky-bar">
          <Link href="/book" className="hb__sticky-bar-btn">
            Онлайн запись
          </Link>
        </div>
      </div>
    </>
  );
}
