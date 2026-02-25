import Link from "next/link";
import { auth } from "@/auth";
import { getPublicPortalLink } from "@/src/lib/auth/public-nav";
import { navItems, siteConfig } from "@/src/lib/content/site-data";

export async function SiteFooter() {
  const session = await auth();
  const portalLink = getPublicPortalLink(session);

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
          <div className="site-footer__socials">
            {siteConfig.socialLinks.map((link) => (
              <Link key={link.label} href={link.href} className="site-footer__social-link" target="_blank" rel="noreferrer">
                <span className="site-footer__social-icon" aria-hidden="true">
                  {link.label.slice(0, 2).toUpperCase()}
                </span>
                <span>{link.label}</span>
              </Link>
            ))}
          </div>
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
          <div className="site-footer__portal-links">
            <Link href={portalLink.href} className="site-footer__link">
              {portalLink.label}
            </Link>
          </div>
        </div>
      </div>
      <div className="site-shell site-footer__bottom">
        <p className="site-footer__copyright">
          © 2026 {siteConfig.name}. Демо-версия публичного сайта.
        </p>
        <div className="site-footer__legal-links">
          {siteConfig.legalLinks.map((link) => (
            <Link key={link.label} href={link.href} className="site-footer__link">
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </footer>
  );
}
