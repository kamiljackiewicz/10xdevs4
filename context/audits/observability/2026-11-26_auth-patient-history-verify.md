---
type: observability-audit
date: 2026-11-26
mode: verify
source_commit: 2a8c3f2
source: working-tree
previous_report: 2026-11-26_auth-patient-history.md
areas: [auth, patient-history]
runtime_proof: local-a1-h1
production_alerts: not-verified
---

# Weryfikacja A1/H1 — Auth i odczyty SSR

Poprawka przywraca bezpieczny sygnał dla obsługiwanych awarii A1/H1. **Nie zmienia HTTP/UI**: awaria wyniku Auth nadal przekierowuje 302, a odczytu SSR nadal daje 200 z dotychczasowym komunikatem. Nie jest to potwierdzenie działania alertów produkcyjnych.

## Dowód

Ten sam harness produkcyjnego buildu Astro/Cloudflare uruchomiono dla `0a7e115` i working tree opartego na `2a8c3f2`. Zastąpiono wyłącznie integrację Supabase w nowych kopiach tymczasowych; zachowano rzeczywisty middleware, strony i reporter. Nie kopiowano sekretów ani stanu sesji, nie łączono się z Supabase ani produkcyjnym monitoringiem.

- Before: **34/34 PASS**, zero zdarzeń aplikacyjnych.
- After: **34/34 PASS**, 18 zdarzeń: dokładnie jedno na każdą obsługiwaną awarię w PL/EN.
- Wszystkie 34 pary mają identyczne statusy, przekierowania i hashe całych odpowiedzi.
- Brak zdarzeń dla brakującej sesji, zdrowych odczytów, brakującego profilu/daty i pustych notatek.
- Kontrolny wyjątek Auth pozostaje 500 i jest logowany przez framework bez aplikacyjnego duplikatu.
- Końcowe logi i odpowiedzi nie zawierają zasianych sekretów/PII. Diagnostyka używa zamkniętego schematu i lokalnych UUID v4, bez surowego stacka.

Polecenia, pełna macierz, ścieżki zachowanych kopii i ograniczenia znajdują się w [verification.md](../../changes/report-auth-and-read-failures/verification.md).

## Status ustaleń

| ID  | Status                | Wniosek                                                                                                       |
| --- | --------------------- | ------------------------------------------------------------------------------------------------------------- |
| A1  | changed               | Nieoczekiwany wynik `getUser` raportowany przed fallbackiem; oczekiwany brak sesji pomijany.                  |
| H1  | changed               | Wyniki i przechwycone wyjątki odczytu profilu/notatek raportowane z rozróżnieniem etapów. HTTP 200 zachowane. |
| A2  | open / not re-checked | Logowanie i rejestracja poza zakresem poprawki.                                                               |
| A3  | open / not re-checked | Wynik wylogowania poza zakresem poprawki.                                                                     |
| H2  | open / not re-checked | Diagnostyka zapisów i usuwania poza zakresem poprawki.                                                        |
| H3  | open / not re-checked | Diagnostyka błędów klienta poza zakresem poprawki.                                                            |

## Przekazanie operacyjne

Emisja `console.error` w lokalnym Workerze jest potwierdzona. Przechowywanie w Cloudflare Logs, retencja i sampling, utworzenie zgłoszenia oraz dostarczenie powiadomienia to kolejne, osobne etapy — nie były sprawdzane. Nie wykonano wdrożenia ani awarii na produkcji. Pierwotny [raport audytu](2026-11-26_auth-patient-history.md) pozostaje historycznym dowodem przed poprawką.
