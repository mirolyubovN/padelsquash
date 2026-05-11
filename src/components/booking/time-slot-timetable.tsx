import type { ReactNode } from "react";
import { t } from "@/src/lib/i18n";

export type TimetableSlot = {
  startTime: string;
  endTime: string;
  availableCourtIds: string[];
};

export type TimetableColumn = {
  id: string;
  label: string;
};

export function TimeSlotTimetable({
  slots,
  columns,
  isSelected,
  onCellClick,
  getCellContent,
  getTimeCellExtra,
  wrapperClassName,
  cellClassName,
}: {
  slots: TimetableSlot[];
  columns: TimetableColumn[];
  isSelected: (startTime: string, columnId: string) => boolean;
  onCellClick: (startTime: string, columnId: string) => void;
  getCellContent: (
    slot: TimetableSlot,
    col: TimetableColumn,
    isSelected: boolean,
    isAvailable: boolean,
  ) => ReactNode;
  getTimeCellExtra?: (slot: TimetableSlot) => ReactNode;
  wrapperClassName?: string;
  cellClassName?: string;
}) {
  return (
    <div className={`booking-flow__timetable-wrapper${wrapperClassName ? ` ${wrapperClassName}` : ""}`}>
      <table className="booking-flow__timetable">
        <thead>
          <tr>
            <th className="booking-flow__timetable-time-header">{t("booking.timeSlotTimetable.timeHeader")}</th>
            {columns.map((col) => (
              <th key={col.id} className="booking-flow__timetable-col-header">
                <span className="booking-flow__timetable-col-name">{col.label}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {slots.map((slot) => (
            <tr key={slot.startTime} className="booking-flow__timetable-row">
              <td className="booking-flow__timetable-time-cell">
                <span className="booking-flow__timetable-time-label">
                  {slot.startTime}–{slot.endTime}
                </span>
                {getTimeCellExtra?.(slot)}
              </td>
              {columns.map((col) => {
                const available = slot.availableCourtIds.includes(col.id);
                const selected = isSelected(slot.startTime, col.id);
                return (
                  <td key={col.id} className="booking-flow__timetable-cell-wrapper">
                    <button
                      type="button"
                      disabled={!available}
                      className={`booking-flow__timetable-cell${cellClassName ? ` ${cellClassName}` : ""}${
                        selected
                          ? " booking-flow__timetable-cell--selected" + (cellClassName ? ` ${cellClassName}--active` : "")
                          : available
                          ? " booking-flow__timetable-cell--available"
                          : " booking-flow__timetable-cell--unavailable"
                      }`}
                      onClick={() => available && onCellClick(slot.startTime, col.id)}
                    >
                      {getCellContent(slot, col, selected, available)}
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
