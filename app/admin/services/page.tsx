import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { AdminPageShell } from "@/src/components/admin/admin-page-shell";
import { assertAdmin } from "@/src/lib/auth/guards";
import {
  createServiceFromForm,
  deleteService,
  getAdminServices,
  getServiceResourceDescription,
  setServiceActive,
  SPORT_LABELS,
} from "@/src/lib/admin/resources";

export const dynamic = "force-dynamic";

export default async function AdminServicesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  await assertAdmin();
  const params = await searchParams;
  const services = await getAdminServices();
  const errorMessage =
    params.error === "delete_blocked"
      ? "Услугу нельзя удалить: по ней уже есть бронирования."
      : params.error === "delete_failed"
        ? "Не удалось удалить услугу."
        : null;
  const successMessage = params.success === "deleted" ? "Услуга удалена." : null;

  async function createAction(formData: FormData) {
    "use server";
    await assertAdmin();
    await createServiceFromForm(formData);
    revalidatePath("/admin/services");
    revalidatePath("/book");
  }

  async function toggleActiveAction(formData: FormData) {
    "use server";
    await assertAdmin();

    const serviceId = String(formData.get("serviceId") ?? "");
    const nextActive = String(formData.get("nextActive") ?? "") === "true";

    if (!serviceId) {
      throw new Error("serviceId обязателен");
    }

    await setServiceActive({ serviceId, active: nextActive });
    revalidatePath("/admin/services");
    revalidatePath("/book");
  }

  async function deleteAction(formData: FormData) {
    "use server";
    await assertAdmin();

    const serviceId = String(formData.get("serviceId") ?? "");
    if (!serviceId) {
      throw new Error("serviceId обязателен");
    }

    try {
      await deleteService(serviceId);
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (message.includes("уже есть бронирования")) {
        redirect("/admin/services?error=delete_blocked");
      }
      redirect("/admin/services?error=delete_failed");
    }

    revalidatePath("/admin/services");
    revalidatePath("/book");
    redirect("/admin/services?success=deleted");
  }

  return (
    <AdminPageShell
      title="Услуги"
      description="Упрощенная модель услуг: фиксированные сессии 60 минут. Тренировка = корт + тренер."
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
                  <label className="admin-form__label" htmlFor="service-code">
                    Код
                  </label>
                  <input
                    id="service-code"
                    name="code"
                    className="admin-form__field"
                    placeholder="padel-rental"
                    pattern="[a-z0-9-]+"
                    required
                  />
                </td>
                <td className="admin-table__cell">
                  <label className="admin-form__label" htmlFor="service-name">
                    Название
                  </label>
                  <input
                    id="service-name"
                    name="name"
                    className="admin-form__field"
                    placeholder="Аренда корта (падел)"
                    required
                  />
                </td>
                <td className="admin-table__cell">
                  <label className="admin-form__label" htmlFor="service-sport">
                    Спорт
                  </label>
                  <select id="service-sport" name="sport" className="admin-form__field" defaultValue="padel">
                    <option value="padel">Падел</option>
                    <option value="squash">Сквош</option>
                  </select>
                </td>
                <td className="admin-table__cell">
                  <label className="admin-form__checkbox">
                    <input name="includesInstructor" type="checkbox" />
                    <span>Это тренировка (добавляет тренера к цене)</span>
                  </label>
                </td>
                <td className="admin-table__cell">
                  <div className="admin-form__actions">
                    <button type="submit" className="admin-form__submit">
                      Добавить услугу
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
              <th className="admin-table__cell admin-table__cell--head">Услуга</th>
              <th className="admin-table__cell admin-table__cell--head">Спорт</th>
              <th className="admin-table__cell admin-table__cell--head">Тип</th>
              <th className="admin-table__cell admin-table__cell--head">Ресурсы</th>
              <th className="admin-table__cell admin-table__cell--head">Сессия</th>
              <th className="admin-table__cell admin-table__cell--head">Активна</th>
              <th className="admin-table__cell admin-table__cell--head">Действия</th>
            </tr>
          </thead>
          <tbody>
            {services.length === 0 ? (
              <tr className="admin-table__row">
                <td className="admin-table__cell" colSpan={7}>
                  Услуг пока нет.
                </td>
              </tr>
            ) : (
              services.map((service) => (
                <tr key={service.id} className="admin-table__row">
                  <td className="admin-table__cell">
                    <div className="admin-bookings__cell-title">{service.name}</div>
                    <div className="admin-bookings__cell-sub">{service.code}</div>
                  </td>
                  <td className="admin-table__cell">{SPORT_LABELS[service.sport]}</td>
                  <td className="admin-table__cell">
                    {service.requiresInstructor ? "Тренировка" : "Аренда"}
                  </td>
                  <td className="admin-table__cell">{getServiceResourceDescription(service)}</td>
                  <td className="admin-table__cell">60 минут</td>
                  <td className="admin-table__cell">
                    <span className="admin-bookings__chip">{service.active ? "Да" : "Нет"}</span>
                  </td>
                  <td className="admin-table__cell">
                    <div className="admin-bookings__actions">
                      <form action={toggleActiveAction} className="admin-bookings__actions">
                        <input type="hidden" name="serviceId" value={service.id} />
                        <input type="hidden" name="nextActive" value={String(!service.active)} />
                        <button type="submit" className="admin-bookings__action-button">
                          {service.active ? "Выключить" : "Включить"}
                        </button>
                      </form>
                      <form action={deleteAction} className="admin-bookings__actions">
                        <input type="hidden" name="serviceId" value={service.id} />
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
