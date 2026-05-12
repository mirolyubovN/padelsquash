import Link from "next/link";
import type { ReactNode } from "react";
import { homePageContent, siteConfig } from "@/src/lib/content/site-data";
import { getHomepageData } from "@/src/lib/public/homepage";
import { buildPageMetadata } from "@/src/lib/seo/metadata";
import { ScrollAnimationInit } from "@/src/components/scroll-animation-init";
import { FaqAccordion } from "@/src/components/faq-accordion";
import { SportIcon } from "@/src/components/sport-icons";

export const metadata = buildPageMetadata({
	title: "Главная | Racket Community Kst",
	description:
		"Теннис, падел и сквош в Костанай: бронируйте корты и тренировки онлайн, выбирайте удобное время и управляйте записями в личном кабинете.",
	path: "/",
});

export const dynamic = "force-dynamic";

const SPORT_PHOTOS: Record<string, string> = {
	padel: "padel-court-clean",
	squash: "squash-court-clean",
	tennis: "tennis-court-clean",
};

const SPORT_INFO_ROUTES: Record<string, string> = {
	padel: "/sports/padel",
	squash: "/sports/squash",
	tennis: "/sports/tennis",
};

const galleryPhotos = [
	{ seed: "club-padel-warm", alt: "Падел-корт", caption: "Падел" },
	{ seed: "club-squash-warm", alt: "Сквош-корт", caption: "Сквош" },
	{ seed: "club-tennis-warm", alt: "Теннисный корт", caption: "Теннис" },
	{ seed: "club-lobby-warm", alt: "Холл клуба", caption: "Клуб" },
];

function formatPrice(amount: number): string {
	return `${amount.toLocaleString("ru-KZ")} ₸`;
}

function ArrowRight(): ReactNode {
	return (
		<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden="true">
			<path d="M3 8h10M9 4l4 4-4 4" />
		</svg>
	);
}

