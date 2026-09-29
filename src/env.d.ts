declare namespace App {
  interface Locals {
    locale: import("./lib/i18n").Locale;
    user: import("@supabase/supabase-js").User | null;
  }
}
