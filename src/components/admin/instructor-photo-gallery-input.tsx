"use client";

import { useState } from "react";
import type { InstructorPhotoAsset } from "@/src/components/admin/instructor-photo-input";

interface InstructorPhotoGalleryInputProps {
  defaultValues?: string[];
  mediaAssets?: InstructorPhotoAsset[];
}

export function InstructorPhotoGalleryInput({
  defaultValues = [],
  mediaAssets = [],
}: InstructorPhotoGalleryInputProps) {
  const [urls, setUrls] = useState(() => uniqueUrls(defaultValues));
  const [manualUrl, setManualUrl] = useState("");

  function addUrl(value: string) {
    const url = value.trim();
    if (!url) return;
    setUrls((current) => (current.includes(url) ? current : [...current, url]));
    setManualUrl("");
  }

  function removeUrl(url: string) {
    setUrls((current) => current.filter((item) => item !== url));
  }

  return (
    <div className="instructor-gallery-input">
      {urls.map((url) => (
        <input key={url} type="hidden" name="galleryPhotoUrls" value={url} />
      ))}

      <div className="instructor-gallery-input__controls">
        {mediaAssets.length > 0 ? (
          <select
            className="admin-form__field instructor-gallery-input__select"
            value=""
            onChange={(event) => addUrl(event.target.value)}
            aria-label="Добавить фото в галерею тренера"
          >
            <option value="">Добавить из медиатеки</option>
            {mediaAssets.map((asset) => {
              const categoryLabel =
                asset.category === "instructors" ? "Тренеры" : asset.category === "gallery" ? "Галерея" : asset.category;
              return (
                <option key={asset.id} value={asset.url}>
                  {categoryLabel}: {asset.label}
                </option>
              );
            })}
          </select>
        ) : null}

        <div className="instructor-gallery-input__manual">
          <input
            type="text"
            className="admin-form__field"
            value={manualUrl}
            onChange={(event) => setManualUrl(event.target.value)}
            placeholder="/uploads/instructors/... или https://..."
          />
          <button type="button" className="admin-bookings__action-button" onClick={() => addUrl(manualUrl)}>
            Добавить URL
          </button>
        </div>
      </div>

      {urls.length > 0 ? (
        <div className="instructor-gallery-input__list" aria-label="Фото в галерее тренера">
          {urls.map((url, index) => (
            <div key={url} className="instructor-gallery-input__item">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="instructor-gallery-input__thumb" />
              <span className="instructor-gallery-input__url">
                {index + 1}. {url}
              </span>
              <button type="button" className="admin-bookings__action-button" onClick={() => removeUrl(url)}>
                Убрать
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="admin-section__description">Дополнительные фото не выбраны.</p>
      )}
    </div>
  );
}

function uniqueUrls(values: string[]): string[] {
  return values
    .map((value) => value.trim())
    .filter(Boolean)
    .filter((value, index, list) => list.indexOf(value) === index);
}
