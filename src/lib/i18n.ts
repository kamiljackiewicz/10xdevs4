export type Locale = "pl" | "en";

const en = {
  language: "Language",
  warning: "Warning:",
  documentation: "Documentation",
  configMissing: "Supabase is not configured — authentication features are disabled.",
  configInstructions: "View setup instructions",
  dashboard: "Profile",
  signIn: "Sign in",
  signUp: "Sign up",
  signOut: "Sign out",
  notSignedIn: "Not signed in",
  welcome: "Welcome,",
  protectedPage: "This page is only for authenticated users.",
  homeDescription: "Create a private patient profile and keep their basic information up to date.",
  homeProfileDescription:
    "Save a first name, last name, date of birth and sex. View and edit the profile on its own page.",
  openDashboard: "Open profile",
  noAccount: "Don't have an account?",
  hasAccount: "Already have an account?",
  email: "Email",
  emailPlaceholder: "you@example.com",
  password: "Password",
  passwordPlaceholder: "Your password",
  newPasswordPlaceholder: "Min. 6 characters",
  confirmPassword: "Confirm password",
  confirmPasswordPlaceholder: "Re-enter your password",
  emailRequired: "Email is required",
  emailInvalid: "Enter a valid email address",
  passwordRequired: "Password is required",
  passwordTooShort: "Password must be at least 6 characters",
  confirmPasswordRequired: "Please confirm your password",
  passwordsMismatch: "Passwords do not match",
  passwordRemaining: "Characters still needed: {count}",
  showPassword: "Show password",
  hidePassword: "Hide password",
  signingIn: "Signing in...",
  creatingAccount: "Creating account...",
  createAccount: "Create account",
  registrationSuccess: "Registration successful",
  registrationDescription: "Your account has been created. You can now sign in.",
  goToSignIn: "Go to sign in",
  checkEmail: "Check your email",
  checkEmailDescription: "We've sent a confirmation link to your email address. Click it to activate your account.",
  backToSignIn: "Back to sign in",
  errorGeneric: "Something went wrong. Please try again.",
  errorInvalidCredentials: "Incorrect email or password.",
  errorEmailNotConfirmed: "Confirm your email address before signing in.",
  errorRateLimited: "Too many attempts. Please try again later.",
  errorWeakPassword: "Choose a stronger password.",
  errorSignupUnavailable: "We couldn't create your account. Please try again later.",
  errorNotConfigured: "Authentication is currently unavailable.",
  errorInvalidLocale: "Unsupported language.",
  patientProfile: "Patient profile",
  createProfile: "Create profile",
  completeProfile: "Complete your profile",
  completeProfileHint: "Add the missing information to your existing patient profile.",
  editProfile: "Edit profile",
  saveProfile: "Save profile",
  savingProfile: "Saving...",
  cancel: "Cancel",
  firstName: "First name",
  lastName: "Last name",
  home: "Home",
  dateOfBirth: "Date of birth",
  sex: "Sex",
  chooseSex: "Select sex",
  female: "Female",
  male: "Male",
  profileRequired: "This field is required.",
  profileNameTooLong: "Each name must be at most 100 characters.",
  profileDateInvalid: "Enter a valid calendar date.",
  profileDateFuture: "Date of birth cannot be in the future.",
  profileSexInvalid: "Select female or male.",
  profileExists: "A profile already exists. Reload the page to view or edit it.",
  profileNotFound: "The profile no longer exists. Reload the page to create it.",
  profileUnauthorized: "Your session has expired. Sign in again before saving.",
  profileLoadFailed: "We couldn't load your profile. Please reload the page.",
  reloadPage: "Reload page",
  timeline: "Timeline",
  openTimeline: "Open timeline",
  backToDashboard: "Back to profile",
  timelineEmpty: "No timeline notes yet.",
  timelineLoadFailed: "We couldn't load the timeline. Please reload the page.",
  createTimelineNote: "Add note",
  editTimelineNote: "Edit note",
  deleteTimelineNote: "Delete note",
  eventDate: "Event date",
  noteBody: "Note",
  noteBodyHint: "Plain text, up to 5000 characters.",
  saveTimelineNote: "Save note",
  savingTimelineNote: "Saving...",
  deleteTimelineConfirm: "Permanently delete this note? This cannot be undone.",
  deletingTimelineNote: "Deleting...",
  timelineRequired: "This field is required.",
  timelineTooLong: "A note can have at most 5000 characters.",
  timelineDateInvalid: "Enter a valid calendar date.",
  timelineBeforeBirthDate: "The event date cannot be before the patient's date of birth.",
  timelineBirthDateRequired: "Add the patient's date of birth in the profile before saving notes.",
  timelineUnauthorized: "Your session has expired. Sign in again before saving.",
  timelineNetworkAmbiguous: "We couldn't confirm the result. Check the timeline before trying again.",
  timelineOldNoteWarning: "This note predates the current date of birth. Correct its date before saving it again.",
  previousPage: "Previous",
  nextPage: "Next",
  createProfileBeforeTimeline: "Create a patient profile before adding timeline notes.",
};

