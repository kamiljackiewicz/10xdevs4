import { useState, type SubmitEvent } from "react";
import { formatProfileDate, type Locale, type Messages } from "@/lib/i18n";
import {
  validateTimelineNote,
  type TimelineNote,
  type TimelineNoteErrorCode,
  type TimelineNoteErrors,
} from "@/lib/timeline-notes";

interface Props {
  notes: TimelineNote[];
  birthDate: string;
  messages: Readonly<Messages>;
  locale: Locale;
  page: number;
  hasNext: boolean;
}
const inputClass =
  "w-full rounded-lg border border-white/20 bg-slate-900 px-3 py-2 text-white focus:ring-2 focus:ring-purple-400 focus:outline-none";
const buttonClass = "rounded-lg bg-purple-600 px-4 py-2 font-medium text-white hover:bg-purple-500 disabled:opacity-50";
function localToday() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export default function TimelineNotes({ notes, birthDate, messages: t, locale, page, hasNext }: Props) {
  const [editing, setEditing] = useState<TimelineNote | null | undefined>();
  const [values, setValues] = useState({ event_date: localToday(), body: "" });
  const [errors, setErrors] = useState<TimelineNoteErrors>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const labels: Record<TimelineNoteErrorCode, string> = {
    required: t.timelineRequired,
    too_long: t.timelineTooLong,
    invalid_date: t.timelineDateInvalid,
    before_birth_date: t.timelineBeforeBirthDate,
  };
  function start(note?: TimelineNote) {
    setEditing(note ?? null);
    setValues(note ? { event_date: note.event_date, body: note.body } : { event_date: localToday(), body: "" });
    setErrors({});
    setFailure(null);
  }
  async function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const validation = validateTimelineNote(values, birthDate);
    if (!validation.ok) {
      setErrors(validation.errors);
      return;
    }
    setPending(true);
    setFailure(null);
    setErrors({});
    try {
      const response = await fetch(editing ? `/api/timeline-notes/${editing.id}` : "/api/timeline-notes", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validation.value),
      });
      if (response.ok) {
        window.location.assign("/dashboard/timeline");
        return;
      }
      const body: unknown = await response.json();
      if (response.status === 400 && typeof body === "object" && body && "errors" in body)
        setErrors((body as { errors: TimelineNoteErrors }).errors);
      else
        setFailure(
          response.status === 409
            ? t.timelineBirthDateRequired
            : response.status === 401
              ? t.timelineUnauthorized
              : t.errorGeneric,
        );
    } catch {
      setFailure(t.timelineNetworkAmbiguous);
    } finally {
      setPending(false);
    }
  }
  async function remove(note: TimelineNote) {
    if (pending) return;
    if (!globalThis.confirm(t.deleteTimelineConfirm)) return;
    setPending(true);
    setFailure(null);
    try {
      const response = await fetch(`/api/timeline-notes/${note.id}`, { method: "DELETE" });
      if (response.ok) {
        window.location.assign(
          notes.length === 1 && page > 1 ? `/dashboard/timeline?page=${page - 1}` : `/dashboard/timeline?page=${page}`,
        );
        return;
      }
      setFailure(response.status === 401 ? t.timelineUnauthorized : t.errorGeneric);
    } catch {
      setFailure(t.timelineNetworkAmbiguous);
    } finally {
      setPending(false);
    }
  }
  if (editing !== undefined)
    return (
      <section className="mt-6 space-y-4 text-left" aria-labelledby="timeline-form-heading">
        <h2 id="timeline-form-heading" className="text-xl font-semibold">
          {editing ? t.editTimelineNote : t.createTimelineNote}
        </h2>
        <form onSubmit={submit} noValidate className="space-y-4">
          <fieldset disabled={pending} className="space-y-4">
            <div>
              <label htmlFor="event_date" className="mb-1 block text-sm">
                {t.eventDate}
              </label>
              <input
                id="event_date"
                type="date"
                style={{ colorScheme: "dark" }}
                min={birthDate}
                value={values.event_date}
                onChange={(e) => {
                  setValues({ ...values, event_date: e.target.value });
                }}
                aria-invalid={Boolean(errors.event_date)}
                aria-describedby={errors.event_date ? "event-date-error" : undefined}
                className={inputClass}
              />
              {errors.event_date && (
                <p id="event-date-error" className="mt-1 text-sm text-red-300">
                  {labels[errors.event_date]}
                </p>
              )}
            </div>
            <div>
              <label htmlFor="body" className="mb-1 block text-sm">
                {t.noteBody}
              </label>
              <textarea
                id="body"
                rows={7}
                value={values.body}
                onChange={(e) => {
                  setValues({ ...values, body: e.target.value });
                }}
                aria-invalid={Boolean(errors.body)}
                aria-describedby={errors.body ? "note-body-hint note-body-error" : "note-body-hint"}
                className={inputClass}
              />
              <p id="note-body-hint" className="mt-1 text-sm text-blue-100/70">
                {t.noteBodyHint}
              </p>
              {errors.body && (
                <p id="note-body-error" className="mt-1 text-sm text-red-300">
                  {labels[errors.body]}
                </p>
              )}
            </div>
            {failure && (
              <p role="alert" className="text-sm text-red-300">
                {failure}
              </p>
            )}
            <div className="flex gap-3">
              <button className={buttonClass} type="submit">
                {pending ? t.savingTimelineNote : t.saveTimelineNote}
              </button>
              <button
                className="rounded-lg border border-white/20 px-4 py-2"
                type="button"
                onClick={() => {
                  setEditing(undefined);
                }}
              >
                {t.cancel}
              </button>
            </div>
          </fieldset>
        </form>
      </section>
    );
  return (
    <section className="mt-6 space-y-4 text-left" aria-labelledby="timeline-heading">
      <div className="flex items-center justify-between gap-3">
        <h2 id="timeline-heading" className="text-xl font-semibold">
          {t.timeline}
        </h2>
        <button
          type="button"
          className={buttonClass}
          onClick={() => {
            start();
          }}
        >
          {t.createTimelineNote}
        </button>
      </div>
      {failure && (
        <p role="alert" className="text-sm text-red-300">
          {failure}
        </p>
      )}
      {notes.length === 0 ? (
        <p className="text-blue-100/70">{t.timelineEmpty}</p>
      ) : (
        <ol className="space-y-4">
          {notes.map((note) => (
            <li key={note.id} className="rounded-lg border border-white/15 p-4">
              <time dateTime={note.event_date} className="font-medium">
                {formatProfileDate(note.event_date, locale)}
              </time>
              {note.event_date < birthDate && (
                <p role="alert" className="mt-2 text-sm text-amber-200">
                  {t.timelineOldNoteWarning}
                </p>
              )}
              <p className="mt-2 whitespace-pre-wrap">{note.body}</p>
              <div className="mt-3 flex gap-3">
                <button
                  type="button"
                  disabled={pending}
                  className="text-sm underline"
                  onClick={() => {
                    start(note);
                  }}
                >
                  {t.editTimelineNote}
                </button>
                <button
                  type="button"
                  disabled={pending}
                  className="text-sm text-red-200 underline"
                  onClick={() => {
                    void remove(note);
                  }}
                >
                  {pending ? t.deletingTimelineNote : t.deleteTimelineNote}
                </button>
              </div>
            </li>
          ))}
        </ol>
      )}
      <nav className="flex justify-between" aria-label={t.timeline}>
        {page > 1 ? (
          <a className="underline" href={`/dashboard/timeline?page=${page - 1}`}>
            {t.previousPage}
          </a>
        ) : (
          <span />
        )}
        {hasNext && (
          <a className="underline" href={`/dashboard/timeline?page=${page + 1}`}>
            {t.nextPage}
          </a>
        )}
      </nav>
    </section>
  );
}
