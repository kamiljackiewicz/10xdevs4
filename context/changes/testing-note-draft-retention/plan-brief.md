# Ochrona szkicu notatki — Plan Brief

> Full plan: [plan.md](plan.md)
> Research: [research.md](research.md)

## What & Why

Po błędzie zapisu użytkownik ma nadal widzieć wpisaną treść i datę w otwartym formularzu notatki. Faza rollout 1 zamyka R2: HTTP smoke sprawdza API, ale nie dowodzi zachowania szkicu w formularzu React.

## Starting Point

Komponent już przechowuje szkic w pamięci i obsługuje błędy zapisu. Brakuje automatycznej kontroli DOM; istnieją testy walidacji, HTTP/SSR i integracji Supabase.

## Desired End State

Jedna komenda `npm run test:interaction` sprawdza tworzenie i edycję w PL/EN po błędach HTTP i niejednoznacznych wynikach sieciowych. CI uruchamia tę kontrolę, a cookbook §6.1 pokazuje, jak dodać kolejny test tego zachowania.

## Key Decisions Made

| Decision | Choice | Why | Source |
| --- | --- | --- | --- |
| Granica dowodu | Rzeczywisty komponent + DOM + kontrolowane HTTP | Przechodzi przez właściciela szkicu | Research |
| Runner | Vitest 5.1.0, jsdom 31.0.0, Testing Library i MSW | Test bez serwera, bazy i sekretów | Research / Plan |
| Runtime | Node 22.23.2 w zadaniu CI | Spełnia sprawdzone wymagania zależności DOM | Plan |
| Scenariusze | Tworzenie/edycja, PL/EN, 400/401/409/500, błąd transportu i nieczytelne body | Pokrywa istotne gałęzie błędów | Research / Plan |
| Niejednoznaczność | Zachowany szkic, ostrzeżenie, brak automatycznego retry | Utrata odpowiedzi nie dowodzi odrzucenia zapisu | Research |
| Czułość testów | Tymczasowe mutacje body i daty z przywróceniem pliku | Wykazuje wykrywanie regresji każdego pola | Plan |
| Struktura | Trzy fazy; MEDIUM; bez dodatkowego wywiadu | Zakres wynika z materiałów wejściowych | Potwierdzenie użytkownika |

## Scope

**In scope:** konfiguracja DOM/HTTP, testy R2, pending i lokalna walidacja, krok istniejącego CI, README i cookbook §6.1.

**Out of scope:** trwałe szkice po reloadzie/nawigacji, retry/idempotencja, migracje, redesign, hydratacja Astro, e2e, nowy pipeline i zakres pozostałych ryzyk. Nowy test sukcesu/nawigacji nie jest potrzebny do tej fazy.

## Architecture / Approach

Testing Library renderuje `TimelineNotes` z rzeczywistym walidatorem i słownikiem; user-event obsługuje etykietowane pola. MSW dostarcza odpowiedzi na przechwycone POST/PATCH. Adapter testowy rozwiązuje względny URL fetch, bez podejmowania decyzji o wyniku żądania. Asercje porównują pola DOM z niezależnym wpisanym szkicem; payload może być znormalizowany, a szkic nadal zachowuje skrajne spacje i linie.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Uruchomienie testów interakcji | Konfiguracja i pierwszy test 500 | Pozorny sukces wskutek błędu transportu testowego |
| 2. Dowód ochrony szkicu R2 | Macierz awarii, pending i lokalna walidacja | Utrata treści/daty lub zastąpienie zmian starą notatką |
| 3. Bramka CI i cookbook | Kontrola czułości, krok CI i wzorzec §6.1 | Zielony test niewykrywający regresji albo pomijany w CI |

**Prerequisites:** dostęp do npm, Node 22.23.2, aktualny research. Brak potrzeby dostępu do kont lub sekretów Supabase.
**Estimated effort:** orientacyjnie 2–3 sesje implementacji; największa niewiadoma kosztu to konfiguracja DOM/transportu.

## Open Risks & Assumptions

- Zgodność manifestów bibliotek sprawdzono; wykonanie zestawu potwierdzi faza 1. Nie osłabiać granicy testu w razie problemów konfiguracji.
- DOM emulowany nie potwierdza hydratacji Astro, natywnego kalendarza ani fizycznej utraty odpowiedzi po commicie.
- Tymczasowe mutacje muszą zostać odwrócone bez naruszenia zastanych zmian. Nie są zmianą końcową produktu.

## Success Criteria (Summary)

- Po awarii wpisana treść i data pozostają edytowalne; komunikat odpowiada scenariuszowi, a pending zostaje zwolniony.
- Testy wykrywają celowe wyczyszczenie treści i reset daty; po przywróceniu kodu kontrole przechodzą.
- CI uruchamia testy interakcji, a README i §6.1 wskazują rzeczywiście dostarczony wzorzec.

## References

- [Research](research.md), [pełny plan](plan.md), [kontrakt jakości](../../foundation/test-plan.md).
- [Vitest](https://vitest.dev/config/), [Testing Library](https://testing-library.com/docs/react-testing-library/setup/), [MSW Node](https://mswjs.io/guides/integrations/node) — checked: 2026-11-13.
