export type AppRole = "customer" | "trainer" | "admin" | "super_admin";

const LEGACY_ROLE_ALIASES: Record<string, AppRole> = {
  coach: "trainer",
};

export function normalizeRole(role: string | null | undefined): AppRole {
  if (!role) {
    return "customer";
  }

  if (role === "customer" || role === "trainer" || role === "admin" || role === "super_admin") {
    return role;
  }

  return LEGACY_ROLE_ALIASES[role] ?? "customer";
}

export function isSuperAdminRole(role: AppRole): role is "super_admin" {
  return role === "super_admin";
}

export function isAdminRole(role: AppRole): role is "admin" | "super_admin" {
  return role === "admin" || role === "super_admin";
}

export function isTrainerRole(role: AppRole): role is "trainer" {
  return role === "trainer";
}

export function canAccessAdminPortal(role: AppRole): boolean {
  return isAdminRole(role);
}

export function canAccessTrainerPortal(role: AppRole): boolean {
  return isTrainerRole(role);
}

export function canManagePricing(role: AppRole): boolean {
  return isSuperAdminRole(role);
}

export function canViewRevenue(role: AppRole): boolean {
  return isSuperAdminRole(role);
}

export function getRoleLabel(role: AppRole): string {
  if (role === "super_admin") return "Супер-админ";
  if (role === "admin") return "Администратор";
  if (role === "trainer") return "Тренер";
  return "Клиент";
}
