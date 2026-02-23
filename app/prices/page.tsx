import { PageHero } from "@/src/components/page-hero";
import {
  pricesPageContent,
  pricingNotes,
  pricingTierRows,
} from "@/src/lib/content/site-data";
import { getComponentPriceMatrix } from "@/src/lib/settings/service";

export const metadata = {
  title: "Цены | Padel & Squash KZ",
};

export const dynamic = "force-dynamic";

export default async function PricesPage() {
  const matrix = await getComponentPriceMatrix();
  const publicPriceMatrixRows = matrix.map((row) => ({
    item: row.label,
    morning: `${row.values.morning.toLocaleString("ru-KZ")} ₸`,
    day: `${row.values.day.toLocaleString("ru-KZ")} ₸`,
    eveningWeekend: `${row.values.evening_weekend.toLocaleString("ru-KZ")} ₸`,
  }));

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
    </div>
  );
}
