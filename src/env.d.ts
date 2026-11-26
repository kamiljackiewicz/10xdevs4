declare namespace App {
  interface Locals {
    requestId: string;
    locale: import("./lib/i18n").Locale;
    user: import("@supabase/supabase-js").User | null;
  }
}
