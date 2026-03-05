import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { AdminPageShell } from "@/src/components/admin/admin-page-shell";
import { AdminConfirmActionForm } from "@/src/components/admin/admin-confirm-action-form";
import { assertAdmin } from "@/src/lib/auth/guards";
import {
  createServiceFromForm,
  deleteService,
  getAdminServices,
  getAdminSportOptions,
  getServiceResourceDescription,
  setServiceActive,
  updateServiceFromForm,
} from "@/src/lib/admin/resources";
import { buildPageMetadata } from "@/src/lib/seo/metadata";

export const metadata = buildPageMetadata({
  title: "Админ: услуги | Padel & Squash KZ",
  description: "Управление услугами клуба: аренда и тренировка, код услуги, спорт, активность и параметры расчета.",
  path: "/admin/services",
  noIndex: true,
});

export const dynamic = "force-dynamic";

export default async function AdminServicesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  await assertAdmin();
  const params = await searchParams;
  const [services, sportOptions] = await Promise.all([getAdminServices(), getAdminSportOptions()]);
  const defaultSportId = sportOptions[0]?.id ?? "";
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

  async function updateAction(formData: FormData) {
    "use server";
    await assertAdmin();
    await updateServiceFromForm(formData);
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
      description="Фиксированные сессии 60 минут. Тренировка считается как корт + тренер."
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
          <h2 className="admin-section__title">Добавить услугу</h2>
          <p className="admin-section__description">Создайте аренду или тренировку для выбранного спорта.</p>
        </div>
        <form action={createAction} className="admin-form admin-form--panel">
          <div className="admin-form__panel-grid">
            <div className="admin-form__group">
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
            </div>
            <div className="admin-form__group">
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
            </div>
            <div className="admin-form__group">
              <label className="admin-form__label" htmlFor="service-sport">
                Спорт
              </label>
              <select id="service-sport" name="sportId" className="admin-form__field" defaultValue={defaultSportId} required>
                {sportOptions.map((sport) => (
                  <option key={sport.id} value={sport.id}>
                    {sport.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="admin-form__group">
              <label className="admin-form__checkbox">
                <input name="includesInstructor" type="checkbox" />
                <span>Это тренировка (добавляет тренера к цене)</span>
              </label>
            </div>
          </div>
          <div className="admin-form__actions">
            <button type="submit" className="admin-form__submit">
              Добавить услугу
            </button>
          </div>
        </form>
      </section>

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
                    <form action={updateAction} className="admin-inline-row-form">
                      <input type="hidden" name="serviceId" value={service.id} />
                      <label className="admin-form__label" htmlFor={`service-name-${service.id}`}>
                        Название
                      </label>
                      <input
                        id={`service-name-${service.id}`}
                        name="name"
                        className="admin-form__field"
                        defaultValue={service.name}
                        required
                      />
                      <label className="admin-form__label" htmlFor={`service-code-${service.id}`}>
                        Код
                      </label>
                      <input
                        id={`service-code-${service.id}`}
                        name="code"
                        className="admin-form__field"
                        defaultValue={service.code}
                        pattern="[a-z0-9-]+"
                        required
                      />
                      <button type="submit" className="admin-bookings__action-button">
                        Сохранить
                      </button>
                    </form>
                  </td>
                  <td className="admin-table__cell">{service.sportName}</td>
                  <td className="admin-table__cell">
                    {service.requiresInstructor ? "Тренировка" : "Аренда"}
                  </td>
                  <td className="admin-table__cell">{getServiceResourceDescription(service)}</td>
                  <td className="admin-table__cell">60 минут</td>
                  <td className="admin-table__cell">
                    <span className={`admin-status-badge ${service.active ? "admin-status-badge--active" : "admin-status-badge--inactive"}`}>
                      <span className="admin-status-badge__dot" aria-hidden="true" />
                      {service.active ? "Активна" : "Неактивна"}
                    </span>
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
                      <AdminConfirmActionForm
                        action={deleteAction}
                        hiddenFields={{ serviceId: service.id }}
                        triggerLabel="Удалить"
                        confirmLabel="Удалить услугу"
                        title="Удалить услугу?"
                        description="Удаление доступно только если по услуге нет исторических бронирований."
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
