import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { PageHero } from "@/src/components/page-hero";
import { AccountCancelBookingForm } from "@/src/components/account/account-cancel-booking-form";
import { AccountTabs } from "@/src/components/account/account-tabs";
import { cancelCustomerAccountEventRegistration, cancelCustomerBooking, cancelCustomerHolds, getAccountActiveHolds, getAccountBookings, payBookingFromWallet } from "@/src/lib/account/bookings";
import { requireAuthenticatedUser } from "@/src/lib/auth/guards";
import { canAccessAdminPortal } from "@/src/lib/auth/roles";
import { getCustomerCancellationPolicySummary } from "@/src/lib/bookings/policy";
import { t } from "@/src/lib/i18n";
import { buildPageMetadata } from "@/src/lib/seo/metadata";

export const metadata = buildPageMetadata({
	title: "Мои бронирования | Racket Community Kst",
	description: "Список предстоящих и прошедших бронирований клиента со статусами оплаты и возможностью отмены.",
	path: "/account/bookings",
	noIndex: true,
});

export const dynamic = "force-dynamic";

export default async function AccountBookingsPage({
	searchParams,
}: {
	searchParams: Promise<{ error?: string; success?: string; pay_error?: string; pay_success?: string }>;
}) {
	const cancellationPolicySummary = getCustomerCancellationPolicySummary();
	const session = await requireAuthenticatedUser("/account/bookings");
	if (canAccessAdminPortal(session.user.role)) {
		redirect("/admin/bookings");
	}
	const params = await searchParams;
	const [bookings, activeHolds] = await Promise.all([
		getAccountBookings(session.user.id, 100),
		getAccountActiveHolds(session.user.id),
	]);
	const now = new Date();

	const upcomingBookings = bookings.filter((row) => new Date(row.startAtIso) >= now);
	const pastBookings = bookings.filter((row) => new Date(row.startAtIso) < now);

	const errorMessage =
		params.error === "cancel_not_allowed"
			? t("account.bookings.error.cancelNotAllowed", { cancellationPolicySummary })
			: params.error === "cancel_failed"
				? t("account.bookings.error.cancelFailed")
				: params.pay_error
					? t("account.bookings.error.payFailed")
					: null;

	const successMessage =
		params.success === "cancelled"
			? t("account.bookings.success.cancelled")
			: params.pay_success
				? t("account.bookings.success.paid")
				: null;

	async function cancelAction(formData: FormData) {
		"use server";
		const actionSession = await requireAuthenticatedUser("/account/bookings");
		if (canAccessAdminPortal(actionSession.user.role)) {
			redirect("/admin/bookings");
		}
		const bookingId = String(formData.get("bookingId") ?? "");
		const eventId = String(formData.get("eventId") ?? "");
		const itemType = String(formData.get("itemType") ?? "booking");

		if (itemType === "event" && !eventId) {
			redirect("/account/bookings?error=cancel_failed");
		}

		if (itemType !== "event" && !bookingId) {
			redirect("/account/bookings?error=cancel_failed");
		}

		let errorCode: "cancel_not_allowed" | "cancel_failed" | null = null;
		try {
			if (itemType === "event") {
				await cancelCustomerAccountEventRegistration({
					userId: actionSession.user.id,
					eventId,
				});
			} else {
				await cancelCustomerBooking({
					userId: actionSession.user.id,
					bookingId,
				});
			}
		} catch (error) {
			const message = error instanceof Error ? error.message : "";
			if (
				message.includes("час") ||
				message.includes("нельзя") ||
				message.includes("доступна") ||
				message.includes("предыдущего дня") ||
				message.includes("already")
			) {
				errorCode = "cancel_not_allowed";
			} else {
				errorCode = "cancel_failed";
			}
		}

		if (errorCode) {
			redirect(`/account/bookings?error=${errorCode}`);
		}

		revalidatePath("/account");
		revalidatePath("/account/bookings");
		revalidatePath("/admin/bookings");
		revalidatePath("/admin/events");
		revalidatePath("/events");
		redirect("/account/bookings?success=cancelled");
	}

	async function cancelHoldsAction(formData: FormData) {
		"use server";
		const actionSession = await requireAuthenticatedUser("/account/bookings");
		const holdIds = formData.getAll("holdId").map(String).filter(Boolean);
		if (holdIds.length > 0) {
			await cancelCustomerHolds({ userId: actionSession.user.id, holdIds });
		}
		revalidatePath("/account/bookings");
		redirect("/account/bookings");
	}

	async function payFromBalanceAction(formData: FormData) {
		"use server";
		const actionSession = await requireAuthenticatedUser("/account/bookings");
		if (canAccessAdminPortal(actionSession.user.role)) redirect("/admin/bookings");
		const bookingId = String(formData.get("bookingId") ?? "");
		if (!bookingId) redirect("/account/bookings?pay_error=1");
		try {
			await payBookingFromWallet({ userId: actionSession.user.id, bookingId });
		} catch {
			redirect("/account/bookings?pay_error=1");
		}
		revalidatePath("/account");
		revalidatePath("/account/bookings");
		redirect("/account/bookings?pay_success=1");
	}

	return (
		<div className="account-page">
			<PageHero
				eyebrow={t("account.common.eyebrow")}
				title={t("account.bookings.hero.title")}
				description={t("account.bookings.hero.description", { cancellationPolicySummary })}
			/>

			<AccountTabs active="bookings" />

			<section className="account-history">
				{errorMessage ? (
					<p className="account-history__message account-history__message--error" role="alert">
						{errorMessage}
					</p>
				) : null}
				{successMessage ? (
					<p className="account-history__message account-history__message--success" role="status">
						{successMessage}
					</p>
				) : null}

				{activeHolds.length > 0 ? (
					<div className="account-history__section">
						<div className="account-history__section-head">
							<h2 className="account-history__section-title">{t("account.bookings.section.pendingPayment")}</h2>
							<span className="account-history__section-count">{activeHolds.length}</span>
						</div>
						<div className="account-history__card-list">
							{activeHolds.map((group) => {
								const expiresAt = new Date(group.expiresAtIso);
								const minutesLeft = Math.max(0, Math.floor((expiresAt.getTime() - now.getTime()) / 60000));
								return (
									<article key={group.groupKey} className="account-history__card account-history__card--hold">
										<div className="account-history__card-head">
											<p className="account-history__card-title">{group.serviceName}</p>
											<p className="account-history__card-price">{group.totalAmountKzt}</p>
										</div>

										<ul className="account-history__hold-slots">
											{group.slots.map((slot) => (
												<li key={slot.id} className="account-history__hold-slot">
													<span className="account-history__hold-slot-label">
														{slot.courtName} · {slot.timeRange}
													</span>
													<span className="account-history__hold-slot-price">{slot.amountKzt}</span>
												</li>
											))}
										</ul>

										<div className="account-history__card-actions">
											<Link href={group.bookReturnUrl} className="account-history__continue-link">
												{t("account.bookings.continueBooking")}
											</Link>
											<span className="account-history__hold-timer">
												{minutesLeft > 0
													? t("account.bookings.holdTimeLeft", { minutes: minutesLeft })
													: t("account.bookings.holdExpiringSoon")}
											</span>
											<form action={cancelHoldsAction}>
												{group.holdIds.map((id) => (
													<input key={id} type="hidden" name="holdId" value={id} />
												))}
												<button type="submit" className="account-history__cancel-hold-btn">
													{t("account.bookings.holdCancelBtn")}
												</button>
											</form>
										</div>
									</article>
								);
							})}
						</div>
					</div>
				) : null}

				{bookings.length === 0 && activeHolds.length === 0 ? (
					<div className="account-history__empty">
						{t("account.bookings.empty")}
					</div>
				) : bookings.length > 0 ? (
					<>
						{[
							{ key: "upcoming", title: t("account.bookings.section.upcoming"), rows: upcomingBookings },
							{ key: "past", title: t("account.bookings.section.past"), rows: pastBookings },
						].map((section) =>
							section.rows.length > 0 ? (
							<div key={section.key} className="account-history__section">
									<div className="account-history__section-head">
										<h2 className="account-history__section-title">{section.title}</h2>
										<span className="account-history__section-count">{section.rows.length}</span>
									</div>

									<div className="account-history__card-list">
										{section.rows.map((row) => (
											<article key={row.id} className="account-history__card">
												<div className="account-history__card-head">
													<div>
														<p className="account-history__card-title">{row.serviceName} - {row.courtName}</p>
														{row.itemType === "event" ? (
															<p className="admin-bookings__cell-sub">{t("account.bookings.eventLabel")}</p>
														) : null}
													</div>
													<p className="account-history__card-price">{row.amountKzt}</p>
												</div>

												<div className="account-history__card-grid">
													<div className="account-history__card-item">
														<span className="account-history__card-label">{t("account.bookings.dateTimeLabel")}</span>
														<span className="account-history__card-value">{row.date} - {row.timeRange}</span>
													</div>
													<div className="account-history__card-item">
														<span className="account-history__card-label">{t("account.bookings.statusLabel")}</span>
														<div className='account-history__badge-container'>
															<span
																className={`account-history__badge account-history__badge--status-${row.status.replaceAll("_", "-")}`}
															>
																{row.statusLabel}
															</span>
															<span
																className={`account-history__badge account-history__badge--payment-${row.paymentStatus.replaceAll("_", "-")}`}
															>
																{row.paymentStatusLabel}
															</span>
														</div>
													</div>
												</div>

												<div className="account-history__card-actions">
													{row.paymentStatus === "unpaid" && row.itemType === "booking" ? (
														<form action={payFromBalanceAction}>
															<input type="hidden" name="bookingId" value={row.id} />
															<button type="submit" className="account-history__continue-link">
																{t("account.bookings.payFromBalance")}
															</button>
														</form>
													) : null}
													{row.canCancel ? (
														<div className="account-history__cancel-group">
															<AccountCancelBookingForm
																bookingId={row.id}
																itemType={row.itemType}
																eventId={row.eventId}
																cancellationDeadlineText={row.cancellationDeadlineText}
																action={cancelAction}
															/>
															{row.cancellationDeadlineText ? (
																<div className="account-history__cancel-meta">
																	{t("account.bookings.cancelDeadline", { deadline: row.cancellationDeadlineText })}
																</div>
															) : null}
														</div>
													) : row.itemType === "booking" ? (
														<div className="account-history__cancel-meta">
															{row.cancelBlockedReason ?? t("account.bookings.cancelUnavailable")}
														</div>
													) : null}
												</div>
											</article>
										))}
									</div>
								</div>
							) : null,
						)}
					</>
				) : null}
			</section>
		</div>
	);
}
