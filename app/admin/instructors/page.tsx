import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { AdminPageShell } from "@/src/components/admin/admin-page-shell";
import { AdminConfirmActionForm } from "@/src/components/admin/admin-confirm-action-form";
import { AdminEditModal } from "@/src/components/admin/admin-edit-modal";
import { assertAdmin, assertSuperAdmin } from "@/src/lib/auth/guards";
import { canManagePricing } from "@/src/lib/auth/roles";
import {
  createInstructorFromForm,
  deleteInstructor,
  getAdminInstructors,
  getAdminSportOptions,
  setInstructorActive,
  updateInstructorBasicFromForm,
  updateInstructorFromForm,
} from "@/src/lib/admin/resources";
import { getSelectableInstructorPhotoAssets } from "@/src/lib/admin/media";
import { buildPageMetadata } from "@/src/lib/seo/metadata";
import { InstructorPhotoInput, type InstructorPhotoAsset } from "@/src/components/admin/instructor-photo-input";
import { InstructorPhotoGalleryInput } from "@/src/components/admin/instructor-photo-gallery-input";
import { t } from "@/src/lib/i18n";

export const metadata = buildPageMetadata({
  title: "Админ: тренеры | Padel & Squash KZ",
  description: "Управление тренерами: виды спорта, описание, ставка за час, активность и переход к расписанию.",
  path: "/admin/instructors",
  noIndex: true,
});

export const dynamic = "force-dynamic";

