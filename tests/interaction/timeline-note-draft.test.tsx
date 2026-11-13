import { render, screen } from "@testing-library/react/pure";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { expect, test } from "vitest";
import TimelineNotes from "@/components/patient/TimelineNotes";
import { messages } from "@/lib/i18n";
import { server } from "./http";

test("create / PL / JSON 500 preserves the draft and allows further editing", async () => {
  const requests: { method: string; url: string; contentType: string | null; body: unknown }[] = [];
  server.use(
    http.post("http://localhost/api/timeline-notes", async ({ request }) => {
      requests.push({
        method: request.method,
        url: request.url,
        contentType: request.headers.get("Content-Type"),
        body: await request.json(),
      });
      return HttpResponse.json({ error: "server_error" }, { status: 500 });
    }),
  );

  const user = userEvent.setup();
  const t = messages.pl;
  render(<TimelineNotes notes={[]} birthDate="2000-01-01" messages={t} locale="pl" page={1} hasNext={false} />);

  await user.click(screen.getByRole("button", { name: t.createTimelineNote }));
  await user.clear(screen.getByLabelText(t.eventDate));
  await user.type(screen.getByLabelText(t.eventDate), "2024-05-17");
  await user.type(screen.getByLabelText(t.noteBody), "  Pierwsza linia\nDruga linia  ");
  await user.click(screen.getByRole("button", { name: t.saveTimelineNote }));

  expect((await screen.findByRole("alert")).textContent).toBe(t.errorGeneric);
  expect(requests).toEqual([
    {
      method: "POST",
      url: "http://localhost/api/timeline-notes",
      contentType: "application/json",
      body: { event_date: "2024-05-17", body: "Pierwsza linia\nDruga linia" },
    },
  ]);
  expect(screen.getByRole("heading", { name: t.createTimelineNote })).toBeTruthy();
  expect(screen.getByLabelText<HTMLInputElement>(t.eventDate).value).toBe("2024-05-17");
  expect(screen.getByLabelText<HTMLTextAreaElement>(t.noteBody).value).toBe("  Pierwsza linia\nDruga linia  ");

  await user.type(screen.getByLabelText(t.noteBody), "Dalsza edycja");
  await user.clear(screen.getByLabelText(t.eventDate));
  await user.type(screen.getByLabelText(t.eventDate), "2024-05-18");
  expect(screen.getByLabelText<HTMLTextAreaElement>(t.noteBody).value).toBe(
    "  Pierwsza linia\nDruga linia  Dalsza edycja",
  );
  expect(screen.getByLabelText<HTMLInputElement>(t.eventDate).value).toBe("2024-05-18");
});
