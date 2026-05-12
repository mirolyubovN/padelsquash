import Link from "next/link";
import { AuthPanel, AuthPanelLinks } from "@/src/components/auth/auth-panel";
import { PageHero } from "@/src/components/page-hero";
import { ForgotPasswordForm } from "@/src/components/auth/forgot-password-form";
import { buildPageMetadata } from "@/src/lib/seo/metadata";

export const metadata = buildPageMetadata({
	title: "Сброс пароля | Racket Community Kst",
	description: "Страница восстановления доступа к аккаунту: оставьте email и получите инструкции для связи с администратором клуба.",
	path: "/forgot-password",
	noIndex: true,
});

export default async function ForgotPasswordPage({
	searchParams,
}: {
	searchParams: Promise<{ next?: string }>;
}) {
	const params = await searchParams;
	const next = typeof params.next === "string" && params.next.startsWith("/") ? params.next : "/login";

	return (
		<div className="login-page">
			<PageHero
				eyebrow="Восстановление доступа"
				title="Сброс пароля"
				description="Оставьте email, и мы подскажем, как восстановить доступ к вашему аккаунту."
			/>

			<AuthPanel title="Восстановление пароля" titleId="forgot-password-title" brandSubtitle="Помощь с доступом">
				<p className="auth-panel__hint">
					Используйте форму ниже, и мы направим вас к администратору клуба.
				</p>

				<ForgotPasswordForm />

				<AuthPanelLinks>
					<Link href={`/login?next=${encodeURIComponent(next)}`} className="auth-panel__link">
						Вернуться ко входу
					</Link>
				</AuthPanelLinks>
			</AuthPanel>
		</div>
	);
}
