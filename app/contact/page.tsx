import Link from "next/link";
import { PageHero } from "@/src/components/page-hero";
import { contactPageContent, siteConfig } from "@/src/lib/content/site-data";

export const metadata = {
  title: "Контакты | Padel & Squash KZ",
};

export default function ContactPage() {
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
        </article>
        <article className="contact-card">
          <h2 className="contact-card__title">Телефон и email</h2>
          <p className="contact-card__text">{siteConfig.phone}</p>
          <p className="contact-card__text">{siteConfig.email}</p>
        </article>
        <article className="contact-card">
          <h2 className="contact-card__title">Бронирование</h2>
          <p className="contact-card__text">{contactPageContent.bookingCardText}</p>
          <Link href="/book" className="contact-card__button">
            Забронировать
          </Link>
        </article>
      </section>
    </div>
  );
}
