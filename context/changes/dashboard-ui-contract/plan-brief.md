# Dashboard UI contract — Plan Brief

> Full plan: [plan.md](plan.md)
> Research: [research.md](research.md)

## What & Why

Dashboard profilu pacjenta otrzyma spokojny ciemny wygląd, czytelniejszą hierarchię i spójne kontrolki. Celem jest podłączenie istniejącego widoku do tokenów oraz komponentów repozytorium i pokazanie poprawnych stanów formularza.

## Starting Point

Profil już działa w PL/EN z tworzeniem, edycją, walidacją i ochroną właściciela. Research znalazł 22 linie kolorów palety w stronie i komponencie profilu; testy HTTP nie sprawdzają wyglądu ani fokusu.

## Desired End State

Jeden panel pokazuje podsumowanie lub formularz, jednoznaczne akcje i stany błędów/oczekiwania. Zmiana dotyczy dashboardu, z zachowaniem powrotu do Home, wylogowania i istniejącego przepływu danych. Zrzuty na danych syntetycznych potwierdzą desktop i mobile w PL/EN.

## Key Decisions Made

| Decision   | Choice                                                                    | Why                                                          | Source                  |
| ---------- | ------------------------------------------------------------------------- | ------------------------------------------------------------ | ----------------------- |
| Estetyka   | Spokojny ciemny panel, bez gradientu i przezroczystej karty               | Czytelniejsza hierarchia przy zachowaniu ciemnego charakteru | Plan: wybór użytkownika |
| Motyw      | Stały, bez przełącznika, zakres dashboard-theme                           | Ogranicza wpływ na inne widoki                               | Plan: wybór użytkownika |
| Układ      | Uporządkowanie jednego panelu                                             | Mały zakres bez nowej nawigacji                              | Plan: wybór użytkownika |
| Komponenty | Istniejący Button, minimalne Input/Select/Field                           | Zachowuje natywne props i ARIA profilu                       | Research / Plan         |
| Wartości   | Istniejące role CSS, lokalne wartości slate/fiolet; pełna tabela w planie | Bez kolejnego systemu projektowego                           | Plan                    |
| Bramka     | Siedem stanów, 1440 × 1000 i 390 × 844 px, PL/EN                          | Ujawnia stany pomijane przez smoke                           | Research / Plan         |
| Zależności | Bez nowych pakietów                                                       | Dostępny stos wystarcza do kontrolek i demonstracji          | Plan                    |

## Scope

**In scope:** dashboard, profil, zakresowane tokeny, współdzielone kontrolki, deweloperska demonstracja, reguła AGENTS i wąski guard w lint.

**Out of scope:** inne ekrany, przełącznik motywu, formularz bez JS, API, migracje, auth, wdrożenie i czyszczenie całego DS.

## Architecture / Approach

Kontroler profilu zachowuje walidację i transport. Wspólna prezentacja zasila dashboard oraz demonstrację syntetycznych stanów bez API. Lokalne tokeny w global.css nie zmieniają root, globalnego dark ani bg-cosmic. Demonstracja jest dostępna w dev; produkcyjny build zwraca 404.

## Phases at a Glance

| Phase                      | What it delivers                                     | Key risk                                   |
| -------------------------- | ---------------------------------------------------- | ------------------------------------------ |
| 1. Współdzielone kontrolki | Natywne Input/Select/Field i użycie kontraktu Button | Utrata atrybutów dostępności               |
| 2. Tokeny dashboardu       | Zakresowany ciemny motyw i dokument wartości         | Wpływ na inne ekrany                       |
| 3. Widok profilu           | Uporządkowany panel, tokeny i kontrolki              | Regresja zapisu lub lokalizacji            |
| 4. Stany i zabezpieczenia  | Demonstracja, zrzuty, reguła i guard                 | Pozorne zaliczenie stanów bez renderowania |

**Prerequisites:** działająca konfiguracja lokalna z README/CI, syntetyczny użytkownik, dostęp do przeglądarki i zrzutów. Bazowe zrzuty przed podłączeniem motywu. Brak dostępu pozostawia odpowiednie kryterium pending.

**Estimated effort:** orientacyjnie 2–3 sesje implementacyjne w czterech fazach, zależnie od dostępności lokalnego środowiska i ręcznej weryfikacji.

## Open Risks & Assumptions

- Bieżący wygląd nie został jeszcze obejrzany; kontrast i kalendarz wymagają renderowania.
- Tokeny wstępnie wybrane w planie podlegają korekcie w swoim źródle, jeśli nie spełnią kontrastu; nie wprowadzać wyjątków kolorów w widoku.
- Demonstracja musi używać rzeczywistej prezentacji i unikalnych id, bez danych pacjenta i połączeń z API.

## Success Criteria (Summary)

- PL/EN, odczyt, tworzenie, uzupełnienie, edycja, błędy i zapis działają przy zachowanej ochronie danych.
- Siedem stanów i obie szerokości mają dowody; fokus, disabled, kontrast i pending zostały obejrzane.
- Lint, Astro check, build, unit i smoke przechodzą, skan widoku wynosi zero, a demonstracja daje produkcyjne 404. Kryteria i postęp faz znajdują się wyłącznie w pełnym planie.
