"use client";

import { useRouter, usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { t } from "@/src/lib/i18n";

const DAYS = [
  { label: t("admin.schedule.days.mon"), value: 1 },
  { label: t("admin.schedule.days.tue"), value: 2 },
  { label: t("admin.schedule.days.wed"), value: 3 },
  { label: t("admin.schedule.days.thu"), value: 4 },
  { label: t("admin.schedule.days.fri"), value: 5 },
  { label: t("admin.schedule.days.sat"), value: 6 },
  { label: t("admin.schedule.days.sun"), value: 0 },
];

const HOURS = Array.from({ length: 15 }, (_, i) => i + 7); // 7..21

const RU_MONTHS_SHORT = [
  t("admin.schedule.months.jan"),
  t("admin.schedule.months.feb"),
  t("admin.schedule.months.mar"),
  t("admin.schedule.months.apr"),
  t("admin.schedule.months.may"),
  t("admin.schedule.months.jun"),
  t("admin.schedule.months.jul"),
  t("admin.schedule.months.aug"),
  t("admin.schedule.months.sep"),
  t("admin.schedule.months.oct"),
  t("admin.schedule.months.nov"),
  t("admin.schedule.months.dec"),
];

interface ScheduleEntry {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

interface WeeklyScheduleGridProps {
  baseSchedule: ScheduleEntry[];
  weekStart: string | null;
  weekSchedule: ScheduleEntry[] | null;
  todayWeekStart: string;
  sportOptions: Array<{ id: string; name: string }>;
  saveBaseAction: (fd: FormData) => void | Promise<void>;
  saveWeekAction: (fd: FormData) => void | Promise<void>;
  resetWeekAction: (fd: FormData) => void | Promise<void>;
}

function expandToHourCells(schedules: ScheduleEntry[]): Set<string> {
  const cells = new Set<string>();
  for (const s of schedules) {
    const startHour = parseInt(s.startTime.split(":")[0], 10);
    const endHour = parseInt(s.endTime.split(":")[0], 10);
    for (let h = startHour; h < endHour; h++) {
      cells.add(`${s.dayOfWeek}:${h}`);
    }
  }
  return cells;
}

function addDaysToDate(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().split("T")[0];
}

function getWeekLabel(weekStartStr: string): string {
  const mon = new Date(weekStartStr + "T12:00:00Z");
  const sun = new Date(weekStartStr + "T12:00:00Z");
  sun.setUTCDate(sun.getUTCDate() + 6);
  const monDay = mon.getUTCDate();
  const sunDay = sun.getUTCDate();
  const monMonth = RU_MONTHS_SHORT[mon.getUTCMonth()];
  const sunMonth = RU_MONTHS_SHORT[sun.getUTCMonth()];
  if (mon.getUTCMonth() === sun.getUTCMonth()) {
    return `${monDay}–${sunDay} ${sunMonth}`;
  }
  return `${monDay} ${monMonth}–${sunDay} ${sunMonth}`;
}

function cellKey(day: number, hour: number): string {
  return `${day}:${hour}`;
}

function cellSlot(day: number, hour: number): string {
  const start = `${hour.toString().padStart(2, "0")}:00`;
  const end = `${(hour + 1).toString().padStart(2, "0")}:00`;
  return `${day}:${start}:${end}`;
}

function isCoveredBySchedule(dayOfWeek: number, hour: number, schedules: ScheduleEntry[]): boolean {
  const hourStr = `${hour.toString().padStart(2, "0")}:00`;
  return schedules.some(
    (s) => s.dayOfWeek === dayOfWeek && s.startTime <= hourStr && s.endTime > hourStr,
  );
}

function GridRows({
  hours,
  days,
  renderCell,
}: {
  hours: number[];
  days: typeof DAYS;
  renderCell: (day: (typeof DAYS)[0], hour: number) => ReactNode;
}) {
  return (
    <>
      {hours.map((hour) => (
        <div key={hour} className="schedule-grid__row">
          <div className="schedule-grid__hour-label">{hour.toString().padStart(2, "0")}:00</div>
          {days.map((day) => renderCell(day, hour))}
        </div>
      ))}
    </>
  );
}

export function WeeklyScheduleGrid({
  baseSchedule,
  weekStart,
  weekSchedule,
  todayWeekStart,
  sportOptions,
  saveBaseAction,
  saveWeekAction,
  resetWeekAction,
}: WeeklyScheduleGridProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [editMode, setEditMode] = useState(false);
  const [selectedCells, setSelectedCells] = useState<Set<string>>(new Set());

  const isBaseMode = weekStart === null;
  const hasWeekOverride = weekStart !== null && weekSchedule !== null;
  const usesBaseTemplate = weekStart !== null && weekSchedule === null;

  const refWeek = weekStart ?? todayWeekStart;
  const prevWeekStr = addDaysToDate(refWeek, -7);
  const nextWeekStr = addDaysToDate(refWeek, 7);

  function navigateTo(week: string | null) {
    if (week) {
      router.push(`${pathname}?week=${week}`);
    } else {
      router.push(pathname);
    }
  }

  function handleEnterEdit(prefilledFrom: ScheduleEntry[]) {
    setSelectedCells(expandToHourCells(prefilledFrom));
    setEditMode(true);
  }

  function handleCancelEdit() {
    setSelectedCells(new Set());
    setEditMode(false);
  }

  function toggleCell(day: number, hour: number) {
    const key = cellKey(day, hour);
    setSelectedCells((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  const selectedSlots = Array.from(selectedCells).map((key) => {
    const [day, hour] = key.split(":").map(Number);
    return cellSlot(day, hour);
  });

  // Banner
  let bannerText = "";
  let bannerMod = "";
  if (editMode) {
    bannerText = t("admin.schedule.banner.editing");
    bannerMod = "editing";
  } else if (usesBaseTemplate) {
    bannerText = t("admin.schedule.banner.template");
    bannerMod = "template";
  } else if (hasWeekOverride) {
    bannerText = t("admin.schedule.banner.custom");
    bannerMod = "custom";
  }

  const sportSelector = sportOptions.length > 0 ? (
    <div className="schedule-grid__sport-row">
      <label className="admin-form__label" htmlFor="grid-sport">
        {t("admin.schedule.sportLabel")}
      </label>
      <select id="grid-sport" name="sportId" className="admin-form__field schedule-grid__sport-select">
        <option value="">{t("admin.schedule.allSports")}</option>
        {sportOptions.map((sport) => (
          <option key={sport.id} value={sport.id}>
            {sport.name}
          </option>
        ))}
      </select>
    </div>
  ) : null;

  return (
    <div className="schedule-grid__wrapper">
      {/* Week navigation */}
      <div className="schedule-grid__nav">
        <button
          type="button"
          className="schedule-grid__nav-btn"
          onClick={() => navigateTo(prevWeekStr)}
        >
          {t("admin.schedule.prevWeek")}
        </button>
        <button
          type="button"
          className={`schedule-grid__nav-btn${isBaseMode ? " schedule-grid__nav-btn--active" : ""}`}
          onClick={() => navigateTo(null)}
        >
          {t("admin.schedule.baseTemplate")}
        </button>
        <button
          type="button"
          className={`schedule-grid__nav-btn${!isBaseMode ? " schedule-grid__nav-btn--active" : ""}`}
          onClick={() => navigateTo(weekStart ?? todayWeekStart)}
        >
          {t("admin.schedule.weekLabel", { week: getWeekLabel(refWeek) })}
        </button>
        <button
          type="button"
          className="schedule-grid__nav-btn"
          onClick={() => navigateTo(nextWeekStr)}
        >
          {t("admin.schedule.nextWeek")}
        </button>
      </div>

      {/* Banner */}
      {bannerText && (
        <div className={`schedule-grid__banner schedule-grid__banner--${bannerMod}`}>
          {bannerText}
        </div>
      )}

      {/* Edit form */}
      {editMode && (
        <form
          action={isBaseMode ? saveBaseAction : saveWeekAction}
          onSubmit={() => { setSelectedCells(new Set()); setEditMode(false); }}
          className="schedule-grid__form"
        >
          {!isBaseMode && weekStart && (
            <input type="hidden" name="weekStart" value={weekStart} />
          )}
          {selectedSlots.map((slot) => (
            <input key={slot} type="hidden" name="slot" value={slot} />
          ))}
          {sportSelector}

          <div className="schedule-grid">
            <div className="schedule-grid__header">
              <div className="schedule-grid__hour-label" />
              {DAYS.map((day) => (
                <div key={day.value} className="schedule-grid__day-label">
                  {day.label}
                </div>
              ))}
            </div>
            <GridRows
              hours={HOURS}
              days={DAYS}
              renderCell={(day, hour) => {
                const selected = selectedCells.has(cellKey(day.value, hour));
                return (
                  <button
                    key={day.value}
                    type="button"
                    className={`schedule-grid__cell${selected ? " schedule-grid__cell--selected" : ""}`}
                    aria-pressed={selected}
                    aria-label={`${day.label} ${hour}:00`}
                    onClick={() => toggleCell(day.value, hour)}
                  />
                );
              }}
            />
          </div>

          <div className="schedule-grid__actions">
            <span className="schedule-grid__hint">
              {selectedCells.size > 0
                ? t("admin.schedule.selectedCells", { count: selectedCells.size })
                : t("admin.schedule.noSelectedCells")}
            </span>
            <div className="schedule-grid__action-group">
              <button type="button" className="admin-form__cancel" onClick={handleCancelEdit}>
                {t("admin.common.cancel")}
              </button>
              <button type="submit" className="admin-form__submit">
                {isBaseMode ? t("admin.schedule.saveTemplate") : t("admin.schedule.saveWeek")}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* View-only grid (all non-edit states) */}
      {!editMode && (
        <>
          <div className="schedule-grid">
            <div className="schedule-grid__header">
              <div className="schedule-grid__hour-label" />
              {DAYS.map((day) => (
                <div key={day.value} className="schedule-grid__day-label">
                  {day.label}
                </div>
              ))}
            </div>
            <GridRows
              hours={HOURS}
              days={DAYS}
              renderCell={(day, hour) => {
                const covered = isBaseMode
                  ? isCoveredBySchedule(day.value, hour, baseSchedule)
                  : hasWeekOverride && weekSchedule
                    ? isCoveredBySchedule(day.value, hour, weekSchedule)
                    : false;
                const isTemplate = usesBaseTemplate
                  ? isCoveredBySchedule(day.value, hour, baseSchedule)
                  : false;
                return (
                  <div
                    key={day.value}
                    className={`schedule-grid__cell${covered ? " schedule-grid__cell--covered" : isTemplate ? " schedule-grid__cell--template" : ""}`}
                    role="presentation"
                  />
                );
              }}
            />
          </div>

          <div className="schedule-grid__actions">
            {isBaseMode && (
              <button
                type="button"
                className="admin-form__submit"
                onClick={() => handleEnterEdit(baseSchedule)}
              >
                {t("admin.schedule.edit")}
              </button>
            )}
            {usesBaseTemplate && (
              <button
                type="button"
                className="admin-form__submit"
                onClick={() => handleEnterEdit(baseSchedule)}
              >
                {t("admin.schedule.customizeWeek")}
              </button>
            )}
            {hasWeekOverride && (
              <div className="schedule-grid__action-group">
                <form action={resetWeekAction}>
                  <input type="hidden" name="weekStart" value={weekStart!} />
                  <button type="submit" className="admin-form__cancel">
                    {t("admin.schedule.resetToTemplate")}
                  </button>
                </form>
                <button
                  type="button"
                  className="admin-form__submit"
                  onClick={() => handleEnterEdit(weekSchedule!)}
                >
                  {t("admin.schedule.change")}
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
