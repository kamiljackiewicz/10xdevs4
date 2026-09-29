function isCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  if (year < 1 || month < 1 || month > 12 || day < 1) return false;
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  return day <= [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1];
}

export interface TimelineNoteInput {
  event_date: string;
  body: string;
}

export interface TimelineNote extends TimelineNoteInput {
  id: string;
  patient_id: string;
  created_at: string;
  updated_at: string;
}

export const timelineNoteColumns = "id,patient_id,event_date,body,created_at,updated_at";
export type TimelineNoteField = keyof TimelineNoteInput;
export type TimelineNoteErrorCode = "required" | "too_long" | "invalid_date" | "before_birth_date";
export type TimelineNoteErrors = Partial<Record<TimelineNoteField, TimelineNoteErrorCode>>;

export function normalizeNoteBody(value: string): string {
  return value.replace(/\r\n?/g, "\n").trim();
}

function codePointLength(value: string): number {
  return Array.from(value).length;
}

export function validateTimelineNote(
  input: unknown,
  birthDate: string | null,
): { ok: true; value: TimelineNoteInput } | { ok: false; errors: TimelineNoteErrors } {
  const fields = typeof input === "object" && input !== null && !Array.isArray(input) ? input : {};
  const eventDate = "event_date" in fields && typeof fields.event_date === "string" ? fields.event_date : "";
  const body = "body" in fields && typeof fields.body === "string" ? normalizeNoteBody(fields.body) : "";
  const errors: TimelineNoteErrors = {};
  if (!eventDate) errors.event_date = "required";
  else if (!isCalendarDate(eventDate)) errors.event_date = "invalid_date";
  else if (!birthDate || eventDate < birthDate) errors.event_date = "before_birth_date";
  if (!body) errors.body = "required";
  else if (codePointLength(body) > 5000) errors.body = "too_long";
  return Object.keys(errors).length ? { ok: false, errors } : { ok: true, value: { event_date: eventDate, body } };
}
