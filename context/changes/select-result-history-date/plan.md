# Wybór daty wyniku — Implementation Plan

## Overview

Dostarczyć mały moduł domenowy do wyboru dnia wyniku i jego źródła, jako przygotowanie do S-03. Zrealizować jedną zatwierdzoną fazę przez TDD: test przed kodem, minimalna implementacja, refaktoryzacja przy zielonych testach.

## Current State Analysis

W sprawdzonym kodzie nie ma selektora dat raportu. Priorytet pochodzi z `context/changes/review-imported-blood-result/plan.md:156` i briefu `:30`. Istnieje czysty `isCalendarDate` w `src/lib/patient-profile.ts:27` i runner Node dla `scripts/*.test.mjs`. Badanie zapisano w `research.md`.

Użytkownik wybrał błąd wymagający korekty przy podanej niepoprawnej dacie pobrania, również gdy data raportu jest poprawna. Zatwierdzono LOW, brak dalszego wywiadu oraz jedną fazę z poniższym kontraktem. Pełny import pozostaje odrębną pracą.

## Desired End State

`resolveResultHistoryDate` wybiera poprawny dzień YYYY-MM-DD i wskazuje jego podstawę. Brak dat wymaga ręcznego uzupełnienia; niepoprawna pierwsza podana data zwraca błąd pola. Regułę chronią testy bez usług, sekretów i przeglądarki.

### Key Discoveries:

- `src/lib/patient-profile.ts:27` eksportuje walidację kalendarza niezależną od Date i stref czasowych.
- `scripts/patient-profile.test.mjs:3` pokazuje istniejącą konwencję importu modułu TS z testu Node.
- `context/changes/review-imported-blood-result/plan.md:90` wyklucza wyprowadzanie daty z nazwy pliku.
- Zakaz przyszłych dat w walidacji profilu dotyczy daty urodzenia; nie jest regułą tego selektora.

## What We're NOT Doing

- PDF/OCR, parsowanie dat drukowanych w dokumentach i zgadywanie formatu dat.
- API, baza, UI, konsument modułu ani integracja z importem.
- Daty z nazwy pliku, podstawianie dzisiejszego dnia i konwersja stref czasowych.
- Zakaz dat przyszłych, reguły chronologii względem urodzenia lub porównywanie dat pobrania i raportu.
- Refaktoryzacja istniejących walidatorów, zmiany zależności, konfiguracji runnerów lub CI.
- Zamknięcie faz planu S-03 lub całego ryzyka R4.

## Implementation Approach

Nowy moduł korzysta z istniejącego walidatora kalendarza; import względny z rozszerzeniem .ts obsługuje runner Node oraz konfiguracja Astro. Testy używają `node:test`, `node:assert/strict` i niezależnych wartości literalnych. Nie mockują selektora ani walidatora. Nie zmieniać istniejących reguł profilu i notatek.

## Phase 1: Wybór daty wyniku w TDD

### Overview

Zaimplementować zatwierdzony kontrakt czystej funkcji, zachowując kolejność RED → GREEN → REFACTOR. Pierwszy test ma powstać przed plikiem produkcyjnym.

### Changes Required:

#### 1. Kontrakt selektora

**File**: `src/lib/result-history-date.ts`

**Intent**: Wybrać dzień wyniku na podstawie znaczenia źródła i zachować tę informację dla przyszłego importu.

**Contract**: Eksportować `ResultHistoryDateInput` z opcjonalnymi polami `collection_date`, `report_date`, `manual_date` typu string lub null oraz funkcję `resolveResultHistoryDate(input: ResultHistoryDateInput)`. Sukces ma postać `{ ok: true, value: { date, basis } }`, gdzie `basis` to `collection`, `report` lub `manual`. Błąd ma postać `{ ok: false, error: { field, code } }`, z nazwą pola wejściowego i kodem `required` albo `invalid_date`.

- Rozpatrywać pola kolejno: collection_date, report_date, manual_date. undefined, null i dokładnie pusty string oznaczają brak. Nie trimować ani nie parsować formatu lokalnego; biały tekst nie jest pustym polem w tym kontrakcie.
- Walidować pierwszą podaną datę przez istniejący isCalendarDate. Błędna data zwraca invalid_date tego pola i zatrzymuje wybór. Pola o niższym priorytecie nie uczestniczą w wyborze ani walidacji selektora.
- Poprawną datę zwracać jako niezmieniony string i właściwą podstawę. Poprawne daty przyszłe są dozwolone; funkcja nie korzysta z zegara ani strefy czasowej.
- Gdy brakuje wszystkich dat, zwracać błąd `{ field: "manual_date", code: "required" }`. Nie przyjmować ani nie analizować nazwy pliku.

#### 2. Testy prowadzące implementację

**File**: `scripts/result-history-date.test.mjs`

**Intent**: Przypiąć priorytety i zachowanie dnia przed napisaniem implementacji, a następnie sprawdzić błędy bez cichego fallbacku.

