import assert from "node:assert/strict";
import test from "node:test";
import { resolveResultHistoryDate } from "../src/lib/result-history-date.ts";

test("collection date takes precedence over report date and retains its source", () => {
  assert.deepEqual(resolveResultHistoryDate({ collection_date: "2024-05-17", report_date: "2024-05-20" }), {
    ok: true,
    value: { date: "2024-05-17", basis: "collection" },
  });
  for (const collection_date of ["2000-02-29", "2024-03-31", "2024-11-03", "2030-01-01"]) {
    assert.deepEqual(resolveResultHistoryDate({ collection_date, report_date: "invalid", manual_date: "invalid" }), {
      ok: true,
      value: { date: collection_date, basis: "collection" },
    });
  }
});

test("report date is selected when collection date is absent", () => {
  for (const collection_date of [undefined, null, ""]) {
    assert.deepEqual(
      resolveResultHistoryDate({ collection_date, report_date: "2024-05-20", manual_date: "2024-05-22" }),
      { ok: true, value: { date: "2024-05-20", basis: "report" } },
    );
  }
  assert.deepEqual(resolveResultHistoryDate({ report_date: "2024-05-20", manual_date: "invalid" }), {
    ok: true,
    value: { date: "2024-05-20", basis: "report" },
  });
});

test("manual date is selected when both source dates are absent", () => {
  for (const collection_date of [undefined, null, ""]) {
    for (const report_date of [undefined, null, ""]) {
      assert.deepEqual(resolveResultHistoryDate({ collection_date, report_date, manual_date: "2024-03-31" }), {
        ok: true,
        value: { date: "2024-03-31", basis: "manual" },
      });
    }
  }
});

test("missing dates require a manual date instead of choosing a day", () => {
  for (const collection_date of [undefined, null, ""]) {
    for (const report_date of [undefined, null, ""]) {
      for (const manual_date of [undefined, null, ""]) {
        assert.deepEqual(resolveResultHistoryDate({ collection_date, report_date, manual_date }), {
          ok: false,
          error: { field: "manual_date", code: "required" },
        });
      }
    }
  }
});

test("invalid selected dates identify the field and never fall back to a lower source", () => {
  for (const invalid of [
    "2025-02-30",
    "1900-02-29",
    "2025-02-29",
    "0000-01-01",
    "2024-5-17",
    " ",
    "2024-05-17T00:00:00Z",
  ]) {
    for (const [field, input] of [
      ["collection_date", { collection_date: invalid, report_date: "2024-05-20", manual_date: "2024-05-22" }],
      ["report_date", { report_date: invalid, manual_date: "2024-05-22" }],
      ["manual_date", { manual_date: invalid }],
    ]) {
      assert.deepEqual(
        resolveResultHistoryDate(input),
        { ok: false, error: { field, code: "invalid_date" } },
        `${field}: ${invalid}`,
      );
    }
  }
});
