"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { adminNavItems } from "@/src/components/admin/admin-nav-config";

interface AdminShellFrameProps {
  email: string;
  logoutAction: (formData: FormData) => void | Promise<void>;
  children: React.ReactNode;
}

export function AdminShellFrame({ email, logoutAction, children }: AdminShellFrameProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="admin-shell">
      <div className="admin-shell__toolbar">
        <div className="admin-shell__identity">
          <button
            type="button"
            className="admin-shell__menu-button"
            onClick={() => setMobileOpen((value) => !value)}
            aria-expanded={mobileOpen}
            aria-controls="admin-sidebar"
            aria-label={mobileOpen ? "Закрыть меню админ-панели" : "Открыть меню админ-панели"}
          >
            Меню
          </button>
          <span className="admin-shell__badge">admin</span>
          <span className="admin-shell__email">{email}</span>
        </div>
        <form action={logoutAction}>
          <button type="submit" className="admin-shell__logout">
            Выйти
          </button>
        </form>
      </div>

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
          <div className="admin-shell__sidebar-head">
            <p className="admin-shell__sidebar-title">Навигация</p>
            <p className="admin-shell__sidebar-subtitle">Разделы управления клубом</p>
          </div>
          <nav className="admin-shell__nav" aria-label="Разделы админ-панели">
            {adminNavItems.map((item) => {
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
        </aside>

        <main className="admin-shell__main">{children}</main>
      </div>
    </div>
  );
}
