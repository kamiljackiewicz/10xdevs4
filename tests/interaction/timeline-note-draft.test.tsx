import { render, screen } from "@testing-library/react/pure";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, test } from "vitest";
import TimelineNotes from "@/components/patient/TimelineNotes";
import { messages, type Locale, type Messages } from "@/lib/i18n";
import type { TimelineNote } from "@/lib/timeline-notes";
import { server } from "./http";

const existingNote: TimelineNote = {
  id: "11111111-1111-4111-8111-111111111111",
  patient_id: "22222222-2222-4222-8222-222222222222",
  event_date: "2023-03-12",
  body: "Poprzednia zapisana notatka",
  created_at: "2023-03-12T12:00:00Z",
  updated_at: "2023-03-12T12:00:00Z",
};

const modes = [
  { name: "create", method: "post", expectedMethod: "POST", url: "http://localhost/api/timeline-notes" },
  {
    name: "edit",
    method: "patch",
    expectedMethod: "PATCH",
    url: "http://localhost/api/timeline-notes/11111111-1111-4111-8111-111111111111",
  },
] as const;
type Mode = (typeof modes)[number];

interface CapturedRequest {
  method: string;
  url: string;
  contentType: string | null;
  body: unknown;
}

interface NoteForm {
  user: ReturnType<typeof userEvent.setup>;
  t: Readonly<Messages>;
  heading: string;
  date: HTMLInputElement;
  body: HTMLTextAreaElement;
  save: HTMLButtonElement;
  cancel: HTMLButtonElement;
}

const failures = [
  {
    name: "JSON 400",
    fieldError: true,
    message: "timelineBeforeBirthDate",
    // Models the server rejecting a date that was valid for the rendered birthDate.
    response: () =>
      HttpResponse.json({ error: "validation_failed", errors: { event_date: "before_birth_date" } }, { status: 400 }),
  },
  {
    name: "JSON 401",
    fieldError: false,
    message: "timelineUnauthorized",
    response: () => HttpResponse.json({ error: "unauthorized" }, { status: 401 }),
  },
  {
    name: "JSON 409",
    fieldError: false,
    message: "timelineBirthDateRequired",
    response: () => HttpResponse.json({ error: "birth_date_required" }, { status: 409 }),
  },
  {
    name: "JSON 500",
    fieldError: false,
    message: "errorGeneric",
    response: () => HttpResponse.json({ error: "server_error" }, { status: 500 }),
  },
  {
    name: "transport error",
    fieldError: false,
    message: "timelineNetworkAmbiguous",
    response: () => HttpResponse.error(),
  },
  {
    name: "HTTP 502 with non-JSON body",
    fieldError: false,
    message: "timelineNetworkAmbiguous",
    response: () => HttpResponse.html("<h1>Bad Gateway</h1>", { status: 502 }),
  },
] as const;

async function openForm(mode: Mode, locale: Locale): Promise<NoteForm> {
  const user = userEvent.setup();
  const t = messages[locale];
  const heading = mode.name === "edit" ? t.editTimelineNote : t.createTimelineNote;
  render(
    <TimelineNotes
      notes={mode.name === "edit" ? [existingNote] : []}
      birthDate="2000-01-01"
      messages={t}
      locale={locale}
      page={1}
      hasNext={false}
    />,
  );
  await user.click(screen.getByRole("button", { name: heading }));
  const date = screen.getByLabelText<HTMLInputElement>(t.eventDate);
  const body = screen.getByLabelText<HTMLTextAreaElement>(t.noteBody);
  if (mode.name === "edit") {
    expect(date.value).toBe("2023-03-12");
    expect(body.value).toBe("Poprzednia zapisana notatka");
  }
  return {
    user,
    t,
    heading,
    date,
    body,
    save: screen.getByRole<HTMLButtonElement>("button", { name: t.saveTimelineNote }),
    cancel: screen.getByRole<HTMLButtonElement>("button", { name: t.cancel }),
  };
}

async function fillDraft(form: NoteForm, date = "2024-05-17") {
  await form.user.clear(form.date);
  await form.user.type(form.date, date);
  await form.user.clear(form.body);
  await form.user.type(form.body, "  Pierwsza linia\nDruga linia  ");
}

function expectDraft(form: NoteForm, date = "2024-05-17") {
  expect(screen.getByRole("heading", { name: form.heading })).toBeTruthy();
  expect(screen.getByLabelText<HTMLInputElement>(form.t.eventDate).value).toBe(date);
  expect(screen.getByLabelText<HTMLTextAreaElement>(form.t.noteBody).value).toBe("  Pierwsza linia\nDruga linia  ");
}

