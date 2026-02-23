import Link from "next/link";
import { AdminPageShell } from "@/src/components/admin/admin-page-shell";

const adminSections = [
  { href: "/admin/courts", label: "Корты" },
  { href: "/admin/instructors", label: "Тренеры" },
  { href: "/admin/services", label: "Услуги" },
  { href: "/admin/opening-hours", label: "Часы работы" },
  { href: "/admin/exceptions", label: "Исключения" },
  { href: "/admin/pricing/base", label: "Цены (матрица)" },
  { href: "/admin/pricing/rules", label: "Периоды цен" },
  { href: "/admin/bookings", label: "Бронирования" },
];

export default function AdminIndexPage() {
  return (
    <AdminPageShell
      title="Панель управления"
      description="Все разделы управления расписанием, ценами и бронированиями размещаются внутри приложения без внешней CMS."
    >
      <div className="admin-link-grid">
        {adminSections.map((section) => (
          <Link key={section.href} href={section.href} className="admin-link-grid__item">
            {section.label}
          </Link>
        ))}
      </div>
    </AdminPageShell>
  );
}
