import Link from "next/link";
import { PageHero } from "@/src/components/page-hero";
import { CoachGalleryList, type CoachGalleryItem } from "@/src/components/coaches/coach-gallery-list";
import { prisma } from "@/src/lib/prisma";
import { coachesPageContent } from "@/src/lib/content/site-data";
import { buildPageMetadata } from "@/src/lib/seo/metadata";

export const metadata = buildPageMetadata({
	title: "Тренеры | Racket Community Kst",
	description: "Тренеры по теннису, паделу и сквошу в Костанай: индивидуальные и парные занятия, стоимость за час и запись онлайн через форму бронирования.",
	path: "/coaches",
});

export default async function CoachesPage() {
	const dbInstructors = await prisma.instructor.findMany({
		where: { active: true },
		select: {
			id: true,
			name: true,
			bio: true,
			photoUrl: true,
			instructorPhotos: {
				orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
				select: {
					url: true,
				},
			},
			instructorSports: {
				orderBy: [{ sport: { sortOrder: "asc" } }, { sport: { name: "asc" } }],
				select: {
					pricePerHour: true,
					sport: {
						select: {
							slug: true,
							name: true,
						},
					},
				},
			},
		},
		orderBy: [{ name: "asc" }],
	});
	const formatMoneyKzt = (amount: number) => `${amount.toLocaleString("ru-KZ")} ₸`;
	const getCoachBookingHref = (sports: Array<{ slug: string }>) => {
		const preferredSport = sports[0]?.slug ?? "padel";
		return `/book?sport=${preferredSport}&service=training`;
	};
	const coaches: CoachGalleryItem[] = dbInstructors.map((coach) => ({
		id: coach.id,
		name: coach.name,
		bio: coach.bio ?? undefined,
		photoUrl: coach.photoUrl ?? undefined,
		galleryPhotoUrls: coach.instructorPhotos.map((photo) => photo.url),
		sports: coach.instructorSports.map((item) => ({
			slug: item.sport.slug,
			name: item.sport.name,
		})),
		priceLabel:
			coach.instructorSports.length > 0
				? `от ${formatMoneyKzt(
					Math.min(...coach.instructorSports.map((item) => Number(item.pricePerHour))),
				)} / час`
				: "Цена уточняется",
		bookingHref: getCoachBookingHref(coach.instructorSports.map((item) => item.sport)),
	}));

	return (
		<div className="listing-page">
			<PageHero
				eyebrow={coachesPageContent.hero.eyebrow}
				title={coachesPageContent.hero.title}
				description={coachesPageContent.hero.description}
			/>

			{coaches.length === 0 ? (
				<section className="card-grid" aria-label="Список тренеров">
					<article className="coach-card">
						<p className="card-grid__text">
							Информация о тренерах скоро появится.
						</p>
						<div className="card-grid__actions">
							<Link href="/book?sport=padel&service=training" className="card-grid__button">
								{coachesPageContent.bookingLabel}
							</Link>
						</div>
					</article>
				</section>
			) : null}
			{coaches.length > 0 ? <CoachGalleryList coaches={coaches} bookingLabel={coachesPageContent.bookingLabel} /> : null}
		</div>
	);
}
