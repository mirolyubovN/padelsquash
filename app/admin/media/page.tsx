import Image from "next/image";
import { revalidatePath } from "next/cache";
import { AdminPageShell } from "@/src/components/admin/admin-page-shell";
import { MediaUploadForm } from "@/src/components/admin/media-upload-form";
import { assertSuperAdmin } from "@/src/lib/auth/guards";
import {
  getAdminMediaAssets,
  setMediaAssetActive,
  updateMediaAssetFromForm,
} from "@/src/lib/admin/media";
import { MEDIA_CATEGORIES, MEDIA_CATEGORY_LABELS, type MediaCategory } from "@/src/lib/media/constants";
import { buildPageMetadata } from "@/src/lib/seo/metadata";

export const metadata = buildPageMetadata({
  title: "Админ: медиа | Padel & Squash KZ",
  description: "Загрузка и управление публичными фотографиями сайта.",
  path: "/admin/media",
  noIndex: true,
});

export const dynamic = "force-dynamic";

function formatBytes(value: number): string {
  if (value < 1024 * 1024) {
    return `${Math.max(1, Math.round(value / 1024)).toLocaleString("ru-KZ")} КБ`;
  }
  return `${(value / 1024 / 1024).toLocaleString("ru-KZ", { maximumFractionDigits: 1 })} МБ`;
}

function getCategoryLabel(category: string): string {
  if (MEDIA_CATEGORIES.includes(category as MediaCategory)) {
    return MEDIA_CATEGORY_LABELS[category as MediaCategory];
  }
  return category;
}

function revalidateMediaDependencies() {
  revalidatePath("/admin/media");
  revalidatePath("/");
  revalidatePath("/preview/citysquash-style");
}

export default async function AdminMediaPage() {
  await assertSuperAdmin();
  const assets = await getAdminMediaAssets();

  async function updateAction(formData: FormData) {
    "use server";
    await assertSuperAdmin();
    await updateMediaAssetFromForm(formData);
    revalidateMediaDependencies();
  }

  async function toggleActiveAction(formData: FormData) {
    "use server";
    await assertSuperAdmin();
    const mediaAssetId = String(formData.get("mediaAssetId") ?? "");
    const active = String(formData.get("active") ?? "") === "true";
    await setMediaAssetActive({ mediaAssetId, active });
    revalidateMediaDependencies();
  }

  return (
    <AdminPageShell
      title="Медиа"
      description="Загрузка и управление фотографиями для главной, галереи, мероприятий, предложений и тренеров."
    >
      <section className="admin-section">
        <div className="admin-section__head">
          <h2 className="admin-section__title">Загрузить фото</h2>
          <p className="admin-section__description">
            Категория определяет папку загрузки и место использования: «Главная» и «Галерея» уже используются
            на публичных/preview-страницах, «Тренеры» доступна в выборе фото тренера, «Мероприятия» и
            «Предложения» зарезервированы для следующих блоков.
          </p>
        </div>
        <MediaUploadForm defaultCategory="gallery" />
      </section>

      <section className="admin-section">
        <div className="admin-section__head">
          <h2 className="admin-section__title">Медиатека</h2>
          <p className="admin-section__description">
            Активные фото категории «Галерея» используются в галерейных блоках; фото категории «Тренеры» и
            «Галерея» можно выбрать в карточке тренера. Неактивные фото скрываются из публичных выборок.
          </p>
        </div>

        {assets.length === 0 ? (
          <p className="admin-dashboard__empty">Фотографий пока нет.</p>
        ) : (
          <div className="admin-media-grid">
            {assets.map((asset) => (
              <article key={asset.id} className="admin-media-card">
                <div className="admin-media-card__image-wrap">
                  <Image
                    src={asset.url}
                    alt={asset.altText || asset.caption || "Загруженное фото"}
                    fill
                    sizes="(max-width: 768px) 100vw, 360px"
                    className="admin-media-card__image"
                  />
                  <span className={`admin-media-card__status ${asset.active ? "admin-media-card__status--active" : "admin-media-card__status--inactive"}`}>
                    {asset.active ? "Активно" : "Скрыто"}
                  </span>
                </div>

                <div className="admin-media-card__body">
                  <div>
                    <div className="admin-bookings__cell-title">{asset.caption || asset.originalName || asset.id}</div>
                    <div className="admin-bookings__cell-sub">
                      {getCategoryLabel(asset.category)} · {formatBytes(asset.sizeBytes)} · {asset.mimeType}
                    </div>
                  </div>

                  <label className="admin-form__label" htmlFor={`media-url-${asset.id}`}>
                    URL
                  </label>
                  <input
                    id={`media-url-${asset.id}`}
                    className="admin-form__field"
                    value={asset.url}
                    readOnly
                  />

                  <form action={updateAction} className="admin-form">
                    <input type="hidden" name="mediaAssetId" value={asset.id} />
                    <div className="admin-form__group">
                      <label className="admin-form__label" htmlFor={`media-category-${asset.id}`}>
                        Категория
                      </label>
                      <select
                        id={`media-category-${asset.id}`}
                        name="category"
                        className="admin-form__field"
                        defaultValue={asset.category}
                      >
                        {MEDIA_CATEGORIES.map((category) => (
                          <option key={category} value={category}>
                            {MEDIA_CATEGORY_LABELS[category]}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="admin-form__group">
                      <label className="admin-form__label" htmlFor={`media-alt-${asset.id}`}>
                        Alt-текст
                      </label>
                      <input
                        id={`media-alt-${asset.id}`}
                        name="altText"
                        className="admin-form__field"
                        defaultValue={asset.altText ?? ""}
                      />
                    </div>
                    <div className="admin-form__group">
                      <label className="admin-form__label" htmlFor={`media-caption-${asset.id}`}>
                        Подпись
                      </label>
                      <input
                        id={`media-caption-${asset.id}`}
                        name="caption"
                        className="admin-form__field"
                        defaultValue={asset.caption ?? ""}
                      />
                    </div>
                    <div className="admin-form__group">
                      <label className="admin-form__label" htmlFor={`media-sort-${asset.id}`}>
                        Порядок
                      </label>
                      <input
                        id={`media-sort-${asset.id}`}
                        name="sortOrder"
                        type="number"
                        step="1"
                        className="admin-form__field"
                        defaultValue={asset.sortOrder}
                      />
                    </div>
                    <div className="admin-form__actions">
                      <button type="submit" className="admin-form__submit">
                        Сохранить
                      </button>
                    </div>
                  </form>

                  <form action={toggleActiveAction}>
                    <input type="hidden" name="mediaAssetId" value={asset.id} />
                    <input type="hidden" name="active" value={String(!asset.active)} />
                    <button type="submit" className="admin-bookings__action-button">
                      {asset.active ? "Скрыть" : "Показать"}
                    </button>
                  </form>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </AdminPageShell>
  );
}
