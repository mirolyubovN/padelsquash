import Link from "next/link";
import { navItems, siteConfig } from "@/src/lib/content/site-data";

export function SiteHeader() {
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

        <Link href="/book" className="site-header__cta">
          Забронировать
        </Link>
      </div>
    </header>
  );
}
