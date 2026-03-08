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
      ? "Корт нельзя удалить: он уже используется в истории бронирований."
      : params.error === "delete_failed"
        ? "Не удалось удалить корт."
        : null;
  const successMessage = params.success === "deleted" ? "Корт удален." : null;

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
      title="Корты"
      description="Список кортов клуба, включение/выключение и ссылки на разовые исключения."
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
          <h2 className="admin-section__title">Добавить корт</h2>
          <p className="admin-section__description">Новая площадка появится в бронировании сразу после создания.</p>
        </div>
        <form action={createAction} className="admin-form admin-form--panel">
          <div className="admin-form__panel-grid">
            <div className="admin-form__group">
              <label className="admin-form__label" htmlFor="court-name">
                Название
              </label>
              <input
                id="court-name"
                name="name"
                className="admin-form__field"
                placeholder="Падел 4"
                required
              />
            </div>
            <div className="admin-form__group">
              <label className="admin-form__label" htmlFor="court-sport">
                Спорт
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
                Примечание (опционально)
              </label>
              <input
                id="court-notes"
                name="notes"
                className="admin-form__field"
                placeholder="Например: временно без камеры"
              />
            </div>
          </div>
          <div className="admin-form__actions">
            <button type="submit" className="admin-form__submit">
              Добавить корт
            </button>
          </div>
        </form>
      </section>

      <div className="admin-table">
        <table className="admin-table__table">
          <thead>
            <tr className="admin-table__row">
              <th className="admin-table__cell admin-table__cell--head">Название</th>
              <th className="admin-table__cell admin-table__cell--head">Спорт</th>
              <th className="admin-table__cell admin-table__cell--head">Активен</th>
              <th className="admin-table__cell admin-table__cell--head">Примечание</th>
              <th className="admin-table__cell admin-table__cell--head">Исключения</th>
              <th className="admin-table__cell admin-table__cell--head">Действия</th>
            </tr>
          </thead>
          <tbody>
            {courts.length === 0 ? (
              <tr className="admin-table__row">
                <td className="admin-table__cell" colSpan={6}>
                  Кортов пока нет.
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
                      {court.active ? "Активен" : "Неактивен"}
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
                      Открыть
                    </Link>
                  </td>
                  <td className="admin-table__cell">
                    <div className="admin-bookings__actions">
                      <AdminEditModal triggerLabel="Редактировать" title={`Корт: ${court.name}`}>
                        <form action={updateAction} className="admin-form">
                          <input type="hidden" name="courtId" value={court.id} />
                          <div className="admin-form__group">
                            <label className="admin-form__label" htmlFor={`court-name-modal-${court.id}`}>Название</label>
                            <input id={`court-name-modal-${court.id}`} name="name" className="admin-form__field" defaultValue={court.name} required />
                          </div>
                          <div className="admin-form__group">
                            <label className="admin-form__label" htmlFor={`court-notes-modal-${court.id}`}>Примечание</label>
                            <input id={`court-notes-modal-${court.id}`} name="notes" className="admin-form__field" defaultValue={court.notes ?? ""} placeholder="Например: временно без камеры" />
                          </div>
                          <div className="admin-form__actions">
                            <button type="submit" className="admin-form__submit">Сохранить</button>
                          </div>
                        </form>
                      </AdminEditModal>
                      <form action={toggleActiveAction} className="admin-bookings__actions">
                        <input type="hidden" name="courtId" value={court.id} />
                        <input type="hidden" name="nextActive" value={String(!court.active)} />
                        <button type="submit" className="admin-bookings__action-button">
                          {court.active ? "Выключить" : "Включить"}
                        </button>
                      </form>
                      <AdminConfirmActionForm
                        action={deleteAction}
                        hiddenFields={{ courtId: court.id }}
                        triggerLabel="Удалить"
                        confirmLabel="Удалить корт"
                        title="Удалить корт?"
                        description="Удаление доступно только если корт не используется в истории бронирований."
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
