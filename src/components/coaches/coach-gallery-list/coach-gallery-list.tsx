"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

export interface CoachGalleryItem {
  id: string;
  name: string;
  bio?: string;
  photoUrl?: string;
  galleryPhotoUrls: string[];
  sports: Array<{ slug: string; name: string }>;
  priceLabel: string;
  bookingHref: string;
}

interface CoachGalleryListProps {
  coaches: CoachGalleryItem[];
  bookingLabel: string;
}

interface ActiveGallery {
  coachId: string;
  index: number;
}

export function CoachGalleryList({ coaches, bookingLabel }: CoachGalleryListProps) {
  const [activeGallery, setActiveGallery] = useState<ActiveGallery | null>(null);
  const galleryByCoach = useMemo(
    () =>
      new Map(
        coaches.map((coach) => [
          coach.id,
          uniqueUrls([coach.photoUrl ?? "", ...coach.galleryPhotoUrls]).map((url) => ({
            url,
            alt: `${coach.name} - фото`,
          })),
        ]),
      ),
    [coaches],
  );
  const activeCoach = activeGallery ? coaches.find((coach) => coach.id === activeGallery.coachId) : undefined;
  const activePhotos = activeGallery ? (galleryByCoach.get(activeGallery.coachId) ?? []) : [];
  const activePhoto = activeGallery ? activePhotos[activeGallery.index] : undefined;

  useEffect(() => {
    if (!activeGallery) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setActiveGallery(null);
      }
      if (event.key === "ArrowRight") {
        setActiveGallery((current) => stepGallery(current, activePhotos.length, 1));
      }
      if (event.key === "ArrowLeft") {
        setActiveGallery((current) => stepGallery(current, activePhotos.length, -1));
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [activeGallery, activePhotos.length]);

  return (
    <>
      <section className="card-grid coaches-grid" aria-label="Список тренеров">
        {coaches.map((coach) => {
          const photos = galleryByCoach.get(coach.id) ?? [];
          const mainPhoto = photos[0]?.url;
          const hasOnlySquash =
            coach.sports.some((item) => item.slug === "squash") && !coach.sports.some((item) => item.slug === "padel");

          return (
            <article key={coach.id} className="coach-card">
              {mainPhoto ? (
                <button
                  type="button"
                  className="coach-card__photo-button"
                  onClick={() => setActiveGallery({ coachId: coach.id, index: 0 })}
                  aria-label={`Открыть галерею тренера ${coach.name}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={mainPhoto} alt={coach.name} className="coach-card__photo" />
                  <span className="coach-card__photo-caption">
                    {photos.length > 1 ? `${photos.length} фото` : "Открыть фото"}
                  </span>
                </button>
              ) : (
                <div className={`coach-card__photo-placeholder coach-card__photo-placeholder--${hasOnlySquash ? "squash" : "padel"}`}>
                  {getInitials(coach.name)}
                </div>
              )}

              <div className="coach-card__body">
                <div className="tag-list" aria-label="Виды спорта">
                  {coach.sports.map((item) => (
                    <span key={`${coach.id}-${item.slug}`} className="card-grid__badge">
                      {item.name}
                    </span>
                  ))}
                </div>
                <div className="coach-card__head">
                  <h2 className="card-grid__title">{coach.name}</h2>
                </div>
                {coach.bio?.trim() ? <p className="card-grid__text">{coach.bio}</p> : null}
                <p className="coach-card__price">{coach.priceLabel}</p>
                <div className="card-grid__actions">
                  <Link href={coach.bookingHref} className="card-grid__button">
                    {bookingLabel}
                  </Link>
                </div>
              </div>
            </article>
          );
        })}
      </section>

      {activeGallery && activeCoach && activePhoto ? (
        <div className="coach-gallery-modal" role="dialog" aria-modal="true" aria-label={`Галерея тренера ${activeCoach.name}`}>
          <button type="button" className="coach-gallery-modal__backdrop" onClick={() => setActiveGallery(null)} aria-label="Закрыть галерею" />
          <div className="coach-gallery-modal__panel">
            <div className="coach-gallery-modal__head">
              <div>
                <p className="coach-gallery-modal__eyebrow">Галерея тренера</p>
                <h2 className="coach-gallery-modal__title">{activeCoach.name}</h2>
              </div>
              <button type="button" className="coach-gallery-modal__close" onClick={() => setActiveGallery(null)}>
                Закрыть
              </button>
            </div>

            <div className="coach-gallery-modal__image-wrap">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={activePhoto.url} alt={activePhoto.alt} className="coach-gallery-modal__image" />
              {activePhotos.length > 1 ? (
                <>
                  <button
                    type="button"
                    className="coach-gallery-modal__nav coach-gallery-modal__nav--prev"
                    onClick={() => setActiveGallery((current) => stepGallery(current, activePhotos.length, -1))}
                    aria-label="Предыдущее фото"
                  >
                    Назад
                  </button>
                  <button
                    type="button"
                    className="coach-gallery-modal__nav coach-gallery-modal__nav--next"
                    onClick={() => setActiveGallery((current) => stepGallery(current, activePhotos.length, 1))}
                    aria-label="Следующее фото"
                  >
                    Далее
                  </button>
                </>
              ) : null}
            </div>

            <div className="coach-gallery-modal__thumbs">
              {activePhotos.map((photo, index) => (
                <button
                  key={photo.url}
                  type="button"
                  className={`coach-gallery-modal__thumb${index === activeGallery.index ? " coach-gallery-modal__thumb--active" : ""}`}
                  onClick={() => setActiveGallery({ coachId: activeGallery.coachId, index })}
                  aria-label={`Показать фото ${index + 1}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photo.url} alt="" />
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("");
}

function uniqueUrls(values: string[]): string[] {
  return values
    .map((value) => value.trim())
    .filter(Boolean)
    .filter((value, index, list) => list.indexOf(value) === index);
}

function stepGallery(current: ActiveGallery | null, photoCount: number, direction: 1 | -1): ActiveGallery | null {
  if (!current || photoCount === 0) return current;
  return {
    ...current,
    index: (current.index + direction + photoCount) % photoCount,
  };
}
