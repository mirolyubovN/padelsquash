import Link from "next/link";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { AdminEditModal } from "@/src/components/admin/admin-edit-modal";
import { AdminPageShell } from "@/src/components/admin/admin-page-shell";
import { buildAccountSetupPath, createAccountSetupToken } from "@/src/lib/auth/account-setup";
import { assertSuperAdmin } from "@/src/lib/auth/guards";
import { getRoleLabel, type AppRole } from "@/src/lib/auth/roles";
import { siteConfig } from "@/src/lib/content/site-data";
import { buildPageMetadata } from "@/src/lib/seo/metadata";
import {
  StaffActionError,
  changeStaffRole,
  createStaffMember,
  getStaffPageData,
  relinkTrainerInstructor,
  resetStaffPassword,
  setStaffActive,
  updateStaffMember,
  type StaffMemberRow,
} from "@/src/lib/admin/staff";
import type { StaffRole } from "@/src/lib/admin/staff-schema";

export const metadata = buildPageMetadata({
  title: "Админ: сотрудники | Padel & Squash KZ",
  description: "Управление администраторами, супер-администраторами и тренерскими аккаунтами.",
  path: "/admin/staff",
  noIndex: true,
});

export const dynamic = "force-dynamic";

function getRequestOrigin(headerStore: Headers): string {
  const host = headerStore.get("x-forwarded-host") ?? headerStore.get("host");
  if (!host) return siteConfig.siteUrl;
  const proto = headerStore.get("x-forwarded-proto") ?? (host.includes("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("ru-KZ");
}

function getSetupNextPath(role: StaffRole): string {
  return role === "trainer" ? "/trainer/schedule" : "/admin";
}

function buildSetupUrl(row: StaffMemberRow, origin: string): string | null {
  if (!row.needsPasswordSetup) {
    return null;
  }

  return new URL(
    buildAccountSetupPath(
      createAccountSetupToken({
        userId: row.id,
        email: row.email,
        passwordHash: row.passwordHash,
      }),
      getSetupNextPath(row.role),
    ),
    origin,
  ).toString();
}

function getSuccessMessage(code: string | undefined): string | null {
  if (code === "created") return "Сотрудник создан.";
  if (code === "updated") return "Данные сотрудника сохранены.";
  if (code === "password_reset") return "Пароль сброшен. Используйте новую ссылку активации.";
  if (code === "activated") return "Аккаунт включен.";
  if (code === "deactivated") return "Аккаунт отключен.";
  if (code === "role_changed") return "Роль сотрудника изменена.";
  if (code === "trainer_linked") return "Карточка тренера обновлена.";
  return null;
}

function getErrorMessage(code: string | undefined): string | null {
  if (code === "staff_email_taken") return "Этот email уже используется другим аккаунтом.";
  if (code === "self_deactivate") return "Нельзя отключить собственный аккаунт.";
  if (code === "self_demote") return "Нельзя понизить собственную роль.";
  if (code === "last_super_admin") return "Нельзя отключить или понизить последнего активного супер-администратора.";
  if (code === "instructor_taken") return "Эта карточка тренера уже связана с другим аккаунтом.";
  if (code === "instructor_not_found") return "Карточка тренера не найдена.";
  if (code === "staff_not_found") return "Сотрудник не найден.";
  if (code === "password_mismatch") return "Пароли не совпадают.";
  if (code) return "Не удалось выполнить действие.";
  return null;
}

function staffErrorCode(error: unknown): string {
  return error instanceof StaffActionError ? error.code : "staff_action_failed";
}

function getFormString(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

function getFormStringArray(formData: FormData, key: string): string[] {
  return formData.getAll(key).map((value) => String(value).trim()).filter(Boolean);
}

export default async function AdminStaffPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; role?: StaffRole | "all"; active?: "all" | "active" | "disabled"; success?: string; error?: string }>;
}) {
  await assertSuperAdmin();
  const params = await searchParams;
  const roleFilter = params.role === "admin" || params.role === "super_admin" || params.role === "trainer" ? params.role : "all";
  const activeFilter = params.active === "active" || params.active === "disabled" ? params.active : "all";
  const [headerStore, data] = await Promise.all([
    headers(),
    getStaffPageData({
      q: params.q,
      role: roleFilter,
      active: activeFilter,
    }),
  ]);
  const requestOrigin = getRequestOrigin(headerStore);
  const successMessage = getSuccessMessage(params.success);
  const errorMessage = getErrorMessage(params.error);

  async function createAction(formData: FormData) {
    "use server";
    const sportIds = getFormStringArray(formData, "newInstructorSportIds");
    const locationIds = getFormStringArray(formData, "locationIds");
    const role = getFormString(formData, "role") as StaffRole;
    const passwordMode = getFormString(formData, "passwordMode") === "manual" ? "manual" : "activation_link";
    const password = String(formData.get("password") ?? "");

    try {
      if (passwordMode === "manual" && password !== String(formData.get("passwordConfirm") ?? "")) {
        throw new StaffActionError("Пароли не совпадают.", "password_mismatch");
      }

      await createStaffMember({
        name: getFormString(formData, "name"),
        email: getFormString(formData, "email").toLowerCase(),
        phone: getFormString(formData, "phone"),
        role,
        passwordMode,
        password,
        instructorMode: getFormString(formData, "instructorMode") === "create_new" ? "create_new" : "link_existing",
        instructorId: getFormString(formData, "instructorId"),
        newInstructor: {
          name: getFormString(formData, "newInstructorName"),
          bio: getFormString(formData, "newInstructorBio"),
          sportPrices: sportIds.map((sportId) => ({
            sportId,
            pricePerHour: Number(formData.get(`price_${sportId}`) ?? 0),
          })),
          locationIds,
        },
      });
    } catch (error) {
      redirect(`/admin/staff?error=${encodeURIComponent(staffErrorCode(error))}`);
    }

    revalidatePath("/admin/staff");
    redirect("/admin/staff?success=created");
  }

  async function updateAction(formData: FormData) {
    "use server";
    const userId = getFormString(formData, "userId");
    try {
      await updateStaffMember({
        userId,
        name: getFormString(formData, "name"),
        email: getFormString(formData, "email").toLowerCase(),
        phone: getFormString(formData, "phone"),
      });
    } catch (error) {
      redirect(`/admin/staff?error=${encodeURIComponent(staffErrorCode(error))}`);
    }

    revalidatePath("/admin/staff");
    redirect("/admin/staff?success=updated");
  }

  async function resetPasswordAction(formData: FormData) {
    "use server";
    const userId = getFormString(formData, "userId");
    try {
      await resetStaffPassword(userId);
    } catch (error) {
      redirect(`/admin/staff?error=${encodeURIComponent(staffErrorCode(error))}`);
    }

    revalidatePath("/admin/staff");
    redirect("/admin/staff?success=password_reset");
  }

  async function toggleActiveAction(formData: FormData) {
    "use server";
    const userId = getFormString(formData, "userId");
    const active = getFormString(formData, "active") === "true";
    try {
      await setStaffActive({ userId, active });
    } catch (error) {
      redirect(`/admin/staff?error=${encodeURIComponent(staffErrorCode(error))}`);
    }

    revalidatePath("/admin/staff");
    redirect(`/admin/staff?success=${active ? "activated" : "deactivated"}`);
  }

  async function changeRoleAction(formData: FormData) {
    "use server";
    const userId = getFormString(formData, "userId");
    const role = getFormString(formData, "role") === "super_admin" ? "super_admin" : "admin";
    try {
      await changeStaffRole({ userId, role });
    } catch (error) {
      redirect(`/admin/staff?error=${encodeURIComponent(staffErrorCode(error))}`);
    }

    revalidatePath("/admin/staff");
    redirect("/admin/staff?success=role_changed");
  }

  async function relinkTrainerAction(formData: FormData) {
    "use server";
    const userId = getFormString(formData, "userId");
    const instructorId = getFormString(formData, "instructorId") || null;
    try {
      await relinkTrainerInstructor({ userId, instructorId });
    } catch (error) {
      redirect(`/admin/staff?error=${encodeURIComponent(staffErrorCode(error))}`);
    }

    revalidatePath("/admin/staff");
    revalidatePath("/trainer/schedule");
    redirect("/admin/staff?success=trainer_linked");
  }

  return (
    <AdminPageShell
      title="Сотрудники"
      description="Создание и управление аккаунтами администраторов, супер-администраторов и тренеров."
    >
      {errorMessage ? (
        <p className="account-history__message account-history__message--error" role="alert">{errorMessage}</p>
      ) : null}
      {successMessage ? (
        <p className="account-history__message account-history__message--success" role="status">{successMessage}</p>
      ) : null}

      <section className="admin-section">
        <div className="admin-section__head">
          <h2 className="admin-section__title">Новый сотрудник</h2>
          <p className="admin-section__description">
            Ссылка активации создается автоматически, если пароль не задается вручную.
          </p>
        </div>
        <form action={createAction} className="admin-form admin-form--panel">
          <div className="admin-form__panel-grid">
            <div className="admin-form__group">
              <label className="admin-form__label" htmlFor="staff-name">Имя</label>
              <input id="staff-name" name="name" className="admin-form__field" required />
            </div>
            <div className="admin-form__group">
              <label className="admin-form__label" htmlFor="staff-email">Email</label>
              <input id="staff-email" name="email" type="email" className="admin-form__field" required />
            </div>
            <div className="admin-form__group">
              <label className="admin-form__label" htmlFor="staff-phone">Телефон</label>
              <input id="staff-phone" name="phone" className="admin-form__field" required />
            </div>
            <div className="admin-form__group">
              <label className="admin-form__label" htmlFor="staff-role">Роль</label>
              <select id="staff-role" name="role" className="admin-form__field" defaultValue="admin">
                <option value="admin">Администратор</option>
                <option value="super_admin">Супер-администратор</option>
                <option value="trainer">Тренер</option>
              </select>
            </div>
            <div className="admin-form__group">
              <label className="admin-form__label" htmlFor="password-mode">Пароль</label>
              <select id="password-mode" name="passwordMode" className="admin-form__field" defaultValue="activation_link">
                <option value="activation_link">Ссылка активации</option>
                <option value="manual">Задать вручную</option>
              </select>
            </div>
            <div className="admin-form__group">
              <label className="admin-form__label" htmlFor="staff-password">Пароль вручную</label>
              <input id="staff-password" name="password" type="password" className="admin-form__field" autoComplete="new-password" />
            </div>
            <div className="admin-form__group">
              <label className="admin-form__label" htmlFor="staff-password-confirm">Повторите пароль</label>
              <input id="staff-password-confirm" name="passwordConfirm" type="password" className="admin-form__field" autoComplete="new-password" />
            </div>
          </div>

          <div className="admin-form__group">
            <label className="admin-form__label" htmlFor="instructor-mode">Карточка тренера, если роль — тренер</label>
            <select id="instructor-mode" name="instructorMode" className="admin-form__field" defaultValue="link_existing">
              <option value="link_existing">Связать с существующей карточкой</option>
              <option value="create_new">Создать новую карточку</option>
            </select>
          </div>

          <div className="admin-form__panel-grid">
            <div className="admin-form__group">
              <label className="admin-form__label" htmlFor="instructor-id">Существующая карточка</label>
              <select id="instructor-id" name="instructorId" className="admin-form__field" defaultValue="">
                <option value="">Не выбрана</option>
                {data.unlinkedInstructors.map((instructor) => (
                  <option key={instructor.id} value={instructor.id}>{instructor.name}</option>
                ))}
              </select>
            </div>
            <div className="admin-form__group">
              <label className="admin-form__label" htmlFor="new-instructor-name">Имя новой карточки</label>
              <input id="new-instructor-name" name="newInstructorName" className="admin-form__field" placeholder="По умолчанию имя сотрудника" />
            </div>
            <div className="admin-form__group">
              <label className="admin-form__label" htmlFor="new-instructor-bio">Описание новой карточки</label>
              <input id="new-instructor-bio" name="newInstructorBio" className="admin-form__field" />
            </div>
          </div>

          <div className="admin-form__group">
            <label className="admin-form__label">Виды спорта и ставка для новой карточки</label>
            <div className="admin-inline-sport-prices">
              {data.sports.map((sport) => (
                <div key={sport.id} className="admin-inline-sport-price-row">
                  <label className="admin-form__checkbox">
                    <input name="newInstructorSportIds" type="checkbox" value={sport.id} />
                    <span>{sport.name}</span>
                  </label>
                  <input name={`price_${sport.id}`} type="number" min="0" step="1" className="admin-form__field admin-form__field--narrow" defaultValue={10000} />
                </div>
              ))}
            </div>
          </div>

          <div className="admin-form__group">
            <label className="admin-form__label">Локации для новой карточки</label>
            <div className="admin-inline-sport-prices">
              {data.locations.map((location) => (
                <label key={location.id} className="admin-form__checkbox">
                  <input name="locationIds" type="checkbox" value={location.id} defaultChecked={data.locations.length === 1} />
                  <span>{location.name}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="admin-form__actions">
            <button type="submit" className="admin-form__submit">Создать сотрудника</button>
          </div>
        </form>
      </section>

      <section className="admin-section">
        <form method="get" className="admin-filters">
          <div className="admin-filters__grid">
            <div className="admin-form__group">
              <label className="admin-form__label" htmlFor="staff-query">Поиск</label>
              <input id="staff-query" name="q" className="admin-form__field" defaultValue={params.q ?? ""} placeholder="Имя, телефон или email" />
            </div>
            <div className="admin-form__group">
              <label className="admin-form__label" htmlFor="staff-role-filter">Роль</label>
              <select id="staff-role-filter" name="role" className="admin-form__field" defaultValue={roleFilter}>
                <option value="all">Все роли</option>
                <option value="admin">Администраторы</option>
                <option value="super_admin">Супер-администраторы</option>
                <option value="trainer">Тренеры</option>
              </select>
            </div>
            <div className="admin-form__group">
              <label className="admin-form__label" htmlFor="staff-active-filter">Статус</label>
              <select id="staff-active-filter" name="active" className="admin-form__field" defaultValue={activeFilter}>
                <option value="all">Все</option>
                <option value="active">Активные</option>
                <option value="disabled">Отключенные</option>
              </select>
            </div>
          </div>
          <div className="admin-filters__actions">
            <button type="submit" className="admin-form__submit">Найти</button>
            <Link href="/admin/staff" className="admin-bookings__action-button">Сбросить</Link>
          </div>
        </form>

        <div className="admin-table">
          <table className="admin-table__table">
            <thead>
              <tr className="admin-table__row">
                <th className="admin-table__cell admin-table__cell--head">Сотрудник</th>
                <th className="admin-table__cell admin-table__cell--head">Роль</th>
                <th className="admin-table__cell admin-table__cell--head">Тренер</th>
                <th className="admin-table__cell admin-table__cell--head">Статус</th>
                <th className="admin-table__cell admin-table__cell--head">Создан</th>
                <th className="admin-table__cell admin-table__cell--head">Действия</th>
              </tr>
            </thead>
            <tbody>
              {data.staff.length === 0 ? (
                <tr className="admin-table__row">
                  <td className="admin-table__cell" colSpan={6}>Сотрудники не найдены.</td>
                </tr>
              ) : (
                data.staff.map((row) => {
                  const setupUrl = buildSetupUrl(row, requestOrigin);
                  const canChangeAdminRole = row.role === "admin" || row.role === "super_admin";
                  const roleValue = row.role as AppRole;

                  return (
                    <tr key={row.id} className="admin-table__row">
                      <td className="admin-table__cell">
                        <div className="admin-bookings__cell-title">{row.name}</div>
                        <div className="admin-bookings__cell-sub">{row.email}</div>
                        <div className="admin-bookings__cell-sub">{row.phone}</div>
                      </td>
                      <td className="admin-table__cell">{getRoleLabel(roleValue)}</td>
                      <td className="admin-table__cell">
                        {row.instructorId && row.instructorName ? (
                          <Link href={`/admin/instructors/${row.instructorId}`}>{row.instructorName}</Link>
                        ) : row.role === "trainer" ? (
                          <span className="account-history__message account-history__message--error">Не привязан</span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="admin-table__cell">
                        <span className={`admin-status-badge ${row.active ? "admin-status-badge--active" : "admin-status-badge--inactive"}`}>
                          <span className="admin-status-badge__dot" aria-hidden="true" />
                          {row.active ? "Активен" : "Отключен"}
                        </span>
                        {row.needsPasswordSetup ? (
                          <div className="admin-bookings__cell-sub">Ожидает пароль</div>
                        ) : null}
                      </td>
                      <td className="admin-table__cell">{formatDate(row.createdAtIso)}</td>
                      <td className="admin-table__cell">
                        <div className="admin-bookings__actions">
                          <AdminEditModal triggerLabel="Управлять" title={`Сотрудник: ${row.name}`}>
                            <form action={updateAction} className="admin-form admin-form--panel">
                              <input type="hidden" name="userId" value={row.id} />
                              <div className="admin-form__panel-grid">
                                <div className="admin-form__group">
                                  <label className="admin-form__label">Имя</label>
                                  <input name="name" className="admin-form__field" defaultValue={row.name} required />
                                </div>
                                <div className="admin-form__group">
                                  <label className="admin-form__label">Email</label>
                                  <input name="email" type="email" className="admin-form__field" defaultValue={row.email} required />
                                </div>
                                <div className="admin-form__group">
                                  <label className="admin-form__label">Телефон</label>
                                  <input name="phone" className="admin-form__field" defaultValue={row.phone} required />
                                </div>
                              </div>
                              <div className="admin-form__actions">
                                <button type="submit" className="admin-form__submit">Сохранить данные</button>
                              </div>
                            </form>

                            {setupUrl ? (
                              <div className="admin-form admin-form--panel">
                                <div className="admin-form__group">
                                  <label className="admin-form__label">Ссылка активации</label>
                                  <input className="admin-form__field" value={setupUrl} readOnly />
                                </div>
                                <div className="admin-form__actions">
                                  <a href={setupUrl} target="_blank" rel="noreferrer" className="admin-form__submit">Открыть ссылку</a>
                                </div>
                              </div>
                            ) : null}

                            <form action={resetPasswordAction} className="admin-form admin-form--panel">
                              <input type="hidden" name="userId" value={row.id} />
                              <p className="admin-bookings__cell-sub">Сброс пароля отключит текущий пароль и создаст новую ссылку активации.</p>
                              <div className="admin-form__actions">
                                <button type="submit" className="admin-bookings__action-button">Сбросить пароль</button>
                              </div>
                            </form>

                            <form action={toggleActiveAction} className="admin-form admin-form--panel">
                              <input type="hidden" name="userId" value={row.id} />
                              <input type="hidden" name="active" value={String(!row.active)} />
                              <p className="admin-bookings__cell-sub">
                                Отключенный сотрудник не сможет войти, история бронирований и журнал действий сохраняются.
                              </p>
                              <div className="admin-form__actions">
                                <button type="submit" className={`admin-bookings__action-button${row.active ? " admin-bookings__action-button--danger" : ""}`}>
                                  {row.active ? "Отключить аккаунт" : "Включить аккаунт"}
                                </button>
                              </div>
                            </form>

                            {canChangeAdminRole ? (
                              <form action={changeRoleAction} className="admin-form admin-form--panel">
                                <input type="hidden" name="userId" value={row.id} />
                                <div className="admin-form__group">
                                  <label className="admin-form__label">Роль администратора</label>
                                  <select name="role" className="admin-form__field" defaultValue={row.role}>
                                    <option value="admin">Администратор</option>
                                    <option value="super_admin">Супер-администратор</option>
                                  </select>
                                </div>
                                <div className="admin-form__actions">
                                  <button type="submit" className="admin-form__submit">Изменить роль</button>
                                </div>
                              </form>
                            ) : null}

                            {row.role === "trainer" ? (
                              <form action={relinkTrainerAction} className="admin-form admin-form--panel">
                                <input type="hidden" name="userId" value={row.id} />
                                <div className="admin-form__group">
                                  <label className="admin-form__label">Связанная карточка тренера</label>
                                  <select name="instructorId" className="admin-form__field" defaultValue={row.instructorId ?? ""}>
                                    <option value="">Не привязана</option>
                                    {data.allInstructors.map((instructor) => (
                                      <option key={instructor.id} value={instructor.id}>{instructor.name}</option>
                                    ))}
                                  </select>
                                </div>
                                <div className="admin-form__actions">
                                  <button type="submit" className="admin-form__submit">Обновить привязку</button>
                                </div>
                              </form>
                            ) : null}
                          </AdminEditModal>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </AdminPageShell>
  );
}
