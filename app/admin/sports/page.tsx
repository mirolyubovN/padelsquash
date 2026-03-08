import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { AdminPageShell } from "@/src/components/admin/admin-page-shell";
import { AdminConfirmActionForm } from "@/src/components/admin/admin-confirm-action-form";
import { AdminEditModal } from "@/src/components/admin/admin-edit-modal";
import { assertSuperAdmin } from "@/src/lib/auth/guards";
import {
  createSportFromForm,
  deleteSport,
  getAdminSports,
  setSportActive,
  updateSportFromForm,
} from "@/src/lib/admin/resources";
import { buildPageMetadata } from "@/src/lib/seo/metadata";

export const metadata = buildPageMetadata({
  title: "Админ: виды спорта | Padel & Squash KZ",
  description: "Центральная настройка вида спорта: название, rental service и базовые цены корта.",
  path: "/admin/sports",
  noIndex: true,
});

export const dynamic = "force-dynamic";

function revalidateSportDependencies() {
  revalidatePath("/admin/sports");
  revalidatePath("/admin/courts");
  revalidatePath("/admin/instructors");
  revalidatePath("/admin/services");
  revalidatePath("/admin/pricing/base");
  revalidatePath("/book");
  revalidatePath("/coaches");
  revalidatePath("/prices");
  revalidatePath("/");
}

