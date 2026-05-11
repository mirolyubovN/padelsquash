import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { AdminPageShell } from "@/src/components/admin/admin-page-shell";
import { AdminConfirmActionForm } from "@/src/components/admin/admin-confirm-action-form";
import { AdminEditModal } from "@/src/components/admin/admin-edit-modal";
import { assertAdmin } from "@/src/lib/auth/guards";
import {
  createCourtFromForm,
  deleteCourt,
  getAdminCourts,
  getAdminSportOptions,
  setCourtActive,
  updateCourtFromForm,
} from "@/src/lib/admin/resources";
import { buildPageMetadata } from "@/src/lib/seo/metadata";
import { t } from "@/src/lib/i18n";

export const metadata = buildPageMetadata({
  title: "Админ: корты | Padel & Squash KZ",
  description: "Управление кортами клуба: создание, редактирование, включение/выключение и переход к исключениям по каждому корту.",
  path: "/admin/courts",
  noIndex: true,
});

export const dynamic = "force-dynamic";

export default async function AdminCourtsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  await assertAdmin();
  const params = await searchParams;
  const [courts, sportOptions] = await Promise.all([getAdminCourts(), getAdminSportOptions()]);
  const defaultSportId = sportOptions[0]?.id ?? "";
  const errorMessage =
    params.error === "delete_blocked"
      ? t("admin.courts.deleteBlocked")
      : params.error === "delete_failed"
        ? t("admin.courts.deleteFailed")
        : null;
  const successMessage = params.success === "deleted" ? t("admin.courts.deleted") : null;

  async function createAction(formData: FormData) {
    "use server";
    await assertAdmin();
    await createCourtFromForm(formData);
    revalidatePath("/admin/courts");
  }

  async function toggleActiveAction(formData: FormData) {
    "use server";
    await assertAdmin();

    const courtId = String(formData.get("courtId") ?? "");
    const nextActive = String(formData.get("nextActive") ?? "") === "true";

    if (!courtId) {
      throw new Error("courtId обязателен");
    }

    await setCourtActive({ courtId, active: nextActive });
    revalidatePath("/admin/courts");
  }

  async function updateAction(formData: FormData) {
    "use server";
    await assertAdmin();
    await updateCourtFromForm(formData);
    revalidatePath("/admin/courts");
    revalidatePath("/book");
  }

  async function deleteAction(formData: FormData) {
    "use server";
    await assertAdmin();

    const courtId = String(formData.get("courtId") ?? "");
    if (!courtId) {
      throw new Error("courtId обязателен");
    }

    try {
      await deleteCourt(courtId);
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (message.includes("истории бронирований")) {
        redirect("/admin/courts?error=delete_blocked");
      }
      redirect("/admin/courts?error=delete_failed");
    }

    revalidatePath("/admin/courts");
    revalidatePath("/admin/exceptions");
    revalidatePath("/book");
    redirect("/admin/courts?success=deleted");
  }

  return (
    <AdminPageShell
      title={t("admin.courts.title")}
      description={t("admin.courts.description")}
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

      <section className="admin-section">
        <div className="admin-section__head">
          <h2 className="admin-section__title">{t("admin.courts.addTitle")}</h2>
          <p className="admin-section__description">{t("admin.courts.addDescription")}</p>
        </div>
        <form action={createAction} className="admin-form admin-form--panel">
          <div className="admin-form__panel-grid">
            <div className="admin-form__group">
              <label className="admin-form__label" htmlFor="court-name">
                {t("admin.common.fields.name")}
              </label>
              <input
                id="court-name"
                name="name"
                className="admin-form__field"
                placeholder={t("admin.courts.placeholders.name")}
                required
              />
            </div>
            <div className="admin-form__group">
              <label className="admin-form__label" htmlFor="court-sport">
                {t("admin.common.fields.sport")}
              </label>
              <select id="court-sport" name="sportId" className="admin-form__field" defaultValue={defaultSportId} required>
                {sportOptions.map((sport) => (
                  <option key={sport.id} value={sport.id}>
                    {sport.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="admin-form__group">
              <label className="admin-form__label" htmlFor="court-notes">
                {t("admin.courts.fields.notesOptional")}
              </label>
              <input
                id="court-notes"
                name="notes"
                className="admin-form__field"
                placeholder={t("admin.courts.placeholders.notes")}
              />
            </div>
          </div>
          <div className="admin-form__actions">
            <button type="submit" className="admin-form__submit">
              {t("admin.courts.addSubmit")}
            </button>
          </div>
        </form>
      </section>

      <div className="admin-table">
        <table className="admin-table__table">
          <thead>
            <tr className="admin-table__row">
              <th className="admin-table__cell admin-table__cell--head">{t("admin.common.table.name")}</th>
              <th className="admin-table__cell admin-table__cell--head">{t("admin.common.table.sport")}</th>
              <th className="admin-table__cell admin-table__cell--head">{t("admin.courts.table.active")}</th>
              <th className="admin-table__cell admin-table__cell--head">{t("admin.common.table.note")}</th>
              <th className="admin-table__cell admin-table__cell--head">{t("admin.courts.table.exceptions")}</th>
              <th className="admin-table__cell admin-table__cell--head">{t("admin.common.table.actions")}</th>
            </tr>
          </thead>
          <tbody>
            {courts.length === 0 ? (
              <tr className="admin-table__row">
                <td className="admin-table__cell" colSpan={6}>
                  {t("admin.courts.empty")}
                </td>
              </tr>
            ) : (
              courts.map((court) => (
                <tr key={court.id} className="admin-table__row">
                  <td className="admin-table__cell">
                    <div className="admin-bookings__cell-title">{court.name}</div>
                    <div className="admin-bookings__cell-sub">{court.id}</div>
                  </td>
                  <td className="admin-table__cell">{court.sportName}</td>
                  <td className="admin-table__cell">
                    <span className={`admin-status-badge ${court.active ? "admin-status-badge--active" : "admin-status-badge--inactive"}`}>
                      <span className="admin-status-badge__dot" aria-hidden="true" />
                      {court.active ? t("admin.common.active") : t("admin.common.inactive")}
                    </span>
                  </td>
                  <td className="admin-table__cell">
                    <div className="admin-bookings__cell-sub">{court.notes || "—"}</div>
                  </td>
                  <td className="admin-table__cell">
                    <Link
                      href={`/admin/courts/${court.id}/exceptions`}
                      className="admin-inline-links__item"
                    >
                      {t("admin.common.open")}
                    </Link>
                  </td>
                  <td className="admin-table__cell">
                    <div className="admin-bookings__actions">
                      <AdminEditModal triggerLabel={t("admin.common.edit")} title={t("admin.courts.editTitle", { name: court.name })}>
                        <form action={updateAction} className="admin-form">
                          <input type="hidden" name="courtId" value={court.id} />
                          <div className="admin-form__group">
                            <label className="admin-form__label" htmlFor={`court-name-modal-${court.id}`}>{t("admin.common.fields.name")}</label>
                            <input id={`court-name-modal-${court.id}`} name="name" className="admin-form__field" defaultValue={court.name} required />
                          </div>
                          <div className="admin-form__group">
                            <label className="admin-form__label" htmlFor={`court-notes-modal-${court.id}`}>{t("admin.common.fields.note")}</label>
                            <input id={`court-notes-modal-${court.id}`} name="notes" className="admin-form__field" defaultValue={court.notes ?? ""} placeholder={t("admin.courts.placeholders.notes")} />
                          </div>
                          <div className="admin-form__actions">
                            <button type="submit" className="admin-form__submit">{t("admin.common.save")}</button>
                          </div>
                        </form>
                      </AdminEditModal>
                      <form action={toggleActiveAction} className="admin-bookings__actions">
                        <input type="hidden" name="courtId" value={court.id} />
                        <input type="hidden" name="nextActive" value={String(!court.active)} />
                        <button type="submit" className="admin-bookings__action-button">
                          {court.active ? t("admin.common.disable") : t("admin.common.enable")}
                        </button>
                      </form>
                      <AdminConfirmActionForm
                        action={deleteAction}
                        hiddenFields={{ courtId: court.id }}
                        triggerLabel={t("admin.common.delete")}
                        confirmLabel={t("admin.courts.deleteConfirm")}
                        title={t("admin.courts.deleteTitle")}
                        description={t("admin.courts.deleteDescription")}
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
