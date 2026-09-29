export type Locale = "pl" | "en";

const en = {
  language: "Language",
  warning: "Warning:",
  documentation: "Documentation",
  configMissing: "Supabase is not configured — authentication features are disabled.",
  configInstructions: "View setup instructions",
  dashboard: "Dashboard",
  signIn: "Sign in",
  signUp: "Sign up",
  signOut: "Sign out",
  notSignedIn: "Not signed in",
  welcome: "Welcome,",
  protectedPage: "This page is only for authenticated users.",
  tagline: "A production-ready starter with authentication, modern tooling, and a cosmic developer experience.",
  authReady: "Authentication Ready",
  authDescription: "Built-in Supabase auth with sign in, sign up, and protected routes out of the box.",
  modernStack: "Modern Stack",
  stackDescription: "Astro 7, React 19, Tailwind 4, and TypeScript — the latest tools, ready to go.",
  developerExperience: "Developer Experience",
  developerDescription: "ESLint, Prettier, and pre-commit hooks keep your codebase clean from day one.",
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
};

export type Messages = typeof en;

const pl: Messages = {
  language: "Język",
  warning: "Uwaga:",
  documentation: "Dokumentacja",
  configMissing: "Supabase nie jest skonfigurowany — funkcje uwierzytelniania są wyłączone.",
  configInstructions: "Zobacz instrukcję konfiguracji",
  dashboard: "Panel",
  signIn: "Zaloguj się",
  signUp: "Zarejestruj się",
  signOut: "Wyloguj się",
  notSignedIn: "Nie zalogowano",
  welcome: "Witaj,",
  protectedPage: "Ta strona jest dostępna tylko dla zalogowanych użytkowników.",
  tagline: "Gotowy do wdrożenia starter z uwierzytelnianiem, nowoczesnymi narzędziami i kosmicznym komfortem pracy.",
  authReady: "Gotowe uwierzytelnianie",
  authDescription: "Wbudowane uwierzytelnianie Supabase z logowaniem, rejestracją i chronionymi stronami.",
  modernStack: "Nowoczesne technologie",
  stackDescription: "Astro 7, React 19, Tailwind 4 i TypeScript — najnowsze narzędzia, gotowe do pracy.",
  developerExperience: "Komfort pracy programisty",
  developerDescription: "ESLint, Prettier i hooki pre-commit dbają o porządek w kodzie od pierwszego dnia.",
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
};

export const messages: Readonly<Record<Locale, Readonly<Messages>>> = { pl, en };

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
