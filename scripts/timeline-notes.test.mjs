import assert from "node:assert/strict";
import test from "node:test";
import { normalizeNoteBody, validateTimelineNote } from "../src/lib/timeline-notes.ts";

const birthDate = "2000-02-29";
const valid = { event_date: birthDate, body: "A note" };

test("timeline notes normalize newlines and edge whitespace", () => {
  assert.equal(normalizeNoteBody(" \r\nfirst\rsecond\n "), "first\nsecond");
  assert.deepEqual(validateTimelineNote({ ...valid, body: "  hello\r\n\r\nworld  " }, birthDate), {
    ok: true,
    value: { event_date: birthDate, body: "hello\n\nworld" },
  });
});

test("timeline notes validate required body, Unicode limit, and calendar dates", () => {
  for (const body of [undefined, null, "", " \t\n "])
    assert.equal(validateTimelineNote({ ...valid, body }, birthDate).errors.body, "required");
  assert.equal(validateTimelineNote({ ...valid, body: "😀".repeat(5000) }, birthDate).ok, true);
  assert.equal(validateTimelineNote({ ...valid, body: "😀".repeat(5001) }, birthDate).errors.body, "too_long");
  for (const event_date of ["2000-02-30", "1900-02-29", "0000-01-01", "2000-2-29"]) {
    assert.equal(validateTimelineNote({ ...valid, event_date }, birthDate).errors.event_date, "invalid_date");
  }
});

test("timeline notes permit birth day and future days but reject days before birth", () => {
  assert.equal(validateTimelineNote(valid, birthDate).ok, true);
  assert.equal(validateTimelineNote({ ...valid, event_date: "2030-01-01" }, birthDate).ok, true);
  assert.equal(
    validateTimelineNote({ ...valid, event_date: "2000-02-28" }, birthDate).errors.event_date,
    "before_birth_date",
  );
  assert.equal(validateTimelineNote(valid, null).errors.event_date, "before_birth_date");
});
