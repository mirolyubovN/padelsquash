export type BookingServiceKind = "court" | "training";

export interface BookingUrlSelectedCell {
  timeKey: string;
  resourceId: string;
  holdId?: string;
}

export interface BookingUrlState {
  sport?: string;
  serviceKind?: BookingServiceKind;
  date?: string;
  instructorId?: string;
  selectedCells: BookingUrlSelectedCell[];
}

export const SELECTED_CELL_QUERY_PARAM = "cell";

type SearchParamInput = URLSearchParams | Record<string, string | string[] | undefined>;

function getSearchParamValue(input: SearchParamInput, key: string): string | undefined {
  if (input instanceof URLSearchParams) {
    return input.get(key) ?? undefined;
  }

  const value = input[key];
  return Array.isArray(value) ? value[0] : value;
}

function getSearchParamValues(input: SearchParamInput, key: string): string[] {
  if (input instanceof URLSearchParams) {
    return input.getAll(key);
  }

  const value = input[key];
  if (Array.isArray(value)) {
    return value;
  }
  return value ? [value] : [];
}

export function encodeSelectedCellQueryValue(cell: BookingUrlSelectedCell): string {
  if (cell.holdId) {
    return `${cell.timeKey}::${cell.resourceId}::${cell.holdId}`;
  }
  return `${cell.timeKey}::${cell.resourceId}`;
}

export function decodeSelectedCellQueryValue(value: string): BookingUrlSelectedCell | null {
  const parts = value.split("::");
  if (parts.length < 2 || parts.length > 3) {
    return null;
  }

  const [timeKey, resourceId, holdId] = parts;

  if (!timeKey.includes("|") || resourceId.length === 0) {
    return null;
  }

  return { timeKey, resourceId, holdId: holdId || undefined };
}

export function parseBookingUrlState(input: SearchParamInput): BookingUrlState {
  const serviceValue = getSearchParamValue(input, "service");

  return {
    sport: getSearchParamValue(input, "sport"),
    serviceKind: serviceValue === "court" || serviceValue === "training" ? serviceValue : undefined,
    date: getSearchParamValue(input, "date"),
    instructorId: getSearchParamValue(input, "instructor"),
    selectedCells: getSearchParamValues(input, SELECTED_CELL_QUERY_PARAM)
      .map((value) => decodeSelectedCellQueryValue(value))
      .filter((value): value is BookingUrlSelectedCell => value !== null),
  };
}
