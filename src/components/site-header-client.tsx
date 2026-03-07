"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { navItems, siteConfig } from "@/src/lib/content/site-data";

interface SiteHeaderClientProps {
  portalLink: {
    href: string;
    label: string;
  };
  logoutAction?: (fd: FormData) => void | Promise<void>;
  accountLink?: { href: string; label: string };
}

export function SiteHeaderClient({ portalLink, logoutAction, accountLink }: SiteHeaderClientProps) {
  const pathname = usePathname();
  const [mobileMenuPath, setMobileMenuPath] = useState<string | null>(null);
  const isMobileMenuOpen = mobileMenuPath === pathname;

  useEffect(() => {
    if (!isMobileMenuOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isMobileMenuOpen]);

  useEffect(() => {
    if (!isMobileMenuOpen) {
      return;
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMobileMenuPath(null);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isMobileMenuOpen]);

  return (
    <header className="site-header">
      <div className="site-shell site-header__inner">
        <Link href="/" className="site-header__brand">
          <span className="site-header__brand-mark">PS</span>
          <span className="site-header__brand-text">{siteConfig.name}</span>
        </Link>

        <nav className="site-header__nav" aria-label="Основная навигация">
          <ul className="site-header__nav-list">
            {navItems.map((item) => (
              <li key={item.href} className="site-header__nav-item">
                <Link href={item.href} className="site-header__nav-link">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="site-header__actions">
          {accountLink ? (
            <Link href={accountLink.href} className="site-header__portal-link">
              {accountLink.label}
            </Link>
          ) : null}
          <Link href={portalLink.href} className="site-header__portal-link">
            {portalLink.label}
          </Link>
          {logoutAction ? (
            <form action={logoutAction}>
              <button type="submit" className="site-header__logout-button">
                Выйти
              </button>
            </form>
          ) : null}
          <Link href="/book" className="site-header__cta">
            Забронировать
          </Link>
        </div>

        <button
          type="button"
          className="site-header__menu-button"
          aria-label={isMobileMenuOpen ? "Закрыть меню" : "Открыть меню"}
          aria-controls="site-mobile-nav"
          aria-expanded={isMobileMenuOpen}
          onClick={() => setMobileMenuPath(isMobileMenuOpen ? null : pathname)}
        >
          <span className="site-header__menu-icon" aria-hidden="true">
            <span className="site-header__menu-icon-bar" />
            <span className="site-header__menu-icon-bar" />
            <span className="site-header__menu-icon-bar" />
          </span>
          <span>Меню</span>
        </button>
      </div>

      {isMobileMenuOpen ? (
        <div
          className="site-header__mobile-overlay"
          role="presentation"
          onClick={() => setMobileMenuPath(null)}
        >
          <div
            id="site-mobile-nav"
            className="site-header__mobile-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Мобильная навигация"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="site-header__mobile-head">
              <div className="site-header__mobile-title">Навигация</div>
              <button
                type="button"
                className="site-header__mobile-close"
                onClick={() => setMobileMenuPath(null)}
                aria-label="Закрыть меню"
              >
                Закрыть
              </button>
            </div>

            <nav aria-label="Мобильная навигация">
              <ul className="site-header__mobile-list">
                {navItems.map((item) => (
                  <li key={item.href} className="site-header__mobile-item">
                    <Link
                      href={item.href}
                      className="site-header__mobile-link"
                      onClick={() => setMobileMenuPath(null)}
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            <div className="site-header__mobile-actions">
              {accountLink ? (
                <Link
                  href={accountLink.href}
                  className="site-header__mobile-portal-link"
                  onClick={() => setMobileMenuPath(null)}
                >
                  {accountLink.label}
                </Link>
              ) : null}
              <Link
                href={portalLink.href}
                className="site-header__mobile-portal-link"
                onClick={() => setMobileMenuPath(null)}
              >
                {portalLink.label}
              </Link>
              {logoutAction ? (
                <form action={logoutAction}>
                  <button type="submit" className="site-header__mobile-logout-button">
                    Выйти
                  </button>
                </form>
              ) : null}
              <Link href="/book" className="site-header__mobile-cta" onClick={() => setMobileMenuPath(null)}>
                Забронировать
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}
