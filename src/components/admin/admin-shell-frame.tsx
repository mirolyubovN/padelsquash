"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { getAdminNavItems } from "@/src/components/admin/admin-nav-config";
import { getRoleLabel, type AppRole } from "@/src/lib/auth/roles";

interface AdminShellFrameProps {
  email: string;
  role: AppRole;
  logoutAction: (formData: FormData) => void | Promise<void>;
  children: React.ReactNode;
}

export function AdminShellFrame({ email, role, logoutAction, children }: AdminShellFrameProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const navItems = getAdminNavItems(role);

  return (
    <div className="admin-shell">
      <div className="admin-shell__layout">
        {mobileOpen ? (
          <button
            type="button"
            className="admin-shell__backdrop"
            onClick={() => setMobileOpen(false)}
            aria-label="Закрыть меню"
          />
        ) : null}

        <aside
          id="admin-sidebar"
          className={`admin-shell__sidebar${mobileOpen ? " admin-shell__sidebar--open" : ""}`}
        >
          <div className="admin-shell__sidebar-brand">
            <span className="admin-shell__brand-mark">PS</span>
            <span className="admin-shell__brand-name">Admin</span>
          </div>

          <nav className="admin-shell__nav" aria-label="Разделы админ-панели">
            {navItems.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== "/admin" && pathname.startsWith(`${item.href}/`));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`admin-shell__nav-link${isActive ? " admin-shell__nav-link--active" : ""}`}
                  onClick={() => setMobileOpen(false)}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="admin-shell__sidebar-footer">
            <div className="admin-shell__identity">
              <span className="admin-shell__badge">{getRoleLabel(role)}</span>
              <span className="admin-shell__email">{email}</span>
            </div>
            <form action={logoutAction}>
              <button type="submit" className="admin-shell__logout">
                Выйти
              </button>
            </form>
          </div>
        </aside>

        <div className="admin-shell__main-col">
          <div className="admin-shell__toolbar">
            <button
              type="button"
              className="admin-shell__menu-button"
              onClick={() => setMobileOpen((v) => !v)}
              aria-expanded={mobileOpen}
              aria-controls="admin-sidebar"
              aria-label={mobileOpen ? "Закрыть меню" : "Открыть меню"}
            >
              <span className="admin-shell__menu-icon">
                <span className="admin-shell__menu-icon-bar" />
                <span className="admin-shell__menu-icon-bar" />
                <span className="admin-shell__menu-icon-bar" />
              </span>
              Меню
            </button>
            <div className="admin-shell__toolbar-identity">
              <span className="admin-shell__badge">{getRoleLabel(role)}</span>
              <span className="admin-shell__email">{email}</span>
            </div>
            <form action={logoutAction}>
              <button type="submit" className="admin-shell__logout">
                Выйти
              </button>
            </form>
          </div>

          <main className="admin-shell__main">{children}</main>
        </div>
      </div>
    </div>
  );
}
