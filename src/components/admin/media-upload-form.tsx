"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  MEDIA_CATEGORIES,
  MEDIA_CATEGORY_LABELS,
  type MediaCategory,
} from "@/src/lib/media/constants";

interface MediaUploadFormProps {
  defaultCategory?: MediaCategory;
}

export function MediaUploadForm({ defaultCategory = "gallery" }: MediaUploadFormProps) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setUploading(true);
    setMessage(null);
    setError(null);

    try {
      const body = new FormData(event.currentTarget);
      const response = await fetch("/api/admin/upload", {
        method: "POST",
        body,
      });
      const data = (await response.json()) as { url?: string; error?: string };

      if (!response.ok || !data.url) {
        setError(data.error ?? "Не удалось загрузить файл");
        return;
      }

      formRef.current?.reset();
      setMessage(`Файл загружен: ${data.url}`);
      router.refresh();
    } catch {
      setError("Ошибка сети при загрузке файла");
    } finally {
      setUploading(false);
    }
  }

  return (
    <form ref={formRef} className="admin-form admin-form--panel" onSubmit={handleSubmit}>
      <div className="admin-form__panel-grid">
        <div className="admin-form__group">
          <label className="admin-form__label" htmlFor="media-file">
            Файл
          </label>
          <input
            id="media-file"
            name="file"
            type="file"
            className="admin-form__field"
            accept="image/jpeg,image/png,image/webp,image/gif"
            required
          />
        </div>
        <div className="admin-form__group">
          <label className="admin-form__label" htmlFor="media-category">
            Категория
          </label>
          <select id="media-category" name="category" className="admin-form__field" defaultValue={defaultCategory}>
            {MEDIA_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {MEDIA_CATEGORY_LABELS[category]}
              </option>
            ))}
          </select>
        </div>
        <div className="admin-form__group">
          <label className="admin-form__label" htmlFor="media-alt">
            Alt-текст
          </label>
          <input
            id="media-alt"
            name="altText"
            className="admin-form__field"
            placeholder="Что изображено на фото"
          />
        </div>
        <div className="admin-form__group">
          <label className="admin-form__label" htmlFor="media-caption">
            Подпись
          </label>
          <input
            id="media-caption"
            name="caption"
            className="admin-form__field"
            placeholder="Например: Падел-корт"
          />
        </div>
        <div className="admin-form__group">
          <label className="admin-form__label" htmlFor="media-sort-order">
            Порядок
          </label>
          <input
            id="media-sort-order"
            name="sortOrder"
            type="number"
            step="1"
            className="admin-form__field"
            defaultValue={100}
          />
        </div>
      </div>
      <div className="admin-form__actions">
        <button type="submit" className="admin-form__submit" disabled={uploading}>
          {uploading ? "Загружаем..." : "Загрузить фото"}
        </button>
      </div>
      {message ? (
        <p className="account-history__message account-history__message--success" role="status">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="account-history__message account-history__message--error" role="alert">
          {error}
        </p>
      ) : null}
    </form>
  );
}
