import type { APIRoute } from "astro";
import { createClient } from "@/lib/supabase";
import { patientColumns, validateProfile, type Patient } from "@/lib/patient-profile";

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "private, no-store" },
  });
}

const writeProfile: APIRoute = async ({ request, url, cookies, locals }) => {
  if (!locals.user) return json({ error: "unauthorized" }, 401);
  if (request.headers.get("Origin") !== url.origin) return json({ error: "invalid_origin" }, 403);
  if (request.headers.get("Content-Type")?.split(";")[0].trim().toLowerCase() !== "application/json") {
    return json({ error: "invalid_content_type" }, 415);
  }
  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return json({ error: "invalid_input" }, 400);
  }
  const validation = validateProfile(input);
  if (!validation.ok) return json({ error: "validation_failed", errors: validation.errors }, 400);
  const supabase = createClient(request.headers, cookies);
  if (!supabase) return json({ error: "server_error" }, 500);
  try {
    if (request.method === "POST") {
      const { data, error } = await supabase
        .from("patients")
        .insert(validation.value)
        .select(patientColumns)
        .single<Patient>();
      if (error?.code === "23505") return json({ error: "profile_exists" }, 409);
      if (error) return json({ error: "server_error" }, 500);
      return json({ patient: data }, 201);
    }
    const { data, error } = await supabase
      .from("patients")
      .update(validation.value)
      .eq("owner_id", locals.user.id)
      .select(patientColumns)
      .maybeSingle<Patient>();
    if (error) return json({ error: "server_error" }, 500);
    if (!data) return json({ error: "profile_not_found" }, 404);
    return json({ patient: data }, 200);
  } catch {
    return json({ error: "server_error" }, 500);
  }
};

export const POST = writeProfile;
export const PATCH = writeProfile;