function expectSingleSave(requests: CapturedRequest[], mode: Mode) {
  expect(requests).toEqual([
    {
      method: mode.expectedMethod,
      url: mode.url,
      contentType: "application/json",
      body: { event_date: "2024-05-17", body: "Pierwsza linia\nDruga linia" },
    },
  ]);
}

function expectDateError(form: NoteForm, message: HTMLElement) {
  expect(message.textContent).toBe(form.t.timelineBeforeBirthDate);
  expect(form.date.getAttribute("aria-invalid")).toBe("true");
  expect(message.id).not.toBe("");
  expect(form.date.getAttribute("aria-describedby")?.split(" ")).toContain(message.id);
}

async function continueEditing(form: NoteForm) {
  for (const control of [form.date, form.body, form.save, form.cancel]) {
    expect(control.matches(":disabled")).toBe(false);
  }
  await form.user.type(form.body, "Dalsza edycja");
  await form.user.clear(form.date);
  await form.user.type(form.date, "2024-05-18");
  expect(form.body.value).toBe("  Pierwsza linia\nDruga linia  Dalsza edycja");
  expect(form.date.value).toBe("2024-05-18");
}

for (const mode of modes) {
  for (const locale of ["pl", "en"] as const) {
    describe(`${mode.name} / ${locale.toUpperCase()}`, () => {
      for (const failure of failures) {
        test(`${failure.name} preserves the draft and allows further editing`, async () => {
          const requests: CapturedRequest[] = [];
          server.use(
            http[mode.method](mode.url, async ({ request }) => {
              requests.push({
                method: request.method,
                url: request.url,
                contentType: request.headers.get("Content-Type"),
                body: await request.json(),
              });
              return failure.response();
            }),
          );

          const form = await openForm(mode, locale);
          await fillDraft(form);
          await form.user.click(form.save);

          if (failure.fieldError) {
            expectDateError(form, await screen.findByText(form.t.timelineBeforeBirthDate));
            expect(screen.queryByRole("alert")).toBeNull();
          } else {
            expect((await screen.findByRole("alert")).textContent).toBe(form.t[failure.message]);
            expect(form.date.getAttribute("aria-invalid")).toBe("false");
          }
          expectSingleSave(requests, mode);
          expectDraft(form);
          await continueEditing(form);
          // Observe the completed failure cycle without submitting another save.
          // An ambiguous response does not prove whether the database committed it.
          expectSingleSave(requests, mode);
        });
      }

      test("pending blocks another save, then JSON 500 unlocks the preserved draft", async () => {
        const requests: CapturedRequest[] = [];
        const received = Promise.withResolvers<undefined>();
        const release = Promise.withResolvers<undefined>();
        server.use(
          http[mode.method](mode.url, async ({ request }) => {
            requests.push({
              method: request.method,
              url: request.url,
              contentType: request.headers.get("Content-Type"),
              body: await request.json(),
            });
            received.resolve(undefined);
            await release.promise;
            return HttpResponse.json({ error: "server_error" }, { status: 500 });
          }),
        );

        const form = await openForm(mode, locale);
        await fillDraft(form);
        try {
          await form.user.click(form.save);
          await received.promise;
          expectDraft(form);
          expect(form.save.textContent).toBe(form.t.savingTimelineNote);
          for (const control of [form.date, form.body, form.save, form.cancel]) {
            expect(control.matches(":disabled")).toBe(true);
          }
          await form.user.click(form.save);
          expectSingleSave(requests, mode);
        } finally {
          release.resolve(undefined);
        }

        expect((await screen.findByRole("alert")).textContent).toBe(form.t.errorGeneric);
        expectDraft(form);
        await continueEditing(form);
        expectSingleSave(requests, mode);
      });

      test("local before-birth-date validation preserves the draft without HTTP", async () => {
        const requests: string[] = [];
        // Count every HTTP request, including an unexpected method or URL.
        server.use(
          http.all("*", ({ request }) => {
            requests.push(`${request.method} ${request.url}`);
            return HttpResponse.json({ error: "server_error" }, { status: 500 });
          }),
        );

        const form = await openForm(mode, locale);
        await fillDraft(form, "1999-12-31");
        await form.user.click(form.save);

        expectDateError(form, await screen.findByText(form.t.timelineBeforeBirthDate));
        expectDraft(form, "1999-12-31");
        expect(requests).toEqual([]);
        await continueEditing(form);
        expect(requests).toEqual([]);
      });
    });
  }
}
