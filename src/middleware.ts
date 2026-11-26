import { defineMiddleware } from "astro:middleware";
import { createClient } from "@/lib/supabase";
import { resolveLocale } from "@/lib/i18n";
import { isUnexpectedAuthError } from "@/lib/observability";
import { reportFailure } from "@/lib/server/report-failure";

const PROTECTED_ROUTES = ["/dashboard"];

export const onRequest = defineMiddleware(async (context, next) => {
  context.locals.requestId = crypto.randomUUID();
  context.locals.locale = resolveLocale(context.cookies.get("locale")?.value);
  const supabase = createClient(context.request.headers, context.cookies);

  if (supabase) {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (isUnexpectedAuthError(error)) {
      reportFailure({ operation: "auth.get_user", kind: "result", requestId: context.locals.requestId, error });
    }
    context.locals.user = user ?? null;
  } else {
    context.locals.user = null;
  }

  if (PROTECTED_ROUTES.some((route) => context.url.pathname.startsWith(route))) {
    if (!context.locals.user) {
      return context.redirect("/auth/signin");
    }
  }

  return next();
});
