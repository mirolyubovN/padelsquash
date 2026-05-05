"use client";

import { useRef, useState } from "react";

export interface InstructorPhotoAsset {
  id: string;
  url: string;
  label: string;
  category: string;
}

interface InstructorPhotoInputProps {
  defaultValue?: string;
  inputId?: string;
  mediaAssets?: InstructorPhotoAsset[];
}

export function InstructorPhotoInput({
  defaultValue = "",
  inputId = "instructor-photo-url",
  mediaAssets = [],
}: InstructorPhotoInputProps) {
  const [url, setUrl] = useState(defaultValue);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      body.append("category", "instructors");
      const res = await fetch("/api/admin/upload", { method: "POST", body });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        setError(data.error ?? "Ошибка загрузки");
        return;
      }
      setUrl(data.url);
    } catch {
      setError("Ошибка сети при загрузке");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="instructor-photo-input">
      <input
        id={inputId}
        name="photoUrl"
        type="text"
        className="admin-form__field"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="/uploads/instructors/... или https://..."
      />
      <div className="instructor-photo-input__upload">
        <label className="admin-bookings__action-button instructor-photo-input__label">
          {uploading ? "Загружаем..." : "Загрузить файл"}
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="instructor-photo-input__file"
            onChange={handleFileChange}
            disabled={uploading}
          />
        </label>
        {mediaAssets.length > 0 ? (
          <select
            className="admin-form__field instructor-photo-input__select"
            value=""
            onChange={(event) => {
              if (event.target.value) {
                setUrl(event.target.value);
              }
            }}
            aria-label="Выбрать фото из медиатеки"
          >
            <option value="">Выбрать из медиатеки</option>
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
        {url ? (
          <img src={url} alt="Фото тренера" className="instructor-photo-input__preview" />
        ) : null}
      </div>
      {error ? <p className="instructor-photo-input__error">{error}</p> : null}
    </div>
  );
}
