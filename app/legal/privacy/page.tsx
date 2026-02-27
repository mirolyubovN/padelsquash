import { PageHero } from "@/src/components/page-hero";
import { buildPageMetadata } from "@/src/lib/seo/metadata";

export const metadata = buildPageMetadata({
  title: "Политика конфиденциальности | Padel & Squash KZ",
  description: "Краткая политика конфиденциальности сайта клуба: какие данные собираются для бронирования и как они используются.",
  path: "/legal/privacy",
});

export default function PrivacyPolicyPage() {
  return (
    <div className="listing-page">
      <PageHero
        eyebrow="Документы"
        title="Политика конфиденциальности"
        description="Краткая версия политики для сайта клуба. Полная редакция будет опубликована после юридического согласования."
      />

      <section className="booking-flow" aria-labelledby="privacy-content-title">
        <h2 id="privacy-content-title" className="booking-flow__title">
          Как мы используем данные
        </h2>
        <div className="booking-flow__panel">
          <div className="booking-live__message">
            Мы используем контактные данные (имя, телефон, email) для оформления бронирований, подтверждения
            занятий и связи по изменениям расписания.
          </div>
          <div className="booking-live__message">
            Данные не публикуются в открытом доступе и используются только для работы клуба и личного кабинета.
          </div>
          <div className="booking-live__message">
            По вопросам удаления или уточнения данных свяжитесь с администратором клуба по контактам на странице
            «Контакты».
          </div>
        </div>
      </section>
    </div>
  );
}
