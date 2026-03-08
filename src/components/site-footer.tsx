import Link from "next/link";
import { auth } from "@/auth";
import { getPublicPortalLink } from "@/src/lib/auth/public-nav";
import { navItems, siteConfig } from "@/src/lib/content/site-data";

function FooterIconInstagram() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

function FooterIconTelegram() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M22 2L11 13" />
      <path d="M22 2L15 22l-4-9-9-4 20-7z" />
    </svg>
  );
}

function FooterIconWhatsApp() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  );
}

function getFooterSocialIcon(label: string) {
  if (label === "Instagram") return <FooterIconInstagram />;
  if (label === "Telegram") return <FooterIconTelegram />;
  if (label === "WhatsApp") return <FooterIconWhatsApp />;
  return <span aria-hidden="true">{label.slice(0, 2).toUpperCase()}</span>;
}

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
                <span className="site-footer__social-badge" aria-hidden="true">
                  {getFooterSocialIcon(link.label)}
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
          © 2026 {siteConfig.name}. Все права защищены.
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
