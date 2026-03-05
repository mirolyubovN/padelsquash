import Link from "next/link";
import { PageHero } from "@/src/components/page-hero";
import {
  pricesPageContent,
  pricingNotes,
  pricingTierRows,
} from "@/src/lib/content/site-data";
import { prisma } from "@/src/lib/prisma";
import { getComponentPriceMatrix } from "@/src/lib/settings/service";
import { buildPageMetadata } from "@/src/lib/seo/metadata";

export const metadata = buildPageMetadata({
  title: "Цены | Padel & Squash KZ",
  description: "Тарифы на аренду кортов падела и сквоша, правила расчета стоимости и пример итоговой цены тренировки с тренером.",
  path: "/prices",
});

export const dynamic = "force-dynamic";

export default async function PricesPage() {
  const [matrix, instructorRates] = await Promise.all([
    getComponentPriceMatrix(),
    prisma.instructorSport.findMany({
      where: {
        instructor: {
          active: true,
        },
      },
      select: {
        pricePerHour: true,
        sport: {
          select: {
            slug: true,
            name: true,
          },
        },
      },
      orderBy: [{ sport: { sortOrder: "asc" } }, { sport: { name: "asc" } }],
    }),
  ]);

  const publicPriceMatrixRows = matrix.map((row) => ({
    item: row.label,
    morning: `${row.values.morning.toLocaleString("ru-KZ")} ₸`,
    day: `${row.values.day.toLocaleString("ru-KZ")} ₸`,
    eveningWeekend: `${row.values.evening_weekend.toLocaleString("ru-KZ")} ₸`,
  }));

  const exampleCourtRow =
    matrix.find((row) => row.sport === "padel" && row.componentType === "court") ??
    matrix.find((row) => row.componentType === "court");
  const exampleSportSlug = exampleCourtRow?.sport ?? "padel";
  const exampleSportName = exampleCourtRow?.sportName ?? "Падел";
  const exampleCourtEvening = exampleCourtRow?.values.evening_weekend ?? 0;
  const exampleTrainerPrices = instructorRates
    .filter((item) => item.sport.slug === exampleSportSlug)
    .map((item) => Number(item.pricePerHour))
    .filter((value) => Number.isFinite(value));
  const hasActiveInstructors = instructorRates.length > 0;
  const exampleInstructorEveningMin = exampleTrainerPrices.length
    ? [...exampleTrainerPrices].sort((a, b) => a - b)[0]
    : null;
  const exampleTotal = exampleInstructorEveningMin !== null ? exampleCourtEvening + exampleInstructorEveningMin : null;

  const sportEntries = Array.from(
    new Map(
      matrix
        .filter((row) => row.componentType === "court")
        .map((row) => [row.sport, row.sportName]),
    ).entries(),
  );
  const trainerRangeBySport = sportEntries.map(([sportSlug, sportName]) => {
    const values = instructorRates
      .filter((item) => item.sport.slug === sportSlug)
      .map((item) => Number(item.pricePerHour))
      .filter((value) => Number.isFinite(value));

    const min = values.length ? Math.min(...values) : null;
    const max = values.length ? Math.max(...values) : null;
    return { sportSlug, sportName, min, max, hasTrainers: values.length > 0 };
  });

  return (
    <div className="pricing-page">
      <PageHero
        eyebrow={pricesPageContent.hero.eyebrow}
        title={pricesPageContent.hero.title}
        description={pricesPageContent.hero.description}
      />

      <section className="pricing-table" aria-labelledby="pricing-table-title">
        <h2 id="pricing-table-title" className="pricing-table__title">
          {pricesPageContent.tableTitle}
        </h2>
        <div className="pricing-table__scroll">
          <table className="pricing-table__table">
            <thead>
              <tr>
                <th>Позиция</th>
                <th>Утро</th>
                <th>День</th>
                <th>Вечер / выходные</th>
              </tr>
            </thead>
            <tbody>
              {publicPriceMatrixRows.map((row) => (
                <tr key={row.item}>
                  <td>{row.item}</td>
                  <td>{row.morning}</td>
                  <td>{row.day}</td>
                  <td>{row.eveningWeekend}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rule-list" aria-labelledby="rule-list-title">
        <h2 id="rule-list-title" className="rule-list__title">
          {pricesPageContent.rulesTitle}
        </h2>
        <ol className="rule-list__items">
          {pricesPageContent.calculationSteps.map((step) => (
            <li key={step} className="rule-list__item">
              {step}
            </li>
          ))}
        </ol>
        <ul className="rule-list__notes">
          {pricingTierRows.map((tier) => (
            <li key={tier.tier} className="rule-list__note">
              <strong>{tier.label}:</strong> {tier.schedule}
            </li>
          ))}
          {pricingNotes.map((note) => (
            <li key={note} className="rule-list__note">
              {note}
            </li>
          ))}
        </ul>
      </section>

      <section className="pricing-example" aria-labelledby="pricing-example-title">
        {hasActiveInstructors ? (
          <div className="pricing-example__card">
            <h2 id="pricing-example-title" className="pricing-example__title">
              {pricesPageContent.exampleTitle}
            </h2>
            <p className="pricing-example__text">{pricesPageContent.exampleDescription}</p>
            <div className="pricing-example__rows">
              <div className="pricing-example__row">
                <span>Корт ({exampleSportName.toLowerCase()}), вечер</span>
                <strong>{exampleCourtEvening.toLocaleString("ru-KZ")} ₸</strong>
              </div>
              <div className="pricing-example__row">
                <span>Тренер ({exampleSportName.toLowerCase()}), вечер</span>
                <strong>
                  {exampleInstructorEveningMin !== null
                    ? `${exampleInstructorEveningMin.toLocaleString("ru-KZ")} ₸`
                    : "Уточняйте при бронировании"}
                </strong>
              </div>
              {exampleTotal !== null ? (
                <div className="pricing-example__row pricing-example__row--total">
                  <span>Итого</span>
                  <strong>{exampleTotal.toLocaleString("ru-KZ")} ₸</strong>
                </div>
              ) : (
                <div className="pricing-example__row pricing-example__row--total">
                  <span>Итого</span>
                  <strong>Зависит от выбранного тренера</strong>
                </div>
              )}
            </div>
          </div>
        ) : null}

        <div className="pricing-example__card">
          <h2 className="pricing-example__title">{pricesPageContent.trainerRangesTitle}</h2>
          <ul className="rule-list__notes">
            {trainerRangeBySport.map((row) => (
              <li key={row.sportSlug} className="rule-list__note">
                <strong>{row.sportName}:</strong>{" "}
                {row.hasTrainers && row.min !== null && row.max !== null
                  ? `от ${row.min.toLocaleString("ru-KZ")} ₸ до ${row.max.toLocaleString("ru-KZ")} ₸ / час`
                  : "Цены тренеров уточняйте при бронировании."}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <div className="pricing-page__footer-cta">
        <Link href="/book" className="card-grid__button">
          {pricesPageContent.ctaLabel}
        </Link>
      </div>
    </div>
  );
}
