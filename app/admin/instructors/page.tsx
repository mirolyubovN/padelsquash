import Link from "next/link";
import { revalidatePath } from "next/cache";
import { AdminPageShell } from "@/src/components/admin/admin-page-shell";
import { assertAdmin } from "@/src/lib/auth/guards";
import {
  createInstructorFromForm,
  getAdminInstructors,
  setInstructorActive,
  SPORT_LABELS,
  updateInstructorPricingFromForm,
} from "@/src/lib/admin/resources";

export const dynamic = "force-dynamic";

export default async function AdminInstructorsPage() {
  await assertAdmin();
  const instructors = await getAdminInstructors();

  async function createAction(formData: FormData) {
    "use server";
    await assertAdmin();
    await createInstructorFromForm(formData);
    revalidatePath("/admin/instructors");
    revalidatePath("/admin/exceptions");
    revalidatePath("/book");
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
  }

  async function updatePricingAction(formData: FormData) {
    "use server";
    await assertAdmin();
    await updateInstructorPricingFromForm(formData);
    revalidatePath("/admin/instructors");
    revalidatePath("/book");
  }

  return (
    <AdminPageShell
      title="Тренеры"
      description="Тренеры с привязкой к спорту, индивидуальными ценами по периодам и настройкой графика."
    >
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
                  <label className="admin-form__label" htmlFor="instructor-sport">
                    Спорт
                  </label>
                  <select
                    id="instructor-sport"
                    name="sport"
                    className="admin-form__field"
                    defaultValue="padel"
                  >
                    <option value="padel">Падел</option>
                    <option value="squash">Сквош</option>
                  </select>
                </td>
                <td className="admin-table__cell">
                  <label className="admin-form__label" htmlFor="instructor-bio">
                    Описание (опционально)
                  </label>
                  <input
                    id="instructor-bio"
                    name="bio"
                    className="admin-form__field"
                    placeholder="Направление, опыт, формат занятий"
                  />
                </td>
                <td className="admin-table__cell">
                  <label className="admin-form__label" htmlFor="instructor-price-morning">
                    Утро (₸)
                  </label>
                  <input
                    id="instructor-price-morning"
                    name="priceMorning"
                    type="number"
                    min="0"
                    step="1"
                    className="admin-form__field"
                    defaultValue={9000}
                    required
                  />
                </td>
                <td className="admin-table__cell">
                  <label className="admin-form__label" htmlFor="instructor-price-day">
                    День (₸)
                  </label>
                  <input
                    id="instructor-price-day"
                    name="priceDay"
                    type="number"
                    min="0"
                    step="1"
                    className="admin-form__field"
                    defaultValue={10000}
                    required
                  />
                </td>
                <td className="admin-table__cell">
                  <label className="admin-form__label" htmlFor="instructor-price-evening">
                    Вечер/выходные (₸)
                  </label>
                  <input
                    id="instructor-price-evening"
                    name="priceEveningWeekend"
                    type="number"
                    min="0"
                    step="1"
                    className="admin-form__field"
                    defaultValue={11000}
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
              <th className="admin-table__cell admin-table__cell--head">Спорт</th>
              <th className="admin-table__cell admin-table__cell--head">Описание</th>
              <th className="admin-table__cell admin-table__cell--head">Цены (₸)</th>
              <th className="admin-table__cell admin-table__cell--head">Активен</th>
              <th className="admin-table__cell admin-table__cell--head">График / исключения</th>
              <th className="admin-table__cell admin-table__cell--head">Действия</th>
            </tr>
          </thead>
          <tbody>
            {instructors.length === 0 ? (
              <tr className="admin-table__row">
                <td className="admin-table__cell" colSpan={7}>
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
                  <td className="admin-table__cell">{SPORT_LABELS[instructor.sport]}</td>
                  <td className="admin-table__cell">{instructor.bio ?? "—"}</td>
                  <td className="admin-table__cell">
                    <form action={updatePricingAction} className="admin-bookings__actions">
                      <input type="hidden" name="instructorId" value={instructor.id} />
                      <div className="admin-inline-edit">
                        <label className="admin-form__label" htmlFor={`pm-${instructor.id}`}>
                          Утро
                        </label>
                        <input
                          id={`pm-${instructor.id}`}
                          name="priceMorning"
                          type="number"
                          min="0"
                          step="1"
                          className="admin-form__field"
                          defaultValue={instructor.priceMorning}
                          required
                        />
                      </div>
                      <div className="admin-inline-edit">
                        <label className="admin-form__label" htmlFor={`pd-${instructor.id}`}>
                          День
                        </label>
                        <input
                          id={`pd-${instructor.id}`}
                          name="priceDay"
                          type="number"
                          min="0"
                          step="1"
                          className="admin-form__field"
                          defaultValue={instructor.priceDay}
                          required
                        />
                      </div>
                      <div className="admin-inline-edit">
                        <label className="admin-form__label" htmlFor={`pe-${instructor.id}`}>
                          Вечер
                        </label>
                        <input
                          id={`pe-${instructor.id}`}
                          name="priceEveningWeekend"
                          type="number"
                          min="0"
                          step="1"
                          className="admin-form__field"
                          defaultValue={instructor.priceEveningWeekend}
                          required
                        />
                      </div>
                      <button type="submit" className="admin-bookings__action-button">
                        Сохранить цены
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
                    <form action={toggleActiveAction} className="admin-bookings__actions">
                      <input type="hidden" name="instructorId" value={instructor.id} />
                      <input type="hidden" name="nextActive" value={String(!instructor.active)} />
                      <button type="submit" className="admin-bookings__action-button">
                        {instructor.active ? "Выключить" : "Включить"}
                      </button>
                    </form>
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
