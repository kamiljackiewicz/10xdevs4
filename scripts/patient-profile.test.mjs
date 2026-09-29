import assert from "node:assert/strict";
import test from "node:test";
import { utcToday, validateProfile } from "../src/lib/patient-profile.ts";

const valid = { first_name: "Anna", last_name: "Nowak", date_of_birth: "2000-02-29", sex: "female" };
const today = "2026-09-29";

test("profile validation requires all four fields and rejects non-object input", () => {
  for (const input of [undefined, null, [], {}, "name", 123]) {
    assert.deepEqual(validateProfile(input, today), {
      ok: false,
      errors: { first_name: "required", last_name: "required", date_of_birth: "required", sex: "required" },
    });
  }
  assert.equal(validateProfile({ ...valid, first_name: " \t\n " }, today).errors.first_name, "required");
});

test("surname is required, trimmed and limited to 100 Unicode code points", () => {
  for (const last_name of [undefined, null, "", " \t\n ", 42]) {
    assert.equal(validateProfile({ ...valid, last_name }, today).errors.last_name, "required");
  }
  assert.deepEqual(validateProfile({ ...valid, last_name: "  Nowak  " }, today), { ok: true, value: valid });
  for (const last_name of ["Kowalska-Nowak", "O'Connor", "李", "😀".repeat(100)]) {
    assert.equal(validateProfile({ ...valid, last_name }, today).ok, true);
  }
  assert.equal(validateProfile({ ...valid, last_name: "A".repeat(101) }, today).errors.last_name, "too_long");
  assert.equal(validateProfile({ ...valid, last_name: "😀".repeat(101) }, today).errors.last_name, "too_long");
});

test("valid fields are normalized without accepting ownership or timestamp fields", () => {
  assert.deepEqual(
    validateProfile({ ...valid, first_name: "  Anna  ", id: "foreign", owner_id: "foreign", updated_at: "x" }, today),
    {
      ok: true,
      value: valid,
    },
  );
  assert.equal(validateProfile({ ...valid, sex: "male", first_name: "A".repeat(100) }, today).ok, true);
  assert.equal(validateProfile({ ...valid, first_name: "A".repeat(101) }, today).errors.first_name, "too_long");
  assert.equal(validateProfile({ ...valid, first_name: "😀".repeat(100) }, today).ok, true);
});

test("birth date is a real calendar date stored as a date-only string", () => {
  for (const date_of_birth of [
    "1900-02-29",
    "2025-02-29",
    "2000-02-30",
    "2026-04-31",
    "0000-01-01",
    "2026-00-01",
    "2026-13-01",
    "2026-01-00",
    "2026-9-01",
    "2000-01-01T00:00:00Z",
    "infinity",
  ]) {
    assert.equal(
      validateProfile({ ...valid, date_of_birth }, today).errors.date_of_birth,
      "invalid_date",
      date_of_birth,
    );
  }
  for (const date_of_birth of ["0001-01-01", "2000-02-29", today]) {
    assert.equal(validateProfile({ ...valid, date_of_birth }, today).value.date_of_birth, date_of_birth);
  }
  assert.equal(validateProfile({ ...valid, date_of_birth: "2026-09-30" }, today).errors.date_of_birth, "future_date");
});

test("UTC date boundary is independent from local timezones", () => {
  assert.equal(utcToday(new Date("2026-09-30T00:30:00+02:00")), "2026-09-29");
  assert.equal(utcToday(new Date("2026-09-29T23:30:00-02:00")), "2026-09-30");
});

test("sex allows exactly female or male", () => {
  for (const sex of ["other", "Female", "MALE", 0, {}, true]) {
    assert.equal(validateProfile({ ...valid, sex }, today).errors.sex, "invalid_sex");
  }
});
