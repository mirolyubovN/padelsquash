import { canManagePricing, type AppRole } from "@/src/lib/auth/roles";

export interface AdminNavItem {
  href: string;
  label: string;
  superAdminOnly?: boolean;
}

const ALL_ADMIN_NAV_ITEMS: AdminNavItem[] = [
  { href: "/admin", label: "Дашборд" },
  { href: "/admin/calendar", label: "Расписание" },
  { href: "/admin/bookings", label: "Бронирования" },
  { href: "/admin/events", label: "События" },
  { href: "/admin/clients", label: "Клиенты" },
  { href: "/admin/staff", label: "Сотрудники", superAdminOnly: true },
  { href: "/admin/instructors", label: "Тренеры", superAdminOnly: true },
  { href: "/admin/courts", label: "Корты", superAdminOnly: true },
  { href: "/admin/media", label: "Медиа", superAdminOnly: true },
  { href: "/admin/settings/telegram", label: "Telegram", superAdminOnly: true },
  { href: "/admin/exceptions", label: "Исключения", superAdminOnly: true },
  { href: "/admin/wallet", label: "Кошелёк", superAdminOnly: true },
  { href: "/admin/opening-hours", label: "Часы работы", superAdminOnly: true },
  { href: "/admin/sports", label: "Виды спорта", superAdminOnly: true },
  { href: "/admin/audit", label: "Журнал действий", superAdminOnly: true },
];

export function getAdminNavItems(role: AppRole): AdminNavItem[] {
  const scopedItems = canManagePricing(role)
    ? ALL_ADMIN_NAV_ITEMS
    : ALL_ADMIN_NAV_ITEMS.filter((item) => !item.superAdminOnly);

  return [...scopedItems];
}
