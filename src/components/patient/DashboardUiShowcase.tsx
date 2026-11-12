import { useState } from "react";
import PatientProfileView, { type PatientProfileViewProps, type ProfileValues } from "./PatientProfileView";
import { Button } from "@/components/ui/button";
import { messages, type Locale } from "@/lib/i18n";
import type { Patient } from "@/lib/patient-profile";

const today = "2026-11-12";
const patient: Patient = {
  id: "00000000-0000-4000-8000-000000000001",
  first_name: "Ada",
  last_name: "Fixture",
  date_of_birth: "2000-01-02",
  sex: "female",
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};
const filled: ProfileValues = {
  first_name: "Ada",
  last_name: "Fixture",
  date_of_birth: "2000-01-02",
  sex: "female",
};
const empty: ProfileValues = { first_name: "", last_name: "", date_of_birth: "", sex: "" };
const scenarios = ["read", "create", "complete", "edit", "field-error", "save-error", "load-error", "pending"] as const;
type Scenario = (typeof scenarios)[number];

const copy = {
  pl: {
    title: "Dashboard — demonstracja stanów",
    intro:
      "Wyłącznie dane syntetyczne. Zapis zmienia lokalny stan; nie zapisuje profilu. Stała data: 12 listopada 2026.",
    interaction:
      "Hover: najedź na akcję. Focus-visible: użyj Tab i Shift+Tab. Zapis utrzymuje loading do wyłączenia go poniżej; porównaj położenie akcji i anulowania.",
    reset: "Przywróć przykład",
    pending: "Przełącz loading",
    labels: {
      read: "Default · odczyt",
      create: "Empty · tworzenie",
      complete: "Niekompletny profil",
      edit: "Hover / focus-visible · edycja",
      "field-error": "Error · błędy pól",
      "save-error": "Error · błąd zapisu",
      "load-error": "Error · błąd odczytu",
      pending: "Disabled / loading · zapis",
    },
  },
  en: {
    title: "Dashboard — state showcase",
    intro: "Synthetic data only. Saving changes local state; it does not save a profile. Fixed date: 12 November 2026.",
    interaction:
      "Hover over an action. Use Tab and Shift+Tab for focus-visible. Saving holds loading until toggled below; compare the position of save and cancel.",
    reset: "Reset example",
    pending: "Toggle loading",
    labels: {
      read: "Default · read",
      create: "Empty · create",
      complete: "Incomplete profile",
      edit: "Hover / focus-visible · edit",
      "field-error": "Error · field errors",
      "save-error": "Error · save failure",
      "load-error": "Error · read failure",
      pending: "Disabled / loading · save",
    },
  },
};

function Example({ scenario, locale }: { scenario: Scenario; locale: Locale }) {
  const t = messages[locale];
  const c = copy[locale];
  const initialMode: PatientProfileViewProps["mode"] =
    scenario === "read" ? "read" : scenario === "create" ? "create" : scenario === "complete" ? "complete" : "edit";
  const initialValues =
    scenario === "create" || scenario === "field-error"
      ? empty
      : scenario === "complete"
        ? { ...filled, first_name: "", sex: "" }
        : filled;
  const [mode, setMode] = useState(initialMode);
  const [values, setValues] = useState(initialValues);
  const [pending, setPending] = useState(scenario === "pending");

  function reset() {
    setMode(initialMode);
    setValues(initialValues);
    setPending(scenario === "pending");
  }

  return (
    <article
      id={scenario}
      className="border-border bg-card text-card-foreground scroll-mt-6 space-y-6 rounded-xl border p-6 shadow-sm sm:p-8"
    >
      <header className="border-border border-b pb-4">
        <h2 className="text-muted-foreground text-sm font-medium">{c.labels[scenario]}</h2>
      </header>
      <div
        onClickCapture={(event) => {
          // The production view's recovery link resets this fixture, never leaves for the real dashboard.
          if ((event.target as HTMLElement).closest('a[href="#save-error"]')) {
            event.preventDefault();
            reset();
          }
        }}
      >
        {scenario === "load-error" ? (
          <p role="alert" className="text-destructive">
            {t.profileLoadFailed}
          </p>
        ) : (
          <PatientProfileView
            patient={
              scenario === "create"
                ? null
                : scenario === "complete"
                  ? { ...patient, first_name: null, sex: null }
                  : patient
            }
            mode={mode}
            values={values}
            errors={
              scenario === "field-error"
                ? {
                    first_name: t.profileRequired,
                    last_name: t.profileRequired,
                    date_of_birth: t.profileDateInvalid,
                    sex: t.profileSexInvalid,
                  }
                : {}
            }
            failure={scenario === "save-error" ? t.errorGeneric : null}
            pending={pending}
            today={today}
            locale={locale}
            messages={t}
            reloadHref="#save-error"
            onChange={(field, value) => {
              setValues((previous) => ({ ...previous, [field]: value }));
            }}
            onSubmit={(event) => {
              event.preventDefault();
              if (scenario !== "field-error" && scenario !== "save-error") setPending(true);
            }}
            onEdit={() => {
              setMode("edit");
            }}
            onCancel={() => {
              setValues(initialValues);
              setPending(false);
              setMode("read");
            }}
          />
        )}
      </div>
      <footer className="border-border flex flex-wrap gap-3 border-t pt-4">
        <Button type="button" variant="outline" size="sm" onClick={reset}>
          {c.reset}
        </Button>
        {scenario !== "load-error" && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            aria-pressed={pending}
            onClick={() => {
              setPending(!pending);
            }}
          >
            {c.pending}
          </Button>
        )}
      </footer>
    </article>
  );
}

export default function DashboardUiShowcase({ locale }: { locale: Locale }) {
  const c = copy[locale];
  return (
    <div className="mx-auto w-full max-w-6xl space-y-8">
      <header className="space-y-4">
        <h1 className="text-3xl font-semibold tracking-tight">{c.title}</h1>
        <p className="text-muted-foreground">{c.intro}</p>
        <p className="text-muted-foreground">{c.interaction}</p>
        <nav aria-label={c.title} className="flex flex-wrap gap-x-5 gap-y-3">
          {scenarios.map((scenario) => (
            <a
              key={scenario}
              href={`#${scenario}`}
              className="focus-visible:outline-ring rounded-sm underline underline-offset-4 hover:no-underline focus-visible:outline-2 focus-visible:outline-offset-4"
            >
              {c.labels[scenario]}
            </a>
          ))}
        </nav>
      </header>
      <div className="grid items-start gap-6 lg:grid-cols-2">
        {scenarios.map((scenario) => (
          <Example key={scenario} scenario={scenario} locale={locale} />
        ))}
      </div>
    </div>
  );
}
