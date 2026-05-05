"use client";

import { useEffect, useMemo, useRef, useState } from "react";

interface SportOption {
  id: string;
  name: string;
}

interface CourtOption {
  id: string;
  name: string;
  sportId: string;
  locationId: string;
  sport: { name: string };
  location: { name: string };
}

interface EventCourtPickerProps {
  sports: SportOption[];
  courts: CourtOption[];
  defaultSportId?: string | null;
  defaultCourtIds?: string[];
  idPrefix: string;
}

export function EventCourtPicker({
  sports,
  courts,
  defaultSportId,
  defaultCourtIds = [],
  idPrefix,
}: EventCourtPickerProps) {
  const initialSportId = defaultSportId || sports[0]?.id || "";
  const [sportId, setSportId] = useState(initialSportId);
  const [selectedCourtIds, setSelectedCourtIds] = useState(() => new Set(defaultCourtIds));
  const [error, setError] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const sportCourts = useMemo(() => courts.filter((court) => court.sportId === sportId), [courts, sportId]);
  const selectedSportCourtCount = sportCourts.filter((court) => selectedCourtIds.has(court.id)).length;

  useEffect(() => {
    const form = rootRef.current?.closest("form");
    if (!form) return undefined;

    const handleSubmit = (event: SubmitEvent) => {
      if (!sportId) {
        setError("Выберите спорт для события");
        event.preventDefault();
        return;
      }

      if (selectedSportCourtCount === 0) {
        setError("Выберите минимум один корт для события");
        event.preventDefault();
      }
    };

    form.addEventListener("submit", handleSubmit);
    return () => form.removeEventListener("submit", handleSubmit);
  }, [selectedSportCourtCount, sportId]);

  function toggleCourt(courtId: string, checked: boolean) {
    setError(null);
    setSelectedCourtIds((current) => {
      const next = new Set(current);
      if (checked) {
        next.add(courtId);
      } else {
        next.delete(courtId);
      }
      return next;
    });
  }

  return (
    <div className="admin-event-court-picker" ref={rootRef}>
      <div className="admin-form__group">
        <label className="admin-form__label" htmlFor={`${idPrefix}-sport`}>
          Спорт
        </label>
        <select
          id={`${idPrefix}-sport`}
          name="sportId"
          className="admin-form__field"
          required
          value={sportId}
          onChange={(event) => {
            setError(null);
            setSportId(event.target.value);
          }}
        >
          <option value="" disabled>
            Выберите спорт
          </option>
          {sports.map((sport) => (
            <option key={sport.id} value={sport.id}>
              {sport.name}
            </option>
          ))}
        </select>
      </div>

      <fieldset className="admin-form__group admin-event-court-picker__fieldset">
        <legend className="admin-form__label">Корты для события</legend>
        {sportCourts.length === 0 ? (
          <p className="admin-event-court-picker__hint">Для выбранного спорта нет активных кортов.</p>
        ) : (
          <div className="admin-event-court-picker__options">
            {sportCourts.map((court) => (
              <label key={court.id} className="admin-event-court-picker__option">
                <input
                  type="checkbox"
                  name="courtIds"
                  value={court.id}
                  checked={selectedCourtIds.has(court.id)}
                  onChange={(event) => toggleCourt(court.id, event.target.checked)}
                />
                <span>
                  {court.name}
                  <small>{court.location.name}</small>
                </span>
              </label>
            ))}
          </div>
        )}
        {error ? (
          <p className="admin-event-court-picker__error" role="alert">
            {error}
          </p>
        ) : null}
      </fieldset>
    </div>
  );
}
