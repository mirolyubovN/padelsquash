import Link from "next/link";
import { PageHero } from "@/src/components/page-hero";
import { contactPageContent, siteConfig } from "@/src/lib/content/site-data";
import { WEEKDAY_LABELS, getOpeningHours } from "@/src/lib/settings/service";

export const metadata = {
  title: "Контакты | Padel & Squash KZ",
};

export const dynamic = "force-dynamic";

export default async function ContactPage() {
  const openingHours = await getOpeningHours();

  return (
    <div className="contact-page">
      <PageHero
        eyebrow={contactPageContent.hero.eyebrow}
        title={contactPageContent.hero.title}
        description={contactPageContent.hero.description}
      />

      <section className="contact-cards" aria-label="Контактная информация">
        <article className="contact-card">
          <h2 className="contact-card__title">Адрес</h2>
          <p className="contact-card__text">{siteConfig.address}</p>
          <p className="contact-card__text">{siteConfig.city}, {siteConfig.country}</p>
          <Link href={contactPageContent.mapUrl} className="contact-card__link" target="_blank" rel="noreferrer">
            {contactPageContent.mapLinkLabel}
          </Link>
        </article>
        <article className="contact-card">
          <h2 className="contact-card__title">Телефон и email</h2>
          <p className="contact-card__text">{siteConfig.phone}</p>
          <p className="contact-card__text">{siteConfig.email}</p>
          <div className="contact-card__socials">
            {siteConfig.socialLinks.map((link) => (
              <Link key={link.label} href={link.href} className="contact-card__social-link" target="_blank" rel="noreferrer">
                {link.label}
              </Link>
            ))}
          </div>
        </article>
        <article className="contact-card">
          <h2 className="contact-card__title">Бронирование</h2>
          <p className="contact-card__text">{contactPageContent.bookingCardText}</p>
          <Link href="/book" className="contact-card__button">
            Забронировать
          </Link>
        </article>
      </section>

      <section className="contact-layout" aria-label="Часы работы и как добраться">
        <article className="rule-list">
          <h2 className="rule-list__title">{contactPageContent.hoursTitle}</h2>
          <ul className="rule-list__notes">
            {openingHours.map((row) => (
              <li key={row.dayOfWeek} className="rule-list__note">
                <strong>{WEEKDAY_LABELS[row.dayOfWeek]}:</strong>{" "}
                {row.active ? `${row.openTime} - ${row.closeTime}` : "Выходной"}
              </li>
            ))}
          </ul>
        </article>

        <article className="rule-list">
          <h2 className="rule-list__title">{contactPageContent.directionsTitle}</h2>
          <ul className="rule-list__notes">
            {contactPageContent.directions.map((item) => (
              <li key={item} className="rule-list__note">
                {item}
              </li>
            ))}
          </ul>
          <div className="contact-layout__social-block">
            <h3 className="contact-layout__subheading">{contactPageContent.socialTitle}</h3>
            <div className="contact-card__socials">
              {siteConfig.socialLinks.map((link) => (
                <Link key={link.label} href={link.href} className="contact-card__social-link" target="_blank" rel="noreferrer">
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        </article>
      </section>
    </div>
  );
}
