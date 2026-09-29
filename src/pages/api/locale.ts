import type { APIRoute } from "astro";
import { isLocale, messages, safeReturnPath } from "@/lib/i18n";

export const POST: APIRoute = async ({ request, cookies, locals, url, redirect }) => {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return new Response(messages[locals.locale].errorInvalidLocale, { status: 400 });
  }
  const locale = form.get("locale");
  if (!isLocale(locale)) {
    return new Response(messages[locals.locale].errorInvalidLocale, { status: 400 });
  }
  cookies.set("locale", locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    httpOnly: true,
    sameSite: "lax",
    secure: url.protocol === "https:",
  });
  return redirect(safeReturnPath(form.get("returnTo")), 303);
};
