import Link from "next/link";
import { PageHero } from "@/src/components/page-hero";

export const metadata = {
  title: "Доступ запрещен | Padel & Squash KZ",
};

export default function UnauthorizedPage() {
  return (
    <div className="login-page">
      <PageHero
        eyebrow="403"
        title="Недостаточно прав"
        description="У вашей учетной записи нет доступа к этому разделу. Обратитесь к администратору."
      />
      <section className="auth-panel">
        <div className="auth-panel__box">
          <div className="auth-panel__links">
            <Link href="/" className="auth-panel__link">
              На главную
            </Link>
            <Link href="/login" className="auth-panel__link">
              Войти под другой учетной записью
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
