import { isCalendarDate } from "./patient-profile.ts";

export interface ResultHistoryDateInput {
  collection_date?: string | null;
  report_date?: string | null;
  manual_date?: string | null;
}

type DateField = keyof ResultHistoryDateInput;
type DateBasis = "collection" | "report" | "manual";

export type ResultHistoryDateResolution =
  | { ok: true; value: { date: string; basis: DateBasis } }
  | { ok: false; error: { field: DateField; code: "required" | "invalid_date" } };

export function resolveResultHistoryDate(input: ResultHistoryDateInput): ResultHistoryDateResolution {
  for (const [field, basis] of [
    ["collection_date", "collection"],
    ["report_date", "report"],
    ["manual_date", "manual"],
  ] as const) {
    const date = input[field];
    if (date === undefined || date === null || date === "") continue;
    if (!isCalendarDate(date)) return { ok: false, error: { field, code: "invalid_date" } };
    return { ok: true, value: { date, basis } };
  }
  return { ok: false, error: { field: "manual_date", code: "required" } };
}
