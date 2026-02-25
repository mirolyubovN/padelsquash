import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { AdminPageShell } from "@/src/components/admin/admin-page-shell";
import { assertAdmin } from "@/src/lib/auth/guards";
import {
  createCourtFromForm,
  deleteCourt,
  getAdminCourts,
  setCourtActive,
  SPORT_LABELS,
} from "@/src/lib/admin/resources";

export const dynamic = "force-dynamic";

export default async function AdminCourtsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  await assertAdmin();
  const params = await searchParams;
  const courts = await getAdminCourts();
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
      description="Список кортов в БД, включение/выключение и ссылки на разовые исключения по каждому корту."
    >
      {errorMessage ? (
        <p className="account-history__message account-history__message--error" role="alert">
          {errorMessage}
        </p>
      ) : null}
      {successMessage ? (
        <p className="account-history__message account-history__message--success">{successMessage}</p>
      ) : null}

      <form action={createAction} className="admin-form">
        <div className="admin-table">
          <table className="admin-table__table">
            <tbody>
              <tr className="admin-table__row">
                <td className="admin-table__cell">
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
                </td>
                <td className="admin-table__cell">
                  <label className="admin-form__label" htmlFor="court-sport">
                    Спорт
                  </label>
                  <select id="court-sport" name="sport" className="admin-form__field" defaultValue="padel">
                    <option value="padel">Падел</option>
                    <option value="squash">Сквош</option>
                  </select>
                </td>
                <td className="admin-table__cell">
                  <label className="admin-form__label" htmlFor="court-notes">
                    Примечание (опционально)
                  </label>
                  <input
                    id="court-notes"
                    name="notes"
                    className="admin-form__field"
                    placeholder="Например: временно без камеры"
                  />
                </td>
                <td className="admin-table__cell">
                  <div className="admin-form__actions">
                    <button type="submit" className="admin-form__submit">
                      Добавить корт
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </form>

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
                  <td className="admin-table__cell">{SPORT_LABELS[court.sport]}</td>
                  <td className="admin-table__cell">
                    <span className="admin-bookings__chip">{court.active ? "Да" : "Нет"}</span>
                  </td>
                  <td className="admin-table__cell">{court.notes ?? "—"}</td>
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
                      <form action={toggleActiveAction} className="admin-bookings__actions">
                        <input type="hidden" name="courtId" value={court.id} />
                        <input type="hidden" name="nextActive" value={String(!court.active)} />
                        <button type="submit" className="admin-bookings__action-button">
                          {court.active ? "Выключить" : "Включить"}
                        </button>
                      </form>
                      <form action={deleteAction} className="admin-bookings__actions">
                        <input type="hidden" name="courtId" value={court.id} />
                        <button type="submit" className="admin-bookings__action-button">
                          Удалить
                        </button>
                      </form>
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