export default async function Home() {
	const homepageData = await getHomepageData();
	const totalCourts = homepageData.clubGroups.reduce((sum, group) => sum + group.count, 0);
	const pricingBuckets = homepageData.sports[0]?.prices ?? [];

	return (
		<>
			<ScrollAnimationInit />
			<div className="home">

				{/* HERO */}
				<section className="home__hero" aria-labelledby="home-hero-title">
					<div className="home__hero-bg" aria-hidden="true">
						<img
							src="/hero.png"
							alt="Клуб ракеточных видов спорта в Костанае"
							loading="eager"
						/>
					</div>
					<div className="home__hero-overlay" aria-hidden="true" />
					<div className="home__hero-content" data-reveal>
						<p className="home__eyebrow home__eyebrow--on-deep">{homePageContent.hero.eyebrow}</p>
						<h1 id="home-hero-title" className="home__hero-title">
							{homePageContent.hero.title}
						</h1>
						<p className="home__hero-lede">{homePageContent.hero.description}</p>
						<div className="home__hero-actions">
							<Link href="/book" className="home__btn home__btn--accent">
								{homePageContent.primaryActionLabel}
								<ArrowRight />
							</Link>
							<Link href="/prices" className="home__btn home__btn--ghost-light">
								Посмотреть цены
							</Link>
						</div>
						<dl className="home__hero-meta">
							<div className="home__hero-meta-item">
								<dt>{totalCourts}</dt>
								<dd>кортов в клубе</dd>
							</div>
							<div className="home__hero-meta-item">
								<dt>3</dt>
								<dd>вида спорта</dd>
							</div>
							<div className="home__hero-meta-item">
								<dt>24/7</dt>
								<dd>онлайн-запись</dd>
							</div>
						</dl>
					</div>
				</section>

				{/* SPORTS */}
				{homepageData.clubGroups.length > 0 && (
					<section className="home__section" aria-labelledby="home-sports-title">
						<div className="home__container">
							<header className="home__section-head" data-reveal>
								<span className="home__eyebrow">Три спорта — один клуб</span>
								<h2 id="home-sports-title" className="home__section-title">
									Выберите свой спорт
								</h2>
								<p className="home__section-lede">
									Все корты в одном месте. Запишитесь онлайн и выбирайте удобное время вместо поиска «лучшего» корта.
								</p>
							</header>
							<ul className="home__sports">
								{homepageData.clubGroups.map((group, index) => {
									const photoSeed = SPORT_PHOTOS[group.sport] ?? `sport-${group.sport}`;
									const infoHref = SPORT_INFO_ROUTES[group.sport];
									return (
										<li key={group.sport} className="home__sport" data-reveal data-delay={String(index + 1)}>
											<div className="home__sport-photo">
												<img
													src={`https://picsum.photos/seed/${photoSeed}/900/700`}
													alt={group.sportName}
													loading="lazy"
												/>
												<div className="home__sport-stamp" aria-hidden="true">
													<SportIcon slug={group.sport} size={32} color="#c93f17" />
												</div>
											</div>
											<div className="home__sport-body">
												<h3 className="home__sport-name">{group.sportName}</h3>
												<p className="home__sport-meta">
													{group.count} {group.count === 1 ? "корт" : "корта"}
												</p>
												<div className="home__sport-actions">
													<Link href={`/book?sport=${group.sport}`} className="home__sport-cta">
														Забронировать <ArrowRight />
													</Link>
													{infoHref ? (
														<Link href={infoHref} className="home__sport-info">
															Про {group.sportName.toLowerCase()}
														</Link>
													) : null}
												</div>
											</div>
										</li>
									);
								})}
							</ul>
						</div>
					</section>
				)}

				{/* PRICING */}
				<section className="home__section home__section--alt" aria-labelledby="home-pricing-title">
					<div className="home__container">
						<header className="home__section-head" data-reveal>
							<span className="home__eyebrow">Тарифы</span>
							<h2 id="home-pricing-title" className="home__section-title">
								{homePageContent.pricingTitle}
							</h2>
							<p className="home__section-lede">{homePageContent.pricingSubtitle}</p>
						</header>

						<div className="home__pricing" data-reveal>
							<table className="home__price-table">
								<thead>
									<tr>
										<th scope="col">Период</th>
										{homepageData.sports.map((sport) => (
											<th key={sport.sport} scope="col">{sport.title}</th>
										))}
									</tr>
								</thead>
								<tbody>
									{pricingBuckets.map((bucket, rowIndex) => (
										<tr key={bucket.code}>
											<th scope="row">
												<span className="home__price-label">{bucket.label}</span>
												<span className="home__price-time">{bucket.timeRange}</span>
											</th>
											{homepageData.sports.map((sport) => (
												<td key={`${sport.sport}-${bucket.code}`}>
													{formatPrice(sport.prices[rowIndex]?.price ?? 0)}
												</td>
											))}
										</tr>
									))}
								</tbody>
							</table>
						</div>

						<p className="home__pricing-note" data-reveal>
							{homePageContent.equipmentBanner}
						</p>

						<div className="home__pricing-cta" data-reveal>
							<Link href="/book" className="home__btn home__btn--primary">
								Забронировать <ArrowRight />
							</Link>
							<Link href="/prices" className="home__inline-link">
								Все детали тарифов
							</Link>
						</div>
					</div>
				</section>

				{/* ABOUT + GALLERY */}
				<section className="home__section" aria-labelledby="home-about-title">
					<div className="home__container home__about">
						<div className="home__about-copy" data-reveal>
							<span className="home__eyebrow">О клубе</span>
							<h2 id="home-about-title" className="home__section-title">
								{homePageContent.aboutClubTitle}
							</h2>
							<p className="home__about-lede">{homePageContent.aboutClubDescription}</p>
							<ul className="home__about-rules">
								{homePageContent.clubRules.slice(0, 3).map((rule) => (
									<li key={rule}>{rule}</li>
								))}
							</ul>
							<Link href="/contact" className="home__inline-link">
								Связаться с администратором
							</Link>
						</div>
						<div className="home__gallery" data-reveal data-delay="2">
							{galleryPhotos.map((photo) => (
								<figure key={photo.seed} className="home__gallery-cell">
									<img
										src={`https://picsum.photos/seed/${photo.seed}/700/520`}
										alt={photo.alt}
										loading="lazy"
									/>
									<figcaption>{photo.caption}</figcaption>
								</figure>
							))}
						</div>
					</div>
				</section>

				{/* FAQ */}
				<section className="home__section home__section--alt" aria-labelledby="home-faq-title">
					<div className="home__container home__faq">
						<header className="home__section-head" data-reveal>
							<span className="home__eyebrow">FAQ</span>
							<h2 id="home-faq-title" className="home__section-title">
								{homePageContent.faqTitle}
							</h2>
							<p className="home__section-lede">{homePageContent.faqSubtitle}</p>
						</header>
						<div data-reveal data-delay="2">
							<FaqAccordion items={homePageContent.faqItems} />
						</div>
					</div>
				</section>

				{/* CONTACT CTA */}
				<section className="home__section home__section--deep" aria-labelledby="home-cta-title">
					<div className="home__container home__cta">
						<div className="home__cta-copy" data-reveal>
							<span className="home__eyebrow home__eyebrow--on-deep">Запишитесь</span>
							<h2 id="home-cta-title" className="home__cta-title">
								Свободные слоты — каждый день
							</h2>
							<p className="home__cta-lede">
								Откройте бронирование и выберите удобное время. Если нужна помощь, напишите нам.
							</p>
						</div>
						<div className="home__cta-actions" data-reveal data-delay="2">
							<Link href="/book" className="home__btn home__btn--accent">
								Онлайн запись <ArrowRight />
							</Link>
							<div className="home__cta-contacts">
								<Link href={`tel:${siteConfig.phone.replace(/[^\d+]/g, "")}`} className="home__cta-contact">
									{siteConfig.phone}
								</Link>
								{siteConfig.socialLinks.map((link) => (
									<Link
										key={link.label}
										href={link.href}
										className="home__cta-contact"
										target="_blank"
										rel="noreferrer"
									>
										{link.label}
									</Link>
								))}
							</div>
						</div>
					</div>
				</section>

			</div>
		</>
	);
}