export default async function AdminSportsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  await assertSuperAdmin();
  const params = await searchParams;
  const sports = await getAdminSports();

  const errorMessage =
    params.error === "delete_blocked"
      ? "Вид спорта нельзя удалить: он уже используется в кортах, услугах, тренерах или ценах."
      : params.error === "delete_failed"
        ? "Не удалось удалить вид спорта."
        : null;
  const successMessage = params.success === "deleted" ? "Вид спорта удален." : null;

  async function createAction(formData: FormData) {
    "use server";
    await assertSuperAdmin();
    await createSportFromForm(formData);
    revalidateSportDependencies();
  }

  async function updateAction(formData: FormData) {
    "use server";
    await assertSuperAdmin();
    await updateSportFromForm(formData);
    revalidateSportDependencies();
  }

  async function toggleActiveAction(formData: FormData) {
    "use server";
    await assertSuperAdmin();

    const sportId = String(formData.get("sportId") ?? "");
    const nextActive = String(formData.get("nextActive") ?? "") === "true";
    if (!sportId) {
      throw new Error("sportId is required");
    }

    await setSportActive({ sportId, active: nextActive });
    revalidateSportDependencies();
  }

  async function deleteAction(formData: FormData) {
    "use server";
    await assertSuperAdmin();

    const sportId = String(formData.get("sportId") ?? "");
    if (!sportId) {
      throw new Error("sportId is required");
    }

    try {
      await deleteSport(sportId);
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (message.includes("already used") || message.includes("используется")) {
        redirect("/admin/sports?error=delete_blocked");
      }
      redirect("/admin/sports?error=delete_failed");
    }

    revalidateSportDependencies();
    redirect("/admin/sports?success=deleted");
  }

  return (
    <AdminPageShell
      title="Виды спорта"
      description="Один экран для настройки нового спорта: создайте спорт, rental service и базовые цены корта без перехода по отдельным вкладкам."
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
          <h2 className="admin-section__title">Новый вид спорта</h2>
          <p className="admin-section__description">
            При создании сразу задаются базовая услуга аренды и цены корта. После этого останется только добавить реальные корты этого спорта.
          </p>
        </div>
        <form action={createAction} className="admin-form admin-form--panel">
          <div className="admin-form__panel-grid">
            <div className="admin-form__group">
              <label className="admin-form__label" htmlFor="sport-name">Название</label>
              <input id="sport-name" name="name" className="admin-form__field" placeholder="Table Tennis" required />
            </div>
            <div className="admin-form__group">
              <label className="admin-form__label" htmlFor="sport-slug">Slug</label>
              <input id="sport-slug" name="slug" className="admin-form__field" placeholder="table-tennis" pattern="[a-z0-9-]+" required />
            </div>
            <div className="admin-form__group">
              <label className="admin-form__label" htmlFor="sport-icon">Иконка</label>
              <input id="sport-icon" name="icon" className="admin-form__field" placeholder="TT" />
            </div>
            <div className="admin-form__group">
              <label className="admin-form__label" htmlFor="sport-sort-order">Порядок</label>
              <input id="sport-sort-order" name="sortOrder" type="number" step="1" className="admin-form__field" defaultValue={100} required />
            </div>
            <div className="admin-form__group">
              <label className="admin-form__label" htmlFor="sport-rental-service-name">Услуга аренды</label>
              <input id="sport-rental-service-name" name="rentalServiceName" className="admin-form__field" placeholder="Аренда корта (Table Tennis)" />
            </div>
            <div className="admin-form__group">
              <label className="admin-form__label" htmlFor="sport-rental-service-code">Код услуги</label>
              <input id="sport-rental-service-code" name="rentalServiceCode" className="admin-form__field" placeholder="table-tennis-rental" pattern="[a-z0-9-]+" />
            </div>
            <div className="admin-form__group">
              <label className="admin-form__label" htmlFor="sport-price-morning">Цена будни/день, KZT</label>
              <input id="sport-price-morning" name="courtPriceMorningKzt" type="number" min="0" step="1" className="admin-form__field" defaultValue={0} required />
            </div>
            <div className="admin-form__group">
              <label className="admin-form__label" htmlFor="sport-price-evening">Цена вечер/выходные, KZT</label>
              <input id="sport-price-evening" name="courtPriceEveningWeekendKzt" type="number" min="0" step="1" className="admin-form__field" defaultValue={0} required />
            </div>
            <div className="admin-form__group">
              <label className="admin-form__checkbox">
                <input name="active" type="checkbox" defaultChecked />
                <span>Активен</span>
              </label>
            </div>
          </div>
          <div className="admin-form__actions">
            <button type="submit" className="admin-form__submit">Добавить вид спорта</button>
          </div>
        </form>
      </section>

      <div className="admin-table">
        <table className="admin-table__table">
          <thead>
            <tr className="admin-table__row">
              <th className="admin-table__cell admin-table__cell--head">Спорт и rental service</th>
              <th className="admin-table__cell admin-table__cell--head">Цены корта</th>
              <th className="admin-table__cell admin-table__cell--head">Корты</th>
              <th className="admin-table__cell admin-table__cell--head">Статус</th>
              <th className="admin-table__cell admin-table__cell--head">Действия</th>
            </tr>
          </thead>
          <tbody>
            {sports.length === 0 ? (
              <tr className="admin-table__row">
                <td className="admin-table__cell" colSpan={5}>Видов спорта пока нет.</td>
              </tr>
            ) : (
              sports.map((sport) => (
                <tr key={sport.id} className="admin-table__row">
                  <td className="admin-table__cell">
                    <div className="admin-bookings__cell-title">{sport.name}</div>
                    <div className="admin-bookings__cell-sub">{sport.slug} · иконка: {sport.icon ?? "—"}</div>
                  </td>
                  <td className="admin-table__cell">
                    <div>Будни/день: {sport.courtBasePriceMorningKzt.toLocaleString("ru-KZ")} ₸</div>
                    <div className="admin-bookings__cell-sub">Вечер/выходные: {sport.courtBasePriceEveningWeekendKzt.toLocaleString("ru-KZ")} ₸</div>
                  </td>
                  <td className="admin-table__cell">
                    <div>{sport.courtsCount}</div>
                    <a href="/admin/courts" className="admin-inline-links__item">Открыть корты</a>
                  </td>
                  <td className="admin-table__cell">
                    <span className={`admin-status-badge ${sport.active ? "admin-status-badge--active" : "admin-status-badge--inactive"}`}>
                      <span className="admin-status-badge__dot" aria-hidden="true" />
                      {sport.active ? "Активен" : "Неактивен"}
                    </span>
                  </td>
                  <td className="admin-table__cell">
                    <div className="admin-bookings__actions">
                      <AdminEditModal triggerLabel="Редактировать" title={`Спорт: ${sport.name}`}>
                        <form action={updateAction} className="admin-form">
                          <input type="hidden" name="sportId" value={sport.id} />
                          <input type="hidden" name="rentalServiceId" value={sport.defaultRentalServiceId ?? ""} />
                          <div className="admin-form__panel-grid">
                            <div className="admin-form__group">
                              <label className="admin-form__label" htmlFor={`sport-name-modal-${sport.id}`}>Название</label>
                              <input id={`sport-name-modal-${sport.id}`} name="name" className="admin-form__field" defaultValue={sport.name} required />
                            </div>
                            <div className="admin-form__group">
                              <label className="admin-form__label" htmlFor={`sport-slug-modal-${sport.id}`}>Slug</label>
                              <input id={`sport-slug-modal-${sport.id}`} name="slug" className="admin-form__field" defaultValue={sport.slug} pattern="[a-z0-9-]+" required />
                            </div>
                            <div className="admin-form__group">
                              <label className="admin-form__label" htmlFor={`sport-icon-modal-${sport.id}`}>Иконка</label>
                              <input id={`sport-icon-modal-${sport.id}`} name="icon" className="admin-form__field" defaultValue={sport.icon ?? ""} />
                            </div>
                            <div className="admin-form__group">
                              <label className="admin-form__label" htmlFor={`sport-sort-modal-${sport.id}`}>Порядок</label>
                              <input id={`sport-sort-modal-${sport.id}`} name="sortOrder" type="number" step="1" className="admin-form__field" defaultValue={sport.sortOrder} required />
                            </div>
                            <div className="admin-form__group">
                              <label className="admin-form__label" htmlFor={`sport-svc-name-modal-${sport.id}`}>Услуга аренды</label>
                              <input id={`sport-svc-name-modal-${sport.id}`} name="rentalServiceName" className="admin-form__field" defaultValue={sport.defaultRentalServiceName ?? `Аренда корта (${sport.name})`} required />
                            </div>
                            <div className="admin-form__group">
                              <label className="admin-form__label" htmlFor={`sport-svc-code-modal-${sport.id}`}>Код услуги</label>
                              <input id={`sport-svc-code-modal-${sport.id}`} name="rentalServiceCode" className="admin-form__field" defaultValue={sport.defaultRentalServiceCode ?? `${sport.slug}-rental`} pattern="[a-z0-9-]+" required />
                            </div>
                            <div className="admin-form__group">
                              <label className="admin-form__label" htmlFor={`sport-price-m-modal-${sport.id}`}>Будни/день, KZT</label>
                              <input id={`sport-price-m-modal-${sport.id}`} name="courtPriceMorningKzt" type="number" min="0" step="1" className="admin-form__field" defaultValue={sport.courtBasePriceMorningKzt} required />
                            </div>
                            <div className="admin-form__group">
                              <label className="admin-form__label" htmlFor={`sport-price-e-modal-${sport.id}`}>Вечер/выходные, KZT</label>
                              <input id={`sport-price-e-modal-${sport.id}`} name="courtPriceEveningWeekendKzt" type="number" min="0" step="1" className="admin-form__field" defaultValue={sport.courtBasePriceEveningWeekendKzt} required />
                            </div>
                          </div>
                          <div className="admin-form__actions">
                            <button type="submit" className="admin-form__submit">Сохранить конфигурацию</button>
                          </div>
                        </form>
                      </AdminEditModal>
                      <form action={toggleActiveAction} className="admin-bookings__actions">
                        <input type="hidden" name="sportId" value={sport.id} />
                        <input type="hidden" name="nextActive" value={String(!sport.active)} />
                        <button type="submit" className="admin-bookings__action-button">
                          {sport.active ? "Выключить" : "Включить"}
                        </button>
                      </form>
                      <AdminConfirmActionForm
                        action={deleteAction}
                        hiddenFields={{ sportId: sport.id }}
                        triggerLabel="Удалить"
                        confirmLabel="Удалить вид спорта"
                        title="Удалить вид спорта?"
                        description="Удаление доступно только если этот спорт еще не используется в кортах, услугах, тренерах и ценах."
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