export type Messages = typeof en;

const pl: Messages = {
  language: "Język",
  warning: "Uwaga:",
  documentation: "Dokumentacja",
  configMissing: "Supabase nie jest skonfigurowany — funkcje uwierzytelniania są wyłączone.",
  configInstructions: "Zobacz instrukcję konfiguracji",
  dashboard: "Profil",
  signIn: "Zaloguj się",
  signUp: "Zarejestruj się",
  signOut: "Wyloguj się",
  notSignedIn: "Nie zalogowano",
  welcome: "Witaj,",
  protectedPage: "Ta strona jest dostępna tylko dla zalogowanych użytkowników.",
  homeDescription: "Utwórz prywatny profil pacjenta i aktualizuj jego podstawowe dane.",
  homeProfileDescription:
    "Zapisz imię, nazwisko, datę urodzenia i płeć. Przeglądaj i edytuj profil na osobnej stronie.",
  openDashboard: "Otwórz profil",
  noAccount: "Nie masz konta?",
  hasAccount: "Masz już konto?",
  email: "Adres e-mail",
  emailPlaceholder: "ty@example.com",
  password: "Hasło",
  passwordPlaceholder: "Twoje hasło",
  newPasswordPlaceholder: "Min. 6 znaków",
  confirmPassword: "Potwierdź hasło",
  confirmPasswordPlaceholder: "Wpisz hasło ponownie",
  emailRequired: "Adres e-mail jest wymagany",
  emailInvalid: "Wpisz poprawny adres e-mail",
  passwordRequired: "Hasło jest wymagane",
  passwordTooShort: "Hasło musi mieć co najmniej 6 znaków",
  confirmPasswordRequired: "Potwierdź hasło",
  passwordsMismatch: "Hasła nie są identyczne",
  passwordRemaining: "Liczba brakujących znaków: {count}",
  showPassword: "Pokaż hasło",
  hidePassword: "Ukryj hasło",
  signingIn: "Logowanie...",
  creatingAccount: "Tworzenie konta...",
  createAccount: "Utwórz konto",
  registrationSuccess: "Rejestracja zakończona",
  registrationDescription: "Twoje konto zostało utworzone. Możesz się teraz zalogować.",
  goToSignIn: "Przejdź do logowania",
  checkEmail: "Sprawdź pocztę",
  checkEmailDescription: "Wysłaliśmy link potwierdzający na Twój adres e-mail. Kliknij go, aby aktywować konto.",
  backToSignIn: "Wróć do logowania",
  errorGeneric: "Coś poszło nie tak. Spróbuj ponownie.",
  errorInvalidCredentials: "Niepoprawny adres e-mail lub hasło.",
  errorEmailNotConfirmed: "Potwierdź adres e-mail przed zalogowaniem.",
  errorRateLimited: "Zbyt wiele prób. Spróbuj ponownie później.",
  errorWeakPassword: "Wybierz silniejsze hasło.",
  errorSignupUnavailable: "Nie udało się utworzyć konta. Spróbuj ponownie później.",
  errorNotConfigured: "Uwierzytelnianie jest obecnie niedostępne.",
  errorInvalidLocale: "Nieobsługiwany język.",
  patientProfile: "Profil pacjenta",
  createProfile: "Utwórz profil",
  completeProfile: "Uzupełnij profil",
  completeProfileHint: "Dodaj brakujące informacje do istniejącego profilu pacjenta.",
  editProfile: "Edytuj profil",
  saveProfile: "Zapisz profil",
  savingProfile: "Zapisywanie...",
  cancel: "Anuluj",
  firstName: "Imię",
  lastName: "Nazwisko",
  home: "Strona główna",
  dateOfBirth: "Data urodzenia",
  sex: "Płeć",
  chooseSex: "Wybierz płeć",
  female: "Kobieta",
  male: "Mężczyzna",
  profileRequired: "To pole jest wymagane.",
  profileNameTooLong: "Imię i nazwisko mogą mieć po najwyżej 100 znaków.",
  profileDateInvalid: "Wpisz poprawną datę kalendarzową.",
  profileDateFuture: "Data urodzenia nie może być w przyszłości.",
  profileSexInvalid: "Wybierz kobietę lub mężczyznę.",
  profileExists: "Profil już istnieje. Odśwież stronę, aby go wyświetlić lub edytować.",
  profileNotFound: "Profil już nie istnieje. Odśwież stronę, aby go utworzyć.",
  profileUnauthorized: "Sesja wygasła. Zaloguj się ponownie przed zapisaniem.",
  profileLoadFailed: "Nie udało się wczytać profilu. Odśwież stronę.",
  reloadPage: "Odśwież stronę",
  timeline: "Oś czasu",
  openTimeline: "Otwórz oś czasu",
  backToDashboard: "Wróć do profilu",
  timelineEmpty: "Brak notatek na osi czasu.",
  timelineLoadFailed: "Nie udało się wczytać osi czasu. Odśwież stronę.",
  createTimelineNote: "Dodaj notatkę",
  editTimelineNote: "Edytuj notatkę",
  deleteTimelineNote: "Usuń notatkę",
  eventDate: "Data zdarzenia",
  noteBody: "Notatka",
  noteBodyHint: "Zwykły tekst, maksymalnie 5000 znaków.",
  saveTimelineNote: "Zapisz notatkę",
  savingTimelineNote: "Zapisywanie...",
  deleteTimelineConfirm: "Trwale usunąć tę notatkę? Tej operacji nie można cofnąć.",
  deletingTimelineNote: "Usuwanie...",
  timelineRequired: "To pole jest wymagane.",
  timelineTooLong: "Notatka może mieć najwyżej 5000 znaków.",
  timelineDateInvalid: "Wpisz poprawną datę kalendarzową.",
  timelineBeforeBirthDate: "Data zdarzenia nie może być wcześniejsza niż data urodzenia pacjenta.",
  timelineBirthDateRequired: "Przed zapisaniem notatek dodaj datę urodzenia pacjenta w profilu.",
  timelineUnauthorized: "Sesja wygasła. Zaloguj się ponownie przed zapisaniem.",
  timelineNetworkAmbiguous: "Nie udało się potwierdzić wyniku. Sprawdź oś czasu przed ponowną próbą.",
  timelineOldNoteWarning:
    "Ta notatka jest wcześniejsza niż obecna data urodzenia. Przed ponownym zapisem popraw jej datę.",
  previousPage: "Poprzednia",
  nextPage: "Następna",
  createProfileBeforeTimeline: "Przed dodaniem notatek utwórz profil pacjenta.",
};

