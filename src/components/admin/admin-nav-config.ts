import { canManagePricing, type AppRole } from "@/src/lib/auth/roles";
import { t } from "@/src/lib/i18n";

export interface AdminNavItem {
  href: string;
  label: string;
  superAdminOnly?: boolean;
}

const ALL_ADMIN_NAV_ITEMS: AdminNavItem[] = [
  { href: "/admin", label: t("admin.nav.dashboard") },
  { href: "/admin/calendar", label: t("admin.nav.schedule") },
  { href: "/admin/bookings", label: t("admin.nav.bookings") },
  { href: "/admin/events", label: t("admin.nav.events") },
  { href: "/admin/clients", label: t("admin.nav.clients") },
  { href: "/admin/staff", label: t("admin.nav.staff"), superAdminOnly: true },
  { href: "/admin/instructors", label: t("admin.nav.instructors"), superAdminOnly: true },
  { href: "/admin/courts", label: t("admin.nav.courts"), superAdminOnly: true },
  { href: "/admin/media", label: t("admin.nav.media"), superAdminOnly: true },
  { href: "/admin/settings/telegram", label: "Telegram", superAdminOnly: true },
  { href: "/admin/exceptions", label: t("admin.nav.exceptions"), superAdminOnly: true },
  { href: "/admin/wallet", label: t("admin.nav.wallet"), superAdminOnly: true },
  { href: "/admin/opening-hours", label: t("admin.nav.openingHours"), superAdminOnly: true },
  { href: "/admin/sports", label: t("admin.nav.sports"), superAdminOnly: true },
  { href: "/admin/promo-codes", label: t("admin.nav.promoCodes") },
  { href: "/admin/audit", label: t("admin.nav.audit"), superAdminOnly: true },
];

export function getAdminNavItems(role: AppRole): AdminNavItem[] {
  const scopedItems = canManagePricing(role)
    ? ALL_ADMIN_NAV_ITEMS
    : ALL_ADMIN_NAV_ITEMS.filter((item) => !item.superAdminOnly);

  return [...scopedItems];
}
