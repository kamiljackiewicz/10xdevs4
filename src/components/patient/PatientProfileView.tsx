import { useId, type SubmitEvent } from "react";
import { LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { formatProfileDate, type Locale, type Messages } from "@/lib/i18n";
import type { Patient, ProfileField } from "@/lib/patient-profile";
import { cn } from "@/lib/utils";

export interface ProfileValues {
  first_name: string;
  last_name: string;
  date_of_birth: string;
  sex: string;
}

export interface PatientProfileViewProps {
  patient: Patient | null;
  mode: "read" | "create" | "complete" | "edit";
  values: ProfileValues;
  errors: Partial<Record<ProfileField, string>>;
  failure: string | null;
  pending: boolean;
  today: string;
  locale: Locale;
  messages: Readonly<Messages>;
  onChange: (field: ProfileField, value: string) => void;
  onSubmit: (event: SubmitEvent<HTMLFormElement>) => void | Promise<void>;
  onEdit: () => void;
  onCancel: () => void;
}

export default function PatientProfileView({
  patient,
  mode,
  values,
  errors,
  failure,
  pending,
  today,
  locale,
  messages: t,
  onChange,
  onSubmit,
  onEdit,
  onCancel,
}: PatientProfileViewProps) {
  const idPrefix = useId();
  const headingId = `${idPrefix}-profile-heading`;
  const dateHint = formatProfileDate(values.date_of_birth, locale);
  const submitLabel = patient ? t.saveProfile : t.createProfile;

  if (mode === "read" && patient) {
    return (
      <section aria-labelledby={headingId} className="space-y-6">
        <h2 id={headingId} className="text-xl font-semibold tracking-tight">
          {t.patientProfile}
        </h2>
        <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
          <div className="min-w-0 space-y-1 break-words">
            <dt className="text-muted-foreground text-sm">{t.firstName}</dt>
            <dd>{patient.first_name}</dd>
          </div>
          <div className="min-w-0 space-y-1 break-words">
            <dt className="text-muted-foreground text-sm">{t.lastName}</dt>
            <dd>{patient.last_name}</dd>
          </div>
          <div className="min-w-0 space-y-1 break-words">
            <dt className="text-muted-foreground text-sm">{t.dateOfBirth}</dt>
            <dd>
              <time dateTime={patient.date_of_birth ?? undefined}>
                {formatProfileDate(patient.date_of_birth, locale)}
              </time>
            </dd>
          </div>
          <div className="min-w-0 space-y-1 break-words">
            <dt className="text-muted-foreground text-sm">{t.sex}</dt>
            <dd>{patient.sex === "female" ? t.female : t.male}</dd>
          </div>
        </dl>
        <Button type="button" onClick={onEdit}>
          {t.editProfile}
        </Button>
      </section>
    );
  }

  return (
    <section aria-labelledby={headingId} className="space-y-6">
      <div className="space-y-2">
        <h2 id={headingId} className="text-xl font-semibold tracking-tight">
          {mode === "create" ? t.createProfile : mode === "complete" ? t.completeProfile : t.editProfile}
        </h2>
        {mode === "complete" && <p className="text-muted-foreground text-sm">{t.completeProfileHint}</p>}
      </div>
      <form method="POST" action="/api/patient" onSubmit={onSubmit} noValidate aria-busy={pending}>
        <fieldset disabled={pending} className="min-w-0 space-y-6">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field id={`${idPrefix}-first_name`} label={t.firstName} error={errors.first_name}>
              {(controlProps) => (
                <Input
                  {...controlProps}
                  name="first_name"
                  autoComplete="given-name"
                  required
                  value={values.first_name}
                  onChange={(event) => {
                    onChange("first_name", event.target.value);
                  }}
                />
              )}
            </Field>
            <Field id={`${idPrefix}-last_name`} label={t.lastName} error={errors.last_name}>
              {(controlProps) => (
                <Input
                  {...controlProps}
                  name="last_name"
                  autoComplete="family-name"
                  required
                  value={values.last_name}
                  onChange={(event) => {
                    onChange("last_name", event.target.value);
                  }}
                />
              )}
            </Field>
            <Field
              id={`${idPrefix}-date_of_birth`}
              label={t.dateOfBirth}
              hint={dateHint || undefined}
              error={errors.date_of_birth}
            >
              {(controlProps) => (
                <Input
                  {...controlProps}
                  name="date_of_birth"
                  type="date"
                  required
                  min="0001-01-01"
                  max={today}
                  value={values.date_of_birth}
                  onChange={(event) => {
                    onChange("date_of_birth", event.target.value);
                  }}
                />
              )}
            </Field>
            <Field id={`${idPrefix}-sex`} label={t.sex} error={errors.sex}>
              {(controlProps) => (
                <Select
                  {...controlProps}
                  name="sex"
                  required
                  value={values.sex}
                  onChange={(event) => {
                    onChange("sex", event.target.value);
                  }}
                >
                  <option value="">{t.chooseSex}</option>
                  <option value="female">{t.female}</option>
                  <option value="male">{t.male}</option>
                </Select>
              )}
            </Field>
          </div>
          {failure && (
            <div role="alert" className="text-destructive space-y-2 text-sm">
              <p>{failure}</p>
              <a
                href="/dashboard"
                className="focus-visible:outline-ring rounded-sm underline underline-offset-4 hover:no-underline focus-visible:outline-2 focus-visible:outline-offset-4"
              >
                {t.reloadPage}
              </a>
            </div>
          )}
          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" disabled={pending} className="relative h-auto max-w-full px-10 whitespace-normal">
              <LoaderCircle
                aria-hidden="true"
                className={cn(
                  "absolute top-1/2 left-3 size-4 -translate-y-1/2",
                  pending ? "animate-spin" : "invisible",
                )}
              />
              <span className="grid min-w-0">
                <span aria-hidden="true" className="invisible col-start-1 row-start-1">
                  {submitLabel}
                </span>
                <span aria-hidden="true" className="invisible col-start-1 row-start-1">
                  {t.savingProfile}
                </span>
                <span className="col-start-1 row-start-1">{pending ? t.savingProfile : submitLabel}</span>
              </span>
            </Button>
            {mode === "edit" && (
              <Button type="button" variant="secondary" onClick={onCancel}>
                {t.cancel}
              </Button>
            )}
          </div>
        </fieldset>
      </form>
      <span role="status" aria-live="polite" className="sr-only">
        {pending ? t.savingProfile : ""}
      </span>
    </section>
  );
}
