interface FaqItem {
  question: string;
  answer: string;
}

export function FaqAccordion({ items }: { items: readonly FaqItem[] }) {
  return (
    <div className="faq-accordion">
      {items.map((item) => (
        <details key={item.question} className="faq-accordion__item">
          <summary className="faq-accordion__trigger">
            <span className="faq-accordion__q">{item.question}</span>
            <span className="faq-accordion__icon" aria-hidden="true">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          </summary>
          <div className="faq-accordion__body">
            <p className="faq-accordion__answer">{item.answer}</p>
          </div>
        </details>
      ))}
    </div>
  );
}
