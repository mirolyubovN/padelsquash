import { canManagePricing, type AppRole } from "@/src/lib/auth/roles";

export interface AdminNavItem {
  href: string;
  label: string;
  pricingSensitive?: boolean;
}

const ALL_ADMIN_NAV_ITEMS: AdminNavItem[] = [
  { href: "/admin", label: "Дашборд" },
  { href: "/admin/calendar", label: "Расписание" },
  { href: "/admin/bookings", label: "Бронирования" },
  { href: "/admin/bookings/create", label: "+ Создать бронь" },
  { href: "/admin/instructors", label: "Тренеры" },
  { href: "/admin/courts", label: "Корты" },
  { href: "/admin/exceptions", label: "Исключения" },
  { href: "/admin/clients", label: "Клиенты" },
  { href: "/admin/wallet", label: "Кошелёк" },
  { href: "/admin/opening-hours", label: "Часы работы", pricingSensitive: true },
  { href: "/admin/sports", label: "Виды спорта", pricingSensitive: true },
  { href: "/admin/audit", label: "Журнал действий" },
];

export function getAdminNavItems(role: AppRole): AdminNavItem[] {
  const scopedItems = canManagePricing(role)
    ? ALL_ADMIN_NAV_ITEMS
    : ALL_ADMIN_NAV_ITEMS.filter((item) => !item.pricingSensitive);

  return [...scopedItems];
}
