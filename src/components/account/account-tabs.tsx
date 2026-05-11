import Link from "next/link";
import { t } from "@/src/lib/i18n";

interface AccountTabsProps {
  active: "profile" | "bookings";
}

export function AccountTabs({ active }: AccountTabsProps) {
  return (
    <nav className="account-tabs" aria-label={t("account.tabs.ariaLabel")}>
      <Link
        href="/account"
        className={`account-tabs__link${active === "profile" ? " account-tabs__link--active" : ""}`}
      >
        {t("account.tabs.profile")}
      </Link>
      <Link
        href="/account/bookings"
        className={`account-tabs__link${active === "bookings" ? " account-tabs__link--active" : ""}`}
      >
        {t("account.tabs.bookings")}
      </Link>
    </nav>
  );
}
