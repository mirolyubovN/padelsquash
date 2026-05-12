import Link from "next/link";
import { AuthPanel, AuthPanelLinks } from "@/src/components/auth/auth-panel";
import { PageHero } from "@/src/components/page-hero";
import { buildPageMetadata } from "@/src/lib/seo/metadata";

export const metadata = buildPageMetadata({
	title: "Доступ запрещен | Racket Community Kst",
	description: "Страница ограничения доступа к разделу сайта. Обратитесь к администратору, если считаете это ошибкой.",
	path: "/unauthorized",
	noIndex: true,
});

export default function UnauthorizedPage() {
	return (
		<div className="login-page">
			<PageHero
				eyebrow="403"
				title="Недостаточно прав"
				description="У вашей учетной записи нет доступа к этому разделу. Обратитесь к администратору."
			/>
			<AuthPanel title="Доступ ограничен" titleId="unauthorized-title" showBrand={false}>
				<AuthPanelLinks>
					<Link href="/login" className="auth-panel__link">
						Войти под другой учетной записью
					</Link>
				</AuthPanelLinks>
			</AuthPanel>
		</div>
	);
}