export default async function AdminInstructorsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const session = await assertAdmin();
  const canEditPricing = canManagePricing(session.user.role);
  const params = await searchParams;
  const [instructors, sportOptions, photoAssets] = await Promise.all([
    getAdminInstructors(),
    getAdminSportOptions(),
    getSelectableInstructorPhotoAssets(),
  ]);
  const selectablePhotoAssets: InstructorPhotoAsset[] = photoAssets.map((asset) => ({
    id: asset.id,
    url: asset.url,
    category: asset.category,
    label: asset.caption || asset.altText || asset.originalName || asset.url,
  }));
  const defaultSportId = sportOptions[0]?.id ?? "";
  const errorMessage =
    params.error === "delete_blocked"
      ? t("admin.instructors.deleteBlocked")
      : params.error === "delete_failed"
        ? t("admin.instructors.deleteFailed")
        : null;
  const successMessage = params.success === "deleted" ? t("admin.instructors.deleted") : null;

  async function createAction(formData: FormData) {
    "use server";
    await assertSuperAdmin();
    await createInstructorFromForm(formData);
    revalidatePath("/admin/instructors");
    revalidatePath("/admin/exceptions");
    revalidatePath("/book");
    revalidatePath("/coaches");
  }

  async function toggleActiveAction(formData: FormData) {
    "use server";
    await assertAdmin();

    const instructorId = String(formData.get("instructorId") ?? "");
    const nextActive = String(formData.get("nextActive") ?? "") === "true";

    if (!instructorId) {
      throw new Error("instructorId обязателен");
    }

    await setInstructorActive({ instructorId, active: nextActive });
    revalidatePath("/admin/instructors");
    revalidatePath("/admin/exceptions");
    revalidatePath("/book");
    revalidatePath("/coaches");
  }

  async function updatePricingAction(formData: FormData) {
    "use server";
    await assertSuperAdmin();
    await updateInstructorFromForm(formData);
    revalidatePath("/admin/instructors");
    revalidatePath("/book");
    revalidatePath("/coaches");
  }

  async function updateBasicAction(formData: FormData) {
    "use server";
    await assertAdmin();
    await updateInstructorBasicFromForm(formData);
    revalidatePath("/admin/instructors");
    revalidatePath("/book");
    revalidatePath("/coaches");
  }

  async function deleteAction(formData: FormData) {
    "use server";
    await assertAdmin();

    const instructorId = String(formData.get("instructorId") ?? "");
    if (!instructorId) {
      throw new Error("instructorId обязателен");
    }

    try {
      await deleteInstructor(instructorId);
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (message.includes("истории бронирований")) {
        redirect("/admin/instructors?error=delete_blocked");
      }
      redirect("/admin/instructors?error=delete_failed");
    }

    revalidatePath("/admin/instructors");
    revalidatePath("/admin/exceptions");
    revalidatePath("/book");
    revalidatePath("/coaches");
    redirect("/admin/instructors?success=deleted");
  }

  return (
    <AdminPageShell
      title={t("admin.instructors.title")}
      description={t("admin.instructors.description")}
    >
      {errorMessage ? (
        <p className="account-history__message account-history__message--error" role="alert">
          {errorMessage}
        </p>
      ) : null}
      {successMessage ? (
        <p className="account-history__message account-history__message--success" role="status">
          {successMessage}
        </p>
      ) : null}

      {canEditPricing ? (
        <section className="admin-section">
          <div className="admin-section__head">
            <h2 className="admin-section__title">{t("admin.instructors.addTitle")}</h2>
            <p className="admin-section__description">{t("admin.instructors.addDescription")}</p>
          </div>
          <form action={createAction} className="admin-form admin-form--panel">
            <div className="admin-form__panel-grid">
              <div className="admin-form__group">
                <label className="admin-form__label" htmlFor="instructor-name">
                  {t("admin.instructors.fields.name")}
                </label>
                <input
                  id="instructor-name"
                  name="name"
                  className="admin-form__field"
                  placeholder={t("admin.instructors.placeholders.fullName")}
                  required
                />
              </div>
              <div className="admin-form__group">
                <label className="admin-form__label">{t("admin.instructors.fields.sportsAndHourlyRate")}</label>
                <div className="admin-inline-sport-prices">
                  {sportOptions.map((sport) => (
                    <div key={sport.id} className="admin-inline-sport-price-row">
                      <label className="admin-form__checkbox">
                        <input
                          name="sportIds"
                          type="checkbox"
                          value={sport.id}
                          defaultChecked={sport.id === defaultSportId}
                        />
                        <span>{sport.name}</span>
                      </label>
                      <input
                        name={`price_${sport.id}`}
                        type="number"
                        min="0"
                        step="1"
                        className="admin-form__field admin-form__field--narrow"
                        defaultValue={10000}
                        placeholder={t("admin.instructors.placeholders.hourlyRate")}
                      />
                    </div>
                  ))}
                </div>
              </div>
              <div className="admin-form__group">
                <label className="admin-form__label" htmlFor="instructor-bio">
                  {t("admin.instructors.fields.bioForCoachesPage")}
                </label>
                <input
                  id="instructor-bio"
                  name="bio"
                  className="admin-form__field"
                  placeholder={t("admin.instructors.placeholders.bio")}
                />
              </div>
              <div className="admin-form__group">
                <label className="admin-form__label" htmlFor="instructor-photo-url">
                  {t("admin.instructors.fields.mainPhoto")}
                </label>
                <InstructorPhotoInput inputId="instructor-photo-url" mediaAssets={selectablePhotoAssets} />
              </div>
              <div className="admin-form__group">
                <label className="admin-form__label">{t("admin.instructors.fields.gallery")}</label>
                <InstructorPhotoGalleryInput mediaAssets={selectablePhotoAssets} />
              </div>
            </div>
            <div className="admin-form__actions">
              <button type="submit" className="admin-form__submit">
                {t("admin.instructors.addSubmit")}
              </button>
            </div>
          </form>
        </section>
      ) : (
        <section className="admin-section">
          <div className="admin-section__head">
            <h2 className="admin-section__title">{t("admin.instructors.accessRestrictedTitle")}</h2>
            <p className="admin-section__description">
              {t("admin.instructors.pricingRestrictedDescription")}
            </p>
          </div>
        </section>
      )}

      <div className="admin-table">
        <table className="admin-table__table">
          <thead>
            <tr className="admin-table__row">
              <th className="admin-table__cell admin-table__cell--head">{t("admin.instructors.table.name")}</th>
              <th className="admin-table__cell admin-table__cell--head">{t("admin.instructors.table.sports")}</th>
              <th className="admin-table__cell admin-table__cell--head">{t("admin.instructors.table.description")}</th>
              <th className="admin-table__cell admin-table__cell--head">{t("admin.instructors.table.active")}</th>
              <th className="admin-table__cell admin-table__cell--head">{t("admin.instructors.table.schedule")}</th>
              <th className="admin-table__cell admin-table__cell--head">{t("admin.instructors.table.actions")}</th>
            </tr>
          </thead>
          <tbody>
            {instructors.length === 0 ? (
              <tr className="admin-table__row">
                <td className="admin-table__cell" colSpan={6}>
                  {t("admin.instructors.empty")}
                </td>
              </tr>
            ) : (
              instructors.map((instructor) => (
                <tr key={instructor.id} className="admin-table__row">
                  <td className="admin-table__cell">
                    <div className="admin-bookings__cell-title">{instructor.name}</div>
                    <div className="admin-bookings__cell-sub">{instructor.id}</div>
                  </td>
                  <td className="admin-table__cell">
                    {instructor.sports.length > 0
                      ? instructor.sports.map((sport) => sport.name).join(", ")
                      : "—"}
                  </td>
                  <td className="admin-table__cell">
                    <div className="admin-bookings__cell-sub">{instructor.bio?.trim() || "—"}</div>
                  </td>
                  <td className="admin-table__cell">
                    <span className={`admin-status-badge ${instructor.active ? "admin-status-badge--active" : "admin-status-badge--inactive"}`}>
                      <span className="admin-status-badge__dot" aria-hidden="true" />
                      {instructor.active ? t("admin.common.active") : t("admin.common.inactive")}
                    </span>
                  </td>
                  <td className="admin-table__cell">
                    <div className="admin-bookings__actions">
                      <Link href={`/admin/instructors/${instructor.id}`} className="admin-inline-links__item">
                        {t("admin.instructors.profileLink")}
                      </Link>
                      <Link href={`/admin/instructors/${instructor.id}/schedule`} className="admin-inline-links__item">
                        {t("admin.instructors.scheduleLink")}
                      </Link>
                    </div>
                  </td>
                  <td className="admin-table__cell">
                    <div className="admin-bookings__actions">
                      <AdminEditModal triggerLabel={t("admin.common.edit")} title={t("admin.instructors.editTitle", { name: instructor.name })}>
                        {canEditPricing ? (
                          <form action={updatePricingAction} className="admin-form">
                            <input type="hidden" name="instructorId" value={instructor.id} />
                            <div className="admin-form__group">
                              <label className="admin-form__label" htmlFor={`name-${instructor.id}`}>{t("admin.instructors.fields.name")}</label>
                              <input id={`name-${instructor.id}`} name="name" className="admin-form__field" defaultValue={instructor.name} required />
                            </div>
                            <div className="admin-form__group">
                              <label className="admin-form__label">{t("admin.instructors.fields.sportsAndRate")}</label>
                              <div className="admin-inline-sport-prices">
                                {sportOptions.map((sport) => {
                                  const existingSport = instructor.sports.find((s) => s.sportId === sport.id);
                                  return (
                                    <div key={`${instructor.id}-${sport.id}`} className="admin-inline-sport-price-row">
                                      <label className="admin-form__checkbox">
                                        <input name="sportIds" type="checkbox" value={sport.id} defaultChecked={Boolean(existingSport)} />
                                        <span>{sport.name}</span>
                                      </label>
                                      <input name={`price_${sport.id}`} type="number" min="0" step="1" className="admin-form__field admin-form__field--narrow" defaultValue={existingSport?.pricePerHour ?? 10000} placeholder={t("admin.instructors.placeholders.hourlyRate")} />
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                            <div className="admin-form__group">
                              <label className="admin-form__label" htmlFor={`bio-${instructor.id}`}>{t("admin.instructors.fields.bio")}</label>
                              <input id={`bio-${instructor.id}`} name="bio" className="admin-form__field" defaultValue={instructor.bio ?? ""} placeholder={t("admin.instructors.placeholders.bio")} />
                            </div>
                            <div className="admin-form__group">
                              <label className="admin-form__label">{t("admin.instructors.fields.mainPhoto")}</label>
                              <InstructorPhotoInput
                                defaultValue={instructor.photoUrl ?? ""}
                                inputId={`photo-${instructor.id}`}
                                mediaAssets={selectablePhotoAssets}
                              />
                            </div>
                            <div className="admin-form__group">
                              <label className="admin-form__label">{t("admin.instructors.fields.gallery")}</label>
                              <InstructorPhotoGalleryInput
                                defaultValues={instructor.galleryPhotoUrls}
                                mediaAssets={selectablePhotoAssets}
                              />
                            </div>
                            <div className="admin-form__actions">
                              <button type="submit" className="admin-form__submit">{t("admin.common.save")}</button>
                            </div>
                          </form>
                        ) : (
                          <form action={updateBasicAction} className="admin-form">
                            <input type="hidden" name="instructorId" value={instructor.id} />
                            <div className="admin-form__group">
                              <label className="admin-form__label" htmlFor={`name-basic-${instructor.id}`}>{t("admin.instructors.fields.name")}</label>
                              <input id={`name-basic-${instructor.id}`} name="name" className="admin-form__field" defaultValue={instructor.name} required />
                            </div>
                            <div className="admin-form__group">
                              <label className="admin-form__label" htmlFor={`bio-basic-${instructor.id}`}>{t("admin.instructors.fields.bio")}</label>
                              <input id={`bio-basic-${instructor.id}`} name="bio" className="admin-form__field" defaultValue={instructor.bio ?? ""} placeholder={t("admin.instructors.placeholders.bio")} />
                            </div>
                            <div className="admin-form__group">
                              <label className="admin-form__label">{t("admin.instructors.fields.mainPhoto")}</label>
                              <InstructorPhotoInput
                                defaultValue={instructor.photoUrl ?? ""}
                                inputId={`photo-basic-${instructor.id}`}
                                mediaAssets={selectablePhotoAssets}
                              />
                            </div>
                            <div className="admin-form__group">
                              <label className="admin-form__label">{t("admin.instructors.fields.gallery")}</label>
                              <InstructorPhotoGalleryInput
                                defaultValues={instructor.galleryPhotoUrls}
                                mediaAssets={selectablePhotoAssets}
                              />
                            </div>
                            <div className="admin-form__actions">
                              <button type="submit" className="admin-form__submit">{t("admin.common.save")}</button>
                            </div>
                          </form>
                        )}
                      </AdminEditModal>
                      <form action={toggleActiveAction} className="admin-bookings__actions">
                        <input type="hidden" name="instructorId" value={instructor.id} />
                        <input type="hidden" name="nextActive" value={String(!instructor.active)} />
                        <button type="submit" className="admin-bookings__action-button">
                          {instructor.active ? t("admin.common.deactivate") : t("admin.common.activate")}
                        </button>
                      </form>
                      <AdminConfirmActionForm
                        action={deleteAction}
                        hiddenFields={{ instructorId: instructor.id }}
                        triggerLabel={t("admin.common.delete")}
                        confirmLabel={t("admin.instructors.deleteConfirm")}
                        title={t("admin.instructors.deleteTitle")}
                        description={t("admin.instructors.deleteDescription")}
                      />
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </AdminPageShell>
  );
}
