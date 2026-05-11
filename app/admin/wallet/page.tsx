import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { AdminPageShell } from "@/src/components/admin/admin-page-shell";
import { assertAdmin, assertSuperAdmin } from "@/src/lib/auth/guards";
import { canManagePricing } from "@/src/lib/auth/roles";
import { formatMoneyKzt } from "@/src/lib/format/money";
import { t } from "@/src/lib/i18n";
import { buildPageMetadata } from "@/src/lib/seo/metadata";
import { getAdminWalletPageData } from "@/src/lib/wallet/queries";
import { adjustUserWalletByEmail, saveWalletBonusSettings } from "@/src/lib/wallet/service";

export const metadata = buildPageMetadata({
  title: "Админ: кошелёк | Padel & Squash KZ",
  description: "Пополнение и списание баланса, история операций и настройки бонусной программы.",
  path: "/admin/wallet",
  noIndex: true,
});

export const dynamic = "force-dynamic";

function getWalletTypeLabel(type: string): string {
  if (type === "topup") return t("admin.wallet.transaction.topup");
  if (type === "bonus") return t("admin.wallet.transaction.bonus");
  if (type === "admin_credit") return t("admin.wallet.transaction.adminCredit");
  if (type === "admin_debit") return t("admin.wallet.transaction.adminDebit");
  if (type === "booking_charge") return t("admin.wallet.transaction.bookingCharge");
  if (type === "booking_refund") return t("admin.wallet.transaction.bookingRefund");
  if (type === "event_charge") return t("admin.wallet.transaction.eventCharge");
  if (type === "event_refund") return t("admin.wallet.transaction.eventRefund");
  return type;
}

