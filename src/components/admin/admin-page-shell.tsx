import Link from "next/link";

interface AdminPageShellProps {
  title: string;
  description: string;
  actions?: Array<{ href: string; label: string }>;
  breadcrumbs?: Array<{ label: string; href?: string }>;
  children: React.ReactNode;
}

export function AdminPageShell({
  title,
  description,
  actions = [],
  breadcrumbs = [],
  children,
}: AdminPageShellProps) {
  return (
    <section className="admin-page">
      <div className="admin-page__header">
        <div>
          {breadcrumbs.length > 0 ? (
            <nav className="admin-page__breadcrumbs" aria-label="Навигация по разделу">
              {breadcrumbs.map((crumb, index) => (
                <span key={`${crumb.label}-${index}`} className="admin-page__breadcrumb-item">
                  {crumb.href ? (
                    <Link href={crumb.href} className="admin-page__breadcrumb-link">
                      {crumb.label}
                    </Link>
                  ) : (
                    <span className="admin-page__breadcrumb-current">{crumb.label}</span>
                  )}
                  {index < breadcrumbs.length - 1 ? (
                    <span className="admin-page__breadcrumb-sep" aria-hidden="true">
                      /
                    </span>
                  ) : null}
                </span>
              ))}
            </nav>
          ) : null}
          <p className="admin-page__eyebrow">Админ-панель</p>
          <h1 className="admin-page__title">{title}</h1>
          <p className="admin-page__description">{description}</p>
        </div>
        {actions.length > 0 ? (
          <div className="admin-page__actions">
            {actions.map((action) => (
              <Link key={action.href} href={action.href} className="admin-page__action-link">
                {action.label}
              </Link>
            ))}
          </div>
        ) : null}
      </div>
      <div className="admin-page__content">{children}</div>
    </section>
  );
}
