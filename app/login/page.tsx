import bcrypt from "bcryptjs";
import { AuthError, CredentialsSignin } from "next-auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import { signIn } from "@/auth";
import { AuthPanel, AuthPanelLinks } from "@/src/components/auth/auth-panel";
import { LoginForm } from "@/src/components/auth/login-form";
import { isCustomerFullyVerified } from "@/src/lib/auth/verification";
import { PageHero } from "@/src/components/page-hero";
import { prisma } from "@/src/lib/prisma";
import { buildPageMetadata } from "@/src/lib/seo/metadata";

export const metadata = buildPageMetadata({
	title: "Вход | Racket Community Kst",
	description: "Войдите в аккаунт, чтобы подтвердить бронирование, посмотреть историю записей и управлять отменами в личном кабинете.",
	path: "/login",
	noIndex: true,
});

export const dynamic = "force-dynamic";

export default async function LoginPage({
	searchParams,
}: {
	searchParams: Promise<{ next?: string; error?: string; email?: string }>;
}) {
	const params = await searchParams;
	const next = typeof params.next === "string" && params.next.startsWith("/") ? params.next : "/account";
	const errorCode =
		params.error === "verification_required"
			? "verification_required"
			: params.error === "account_disabled"
				? "account_disabled"
				: params.error === "credentials"
					? "credentials"
					: undefined;
	const verificationEmail = typeof params.email === "string" ? params.email.trim().toLowerCase() : undefined;
	const verificationHref = `/register/verify?email=${encodeURIComponent(verificationEmail ?? "")}&next=${encodeURIComponent(next)}`;

	async function loginAction(formData: FormData) {
		"use server";

		const email = String(formData.get("email") ?? "").trim().toLowerCase();
		const password = String(formData.get("password") ?? "");
		const nextValue = String(formData.get("next") ?? "/account");
		const safeNext = nextValue.startsWith("/") ? nextValue : "/account";

		const user = await prisma.user.findUnique({
			where: { email },
			select: {
				passwordHash: true,
				role: true,
				active: true,
				emailVerifiedAt: true,
				phoneVerifiedAt: true,
				pendingEmail: true,
				pendingPhone: true,
			},
		});

		let redirectTo = safeNext;
		if (user?.active) {
			let passwordValid = false;
			try {
				passwordValid = await bcrypt.compare(password, user.passwordHash);
			} catch {
				passwordValid = false;
			}

			if (
				passwordValid &&
				!isCustomerFullyVerified({
					role: user.role,
					emailVerifiedAt: user.emailVerifiedAt,
					phoneVerifiedAt: user.phoneVerifiedAt,
					pendingEmail: user.pendingEmail,
					pendingPhone: user.pendingPhone,
				})
			) {
				redirectTo = `/register/verify?email=${encodeURIComponent(email)}&next=${encodeURIComponent(safeNext)}`;
			}
		}

		try {
			await signIn("credentials", {
				email,
				password,
				redirectTo,
			});
		} catch (error) {
			if (error instanceof CredentialsSignin && (error as { code?: string }).code === "account_disabled") {
				redirect(`/login?error=account_disabled&next=${encodeURIComponent(safeNext)}`);
			}
			if (error instanceof AuthError) {
				redirect(`/login?error=credentials&next=${encodeURIComponent(safeNext)}`);
			}
			throw error;
		}
	}

	return (
		<div className="login-page">
			<PageHero
				eyebrow="Авторизация"
				title="Вход в систему"
				description="Войдите с email и паролем, чтобы управлять бронированиями и видеть историю занятий."
			/>

			<AuthPanel
				title={errorCode === "verification_required" ? "Нужно завершить подтверждение" : "Вход по email"}
				titleId="login-form-title"
			>
				{errorCode === "verification_required" ? (
					<>
						<p className="auth-panel__notice" role="status">
							Пароль принят, но вход будет доступен только после подтверждения email и телефона.
						</p>
						<p className="auth-panel__hint">
							Откройте страницу подтверждения, проверьте письмо с ссылкой и отправьте свой контакт в Telegram-боте.
							После двух подтверждений профиль откроется автоматически.
						</p>
						<AuthPanelLinks>
							<Link href={verificationHref} className="auth-form__submit">
								Перейти к подтверждению
							</Link>
						</AuthPanelLinks>
					</>
				) : (
					<>
						{errorCode === "account_disabled" ? (
							<p className="auth-panel__notice" role="alert">
								Аккаунт отключен. Обратитесь к администратору клуба.
							</p>
						) : null}
						<p className="auth-panel__hint">
							Нет аккаунта?{" "}
							<Link href={`/register?next=${encodeURIComponent(next)}`} className="auth-panel__link">
								Зарегистрироваться
							</Link>
						</p>

						<LoginForm next={next} errorCode={errorCode === "credentials" ? "credentials" : undefined} action={loginAction} />
					</>
				)}
			</AuthPanel>
		</div>
	);
}