export const messages: Readonly<Record<Locale, Readonly<Messages>>> = { pl, en };

// Date-only values are displayed in UTC so the calendar day never shifts.
export function formatProfileDate(value: string | null, locale: Locale): string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return "";
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) return "";
  return new Intl.DateTimeFormat(locale === "pl" ? "pl-PL" : "en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export function isLocale(value: unknown): value is Locale {
  return value === "pl" || value === "en";
}

export function resolveLocale(value: unknown): Locale {
  return isLocale(value) ? value : "pl";
}

// Never allow scheme-relative URLs, backslashes or encoded control/path separators.
export function safeReturnPath(value: unknown): string {
  if (
    typeof value !== "string" ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    /\\|%(?:2f|5c|0[0-9a-f]|1[0-9a-f]|7f)/i.test(value)
  ) {
    return "/";
  }
  for (const char of value) {
    if (char.charCodeAt(0) <= 32 || char.charCodeAt(0) === 127) return "/";
  }
  try {
    const url = new URL(value, "https://locale.invalid");
    if (url.origin !== "https://locale.invalid" || url.pathname.startsWith("//")) return "/";
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return "/";
  }
}

const authErrorMessages = {
  generic: "errorGeneric",
  invalid_credentials: "errorInvalidCredentials",
  email_not_confirmed: "errorEmailNotConfirmed",
  rate_limited: "errorRateLimited",
  weak_password: "errorWeakPassword",
  signup_unavailable: "errorSignupUnavailable",
  not_configured: "errorNotConfigured",
} as const satisfies Record<string, keyof Messages>;

export type AuthErrorCode = keyof typeof authErrorMessages;

export function mapAuthError(error: { code?: string; status?: number }): AuthErrorCode {
  if (error.status === 429) return "rate_limited";
  switch (error.code) {
    case "invalid_credentials":
    case "email_not_confirmed":
    case "weak_password":
      return error.code;
    case "over_request_rate_limit":
    case "over_email_send_rate_limit":
      return "rate_limited";
    case "signup_disabled":
    case "user_already_exists":
    case "email_exists":
      return "signup_unavailable";
    default:
      return "generic";
  }
}

export function authErrorMessage(code: string | null, locale: Locale): string | null {
  if (code === null) return null;
  const key = Object.hasOwn(authErrorMessages, code) ? authErrorMessages[code as AuthErrorCode] : "errorGeneric";
  return messages[locale][key];
}
