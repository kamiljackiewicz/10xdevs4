# Auth i odczyt SSR — Plan Brief

> Full plan: [plan.md](plan.md)
> Audyt: [2026-11-26_auth-patient-history.md](../../audits/observability/2026-11-26_auth-patient-history.md)

## What & Why

Przywracamy sygnał diagnostyczny awarii odczytu sesji i danych pacjenta przed zamianą błędu na bezpieczny komunikat. Audyt potwierdził, że obecnie takie awarie mogą wyglądać jak zwykłe 302/200 i nie pozostawiać przyczyny w logu aplikacji.

## Starting Point

Cloudflare Workers ma zadeklarowaną obserwowalność, a Astro loguje nieprzechwycone wyjątki. Problem dotyczy błędów wynikowych SDK i już przechwyconych wyjątków SSR, które aplikacja sama redukuje do braku użytkownika lub loadFailed. Istnieje izolowany harness z dowodem obecnego zachowania.

## Desired End State

Nieoczekiwany wynik Auth albo obsługiwany błąd odczytu SSR pozostawi jeden bezpieczny rekord z nazwą operacji i identyfikatorem żądania. Użytkownik zobaczy te same komunikaty, przekierowania i statusy HTTP. Zwykły brak sesji/profilu/notatek nie stanie się incydentem.

## Key Decisions Made

| Decision               | Choice                                           | Why                                              | Source            |
| ---------------------- | ------------------------------------------------ | ------------------------------------------------ | ----------------- |
| Zakres                 | A1 + H1: middleware i dwa widoki SSR             | Dwie krytyczne luki, ograniczony przyrost        | Plan — użytkownik |
| Kanał                  | Strukturalne console.error → Cloudflare Logs     | Istniejący runtime, brak zależności/transportu   | Plan — użytkownik |
| HTTP/UI                | Zachowane                                        | Minimalizacja ryzyka regresji działania          | Plan — użytkownik |
| Prywatność             | Allowlista pól, bez raw message/stack/payloadów  | Błędy SDK mogą zawierać dane wrażliwe            | Audyt + Plan      |
| Lokalizacja awarii     | Stały operation/callsite i bezpieczny kod/status | Diagnostyka bez obietnicy oryginalnego stacka    | Plan              |
| Weryfikacja            | Node unit + izolowane sondy rzeczywistego SSR    | Istniejące narzędzia, brak sztucznego E2E logów  | Audyt + Plan      |
| Stan audytu po zmianie | A1/H1: changed, pozostałe bez zamknięcia         | Statusy i droga log → alert pozostają bez dowodu | Plan              |

## Scope

**In scope:**

- Reporter serwerowy z czystym konstruktorem zdarzeń i klasyfikacją Auth.
- Lokalny request ID oraz podłączenie do odczytów sesji, profilu i notatek.
- Testy prywatności, brak duplikatów, kontrola normalnych pustych stanów.
- Powtarzalne sondy przed/po, wyniki i nowy raport verify.

**Out of scope:**

- A2/A3/H2/H3: endpointy auth, zapisy/usuwanie i błędy klienta.
- Nowe statusy HTTP, komunikaty, tracker/SDK, alerty, wdrożenie i zmiany CI.
- Dane osobowe, treść notatek, tokeny i surowe błędy w telemetrii.

## Architecture / Approach

Czysty konstruktor buduje ograniczony rekord; adapter z bramką server-only emituje JSON do console.error. Middleware przekazuje lokalny request ID do SSR. Oczekiwane stany nie emitują niczego. Nieprzechwycony wyjątek Auth nadal trafia do istniejącej granicy Astro; nie logujemy go drugi raz. W osi czasu rozróżniamy etap odczytu profilu i etap notatek.

## Phases at a Glance

| Phase                      | What it delivers                                   | Key risk                                        |
| -------------------------- | -------------------------------------------------- | ----------------------------------------------- |
| 1. Reporter i klasyfikacja | Bezpieczny kontrakt, adapter i testy Node          | PII w błędzie SDK, szum oczekiwanych sesji      |
| 2. Middleware i SSR        | Sygnał przed istniejącym fallbackiem               | Zmiana HTTP/UI albo podwójny wpis               |
| 3. Dowód i dokumentacja    | Produkcyjny build w kopii, porównanie before/after | Badanie starego buildu albo rzeczywistych usług |

**Prerequisites:** istniejące zależności Node/npm i audyt; sondy nie wymagają realnej bazy ani sekretów. Dotychczasowy smoke/E2E używa zatwierdzonego zdalnego Supabase i danych syntetycznych ze sprzątaniem.
**Estimated effort:** orientacyjnie 2–3 sesje implementacji i weryfikacji w trzech fazach, bez wdrożenia.

## Open Risks & Assumptions

- Dostarczenie logu do alertu poza repo jest niezweryfikowane; plan gwarantuje tylko emisję aplikacyjną.
- Oryginalny stack nie jest zachowywany. Kontrolowany callsite/kod/status daje świadomie węższą diagnostykę bez surowych danych.
- Sondy muszą kopiować bieżący kod, także nowe pliki reportera, i zatrzymywać własne serwery. Baseline oraz wcześniejszy raport pozostają niezmienne.
- Reporter ma być fail-safe: awaria sinka nie zmieni UI/HTTP, lecz może uniemożliwić dostarczenie zdarzenia.

## Success Criteria (Summary)

- Dla obsługiwanej awarii A1/H1 pojawia się jeden bezpieczny rekord; dla oczekiwanych stanów zero.
- Sondy before/after potwierdzają zachowane HTTP/UI, brak duplikatów i wycieku danych; istniejące testy przechodzą.
- Dokumentacja uczciwie pozostawia statusy 200/302 oraz produkcyjne powiadomienia poza dowodem tej poprawki.
