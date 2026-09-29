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
function isUuid(value: string | undefined): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}
async function patientForRequest(request: Request, cookies: Parameters<typeof createClient>[1], userId: string) {
  const supabase = createClient(request.headers, cookies);
  if (!supabase) return { supabase: null, patient: null, failed: true };
  const result = await supabase
    .from("patients")
    .select("id,date_of_birth")
    .eq("owner_id", userId)
    .maybeSingle<{ id: string; date_of_birth: string | null }>();
  return { supabase, patient: result.data, failed: Boolean(result.error) };
}

export const PATCH: APIRoute = async ({ request, url, cookies, locals, params }) => {
  if (!locals.user) return json({ error: "unauthorized" }, 401);
  if (request.headers.get("Origin") !== url.origin) return json({ error: "invalid_origin" }, 403);
  if (!isJson(request)) return json({ error: "invalid_content_type" }, 415);
  if (!isUuid(params.id)) return json({ error: "note_not_found" }, 404);
  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return json({ error: "invalid_input" }, 400);
  }
  const { supabase, patient, failed } = await patientForRequest(request, cookies, locals.user.id);
  if (failed || !supabase) return json({ error: "server_error" }, 500);
  if (!patient) return json({ error: "profile_not_found" }, 404);
  if (!patient.date_of_birth) return json({ error: "birth_date_required" }, 409);
  const validation = validateTimelineNote(input, patient.date_of_birth);
  if (!validation.ok) return json({ error: "validation_failed", errors: validation.errors }, 400);
  const { data, error } = await supabase
    .from("timeline_notes")
    .update(validation.value)
    .eq("id", params.id)
    .select(timelineNoteColumns)
    .maybeSingle<TimelineNote>();
  if (error)
    return json(
      { error: error.code === "23514" ? "birth_date_changed" : "server_error" },
      error.code === "23514" ? 409 : 500,
    );
  if (!data) return json({ error: "note_not_found" }, 404);
  return json({ note: data }, 200);
};

export const DELETE: APIRoute = async ({ request, url, cookies, locals, params }) => {
  if (!locals.user) return json({ error: "unauthorized" }, 401);
  if (request.headers.get("Origin") !== url.origin) return json({ error: "invalid_origin" }, 403);
  if (!isUuid(params.id)) return json({ error: "note_not_found" }, 404);
  const { supabase, patient, failed } = await patientForRequest(request, cookies, locals.user.id);
  if (failed || !supabase) return json({ error: "server_error" }, 500);
  if (!patient) return json({ error: "profile_not_found" }, 404);
  const { data, error } = await supabase.from("timeline_notes").delete().eq("id", params.id).select("id").maybeSingle();
  if (error) return json({ error: "server_error" }, 500);
  if (!data) return json({ error: "note_not_found" }, 404);
  return new Response(null, { status: 204, headers: { "Cache-Control": "private, no-store" } });
};
