import type { ReactNode } from "react";

interface AuthPanelProps {
  title: string;
  titleId: string;
  children: ReactNode;
  brandSubtitle?: string;
  showBrand?: boolean;
}

interface AuthPanelBrandProps {
  subtitle: string;
}

interface AuthPanelLinksProps {
  children: ReactNode;
}

export function AuthPanel({
  title,
  titleId,
  children,
  brandSubtitle = "Личный кабинет и бронирования",
  showBrand = true,
}: AuthPanelProps) {
  return (
    <section className="auth-panel" aria-labelledby={titleId}>
      <div className="auth-panel__box">
        {showBrand ? <AuthPanelBrand subtitle={brandSubtitle} /> : null}
        <h2 id={titleId} className="auth-panel__title">
          {title}
        </h2>
        {children}
      </div>
    </section>
  );
}

export function AuthPanelBrand({ subtitle }: AuthPanelBrandProps) {
  return (
    <div className="auth-panel__brand" aria-hidden="true">
      <span className="auth-panel__brand-mark">PS</span>
      <div>
        <p className="auth-panel__brand-title">Padel & Squash KZ</p>
        <p className="auth-panel__brand-subtitle">{subtitle}</p>
      </div>
    </div>
  );
}

export function AuthPanelLinks({ children }: AuthPanelLinksProps) {
  return <div className="auth-panel__links">{children}</div>;
}
