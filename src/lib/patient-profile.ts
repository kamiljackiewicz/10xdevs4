export interface ProfileInput {
  first_name: string;
  last_name: string;
  date_of_birth: string;
  sex: "female" | "male";
}

export interface Patient {
  id: string;
  first_name: string | null;
  last_name: string | null;
  date_of_birth: string | null;
  sex: "female" | "male" | null;
  created_at: string;
  updated_at: string;
}

export const patientColumns = "id,first_name,last_name,date_of_birth,sex,created_at,updated_at";
export type ProfileField = keyof ProfileInput;
export type ProfileErrorCode = "required" | "too_long" | "invalid_date" | "future_date" | "invalid_sex";
export type ProfileErrors = Partial<Record<ProfileField, ProfileErrorCode>>;

export function utcToday(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

function isCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  if (year < 1 || month < 1 || month > 12 || day < 1) return false;
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return day <= days[month - 1];
}

export function validateProfile(
  input: unknown,
  today = utcToday(),
): { ok: true; value: ProfileInput } | { ok: false; errors: ProfileErrors } {
  const fields = typeof input === "object" && input !== null && !Array.isArray(input) ? input : {};
  const firstName = "first_name" in fields && typeof fields.first_name === "string" ? fields.first_name.trim() : "";
  const lastName = "last_name" in fields && typeof fields.last_name === "string" ? fields.last_name.trim() : "";
  const dateOfBirth = "date_of_birth" in fields && typeof fields.date_of_birth === "string" ? fields.date_of_birth : "";
  const sex = "sex" in fields ? fields.sex : undefined;
  const errors: ProfileErrors = {};
  for (const [field, value] of [
    ["first_name", firstName],
    ["last_name", lastName],
  ] as const) {
    let nameLength = 0;
    for (const _character of value) nameLength += 1;
    if (!value) errors[field] = "required";
    else if (nameLength > 100) errors[field] = "too_long";
  }
  if (!dateOfBirth) errors.date_of_birth = "required";
  else if (!isCalendarDate(dateOfBirth)) errors.date_of_birth = "invalid_date";
  else if (dateOfBirth > today) errors.date_of_birth = "future_date";
  if (sex === undefined || sex === null || sex === "") errors.sex = "required";
  else if (sex !== "female" && sex !== "male") errors.sex = "invalid_sex";
  if (Object.keys(errors).length > 0 || (sex !== "female" && sex !== "male")) return { ok: false, errors };
  return { ok: true, value: { first_name: firstName, last_name: lastName, date_of_birth: dateOfBirth, sex } };
}
