---
date: 2026-11-13T00:59:14Z
researcher: Codex
git_commit: 20553d0aa07a9cc89c3b9ab23ae2ce5ee1b90d6e
branch: main
repository: 10xdevs4
topic: "Wybór daty wyniku jako mały zakres TDD"
tags: [research, result-date, tdd, chronology]
status: complete
last_updated: 2026-11-13
last_updated_by: Codex
---

# Research: Wybór daty wyniku

## Research Question

Jaki istniejący kontrakt określa wybór daty wyniku, czy jego implementacja już istnieje i jak przygotować mały zakres test-first bez uruchamiania całego importu?

## Summary

- Dla historii raportu plan S-03 określa priorytet: data pobrania, następnie oznaczona data raportu, następnie ręcznie podana data. Dzień kalendarzowy ma pozostać bez konwersji stref czasowych (`context/changes/review-imported-blood-result/plan.md:156`; `plan-brief.md:30`).
- W sprawdzonym zakresie `src/lib`, `src/pages/api`, `supabase/migrations`, `scripts` i `tests` nie znaleziono modułu raportów ani wyboru ich daty. Aktualne moduły domenowe dotyczą profilu i notatek; ich walidacja nie wybiera między datą pobrania i raportu (`src/lib/patient-profile.ts:36`; `src/lib/timeline-notes.ts:34`). To negatywne ustalenie jest ograniczone do wymienionych katalogów.
- Użytkownik wybrał zgłoszenie błędu daty pobrania wymagającego korekty, gdy data pobrania jest podana, ale niepoprawna, nawet przy poprawnej dacie raportu (decyzja w tej rozmowie, 2026-11-13). Nie utożsamiać błędnej daty z jej brakiem.

## Detailed Findings

### Źródło reguły i granice zakresu

`context/changes/review-imported-blood-result/plan.md:90` rozróżnia datę pobrania i raportu oraz wyklucza wyprowadzanie daty z nazwy pliku. Linia 134 wymaga zapisania podstawy daty, a linia 214 jej prezentacji. Wydzielona funkcja może więc zwracać dzień wraz z jego źródłem.

Plan S-03 utrzymuje bramkę ekstrakcji przed integracją bazy i interfejsu (`plan.md:52`). Mały moduł domenowy z testami jednostkowymi nie realizuje tej bramki ani nie zamyka fazy S-03. Nie wymaga PDF.js, OCR, API, migracji, przeglądarki ani danych pacjenta.

### Istniejąca walidacja i runner

`src/lib/patient-profile.ts:27` eksportuje `isCalendarDate`: sprawdza format YYYY-MM-DD, zakres składników i liczbę dni z uwzględnieniem lat przestępnych, bez budowania obiektu Date. `scripts/patient-profile.test.mjs:43` ma przykłady niezależnych oczekiwań dla poprawnych i błędnych dat. Zakaz przyszłej daty w walidatorze profilu dotyczy daty urodzenia (`patient-profile.ts:57`); źródła S-03 nie ustanawiają analogicznej reguły dla selektora daty wyniku.

`package.json`, skrypt `test:unit`, uruchamia natywny runner Node dla `scripts/*.test.mjs`. Test może importować nowy moduł TS bez nowej konfiguracji, tak jak `scripts/patient-profile.test.mjs:3`. Import zależności z rozszerzeniem .ts jest obsługiwany przez konfigurację Astro (`tsconfig.json:2`; `node_modules/astro/tsconfigs/base.json:10`).

### Kontrakt do zatwierdzenia w planie

Proponowany selektor rozpatruje pola według priorytetu. Pierwsza podana data jest walidowana; jej niepoprawność zwraca błąd tego pola zamiast przejścia do niższego źródła. Daty o niższym priorytecie nie uczestniczą w tym wyborze. To uogólnienie zaakceptowanej decyzji o błędnej dacie pobrania wymaga jawnego zapisania w planie.

Rekomendowany mały interfejs przyjmuje opcjonalne daty kalendarzowe (string lub null), a zwraca dzień i źródło albo błąd wymaganej/niepoprawnej daty. Brak źródeł powinien sygnalizować potrzebę ręcznej daty, bez podstawiania dzisiejszego dnia. Szczegóły nazw i pustych pól należą do planu, nie do ustaleń o istniejącym kodzie.

## Code References

- `context/changes/review-imported-blood-result/plan.md:156` — źródło priorytetu i zachowania dnia.
- `context/changes/review-imported-blood-result/plan-brief.md:30` — ręczna data przy braku obu dat źródłowych.
- `src/lib/patient-profile.ts:27` — istniejący czysty walidator daty kalendarzowej.
- `scripts/patient-profile.test.mjs:43` — przykłady testów kalendarza z literalnymi oczekiwaniami.
- `package.json` — istniejący skrypt test:unit.

## Architecture Insights

Nadaje się do małego modułu domenowego z testami w istniejącym runnerze Node. Nie ma potrzeby zmiany konfiguracji Vitest ani dodawania zależności. Typ wyniku powinien zachowywać źródło daty na potrzeby późniejszej integracji S-03. Oczekiwania testów mają wynikać z priorytetu źródeł i jawnych danych, bez obliczania ich produkcyjnym selektorem.

## Historical Context

Źródłem jest aktywny plan S-03, nie zarchiwizowana zmiana. Przesunięcie dni i chronologia są ryzykiem R4 w `context/foundation/test-plan.md`, ale ten moduł nie zastępuje późniejszych testów zapisu, odczytu i sortowania.

## Related Research

`context/changes/testing-note-draft-retention/research.md` dotyczy pamięciowego szkicu notatki; nie określa wyboru dat raportu.

## Open Questions and Verification Limits

Nie uruchamiano testów ani builda w ramach tego badania. Funkcja nie ma jeszcze konsumenta produkcyjnego; jego podłączenie nastąpi w odrębnym zakresie S-03. Reguła korekty błędnej daty pobrania jest rozstrzygnięta przez użytkownika; szczegółowy interfejs i zachowanie pól o niższym priorytecie zostaną przedstawione do zatwierdzenia przed TDD.
