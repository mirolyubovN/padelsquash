import Link from "next/link";
import { redirect } from "next/navigation";
import { z } from "zod";
import { auth } from "@/auth";
import { AuthPanel, AuthPanelLinks } from "@/src/components/auth/auth-panel";
import { PageHero } from "@/src/components/page-hero";
import { getSafeRegisterNext } from "@/src/lib/auth/register-form-state";
import {
	consumeEmailVerificationCode,
	getActivePhoneVerificationSession,
	isCustomerFullyVerified,
	issueEmailVerificationCode,
	issuePhoneVerificationSession,
} from "@/src/lib/auth/verification";
import { buildPageMetadata } from "@/src/lib/seo/metadata";
import { prisma } from "@/src/lib/prisma";

export const metadata = buildPageMetadata({
	title: "Подтверждение регистрации | Racket Community Kst",
	description: "Подтвердите email и телефон, чтобы завершить регистрацию и войти в личный кабинет.",
	path: "/register/verify",
	noIndex: true,
});

export const dynamic = "force-dynamic";

const contactUpdateSchema = z.object({
	currentEmail: z.string().email(),
	email: z.string().email("Введите корректный email."),
	phone: z.string().trim().min(5, "Введите корректный телефон."),
	next: z.string().optional(),
});

function normalizeEmail(email: string | undefined): string {
	return (email ?? "").trim().toLowerCase();
}

