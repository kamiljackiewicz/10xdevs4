# Wybór daty wyniku — Plan Brief

> Full plan: [plan.md](plan.md)
> Research: [research.md](research.md)

## What & Why

Wybrać dzień wyniku i jego źródło zgodnie z kontraktem planowanego importu. Mały moduł pozwala przejść prawdziwe TDD bez uruchamiania PDF/OCR i bazy.

## Starting Point

Selektor jeszcze nie istnieje. Projekt ma walidator daty kalendarzowej i runner Node, które można wykorzystać bez nowych zależności.

## Desired End State

Funkcja zwraca niezmieniony dzień YYYY-MM-DD i podstawę wyboru albo błąd pola wymagający uzupełnienia/korekty. Przyszły import otrzyma przygotowaną regułę domenową; podłączenie nie jest częścią tej zmiany.

## Key Decisions Made

| Decision | Choice | Why | Source |
| --- | --- | --- | --- |
| Priorytet | Pobranie → raport → ręczna | Zachować znaczenie daty wyniku | Plan S-03 |
| Błędna wybrana data | Błąd pola, bez fallbacku | Nie ukrywać błędnej daty pobrania poprawną datą raportu | Użytkownik / zatwierdzony kontrakt |
| Niższy priorytet | Nie uczestniczy w wyborze ani walidacji | Zakres to wybór daty, nie walidacja całego raportu | Zatwierdzony kontrakt |
| Brak | undefined, null lub dokładnie pusty string; brak wszystkich wymaga manual_date | Nie podstawiać dzisiejszego dnia | Zatwierdzony kontrakt |
| Sukces | `{ ok: true, value: { date, basis } }`; basis collection/report/manual | Zachować źródło do późniejszej prezentacji | Plan |
| Błąd | `{ ok: false, error: { field, code } }`; required/invalid_date | Umożliwić wskazanie pola do poprawy | Plan |
| Dzień | Bez Date, stref i zakazu przyszłych dat | Zachować dzień kalendarzowy; nie kopiować reguły daty urodzenia | Research / zatwierdzony kontrakt |
| Tryb i rozmiar | Jedna faza TDD, LOW, bez dalszego wywiadu | Mały zakres z istniejącym runnerem | Użytkownik |

## Scope

**In scope:** `src/lib/result-history-date.ts`, `scripts/result-history-date.test.mjs`, ponowne użycie isCalendarDate, testy priorytetów i błędów oraz wymagane kontrole.

**Out of scope:** PDF/OCR, formaty lokalne, nazwy plików, API, baza, UI, integracja importu, zmiany runnera/CI i zamknięcie S-03 lub całego R4.

## Architecture / Approach

Czysta funkcja `resolveResultHistoryDate` przyjmuje opcjonalne collection_date, report_date i manual_date typu string/null. Rozpatruje pierwszą podaną datę, waliduje ją i zwraca wynik. Node testuje literalne oczekiwania; pierwszy RED powstaje przed kodem produkcyjnym i jest punktem zatrzymania do obejrzenia przez użytkownika.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Wybór daty wyniku w TDD | Selektor, około pięciu testów/grup i weryfikacja w dwóch strefach | Cichy fallback po błędzie lub niewłaściwe źródło |

**Prerequisites:** istniejący Node i runner unit; brak potrzeby kont, sekretów lub przeglądarki.
**Estimated effort:** jedna mała faza implementacji z punktem kontrolnym po RED.

## Open Risks & Assumptions

- Moduł nie ma konsumenta do czasu integracji S-03; test jednostkowy nie dowodzi poprawności zapisu i sortowania.
- Biały tekst i timestamp są niepoprawnymi datami, nie brakującymi polami. Pól o niższym priorytecie selektor nie waliduje.

## Success Criteria (Summary)

- Pierwszy RED dla pobrania 2024-05-17 i raportu 2024-05-20; następnie GREEN z datą 2024-05-17 i basis collection.
- Priorytety, ręczne uzupełnienie i błędy wybranych dat mają literalne asercje; dni są takie same w Pacific/Kiritimati i America/Los_Angeles.
- Unit, interaction, lint, Astro check i build przechodzą. Brak osobnej bramki UI.

## References

- [Pełny plan](plan.md), [research](research.md).
- `context/changes/review-imported-blood-result/plan.md:156` i `plan-brief.md:30`.
