import { canManagePricing, type AppRole } from "@/src/lib/auth/roles";

export interface AdminNavItem {
  href: string;
  label: string;
  pricingSensitive?: boolean;
}

const ALL_ADMIN_NAV_ITEMS: AdminNavItem[] = [
  { href: "/admin/calendar", label: "Расписание" },
  { href: "/admin/bookings", label: "Бронирования" },
  { href: "/admin/bookings/create", label: "+ Создать бронь" },
  { href: "/admin/instructors", label: "Тренеры" },
  { href: "/admin/courts", label: "Корты" },
  { href: "/admin/exceptions", label: "Исключения" },
  { href: "/admin/wallet", label: "Клиенты и баланс" },
  { href: "/admin", label: "Дашборд" },
  { href: "/admin/opening-hours", label: "Часы работы", pricingSensitive: true },
  { href: "/admin/sports", label: "Виды спорта", pricingSensitive: true },
];

export function getAdminNavItems(role: AppRole): AdminNavItem[] {
  if (canManagePricing(role)) {
    return ALL_ADMIN_NAV_ITEMS;
  }

  return ALL_ADMIN_NAV_ITEMS.filter((item) => !item.pricingSensitive);
}
