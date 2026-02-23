import Link from "next/link";
import { navItems, siteConfig } from "@/src/lib/content/site-data";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-shell site-footer__inner">
        <div className="site-footer__brand">
          <div className="site-footer__title">{siteConfig.name}</div>
          <p className="site-footer__text">
            Центр падела и сквоша в {siteConfig.city}, {siteConfig.country}.
          </p>
          <p className="site-footer__text">
            Часовой пояс центра: {siteConfig.timezone}. Цены отображаются в тенге.
          </p>
        </div>

        <div className="site-footer__links">
          <div className="site-footer__heading">Разделы</div>
          <ul className="site-footer__list">
            {navItems.map((item) => (
              <li key={item.href} className="site-footer__list-item">
                <Link href={item.href} className="site-footer__link">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="site-footer__contacts">
          <div className="site-footer__heading">Контакты</div>
          <p className="site-footer__text">{siteConfig.address}</p>
          <p className="site-footer__text">{siteConfig.phone}</p>
          <p className="site-footer__text">{siteConfig.email}</p>
          <div className="site-footer__admin-links">
            <Link href="/account" className="site-footer__link">
              Личный кабинет
            </Link>
            <Link href="/admin" className="site-footer__link">
              Админ-панель
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
