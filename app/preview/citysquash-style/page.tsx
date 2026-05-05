import Link from "next/link";
import { buildPageMetadata } from "@/src/lib/seo/metadata";
import { homePageContent, siteConfig } from "@/src/lib/content/site-data";
import { getHomepageData } from "@/src/lib/public/homepage";
import { getPublicMediaAssets, type AdminMediaAsset } from "@/src/lib/admin/media";

export const metadata = buildPageMetadata({
  title: "Превью простого сайта | Padel & Squash KZ",
  description:
    "Превью более простой фото-ориентированной структуры публичного сайта: бронирование, первый визит, групповые игры, корпоративные форматы, цены и контакты.",
  path: "/preview/citysquash-style",
});

export const dynamic = "force-dynamic";

type PreviewPhoto = {
  src: string;
  alt: string;
  caption: string;
};

const previewPhotos = {
  hero: {
    src: "https://images.unsplash.com/photo-1622279457486-62dcc4a431d6?auto=format&fit=crop&w=1800&q=82",
    alt: "Игровой зал с кортом для ракеточных видов спорта",
    caption: "Основное фото можно заменить на загруженное фото клуба",
  },
  intro: {
    src: "https://images.unsplash.com/photo-1554068865-24cecd4e34b8?auto=format&fit=crop&w=1000&q=82",
    alt: "Тренер объясняет технику игроку на корте",
    caption: "Первое занятие",
  },
  events: {
    src: "https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?auto=format&fit=crop&w=1000&q=82",
    alt: "Игроки проводят групповую тренировку на корте",
    caption: "Групповые форматы",
  },
  corporate: {
    src: "https://images.unsplash.com/photo-1526232761682-d26e03ac148e?auto=format&fit=crop&w=1000&q=82",
    alt: "Команда отдыхает после спортивной игры",
    caption: "Корпоративные игры",
  },
} satisfies Record<string, PreviewPhoto>;

const galleryPhotos: PreviewPhoto[] = [
  {
    src: "https://images.unsplash.com/photo-1542144582-1ba00456b5e3?auto=format&fit=crop&w=900&q=80",
    alt: "Корт с сеткой и разметкой",
    caption: "Корты",
  },
  {
    src: "https://images.unsplash.com/photo-1535131749006-b7f58c99034b?auto=format&fit=crop&w=900&q=80",
    alt: "Ракетка и мяч на спортивном покрытии",
    caption: "Инвентарь",
  },
  {
    src: "https://images.unsplash.com/photo-1518604666860-9ed391f76460?auto=format&fit=crop&w=900&q=80",
    alt: "Спортсмен готовится к удару",
    caption: "Тренировки",
  },
  {
    src: "https://images.unsplash.com/photo-1519861531473-9200262188bf?auto=format&fit=crop&w=900&q=80",
    alt: "Спортивная площадка с ярким освещением",
    caption: "Атмосфера",
  },
];

function mediaAssetToPhoto(asset: AdminMediaAsset, fallbackCaption: string): PreviewPhoto {
  return {
    src: asset.url,
    alt: asset.altText || asset.caption || "Фото клуба",
    caption: asset.caption || fallbackCaption,
  };
}

const offerCards = [
  {
    label: "Первый визит",
    title: "Первое занятие без лишних вопросов",
    text:
      "Подберем спорт, объясним базовые правила, покажем корт и поможем начать в комфортном темпе.",
    details: ["60 минут", "инвентарь для старта", "подходит новичкам"],
    href: "/book",
    cta: "Записаться",
    photo: previewPhotos.intro,
  },
  {
    label: "Групповые игры",
    title: "Игровые встречи и тренировки по уровню",
    text:
      "Формат для тех, кто хочет играть регулярно, найти партнеров и быстрее набрать практику.",
    details: ["уровни от новичка", "тренер или игровой ведущий", "расписание по неделям"],
    href: `https://wa.me/${siteConfig.phone.replace(/[^\d]/g, "")}`,
    cta: "Уточнить расписание",
    photo: previewPhotos.events,
  },
  {
    label: "Компаниям",
    title: "Корпоративный спорт вместо обычного вечера",
    text:
      "Организуем вводную тренировку, мини-турнир или регулярные занятия для команды.",
    details: ["формат под группу", "корты и тренеры", "помощь с программой"],
    href: `mailto:${siteConfig.email}?subject=Корпоративная%20заявка`,
    cta: "Оставить заявку",
    photo: previewPhotos.corporate,
  },
];

const practicalItems = [
  "Приходите за 10-15 минут до начала слота.",
  "Для первой игры достаточно спортивной формы и чистой обуви для зала.",
  "Базовый инвентарь можно уточнить у администратора перед визитом.",
];

function formatPrice(amount: number): string {
  return `${amount.toLocaleString("ru-KZ")} ₸`;
}

function getPhoneHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}

