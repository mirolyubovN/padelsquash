import { canManagePricing, type AppRole } from "@/src/lib/auth/roles";

export interface AdminNavItem {
  href: string;
  label: string;
  pricingSensitive?: boolean;
}

const ALL_ADMIN_NAV_ITEMS: AdminNavItem[] = [
  { href: "/admin", label: "Панель" },
  { href: "/admin/bookings", label: "Бронирования" },
  { href: "/admin/courts", label: "Корты" },
  { href: "/admin/sports", label: "Виды спорта", pricingSensitive: true },
  { href: "/admin/instructors", label: "Тренеры" },
  { href: "/admin/services", label: "Услуги" },
  { href: "/admin/opening-hours", label: "Часы работы" },
  { href: "/admin/pricing/base", label: "Цены (матрица)", pricingSensitive: true },
  { href: "/admin/pricing/rules", label: "Периоды цен", pricingSensitive: true },
  { href: "/admin/exceptions", label: "Исключения" },
];

export function getAdminNavItems(role: AppRole): AdminNavItem[] {
  if (canManagePricing(role)) {
    return ALL_ADMIN_NAV_ITEMS;
  }

  return ALL_ADMIN_NAV_ITEMS.filter((item) => !item.pricingSensitive);
}