**Contract**: Około pięciu skupionych testów/grup, według istniejącej konwencji Node. Pierwszy czerwony test: collection_date `2024-05-17` i report_date `2024-05-20` dają `{ ok: true, value: { date: "2024-05-17", basis: "collection" } }`. Brak nowego modułu może być początkowym czerwonym wynikiem; uszkodzony test nie jest dowodem RED. Przed dopisaniem kodu produkcyjnego pokazać wynik RED użytkownikowi i zatrzymać się na asercji zgodnie z regułą lekcji w AGENTS.md.

- Pierwszeństwo daty pobrania; ignorowanie pól o niższym priorytecie, także niepoprawnych. Wartości literalne sprawdzają niezmieniony dzień i podstawę.
- Data raportu przy braku pobrania: null, undefined i pusty string. Ręczna data nie zastępuje dostępnej daty raportu.
- Ręczna data przy braku obu dat źródłowych.
- Brak dat daje wymaganie manual_date; brak nie zmienia się w datę dzisiejszą.
- Błąd pierwszej podanej daty dla każdego źródła, także przy poprawnej dacie o niższym priorytecie. Uwzględnić niemożliwy dzień, nieprzestępny luty, format bez zer, biały tekst i timestamp. Poprawny dzień przestępny i przyszły pozostają poprawne.

### Success Criteria:

#### Automated Verification:

- `node --experimental-strip-types --test scripts/result-history-date.test.mjs` przechodzi dla zatwierdzonych priorytetów, źródeł, braków i błędów dat; wykonanie TDD zawiera wykazany RED przed implementacją.
- Test selektora przechodzi również przez `TZ=Pacific/Kiritimati node --experimental-strip-types --test scripts/result-history-date.test.mjs` i `TZ=America/Los_Angeles node --experimental-strip-types --test scripts/result-history-date.test.mjs`, z tymi samymi oczekiwanymi dniami.
- `npm run test:unit`, `npm run test:interaction`, `npm run lint`, `npx astro check` i `npm run build` przechodzą po zmianie.

#### Manual Verification:

Nie jest wymagana osobna weryfikacja UI: moduł nie jest podłączany do widoku. Pauza po pierwszym RED jest punktem kontrolnym przebiegu TDD, nie zastępuje automatycznych kryteriów.

## Testing Strategy

### Unit Tests:

Jawne dane wejściowe i pełne oczekiwane wyniki. Oczekiwań nie obliczać selektorem, walidatorem ani obiektem Date. Nie uzależniać przykładów od bieżącego dnia. Zmiana kolejności źródeł, cichy fallback po błędzie i nieprawidłowa podstawa powinny powodować porażkę testów.

### Integration Tests:

Istniejące testy interakcji pozostają kontrolą regresji. Ta zmiana nie dodaje integracji raportów; sam test funkcji nie dowodzi poprawności przyszłego zapisu, prezentacji ani sortowania wyników.

### Manual Testing Steps:

Brak ręcznych testów produktu w tym zakresie. Po pierwszym RED użytkownik ogląda test i jego wynik przed kontynuacją GREEN.

## Performance Considerations

Ograniczony wybór spośród trzech pól; bez I/O, usług i nowych zależności. Nie tworzyć infrastruktury benchmarków.

## Migration Notes

Brak migracji i wdrożenia. Nowy moduł nie ma jeszcze konsumenta; jego późniejsze podłączenie jest częścią S-03. Wycofanie tej zmiany usuwa nowy moduł i test, bez operacji na danych.

## References

- `research.md` — źródła, zakres sprawdzonego kodu i decyzja użytkownika.
- `context/changes/review-imported-blood-result/plan.md:156` — priorytet i data kalendarzowa.
- `context/changes/review-imported-blood-result/plan-brief.md:30` — ręczne podanie daty.
- `src/lib/patient-profile.ts:27` — walidator do ponownego użycia.
- `scripts/patient-profile.test.mjs` — istniejący wzorzec testów.
- `AGENTS.md` — reguły lekcji M3L2 i pauza po RED.

## Progress

### Phase 1: Wybór daty wyniku w TDD

#### Automated

- [x] 1.1 `node --experimental-strip-types --test scripts/result-history-date.test.mjs` przechodzi dla zatwierdzonych priorytetów, źródeł, braków i błędów dat; wykonanie TDD zawiera wykazany RED przed implementacją. — 9584788
- [x] 1.2 Test selektora przechodzi również przez `TZ=Pacific/Kiritimati node --experimental-strip-types --test scripts/result-history-date.test.mjs` i `TZ=America/Los_Angeles node --experimental-strip-types --test scripts/result-history-date.test.mjs`, z tymi samymi oczekiwanymi dniami. — 9584788
- [x] 1.3 `npm run test:unit`, `npm run test:interaction`, `npm run lint`, `npx astro check` i `npm run build` przechodzą po zmianie. — 9584788
