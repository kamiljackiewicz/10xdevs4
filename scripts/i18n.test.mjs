import assert from "node:assert/strict";
import test from "node:test";
import {
  authErrorMessage,
  formatProfileDate,
  isLocale,
  mapAuthError,
  messages,
  resolveLocale,
  safeReturnPath,
} from "../src/lib/i18n.ts";

test("profile dates are localized without changing the calendar day and tolerate empty or invalid values", () => {
  assert.equal(formatProfileDate("2000-02-29", "pl"), "29 lutego 2000");
  assert.equal(formatProfileDate("2000-02-29", "en"), "29 February 2000");
  for (const value of [null, "", "invalid", "2025-02-29", "2025-13-01"]) {
    assert.equal(formatProfileDate(value, "pl"), "");
  }
});

test("only Polish and English are selectable; an absent or invalid preference defaults to Polish", () => {
  for (const locale of ["pl", "en"]) {
    assert.equal(isLocale(locale), true);
    assert.equal(resolveLocale(locale), locale);
  }
  for (const locale of [undefined, null, "", "PL", "de", "en-US", "__proto__", 1, {}]) {
    assert.equal(isLocale(locale), false);
    assert.equal(resolveLocale(locale), "pl");
  }
});

test("dictionaries have identical keys and nonempty translations, including placeholders", () => {
  assert.deepEqual(Object.keys(messages.pl).sort(), Object.keys(messages.en).sort());
  for (const key of Object.keys(messages.en)) {
    assert.equal(typeof messages.pl[key], "string", key);
    assert.ok(messages.pl[key].trim(), key);
    assert.ok(messages.en[key].trim(), key);
    assert.deepEqual(messages.pl[key].match(/\{\w+\}/g), messages.en[key].match(/\{\w+\}/g), key);
  }
  assert.equal(messages.pl.signIn, "Zaloguj się");
  assert.equal(messages.en.signIn, "Sign in");
});

test("safe local destinations retain paths, error codes, query parameters and anchors", () => {
  for (const path of ["/", "/dashboard", "/auth/signin?error=invalid_credentials", "/auth/signup?x=1&y=2#form"]) {
    assert.equal(safeReturnPath(path), path);
  }
  assert.equal(safeReturnPath("/auth/../dashboard"), "/dashboard");
});

test("unsafe redirects fall back to the homepage", () => {
  for (const path of [
    undefined,
    null,
    {},
    "",
    "dashboard",
    "https://evil.example/dashboard",
    "https://locale.invalid/dashboard",
    "javascript:alert(1)",
    "//evil.example",
    "///evil.example",
    "/\\evil.example",
    "/%2Fevil.example",
    "/%5cevil.example",
    "/%0a/evil.example",
    "/\n/evil.example",
    "/\t/evil.example",
    " /dashboard",
    "/foo/..//evil.example",
  ]) {
    assert.equal(safeReturnPath(path), "/", String(path));
  }
});

test("provider errors map to a stable, safe application code without exposing details", () => {
  assert.equal(mapAuthError({ code: "invalid_credentials" }), "invalid_credentials");
  assert.equal(mapAuthError({ code: "email_not_confirmed" }), "email_not_confirmed");
  assert.equal(mapAuthError({ code: "weak_password" }), "weak_password");
  assert.equal(mapAuthError({ code: "over_request_rate_limit" }), "rate_limited");
  assert.equal(mapAuthError({ code: "over_email_send_rate_limit" }), "rate_limited");
  assert.equal(mapAuthError({ status: 429 }), "rate_limited");
  for (const code of ["signup_disabled", "user_already_exists", "email_exists"]) {
    assert.equal(mapAuthError({ code }), "signup_unavailable");
  }
  assert.equal(mapAuthError({ message: "private provider detail" }), "generic");
  assert.equal(mapAuthError({ code: "unknown_provider_error", status: 500 }), "generic");
});

test("an existing error code is translated at rendering time, and unrecognized input is never echoed", () => {
  assert.equal(authErrorMessage(null, "pl"), null);
  assert.equal(authErrorMessage(null, "en"), null);
  assert.equal(authErrorMessage("invalid_credentials", "pl"), messages.pl.errorInvalidCredentials);
  assert.equal(authErrorMessage("invalid_credentials", "en"), messages.en.errorInvalidCredentials);
  assert.equal(authErrorMessage("not_configured", "pl"), messages.pl.errorNotConfigured);
  for (const input of ["", "provider secret", "__proto__", "constructor", "<script>alert(1)</script>"]) {
    assert.equal(authErrorMessage(input, "pl"), messages.pl.errorGeneric);
    assert.equal(authErrorMessage(input, "en"), messages.en.errorGeneric);
  }
});