export default async function CitySquashStylePreviewPage() {
  const [homepageData, homepageMedia, galleryMedia] = await Promise.all([
    getHomepageData(),
    getPublicMediaAssets("homepage", 1),
    getPublicMediaAssets("gallery", 8),
  ]);
  const totalCourts = homepageData.clubGroups.reduce((sum, group) => sum + group.count, 0);
  const priceBuckets = homepageData.sports[0]?.prices ?? [];
  const heroPhoto = homepageMedia[0] ? mediaAssetToPhoto(homepageMedia[0], "Фото клуба") : previewPhotos.hero;
  const visibleGalleryPhotos =
    galleryMedia.length > 0
      ? galleryMedia.map((asset, index) => mediaAssetToPhoto(asset, `Фото ${index + 1}`))
      : galleryPhotos;

  return (
    <div className="city-preview">
      <section className="city-preview__hero" aria-labelledby="city-preview-title">
        <div className="city-preview__hero-copy">
          <p className="city-preview__eyebrow">Превью простой структуры</p>
          <h1 id="city-preview-title" className="city-preview__title">
            {homePageContent.hero.title}
          </h1>
          <p className="city-preview__lead">{homePageContent.hero.description}</p>
          <div className="city-preview__hero-actions" aria-label="Основные действия">
            <Link href="/book" className="city-preview__button city-preview__button--dark">
              Забронировать корт
            </Link>
            <Link href={getPhoneHref(siteConfig.phone)} className="city-preview__button city-preview__button--light">
              Позвонить администратору
            </Link>
          </div>
          <dl className="city-preview__facts" aria-label="Коротко о клубе">
            <div>
              <dt>{totalCourts}</dt>
              <dd>активных кортов</dd>
            </div>
            <div>
              <dt>{homepageData.sports.length}</dt>
              <dd>вида спорта</dd>
            </div>
            <div>
              <dt>24/7</dt>
              <dd>онлайн-запись</dd>
            </div>
          </dl>
        </div>
        <figure className="city-preview__hero-photo">
          <img src={heroPhoto.src} alt={heroPhoto.alt} />
          <figcaption>{heroPhoto.caption}</figcaption>
        </figure>
      </section>

      <section className="city-preview__booking-strip" aria-label="Быстрая запись">
        <div>
          <span className="city-preview__section-kicker">Бронирование</span>
          <h2>Выберите спорт, время и подтвердите запись онлайн</h2>
        </div>
        <Link href="/book" className="city-preview__button city-preview__button--accent">
          Перейти к расписанию
        </Link>
      </section>

      <section className="city-preview__section" aria-labelledby="city-preview-offers">
        <div className="city-preview__section-head">
          <span className="city-preview__section-kicker">Форматы</span>
          <h2 id="city-preview-offers">Прямые предложения для разных гостей</h2>
          <p>
            На главной странице сразу видно, что делать новичку, регулярному игроку и компании.
          </p>
        </div>
        <div className="city-preview__offer-grid">
          {offerCards.map((offer) => (
            <article key={offer.label} className="city-preview__offer-card">
              <img src={offer.photo.src} alt={offer.photo.alt} />
              <div className="city-preview__offer-body">
                <span>{offer.label}</span>
                <h3>{offer.title}</h3>
                <p>{offer.text}</p>
                <ul>
                  {offer.details.map((detail) => (
                    <li key={detail}>{detail}</li>
                  ))}
                </ul>
                <Link href={offer.href} className="city-preview__text-link">
                  {offer.cta}
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="city-preview__section city-preview__section--split" aria-labelledby="city-preview-prices">
        <div className="city-preview__section-head city-preview__section-head--sticky">
          <span className="city-preview__section-kicker">Цены</span>
          <h2 id="city-preview-prices">Короткая сводка перед полным прайсом</h2>
          <p>
            Домашняя страница показывает основные диапазоны, а подробная логика остается на странице цен и в бронировании.
          </p>
          <Link href="/prices" className="city-preview__button city-preview__button--light">
            Полный прайс
          </Link>
        </div>
        <div className="city-preview__price-panel">
          {priceBuckets.length > 0 && homepageData.sports.length > 0 ? (
            <table className="city-preview__price-table">
              <thead>
                <tr>
                  <th>Время</th>
                  {homepageData.sports.map((sport) => (
                    <th key={sport.sport}>{sport.title}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {priceBuckets.map((bucket, index) => (
                  <tr key={bucket.code}>
                    <td>
                      <strong>{bucket.label}</strong>
                      <span>{bucket.timeRange}</span>
                    </td>
                    {homepageData.sports.map((sport) => (
                      <td key={`${sport.sport}-${bucket.code}`}>
                        {formatPrice(sport.prices[index]?.price ?? 0)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="city-preview__empty-note">
              Цены появятся здесь после настройки активных кортов и тарифов.
            </p>
          )}
          <div className="city-preview__included">
            <h3>Перед визитом</h3>
            <ul>
              {practicalItems.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="city-preview__section" aria-labelledby="city-preview-gallery">
        <div className="city-preview__section-head">
          <span className="city-preview__section-kicker">Фото</span>
          <h2 id="city-preview-gallery">Галерея без декоративного шума</h2>
          <p>
            Сейчас это временные фото-слоты. Позже их можно заменить на загруженные клубные фото из media/gallery управления.
          </p>
        </div>
        <div className="city-preview__gallery">
          {visibleGalleryPhotos.map((photo) => (
            <figure key={photo.src} className="city-preview__gallery-item">
              <img src={photo.src} alt={photo.alt} loading="lazy" />
              <figcaption>{photo.caption}</figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section className="city-preview__contact" aria-labelledby="city-preview-contact">
        <div>
          <span className="city-preview__section-kicker">Контакты</span>
          <h2 id="city-preview-contact">Как найти клуб и записаться</h2>
          <p>
            {siteConfig.address}. Если едете впервые, напишите администратору: подскажем вход,
            парковку и какой инвентарь взять.
          </p>
        </div>
        <div className="city-preview__contact-card">
          <a href={getPhoneHref(siteConfig.phone)}>{siteConfig.phone}</a>
          <a href={`mailto:${siteConfig.email}`}>{siteConfig.email}</a>
          <Link href="/contact">Контакты и схема проезда</Link>
          <Link href="/book" className="city-preview__button city-preview__button--dark">
            Забронировать онлайн
          </Link>
        </div>
      </section>
    </div>
  );
}
