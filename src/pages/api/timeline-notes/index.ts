import type { APIRoute } from "astro";
import { createClient } from "@/lib/supabase";
import { validateTimelineNote, timelineNoteColumns, type TimelineNote } from "@/lib/timeline-notes";

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "private, no-store" },
  });
}

function isJson(request: Request): boolean {
  return request.headers.get("Content-Type")?.split(";")[0].trim().toLowerCase() === "application/json";
}

export const POST: APIRoute = async ({ request, url, cookies, locals }) => {
  if (!locals.user) return json({ error: "unauthorized" }, 401);
  if (request.headers.get("Origin") !== url.origin) return json({ error: "invalid_origin" }, 403);
  if (!isJson(request)) return json({ error: "invalid_content_type" }, 415);
  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return json({ error: "invalid_input" }, 400);
  }
  const supabase = createClient(request.headers, cookies);
  if (!supabase) return json({ error: "server_error" }, 500);
  const { data: patient, error: patientError } = await supabase
    .from("patients")
    .select("id,date_of_birth")
    .eq("owner_id", locals.user.id)
    .maybeSingle<{ id: string; date_of_birth: string | null }>();
  if (patientError) return json({ error: "server_error" }, 500);
  if (!patient) return json({ error: "profile_not_found" }, 404);
  if (!patient.date_of_birth) return json({ error: "birth_date_required" }, 409);
  const validation = validateTimelineNote(input, patient.date_of_birth);
  if (!validation.ok) return json({ error: "validation_failed", errors: validation.errors }, 400);
  const { data, error } = await supabase
    .from("timeline_notes")
    .insert({ ...validation.value, patient_id: patient.id })
    .select(timelineNoteColumns)
    .single<TimelineNote>();
  if (error)
    return json(
      { error: error.code === "23514" ? "birth_date_changed" : "server_error" },
      error.code === "23514" ? 409 : 500,
    );
  return json({ note: data }, 201);
};
