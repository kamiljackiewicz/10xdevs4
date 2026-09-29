import { SUPABASE_URL, SUPABASE_KEY } from "astro:env/server";
import { messages, type Locale } from "@/lib/i18n";

export interface ConfigStatus {
  name: string;
  configured: boolean;
  message: string;
  docsUrl?: string;
  docsLabel?: string;
}

export const getConfigStatuses = (locale: Locale): ConfigStatus[] => [
  {
    name: "Supabase",
    configured: Boolean(SUPABASE_URL && SUPABASE_KEY),
    message: messages[locale].configMissing,
    docsUrl: "https://github.com/przeprogramowani/10x-astro-starter#supabase-configuration",
    docsLabel: messages[locale].configInstructions,
  },
];

export const getMissingConfigs = (locale: Locale) => getConfigStatuses(locale).filter((s) => !s.configured);
