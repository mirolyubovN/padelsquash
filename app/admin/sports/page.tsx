import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { AdminPageShell } from "@/src/components/admin/admin-page-shell";
import { AdminConfirmActionForm } from "@/src/components/admin/admin-confirm-action-form";
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
                    <form action={updateAction} className="admin-inline-row-form">
                      <input type="hidden" name="sportId" value={sport.id} />
                      <input type="hidden" name="rentalServiceId" value={sport.defaultRentalServiceId ?? ""} />
                      <label className="admin-form__label" htmlFor={`sport-name-${sport.id}`}>Название</label>
                      <input id={`sport-name-${sport.id}`} name="name" className="admin-form__field" defaultValue={sport.name} required />
                      <label className="admin-form__label" htmlFor={`sport-slug-${sport.id}`}>Slug</label>
                      <input id={`sport-slug-${sport.id}`} name="slug" className="admin-form__field" defaultValue={sport.slug} pattern="[a-z0-9-]+" required />
                      <label className="admin-form__label" htmlFor={`sport-icon-${sport.id}`}>Иконка</label>
                      <input id={`sport-icon-${sport.id}`} name="icon" className="admin-form__field" defaultValue={sport.icon ?? ""} />
                      <label className="admin-form__label" htmlFor={`sport-sort-${sport.id}`}>Порядок</label>
                      <input id={`sport-sort-${sport.id}`} name="sortOrder" type="number" step="1" className="admin-form__field" defaultValue={sport.sortOrder} required />
                      <label className="admin-form__label" htmlFor={`sport-service-name-${sport.id}`}>Услуга аренды</label>
                      <input
                        id={`sport-service-name-${sport.id}`}
                        name="rentalServiceName"
                        className="admin-form__field"
                        defaultValue={sport.defaultRentalServiceName ?? `Аренда корта (${sport.name})`}
                        required
                      />
                      <label className="admin-form__label" htmlFor={`sport-service-code-${sport.id}`}>Код услуги</label>
                      <input
                        id={`sport-service-code-${sport.id}`}
                        name="rentalServiceCode"
                        className="admin-form__field"
                        defaultValue={sport.defaultRentalServiceCode ?? `${sport.slug}-rental`}
                        pattern="[a-z0-9-]+"
                        required
                      />
                      <label className="admin-form__label" htmlFor={`sport-price-morning-${sport.id}`}>Будни/день, KZT</label>
                      <input
                        id={`sport-price-morning-${sport.id}`}
                        name="courtPriceMorningKzt"
                        type="number"
                        min="0"
                        step="1"
                        className="admin-form__field"
                        defaultValue={sport.courtBasePriceMorningKzt}
                        required
                      />
                      <label className="admin-form__label" htmlFor={`sport-price-evening-${sport.id}`}>Вечер/выходные, KZT</label>
                      <input
                        id={`sport-price-evening-${sport.id}`}
                        name="courtPriceEveningWeekendKzt"
                        type="number"
                        min="0"
                        step="1"
                        className="admin-form__field"
                        defaultValue={sport.courtBasePriceEveningWeekendKzt}
                        required
                      />
                      <button type="submit" className="admin-bookings__action-button">Сохранить конфигурацию</button>
                    </form>
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
