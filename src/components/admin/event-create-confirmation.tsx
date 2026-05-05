"use client";

import { useEffect, useRef, useState } from "react";

interface EventCreateSummary {
  title: string;
  sport: string;
  courts: string[];
  date: string;
  startTime: string;
  durationMin: string;
  priceKzt: string;
  capacity: string;
  recurrence: string;
  repeatCount: string;
  publish: boolean;
}

function fieldValue(formData: FormData, name: string): string {
  return String(formData.get(name) ?? "").trim();
}

function selectedOptionText(form: HTMLFormElement, name: string): string {
  const select = form.elements.namedItem(name);
  if (!(select instanceof HTMLSelectElement)) return "";
  return select.selectedOptions[0]?.textContent?.trim() ?? "";
}

function selectedCourtLabels(form: HTMLFormElement): string[] {
  return Array.from(form.querySelectorAll<HTMLInputElement>('input[name="courtIds"]:checked'))
    .map((input) => input.closest("label")?.textContent?.trim().replace(/\s+/g, " ") ?? input.value)
    .filter(Boolean);
}

export function EventCreateConfirmation() {
  const rootRef = useRef<HTMLDivElement>(null);
  const allowSubmitRef = useRef(false);
  const [summary, setSummary] = useState<EventCreateSummary | null>(null);

  useEffect(() => {
    const form = rootRef.current?.closest("form");
    if (!form) return undefined;

    const handleSubmit = (event: SubmitEvent) => {
      if (allowSubmitRef.current) {
        allowSubmitRef.current = false;
        return;
      }

      if (!form.checkValidity()) return;

      event.preventDefault();
      const formData = new FormData(form);
      const recurrence = fieldValue(formData, "recurrence");
      setSummary({
        title: fieldValue(formData, "title"),
        sport: selectedOptionText(form, "sportId"),
        courts: selectedCourtLabels(form),
        date: fieldValue(formData, "date"),
        startTime: fieldValue(formData, "startTime"),
        durationMin: fieldValue(formData, "durationMin"),
        priceKzt: fieldValue(formData, "priceKzt"),
        capacity: fieldValue(formData, "capacity"),
        recurrence: recurrence === "weekly" ? "Еженедельно" : "Один раз",
        repeatCount: fieldValue(formData, "repeatCount") || "1",
        publish: formData.get("publish") === "on",
      });
    };

    form.addEventListener("submit", handleSubmit);
    return () => form.removeEventListener("submit", handleSubmit);
  }, []);

  function confirmSubmit() {
    const form = rootRef.current?.closest("form");
    if (!form) return;
    allowSubmitRef.current = true;
    setSummary(null);
    form.requestSubmit();
  }

  return (
    <div ref={rootRef}>
      {summary ? (
        <div className="admin-confirmation" role="alertdialog" aria-modal="true" aria-labelledby="event-create-confirm-title">
          <div className="admin-confirmation__panel">
            <h3 id="event-create-confirm-title" className="admin-confirmation__title">
              Подтвердить создание события
            </h3>
            <dl className="admin-confirmation__list">
              <div><dt>Название</dt><dd>{summary.title}</dd></div>
              <div><dt>Спорт</dt><dd>{summary.sport}</dd></div>
              <div><dt>Корты</dt><dd>{summary.courts.length > 0 ? summary.courts.join(", ") : "Не выбраны"}</dd></div>
              <div><dt>Дата и время</dt><dd>{summary.date}, {summary.startTime}</dd></div>
              <div><dt>Длительность</dt><dd>{summary.durationMin} мин</dd></div>
              <div><dt>Цена</dt><dd>{Number(summary.priceKzt || 0).toLocaleString("ru-KZ")} ₸</dd></div>
              <div><dt>Лимит</dt><dd>{summary.capacity} участников</dd></div>
              <div><dt>Повтор</dt><dd>{summary.recurrence}{summary.recurrence === "Еженедельно" ? `, ${summary.repeatCount} недель` : ""}</dd></div>
              <div><dt>Публикация</dt><dd>{summary.publish ? "Опубликовать сразу" : "Черновик"}</dd></div>
            </dl>
            <div className="admin-confirmation__actions">
              <button type="button" className="admin-form__submit" onClick={confirmSubmit}>
                Подтвердить и создать
              </button>
              <button type="button" className="admin-form__cancel" onClick={() => setSummary(null)}>
                Вернуться к форме
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
