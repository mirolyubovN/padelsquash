import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { PageHero } from "@/src/components/page-hero";
import { buildPageMetadata } from "@/src/lib/seo/metadata";
import { getSportInfoPageContent, sportInfoPages } from "@/src/lib/content/sport-pages";

interface SportInfoPageProps {
	params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
	return sportInfoPages.map((item) => ({ slug: item.slug }));
}

export async function generateMetadata({ params }: SportInfoPageProps): Promise<Metadata> {
	const { slug } = await params;
	const content = getSportInfoPageContent(slug);
	if (!content) {
		return buildPageMetadata({
			title: "Вид спорта | Racket Community Kst",
			description: "Описание вида спорта в клубе Racket Community Kst.",
			path: `/sports/${slug}`,
		});
	}

	return buildPageMetadata({
		title: `${content.title} | Racket Community Kst`,
		description: content.description,
		path: `/sports/${content.slug}`,
	});
}

export default async function SportInfoPage({ params }: SportInfoPageProps) {
	const { slug } = await params;
	const content = getSportInfoPageContent(slug);

	if (!content) {
		notFound();
	}

	return (
		<div className="sport-info-page">
			<PageHero
				eyebrow={content.eyebrow}
				title={content.title}
				description={content.description}
			/>

			<section className="sport-info-page__intro" aria-label={`${content.title}: обзор`}>
				<article className="sport-info-page__photo">
					{/* eslint-disable-next-line @next/next/no-img-element */}
					<img src={content.photo.src} alt={content.photo.alt} loading="lazy" />
					<div className="sport-info-page__photo-caption">
						<Link href={content.photo.creditUrl} target="_blank" rel="noreferrer">
							{content.photo.creditLabel}
						</Link>
					</div>
				</article>

				<article className="rule-list">
					<h2 className="rule-list__title">Что это за спорт</h2>
					<ul className="rule-list__items">
						{content.overview.map((item) => (
							<li key={item} className="rule-list__item">
								{item}
							</li>
						))}
					</ul>
				</article>
			</section>

			<section className="contact-layout" aria-label={`${content.title}: преимущества и источники`}>
				<article className="rule-list">
					<h2 className="rule-list__title">Базовые правила</h2>
					<ul className="rule-list__items">
						{content.rules.map((item) => (
							<li key={item} className="rule-list__item">
								{item}
							</li>
						))}
					</ul>
				</article>

				<article className="rule-list">
					<h2 className="rule-list__title">Почему стоит попробовать уже сейчас</h2>
					<ul className="rule-list__items">
						{content.whyTry.map((item) => (
							<li key={item} className="rule-list__item">
								{item}
							</li>
						))}
					</ul>
					<p className="card-grid__text">
						Начните с первого занятия в комфортном темпе: тренер поможет быстро почувствовать игру и подобрать подходящий формат.
					</p>
				</article>
			</section>

			{/* <section className="rule-list" aria-label={`${content.title}: источники`}>
          <h2 className="rule-list__title">Источники</h2>
          <div className="sport-info-page__sources">
            {content.sourceLinks.map((source) => (
              <Link key={source.href} href={source.href} target="_blank" rel="noreferrer" className="sport-info-page__source-link">
                {source.label}
              </Link>
            ))}
          </div>
      </section> */}

			<div className="listing-page__footer-actions">
				<Link href={`/book?sport=${content.slug}`} className="card-grid__button">
					Перейти к бронированию
				</Link>
			</div>
		</div>
	);
}
