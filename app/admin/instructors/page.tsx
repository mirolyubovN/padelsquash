import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { AdminPageShell } from "@/src/components/admin/admin-page-shell";
import { assertAdmin } from "@/src/lib/auth/guards";
import {
  createInstructorFromForm,
  deleteInstructor,
  getAdminInstructors,
  setInstructorActive,
  SPORT_LABELS,
  updateInstructorFromForm,
} from "@/src/lib/admin/resources";

export const dynamic = "force-dynamic";

export default async function AdminInstructorsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  await assertAdmin();
  const params = await searchParams;
  const instructors = await getAdminInstructors();
  const errorMessage =
    params.error === "delete_blocked"
      ? "Тренера нельзя удалить: он уже используется в истории бронирований."
      : params.error === "delete_failed"
        ? "Не удалось удалить тренера."
        : null;
  const successMessage = params.success === "deleted" ? "Тренер удален." : null;

  async function createAction(formData: FormData) {
    "use server";
    await assertAdmin();
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
    await assertAdmin();
    await updateInstructorFromForm(formData);
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
      title="Тренеры"
      description="Тренеры с несколькими видами спорта, описанием, индивидуальной ставкой за час и настройкой графика."
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
                  <label className="admin-form__label" htmlFor="instructor-name">
                    Имя
                  </label>
                  <input
                    id="instructor-name"
                    name="name"
                    className="admin-form__field"
                    placeholder="Имя Фамилия"
                    required
                  />
                </td>
                <td className="admin-table__cell">
                  <label className="admin-form__label">Виды спорта</label>
                  <div className="admin-inline-checkboxes">
                    <label className="admin-form__checkbox">
                      <input name="sports" type="checkbox" value="padel" defaultChecked />
                      <span>Падел</span>
                    </label>
                    <label className="admin-form__checkbox">
                      <input name="sports" type="checkbox" value="squash" />
                      <span>Сквош</span>
                    </label>
                  </div>
                </td>
                <td className="admin-table__cell">
                  <label className="admin-form__label" htmlFor="instructor-bio">
                    Описание (для страницы тренеров)
                  </label>
                  <input
                    id="instructor-bio"
                    name="bio"
                    className="admin-form__field"
                    placeholder="Направление, опыт, формат занятий"
                  />
                </td>
                <td className="admin-table__cell">
                  <label className="admin-form__label" htmlFor="instructor-price-hour">
                    Ставка за час (₸)
                  </label>
                  <input
                    id="instructor-price-hour"
                    name="pricePerHour"
                    type="number"
                    min="0"
                    step="1"
                    className="admin-form__field"
                    defaultValue={10000}
                    required
                  />
                </td>
                <td className="admin-table__cell">
                  <div className="admin-form__actions">
                    <button type="submit" className="admin-form__submit">
                      Добавить тренера
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
              <th className="admin-table__cell admin-table__cell--head">Имя</th>
              <th className="admin-table__cell admin-table__cell--head">Виды спорта</th>
              <th className="admin-table__cell admin-table__cell--head">Описание и ставка (₸)</th>
              <th className="admin-table__cell admin-table__cell--head">Активен</th>
              <th className="admin-table__cell admin-table__cell--head">График / история / исключения</th>
              <th className="admin-table__cell admin-table__cell--head">Действия</th>
            </tr>
          </thead>
          <tbody>
            {instructors.length === 0 ? (
              <tr className="admin-table__row">
                <td className="admin-table__cell" colSpan={6}>
                  Тренеров пока нет.
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
                      ? instructor.sports.map((sport) => SPORT_LABELS[sport]).join(", ")
                      : "—"}
                  </td>
                  <td className="admin-table__cell">
                    <form action={updatePricingAction} className="admin-bookings__actions">
                      <input type="hidden" name="instructorId" value={instructor.id} />
                      <div className="admin-inline-edit">
                        <label className="admin-form__label">Виды спорта</label>
                        <div className="admin-inline-checkboxes">
                          <label className="admin-form__checkbox">
                            <input
                              name="sports"
                              type="checkbox"
                              value="padel"
                              defaultChecked={instructor.sports.includes("padel")}
                            />
                            <span>Падел</span>
                          </label>
                          <label className="admin-form__checkbox">
                            <input
                              name="sports"
                              type="checkbox"
                              value="squash"
                              defaultChecked={instructor.sports.includes("squash")}
                            />
                            <span>Сквош</span>
                          </label>
                        </div>
                      </div>
                      <div className="admin-inline-edit">
                        <label className="admin-form__label" htmlFor={`bio-${instructor.id}`}>
                          Описание
                        </label>
                        <input
                          id={`bio-${instructor.id}`}
                          name="bio"
                          className="admin-form__field"
                          defaultValue={instructor.bio ?? ""}
                          placeholder="Направление, опыт, формат занятий"
                        />
                      </div>
                      <div className="admin-inline-edit">
                        <label className="admin-form__label" htmlFor={`pph-${instructor.id}`}>
                          Ставка за час
                        </label>
                        <input
                          id={`pph-${instructor.id}`}
                          name="pricePerHour"
                          type="number"
                          min="0"
                          step="1"
                          className="admin-form__field"
                          defaultValue={instructor.pricePerHour}
                          required
                        />
                      </div>
                      <button type="submit" className="admin-bookings__action-button">
                        Сохранить
                      </button>
                    </form>
                  </td>
                  <td className="admin-table__cell">
                    <span className="admin-bookings__chip">{instructor.active ? "Да" : "Нет"}</span>
                  </td>
                  <td className="admin-table__cell">
                    <Link
                      href={`/admin/instructors/${instructor.id}/schedule`}
                      className="admin-inline-links__item"
                    >
                      Открыть
                    </Link>
                  </td>
                  <td className="admin-table__cell">
                    <div className="admin-bookings__actions">
                      <form action={toggleActiveAction} className="admin-bookings__actions">
                        <input type="hidden" name="instructorId" value={instructor.id} />
                        <input type="hidden" name="nextActive" value={String(!instructor.active)} />
                        <button type="submit" className="admin-bookings__action-button">
                          {instructor.active ? "Выключить" : "Включить"}
                        </button>
                      </form>
                      <form action={deleteAction} className="admin-bookings__actions">
                        <input type="hidden" name="instructorId" value={instructor.id} />
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
