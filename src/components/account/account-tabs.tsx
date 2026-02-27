import Link from "next/link";

interface AccountTabsProps {
  active: "profile" | "bookings";
}

export function AccountTabs({ active }: AccountTabsProps) {
  return (
    <nav className="account-tabs" aria-label="Разделы личного кабинета">
      <Link
        href="/account"
        className={`account-tabs__link${active === "profile" ? " account-tabs__link--active" : ""}`}
      >
        Профиль
      </Link>
      <Link
        href="/account/bookings"
        className={`account-tabs__link${active === "bookings" ? " account-tabs__link--active" : ""}`}
      >
        Мои бронирования
      </Link>
    </nav>
  );
}
