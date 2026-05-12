import { PageHero } from "@/src/components/page-hero";
import { AuthPanel } from "@/src/components/auth/auth-panel";
import { RegisterForm } from "@/src/components/auth/register-form";
import { getCustomerCancellationPolicySummary } from "@/src/lib/bookings/policy";
import { buildPageMetadata } from "@/src/lib/seo/metadata";

export const metadata = buildPageMetadata({
	title: "Регистрация | Racket Community Kst",
	description: "Создайте аккаунт для онлайн-бронирования кортов и тренировок, подтверждений записи и управления отменой в личном кабинете.",
	path: "/register",
	noIndex: true,
});

export const dynamic = "force-dynamic";

export default async function RegisterPage({
	searchParams,
}: {
	searchParams: Promise<{ next?: string }>;
}) {
	const cancellationPolicySummary = getCustomerCancellationPolicySummary();
	const params = await searchParams;
	const next = typeof params.next === "string" && params.next.startsWith("/") ? params.next : "/account";

	return (
		<div className="login-page">
			<PageHero
				eyebrow="Регистрация"
				title="Создать аккаунт клиента"
				description={`Аккаунт нужен для просмотра истории бронирований и управления отменами. ${cancellationPolicySummary}`}
			/>

			<AuthPanel title="Регистрация клиента" titleId="register-form-title" brandSubtitle="Создание клиентского аккаунта">
				<p className="auth-panel__hint">
					Если вы уже создавали бронь с этим email, можно зарегистрироваться и получить доступ к истории.
				</p>

				<RegisterForm next={next} />
			</AuthPanel>
		</div>
	);
}
