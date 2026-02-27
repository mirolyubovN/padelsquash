export interface AdminNavItem {
  href: string;
  label: string;
}

export const adminNavItems: AdminNavItem[] = [
  { href: "/admin", label: "Панель" },
  { href: "/admin/bookings", label: "Бронирования" },
  { href: "/admin/courts", label: "Корты" },
  { href: "/admin/instructors", label: "Тренеры" },
  { href: "/admin/services", label: "Услуги" },
  { href: "/admin/opening-hours", label: "Часы работы" },
  { href: "/admin/pricing/base", label: "Цены (матрица)" },
  { href: "/admin/exceptions", label: "Исключения" },
];