export default async function AdminWalletPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string; customerEmail?: string }>;
}) {
  const session = await assertAdmin();
  const params = await searchParams;
  const data = await getAdminWalletPageData(50);
  const canManageBonusProgram = canManagePricing(session.user.role);
  const prefilledEmail = params.customerEmail?.trim().toLowerCase() ?? "";

  const successMessage =
    params.success === "adjusted" ? t("admin.wallet.success.adjusted") : params.success === "bonus_saved" ? t("admin.wallet.success.bonusSaved") : null;
  const errorMessage =
    params.error === "adjust_failed" ? t("admin.wallet.error.adjustFailed") : params.error === "bonus_failed" ? t("admin.wallet.error.bonusFailed") : null;

  async function adjustBalanceAction(formData: FormData) {
    "use server";
    const actionSession = await assertAdmin();
    const customerEmail = String(formData.get("customerEmail") ?? "").trim();
    const amountKzt = Number(formData.get("amountKzt") ?? 0);
    const direction = String(formData.get("direction") ?? "credit");
    const note = String(formData.get("note") ?? "").trim() || undefined;
    try {
      await adjustUserWalletByEmail({
        customerEmail,
        amountKzt,
        direction: direction === "debit" ? "debit" : "credit",
        actorUserId: actionSession.user.id,
        note,
      });
    } catch {
      redirect(`/admin/wallet?error=adjust_failed&customerEmail=${encodeURIComponent(customerEmail.toLowerCase())}`);
    }
    revalidatePath("/admin/wallet");
    revalidatePath("/account");
    redirect(`/admin/wallet?success=adjusted&customerEmail=${encodeURIComponent(customerEmail.toLowerCase())}`);
  }

  async function saveBonusAction(formData: FormData) {
    "use server";
    await assertSuperAdmin();
    try {
      await saveWalletBonusSettings({
        thresholdKzt: Number(formData.get("thresholdKzt") ?? 0),
        bonusPercent: Number(formData.get("bonusPercent") ?? 0),
        active: String(formData.get("active") ?? "") === "on",
      });
    } catch {
      redirect("/admin/wallet?error=bonus_failed");
    }
    revalidatePath("/admin/wallet");
    redirect("/admin/wallet?success=bonus_saved");
  }

  return (
    <AdminPageShell
      title={t("admin.wallet.title")}
      description={t("admin.wallet.description")}
    >
      {errorMessage ? (
        <p className="account-history__message account-history__message--error" role="alert">{errorMessage}</p>
      ) : null}
      {successMessage ? (
        <p className="account-history__message account-history__message--success" role="status">{successMessage}</p>
      ) : null}

      <section className="admin-section" id="wallet-adjustment">
        <div className="admin-section__head">
          <h2 className="admin-section__title">{t("admin.wallet.adjust.title")}</h2>
          <p className="admin-section__description">
            {t("admin.wallet.adjust.description")}
          </p>
        </div>
        <form action={adjustBalanceAction} className="admin-form admin-form--panel">
          <div className="admin-form__panel-grid">
            <div className="admin-form__group">
              <label className="admin-form__label" htmlFor="wallet-customer-email">{t("admin.common.customerEmail")}</label>
              <input
                id="wallet-customer-email"
                name="customerEmail"
                type="email"
                className="admin-form__field"
                defaultValue={prefilledEmail}
                required
              />
            </div>
            <div className="admin-form__group">
              <label className="admin-form__label" htmlFor="wallet-amount-kzt">{t("admin.common.amountKzt")}</label>
              <input id="wallet-amount-kzt" name="amountKzt" type="number" min="1" step="1" className="admin-form__field" required />
            </div>
            <div className="admin-form__group">
              <label className="admin-form__label" htmlFor="wallet-direction">{t("admin.common.action")}</label>
              <select id="wallet-direction" name="direction" className="admin-form__field" defaultValue="credit">
                <option value="credit">{t("admin.common.credit")}</option>
                <option value="debit">{t("admin.common.debit")}</option>
              </select>
            </div>
            <div className="admin-form__group">
              <label className="admin-form__label" htmlFor="wallet-note">{t("admin.common.comment")}</label>
              <input id="wallet-note" name="note" className="admin-form__field" placeholder={t("admin.common.notePlaceholder")} />
            </div>
          </div>
          <div className="admin-form__actions">
            <button type="submit" className="admin-form__submit">{t("admin.common.runOperation")}</button>
          </div>
        </form>
      </section>

      {canManageBonusProgram ? (
        <section className="admin-section">
          <div className="admin-section__head">
            <h2 className="admin-section__title">{t("admin.wallet.bonus.title")}</h2>
            <p className="admin-section__description">
              {t("admin.wallet.bonus.description")}
            </p>
          </div>
          <form action={saveBonusAction} className="admin-form admin-form--panel">
            <div className="admin-form__panel-grid">
              <div className="admin-form__group">
                <label className="admin-form__label" htmlFor="wallet-threshold">{t("admin.wallet.bonus.thresholdLabel")}</label>
                <input id="wallet-threshold" name="thresholdKzt" type="number" min="1" step="1" defaultValue={data.bonusSettings.thresholdKzt} className="admin-form__field" required />
              </div>
              <div className="admin-form__group">
                <label className="admin-form__label" htmlFor="wallet-bonus-percent">{t("admin.wallet.bonus.percentLabel")}</label>
                <input id="wallet-bonus-percent" name="bonusPercent" type="number" min="0" max="100" step="1" defaultValue={data.bonusSettings.bonusPercent} className="admin-form__field" required />
              </div>
              <div className="admin-form__group">
                <label className="admin-form__checkbox">
                  <input name="active" type="checkbox" defaultChecked={data.bonusSettings.active} />
                  <span>{t("admin.wallet.bonus.activeLabel")}</span>
                </label>
              </div>
            </div>
            <div className="admin-form__actions">
              <button type="submit" className="admin-form__submit">{t("admin.wallet.bonus.saveSettings")}</button>
            </div>
          </form>
        </section>
      ) : null}

      <section className="admin-section">
        <div className="admin-section__head">
          <h2 className="admin-section__title">{t("admin.wallet.transactions.title")}</h2>
          <p className="admin-section__description">{t("admin.wallet.transactions.description")}</p>
        </div>
        <div className="admin-table">
          <table className="admin-table__table">
            <thead>
              <tr className="admin-table__row">
                <th className="admin-table__cell admin-table__cell--head">{t("admin.common.client")}</th>
                <th className="admin-table__cell admin-table__cell--head">{t("admin.wallet.table.operation")}</th>
                <th className="admin-table__cell admin-table__cell--head">{t("admin.common.amount")}</th>
                <th className="admin-table__cell admin-table__cell--head">{t("admin.wallet.table.balanceAfter")}</th>
                <th className="admin-table__cell admin-table__cell--head">{t("admin.common.comment")}</th>
              </tr>
            </thead>
            <tbody>
              {data.transactions.length === 0 ? (
                <tr className="admin-table__row">
                  <td className="admin-table__cell" colSpan={5}>{t("admin.wallet.empty")}</td>
                </tr>
              ) : (
                data.transactions.map((row) => (
                  <tr key={row.id} className="admin-table__row">
                    <td className="admin-table__cell">
                      <div>{row.userName ?? t("admin.common.client")}</div>
                      <div className="admin-bookings__cell-sub">{row.userEmail ?? "—"}</div>
                    </td>
                    <td className="admin-table__cell">
                      <div>{getWalletTypeLabel(row.type)}</div>
                      {row.actorName ? <div className="admin-bookings__cell-sub">{t("admin.wallet.table.actor", { name: row.actorName })}</div> : null}
                    </td>
                    <td className="admin-table__cell">
                      {row.amountKzt > 0 ? "+" : ""}
                      {formatMoneyKzt(row.amountKzt)}
                    </td>
                    <td className="admin-table__cell">{formatMoneyKzt(row.balanceAfterKzt)}</td>
                    <td className="admin-table__cell">
                      {row.note ?? "—"}
                      {row.bookingId ? <div className="admin-bookings__cell-sub">{t("admin.wallet.table.booking", { id: row.bookingId })}</div> : null}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </AdminPageShell>
  );
}
