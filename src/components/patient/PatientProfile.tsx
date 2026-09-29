import { useState, type SubmitEvent } from "react";
import { ChevronDown } from "lucide-react";
import { formatProfileDate, type Locale, type Messages } from "@/lib/i18n";
import { validateProfile, type Patient, type ProfileErrors, type ProfileErrorCode } from "@/lib/patient-profile";

interface Props {
  patient: Patient | null;
  messages: Readonly<Messages>;
  today: string;
  locale: Locale;
}

const inputClass =
  "w-full rounded-lg border border-white/20 bg-slate-900 px-3 py-2 text-white focus:ring-2 focus:ring-purple-400 focus:outline-none";
const buttonClass = "rounded-lg bg-purple-600 px-4 py-2 font-medium text-white hover:bg-purple-500 disabled:opacity-50";

export default function PatientProfile({ patient, messages: t, today, locale }: Props) {
  const complete = patient !== null && validateProfile(patient, today).ok;
  const initialValues = {
    first_name: patient?.first_name ?? "",
    last_name: patient?.last_name ?? "",
    date_of_birth: patient?.date_of_birth ?? "",
    sex: patient?.sex ?? "",
  };
  const [editing, setEditing] = useState(!complete);
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState<ProfileErrors>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const dateHint = formatProfileDate(values.date_of_birth, locale);
  const errorLabels: Record<ProfileErrorCode, string> = {
    required: t.profileRequired,
    too_long: t.profileNameTooLong,
    invalid_date: t.profileDateInvalid,
    future_date: t.profileDateFuture,
    invalid_sex: t.profileSexInvalid,
  };

  function change(field: keyof typeof values, value: string) {
    setValues((previous) => ({ ...previous, [field]: value }));
    setErrors((previous) => ({ ...previous, [field]: undefined }));
    setFailure(null);
  }

  async function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const validation = validateProfile(values);
    if (!validation.ok) {
      setErrors(validation.errors);
      return;
    }
    setErrors({});
    setFailure(null);
    setPending(true);
    try {
      const response = await fetch("/api/patient", {
        method: patient ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validation.value),
      });
      if (response.ok) {
        window.location.assign("/dashboard");
        return;
      }
      const body: unknown = await response.json();
      if (response.status === 400 && typeof body === "object" && body !== null && "errors" in body) {
        const fieldErrors = body.errors;
        if (typeof fieldErrors === "object" && fieldErrors !== null) {
          const safeErrors: ProfileErrors = {};
          for (const field of ["first_name", "last_name", "date_of_birth", "sex"] as const) {
            const code = (fieldErrors as Record<string, unknown>)[field];
            if (typeof code === "string" && Object.hasOwn(errorLabels, code)) {
              safeErrors[field] = code as ProfileErrorCode;
            }
          }
          if (Object.keys(safeErrors).length > 0) {
            setErrors(safeErrors);
            return;
          }
        }
      }
      setFailure(
        response.status === 409
          ? t.profileExists
          : response.status === 404
            ? t.profileNotFound
            : response.status === 401
              ? t.profileUnauthorized
              : t.errorGeneric,
      );
    } catch {
      setFailure(t.errorGeneric);
    } finally {
      setPending(false);
    }
  }

  if (!editing && patient) {
    return (
      <section aria-labelledby="profile-heading" className="mt-6 space-y-4 text-left">
        <h2 id="profile-heading" className="text-xl font-semibold">
          {t.patientProfile}
        </h2>
        <dl className="space-y-3">
          <div>
            <dt className="text-sm text-blue-100/70">{t.firstName}</dt>
            <dd>{patient.first_name}</dd>
          </div>
          <div>
            <dt className="text-sm text-blue-100/70">{t.lastName}</dt>
            <dd>{patient.last_name}</dd>
          </div>
          <div>
            <dt className="text-sm text-blue-100/70">{t.dateOfBirth}</dt>
            <dd>
              <time dateTime={patient.date_of_birth ?? undefined}>
                {formatProfileDate(patient.date_of_birth, locale)}
              </time>
            </dd>
          </div>
          <div>
            <dt className="text-sm text-blue-100/70">{t.sex}</dt>
            <dd>{patient.sex === "female" ? t.female : t.male}</dd>
          </div>
        </dl>
        <button
          type="button"
          className={buttonClass}
          onClick={() => {
            setEditing(true);
          }}
        >
          {t.editProfile}
        </button>
      </section>
    );
  }

  return (
    <section aria-labelledby="profile-heading" className="mt-6 space-y-4 text-left">
      <h2 id="profile-heading" className="text-xl font-semibold">
        {patient ? (complete ? t.editProfile : t.completeProfile) : t.createProfile}
      </h2>
      {patient && !complete && <p className="text-sm text-blue-100/70">{t.completeProfileHint}</p>}
      <form method="POST" action="/api/patient" onSubmit={submit} noValidate className="space-y-4">
        <fieldset disabled={pending} className="space-y-4">
          <div>
            <label htmlFor="first_name" className="mb-1 block text-sm">
              {t.firstName}
            </label>
            <input
              id="first_name"
              name="first_name"
              autoComplete="given-name"
              required
              value={values.first_name}
              onChange={(event) => {
                change("first_name", event.target.value);
              }}
              aria-invalid={Boolean(errors.first_name)}
              aria-describedby={errors.first_name ? "first_name-error" : undefined}
              className={inputClass}
            />
            {errors.first_name && (
              <p id="first_name-error" className="mt-1 text-sm text-red-300">
                {errorLabels[errors.first_name]}
              </p>
            )}
          </div>
          <div>
            <label htmlFor="last_name" className="mb-1 block text-sm">
              {t.lastName}
            </label>
            <input
              id="last_name"
              name="last_name"
              autoComplete="family-name"
              required
              value={values.last_name}
              onChange={(event) => {
                change("last_name", event.target.value);
              }}
              aria-invalid={Boolean(errors.last_name)}
              aria-describedby={errors.last_name ? "last_name-error" : undefined}
              className={inputClass}
            />
            {errors.last_name && (
              <p id="last_name-error" className="mt-1 text-sm text-red-300">
                {errorLabels[errors.last_name]}
              </p>
            )}
          </div>
          <div>
            <label htmlFor="date_of_birth" className="mb-1 block text-sm">
              {t.dateOfBirth}
            </label>
            <input
              id="date_of_birth"
              name="date_of_birth"
              type="date"
              style={{ colorScheme: "dark" }}
              required
              min="0001-01-01"
              max={today}
              value={values.date_of_birth}
              onChange={(event) => {
                change("date_of_birth", event.target.value);
              }}
              aria-invalid={Boolean(errors.date_of_birth)}
              aria-describedby={
                errors.date_of_birth ? "date_of_birth-error" : dateHint ? "date_of_birth-hint" : undefined
              }
              className={inputClass}
            />
            {dateHint && (
              <p id="date_of_birth-hint" className="mt-1 text-sm text-blue-100/70">
                {dateHint}
              </p>
            )}
            {errors.date_of_birth && (
              <p id="date_of_birth-error" className="mt-1 text-sm text-red-300">
                {errorLabels[errors.date_of_birth]}
              </p>
            )}
          </div>
          <div>
            <label htmlFor="sex" className="mb-1 block text-sm">
              {t.sex}
            </label>
            <div className="relative">
              <select
                id="sex"
                name="sex"
                required
                value={values.sex}
                onChange={(event) => {
                  change("sex", event.target.value);
                }}
                aria-invalid={Boolean(errors.sex)}
                aria-describedby={errors.sex ? "sex-error" : undefined}
                className={`${inputClass} appearance-none pr-10`}
              >
                <option value="">{t.chooseSex}</option>
                <option value="female">{t.female}</option>
                <option value="male">{t.male}</option>
              </select>
              <ChevronDown
                aria-hidden="true"
                className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-white"
              />
            </div>
            {errors.sex && (
              <p id="sex-error" className="mt-1 text-sm text-red-300">
                {errorLabels[errors.sex]}
              </p>
            )}
          </div>
          {failure && (
            <div role="alert" className="text-sm text-red-300">
              <p>{failure}</p>
              <a href="/dashboard" className="underline">
                {t.reloadPage}
              </a>
            </div>
          )}
          <div className="flex gap-3">
            <button type="submit" disabled={pending} className={buttonClass}>
              {pending ? t.savingProfile : patient ? t.saveProfile : t.createProfile}
            </button>
            {complete && (
              <button
                type="button"
                className="rounded-lg border border-white/20 px-4 py-2"
                onClick={() => {
                  setValues(initialValues);
                  setErrors({});
                  setFailure(null);
                  setEditing(false);
                }}
              >
                {t.cancel}
              </button>
            )}
          </div>
        </fieldset>
      </form>
    </section>
  );
}