export default async function RegisterVerifyPage({
	searchParams,
}: {
	searchParams: Promise<{
		email?: string;
		next?: string;
		emailDelivery?: string;
		telegramSetup?: string;
		resent?: string;
		success?: string;
		error?: string;
	}>;
}) {
	const params = await searchParams;
	const email = normalizeEmail(params.email);
	const next = getSafeRegisterNext(params.next);

	const customer = email
		? await prisma.user.findFirst({
			where: {
				OR: [{ email }, { pendingEmail: email }],
			},
			select: {
				id: true,
				name: true,
				email: true,
				phone: true,
				pendingEmail: true,
				pendingPhone: true,
				role: true,
				emailVerifiedAt: true,
				phoneVerifiedAt: true,
			},
		})
		: null;

	const customerToVerify = customer && customer.role === "customer" ? customer : null;
	const canVerifyCustomer = Boolean(customerToVerify);
	const fullyVerified = customerToVerify ? isCustomerFullyVerified(customerToVerify) : false;
	const session = await auth();
	const emailTarget = customerToVerify?.pendingEmail ?? customerToVerify?.email ?? "";
	const phoneTarget = customerToVerify?.pendingPhone ?? customerToVerify?.phone ?? "";
	const emailPurpose = customerToVerify?.pendingEmail ? "email_change" : "registration";
	const phonePurpose = customerToVerify?.pendingPhone ? "phone_change" : "registration";

	if (
		fullyVerified &&
		(session?.user?.id === customerToVerify?.id || session?.user?.email === customerToVerify?.email)
	) {
		redirect(next);
	}

	const phoneSession =
		customerToVerify && (!customerToVerify.phoneVerifiedAt || customerToVerify.pendingPhone)
			? (await getActivePhoneVerificationSession(customerToVerify.id, phoneTarget)) ??
			(await issuePhoneVerificationSession({
				userId: customerToVerify.id,
				targetPhone: phoneTarget,
				purpose: phonePurpose,
			}))
			: null;

	async function resendEmailAction(formData: FormData) {
		"use server";

		const formEmail = normalizeEmail(String(formData.get("email") ?? ""));
		const nextPath = getSafeRegisterNext(String(formData.get("next") ?? "/account"));
		if (!formEmail) {
			redirect(`/register/verify?next=${encodeURIComponent(nextPath)}`);
		}

		const user = await prisma.user.findUnique({
			where: { email: formEmail },
			select: {
				id: true,
				name: true,
				email: true,
				pendingEmail: true,
				role: true,
				emailVerifiedAt: true,
			},
		});

		if (!user || user.role !== "customer") {
			redirect(`/register/verify?email=${encodeURIComponent(formEmail)}&next=${encodeURIComponent(nextPath)}`);
		}

		const targetEmail = user.pendingEmail ?? user.email;
		const purpose = user.pendingEmail ? "email_change" : "registration";
		if (!user.emailVerifiedAt || user.pendingEmail) {
			const result = await issueEmailVerificationCode({
				userId: user.id,
				email: targetEmail,
				name: user.name,
				nextPath,
				purpose,
			});

			const qs = new URLSearchParams({
				email: formEmail,
				next: nextPath,
				resent: result.sent ? "email" : "email_failed",
			});
			redirect(`/register/verify?${qs.toString()}`);
		}

		redirect(`/register/verify?email=${encodeURIComponent(formEmail)}&next=${encodeURIComponent(nextPath)}&resent=email_already_verified`);
	}

	async function verifyEmailCodeAction(formData: FormData) {
		"use server";

		const formEmail = normalizeEmail(String(formData.get("email") ?? ""));
		const targetEmail = normalizeEmail(String(formData.get("targetEmail") ?? ""));
		const purpose = String(formData.get("purpose") ?? "") === "email_change" ? "email_change" : "registration";
		const code = String(formData.get("code") ?? "").trim();
		const nextPath = getSafeRegisterNext(String(formData.get("next") ?? "/account"));

		const user = await prisma.user.findUnique({
			where: { email: formEmail },
			select: { id: true, role: true },
		});

		if (!user || user.role !== "customer" || !targetEmail) {
			redirect(`/register/verify?email=${encodeURIComponent(formEmail)}&next=${encodeURIComponent(nextPath)}&error=email_code_invalid`);
		}

		const result = await consumeEmailVerificationCode({
			userId: user.id,
			targetEmail,
			code,
			purpose,
		});

		if (result.status !== "verified") {
			redirect(`/register/verify?email=${encodeURIComponent(formEmail)}&next=${encodeURIComponent(nextPath)}&error=email_code_${result.status}`);
		}

		redirect(`/register/verify?email=${encodeURIComponent(result.email)}&next=${encodeURIComponent(nextPath)}&success=email_verified`);
	}

	async function updateContactAction(formData: FormData) {
		"use server";

		const fallbackEmail = normalizeEmail(String(formData.get("currentEmail") ?? ""));
		const fallbackNext = getSafeRegisterNext(String(formData.get("next") ?? "/account"));
		const parsed = contactUpdateSchema.safeParse({
			currentEmail: fallbackEmail,
			email: normalizeEmail(String(formData.get("email") ?? "")),
			phone: String(formData.get("phone") ?? "").trim(),
			next: fallbackNext,
		});

		if (!parsed.success) {
			redirect(`/register/verify?email=${encodeURIComponent(fallbackEmail)}&next=${encodeURIComponent(fallbackNext)}&error=contact_invalid`);
		}

		const currentEmail = parsed.data.currentEmail;
		const nextEmail = parsed.data.email;
		const nextPhone = parsed.data.phone;
		const safeNext = getSafeRegisterNext(parsed.data.next);

		const user = await prisma.user.findUnique({
			where: { email: currentEmail },
			select: {
				id: true,
				name: true,
				email: true,
				phone: true,
				pendingEmail: true,
				pendingPhone: true,
				role: true,
			},
		});

		if (!user || user.role !== "customer") {
			redirect(`/register/verify?email=${encodeURIComponent(currentEmail)}&next=${encodeURIComponent(safeNext)}&error=contact_invalid`);
		}

		const emailOwner = await prisma.user.findUnique({
			where: { email: nextEmail },
			select: { id: true },
		});
		if (emailOwner && emailOwner.id !== user.id) {
			redirect(`/register/verify?email=${encodeURIComponent(currentEmail)}&next=${encodeURIComponent(safeNext)}&error=email_taken`);
		}

		const emailChanged = nextEmail !== user.email;
		const phoneChanged = nextPhone !== user.phone;
		if (!emailChanged && !phoneChanged) {
			redirect(`/register/verify?email=${encodeURIComponent(currentEmail)}&next=${encodeURIComponent(safeNext)}`);
		}

		await prisma.user.update({
			where: { id: user.id },
			data: {
				email: nextEmail,
				phone: nextPhone,
				pendingEmail: null,
				pendingPhone: null,
				...(emailChanged ? { emailVerifiedAt: null } : {}),
				...(phoneChanged ? { phoneVerifiedAt: null, telegramChatId: null, telegramUsername: null } : {}),
			},
		});

		const [emailResult, phoneResult] = await Promise.all([
			emailChanged
				? issueEmailVerificationCode({
					userId: user.id,
					email: nextEmail,
					name: user.name,
					nextPath: safeNext,
				})
				: Promise.resolve({ sent: true }),
			phoneChanged
				? issuePhoneVerificationSession({ userId: user.id, targetPhone: nextPhone })
				: Promise.resolve({ telegramUrl: true }),
		]);

		const qs = new URLSearchParams({
			email: nextEmail,
			next: safeNext,
			success: "contact_updated",
		});
		if (!emailResult.sent) {
			qs.set("emailDelivery", "failed");
		}
		if (!phoneResult.telegramUrl) {
			qs.set("telegramSetup", "missing");
		}

		redirect(`/register/verify?${qs.toString()}`);
	}

	return (
		<div className="login-page">
			<PageHero
				eyebrow="Регистрация"
				title="Подтвердите email и телефон"
				description="Для входа в аккаунт нужно завершить оба шага: подтверждение email и подтверждение телефона через Telegram-бота."
			/>

			<AuthPanel title="Статус подтверждения" titleId="register-verify-title" showBrand={false}>
				{!canVerifyCustomer ? (
					<>
						<p className="auth-panel__error" role="alert">
							Аккаунт для подтверждения не найден. Проверьте email или зарегистрируйтесь заново.
						</p>
						<AuthPanelLinks>
							<Link href={`/register?next=${encodeURIComponent(next)}`} className="auth-panel__link">
								К регистрации
							</Link>
							<Link href="/login" className="auth-panel__link">
								Ко входу
							</Link>
						</AuthPanelLinks>
					</>
				) : (
					<>
						{params.emailDelivery === "failed" ? (
							<p className="auth-panel__error" role="alert">
								Письмо не удалось отправить автоматически. Используйте кнопку повторной отправки или обратитесь к администратору.
							</p>
						) : null}
						{params.telegramSetup === "missing" ? (
							<p className="auth-panel__error" role="alert">
								Telegram-бот не настроен в окружении. Обратитесь к администратору.
							</p>
						) : null}
						{params.resent === "email" ? (
							<p className="auth-panel__hint">Письмо отправлено повторно.</p>
						) : null}
						{params.resent === "email_failed" ? (
							<p className="auth-panel__error" role="alert">
								Повторная отправка письма не удалась.
							</p>
						) : null}
						{params.success === "contact_updated" ? (
							<p className="account-history__message account-history__message--success" role="status">
								Контакты обновлены. Для измененных данных создано новое подтверждение.
							</p>
						) : null}
						{params.success === "email_update_requested" ? (
							<p className="account-history__message account-history__message--success" role="status">
								Новый email сохранен как ожидающий подтверждения. Введите код из письма.
							</p>
						) : null}
						{params.success === "phone_update_requested" ? (
							<p className="account-history__message account-history__message--success" role="status">
								Новый телефон сохранен как ожидающий подтверждения. Подтвердите его через Telegram.
							</p>
						) : null}
						{params.success === "email_verified" ? (
							<p className="account-history__message account-history__message--success" role="status">
								Email подтвержден.
							</p>
						) : null}
						{params.error === "contact_invalid" ? (
							<p className="auth-panel__error" role="alert">
								Проверьте email и телефон.
							</p>
						) : null}
						{params.error === "email_taken" ? (
							<p className="auth-panel__error" role="alert">
								Этот email уже используется другим аккаунтом.
							</p>
						) : null}
						{params.error?.startsWith("email_code_") ? (
							<p className="auth-panel__error" role="alert">
								Код email недействителен, истек или введен слишком много раз. Запросите новый код.
							</p>
						) : null}
						<dl className="account-profile__list">
							<div className="account-profile__item">
								<dt className="account-profile__label">Email</dt>
								<dd className="account-profile__value">
									{customerToVerify!.email}
									{customerToVerify!.pendingEmail ? ` · новый: ${customerToVerify!.pendingEmail}` : ""}
									{customerToVerify!.emailVerifiedAt && !customerToVerify!.pendingEmail ? " · подтвержден" : " · не подтвержден"}
								</dd>
							</div>
							<div className="account-profile__item">
								<dt className="account-profile__label">Телефон</dt>
								<dd className="account-profile__value">
									{customerToVerify!.phone}
									{customerToVerify!.pendingPhone ? ` · новый: ${customerToVerify!.pendingPhone}` : ""}
									{customerToVerify!.phoneVerifiedAt && !customerToVerify!.pendingPhone ? " · подтвержден" : " · не подтвержден"}
								</dd>
							</div>
						</dl>

						{customerToVerify!.emailVerifiedAt && !customerToVerify!.pendingEmail ? (
							<p className="account-history__message account-history__message--success" role="status">
								Email подтвержден.
							</p>
						) : null}
						{customerToVerify!.phoneVerifiedAt && !customerToVerify!.pendingPhone ? (
							<p className="account-history__message account-history__message--success" role="status">
								Телефон подтвержден.
							</p>
						) : null}

						{!fullyVerified ? (
							<details className="auth-panel__details">
								<summary className="admin-bookings__action-button">Изменить email или телефон</summary>
								<form action={updateContactAction} className="auth-form">
									<input type="hidden" name="currentEmail" value={customerToVerify!.email} />
									<input type="hidden" name="next" value={next} />
									<p className="account-profile-form__title">Исправить email или телефон</p>
									<p className="auth-panel__hint">
										Изменяйте контакты только если при регистрации указали неверные данные. Измененные данные нужно подтвердить заново.
									</p>
									<div className="auth-form__group">
										<label htmlFor="verify-email-edit" className="auth-form__label">
											Email
										</label>
										<input
											id="verify-email-edit"
											name="email"
											type="email"
											defaultValue={emailTarget}
											required
											className="auth-form__field"
										/>
									</div>
									<div className="auth-form__group">
										<label htmlFor="verify-phone-edit" className="auth-form__label">
											Телефон
										</label>
										<input
											id="verify-phone-edit"
											name="phone"
											type="tel"
											defaultValue={phoneTarget}
											required
											className="auth-form__field"
										/>
									</div>
									<button type="submit" className="admin-bookings__action-button">
										Сохранить контакты
									</button>
								</form>
							</details>
						) : null}

						{(!customerToVerify!.emailVerifiedAt || customerToVerify!.pendingEmail) ? (
							<>
								<form action={verifyEmailCodeAction} className="auth-form">
									<input type="hidden" name="email" value={customerToVerify!.email} />
									<input type="hidden" name="targetEmail" value={emailTarget} />
									<input type="hidden" name="purpose" value={emailPurpose} />
									<input type="hidden" name="next" value={next} />
									<p className="account-profile-form__title">Подтверждение email кодом</p>
									<p className="auth-panel__hint">Введите 6-значный код, отправленный на {emailTarget}.</p>
									<div className="auth-form__group">
										<label htmlFor="email-code" className="auth-form__label">
											Код из письма
										</label>
										<input
											id="email-code"
											name="code"
											inputMode="numeric"
											pattern="[0-9]{6}"
											maxLength={6}
											required
											className="auth-form__field"
										/>
									</div>
									<button type="submit" className="auth-form__submit">
										Подтвердить email
									</button>
								</form>
								<form action={resendEmailAction} className="auth-form">
									<input type="hidden" name="email" value={customerToVerify!.email} />
									<input type="hidden" name="next" value={next} />
									<button type="submit" className="admin-bookings__action-button">
										Отправить новый код
									</button>
								</form>
							</>
						) : null}

						{(!customerToVerify!.phoneVerifiedAt || customerToVerify!.pendingPhone) ? (
							<div className="auth-form">
								{phoneSession?.telegramUrl ? (
									<a href={phoneSession.telegramUrl} className="auth-form__submit">
										Открыть Telegram-бота для подтверждения телефона
									</a>
								) : (
									<p className="auth-panel__error" role="alert">
										Telegram-ссылка недоступна. Попробуйте обновить страницу.
									</p>
								)}
								<p className="auth-panel__hint">
									В Telegram нужно отправить именно свой контакт. Номер Telegram должен совпадать с телефоном выше:{" "}
									{phoneTarget}. После отправки контакта обновите эту страницу.
								</p>
							</div>
						) : null}

						{fullyVerified ? (
							<>
								<p className="account-history__message account-history__message--success" role="status">
									Аккаунт подтвержден.
								</p>
								<AuthPanelLinks>
									<Link href={`/login?next=${encodeURIComponent(next)}`} className="auth-panel__link">
										Войти
									</Link>
								</AuthPanelLinks>
							</>
						) : (
							<p className="auth-panel__hint">
								После завершения обоих шагов профиль откроется автоматически.
							</p>
						)}
					</>
				)}
			</AuthPanel>
		</div>
	);
}
