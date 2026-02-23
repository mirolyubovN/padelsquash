import Link from "next/link";

interface AdminPageShellProps {
  title: string;
  description: string;
  actions?: Array<{ href: string; label: string }>;
  children: React.ReactNode;
}

export function AdminPageShell({
  title,
  description,
  actions = [],
  children,
}: AdminPageShellProps) {
  return (
    <section className="admin-page">
      <div className="admin-page__header">
        <div>
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
