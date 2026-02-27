import { PageHero } from "@/src/components/page-hero";
import { buildPageMetadata } from "@/src/lib/seo/metadata";

export const metadata = buildPageMetadata({
  title: "Условия использования | Padel & Squash KZ",
  description: "Базовые условия использования сайта и онлайн-бронирования в клубе падела и сквоша.",
  path: "/legal/terms",
});

export default function TermsPage() {
  return (
    <div className="listing-page">
      <PageHero
        eyebrow="Документы"
        title="Условия использования"
        description="Временная страница с базовыми условиями бронирования. Полная версия условий будет опубликована отдельно."
      />

      <section className="booking-flow" aria-labelledby="terms-content-title">
        <h2 id="terms-content-title" className="booking-flow__title">
          Основные правила
        </h2>
        <div className="booking-flow__panel">
          <div className="booking-live__message">
            Онлайн-бронирование оформляется на фиксированные 60-минутные слоты. Итоговая стоимость показывается
            до подтверждения.
          </div>
          <div className="booking-live__message">
            Для бронирования требуется зарегистрированный аккаунт. История бронирований и отмена доступны в личном
            кабинете.
          </div>
          <div className="booking-live__message">
            Условия отмены и посещения могут уточняться клубом. Актуальная информация всегда отображается в процессе
            бронирования и в личном кабинете.
          </div>
        </div>
      </section>
    </div>
  );
}
