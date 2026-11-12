import { useState, type SubmitEvent } from "react";
import type { Locale, Messages } from "@/lib/i18n";
import PatientProfileView from "@/components/patient/PatientProfileView";
import { validateProfile, type Patient, type ProfileErrors, type ProfileErrorCode } from "@/lib/patient-profile";

interface Props {
  patient: Patient | null;
  messages: Readonly<Messages>;
  today: string;
  locale: Locale;
}

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

  return (
    <PatientProfileView
      patient={patient}
      mode={!editing && patient ? "read" : !patient ? "create" : complete ? "edit" : "complete"}
      values={values}
      errors={{
        first_name: errors.first_name ? errorLabels[errors.first_name] : undefined,
        last_name: errors.last_name ? errorLabels[errors.last_name] : undefined,
        date_of_birth: errors.date_of_birth ? errorLabels[errors.date_of_birth] : undefined,
        sex: errors.sex ? errorLabels[errors.sex] : undefined,
      }}
      failure={failure}
      pending={pending}
      today={today}
      locale={locale}
      messages={t}
      onChange={change}
      onSubmit={submit}
      onEdit={() => {
        setEditing(true);
      }}
      onCancel={() => {
        setValues(initialValues);
        setErrors({});
        setFailure(null);
        setEditing(false);
      }}
    />
  );
}
