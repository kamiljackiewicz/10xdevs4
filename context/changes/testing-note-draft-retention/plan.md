# Ochrona szkicu notatki — Implementation Plan

## Overview

Zamknąć lukę R2 z fazy 1 `context/foundation/test-plan.md`: automatycznie wykazać, że po błędzie zapisu treść i data pozostają dostępne w otwartym formularzu. Test ma przechodzić przez rzeczywisty komponent, walidację, interakcje DOM i kontrolowaną granicę HTTP.

Uzgodniono złożoność MEDIUM, bez dodatkowego wywiadu merytorycznego, oraz poniższe trzy fazy. Ten dokument planuje implementację; nie rejestruje jej wykonania.

## Current State Analysis

- `src/components/patient/TimelineNotes.tsx:27–43` posiada stan szkicu. `submit` nie zeruje go w obsługiwanych gałęziach błędu; sukces powoduje nawigację (`:44–80`). Formularz jest kontrolowany, z fieldset wyłączonym podczas pending (`:108–176`).
- `scripts/timeline-notes.test.mjs:1–35` sprawdza walidację. `scripts/smoke.mjs:27–46,177–213` sprawdza HTTP/SSR, a `scripts/supabase-cloud-access.mjs:95–149` reguły danych. Te granice nie obserwują niezapisanego szkicu w DOM.
- POST i PATCH zwracają błędy walidacji, sesji, profilu i bazy. UI rozróżnia 400 z błędami pól, 401, 409, błąd ogólny i wyjątek odczytu/żądania (`src/pages/api/timeline-notes/index.ts:16–48`; `src/pages/api/timeline-notes/[id].ts:28–57`; `TimelineNotes.tsx:65–79`).
- Zapis może nastąpić przed utratą odpowiedzi. Zachowany szkic nie dowodzi odrzucenia operacji ani bezpieczeństwa ponowienia POST. Research wyraźnie oddziela te gwarancje.
- `package.json` nie deklaruje zestawu testów DOM; obecny Node runner pozostaje potrzebny. CI działa na `main` i uruchamia unit przed Astro check/build (`.github/workflows/ci.yml:3–23`).

## Desired End State

`npm run test:interaction` uruchamia deterministyczne testy R2 bez aplikacji Astro, kont, sekretów i bazy. Testy tworzenia i edycji zachowują wpisaną treść i datę po odpowiedziach błędnych oraz niejednoznacznych błędach sieciowych, sprawdzając komunikaty i możliwość kontynuowania edycji. Istniejący workflow CI uruchamia tę kontrolę; cookbook §6.1 wskazuje plik referencyjny i polecenie.

### Key Discoveries:

- Wartości szkicu są surowe; payload jest normalizowany przez walidator. Oczekiwania zachowanego szkicu nie mogą pochodzić z normalizatora (`src/lib/timeline-notes.ts:26–47`; `TimelineNotes.tsx:47–60`).
- Walidacja klienta może zatrzymać żądanie. Test serwerowego 400 musi używać danych poprawnych dla props `birthDate` (`TimelineNotes.tsx:47–50`).
- Nieczytelne body odpowiedzi błędnej trafia do ostrzeżenia sieciowego; odpowiedź `ok` prowadzi do nawigacji przed odczytem body (`TimelineNotes.tsx:61–79`).

## What We're NOT Doing

- Trwałe szkice po reloadzie, zamknięciu formularza, nawigacji lub ponownym logowaniu; offline sync, idempotencja, automatyczne retry i timeout produktu.
- Zmiany API, migracje, redesign formularza, nowe przepływy uwierzytelniania, testy usuwania ani zakres R3–R5.
- Pełne e2e, instalacja przeglądarki, MCP, hooki lub AI-native review. DOM nie potwierdza hydratacji Astro ani natywnego date-picker.
- Mockowanie hooków React, setterów, walidatora lub handlerów komponentu; wyliczanie oczekiwań kodem produkcyjnym; snapshot jako dowód R2.
- Dodatkowy test sukcesu/nawigacji w jsdom. Ta faza skupia się na awariach; istniejące HTTP CRUD pozostaje oddzielnym dowodem sukcesu zapisu.
- Przepisanie zamrożonej strategii §1–§5 lub tworzenie nowego pipeline'u CI. Dodajemy krok do istniejącego workflow.

## Implementation Approach

Vitest w jsdom renderuje produkcyjny `TimelineNotes` z rzeczywistym słownikiem i walidatorem. React Testing Library oraz user-event obsługują formularz przez etykiety i przyciski. MSW kontroluje HTTP, bez wywołań usług Cloud. Node unit runner i obecne smoke pozostają oddzielnymi komendami.

Konfiguracja testowa jest niezależna od `astro.config.mjs`; jawnie obsługuje TSX, alias `@/`, URL środowiska `http://localhost` i ogranicza discovery do `tests/interaction/**/*.test.tsx`. Nie włączać przypadkiem `scripts/*.test.mjs` do Vitest.

Weryfikacja rejestru npm podczas planowania (2026-11-13): Vitest 5.1.0 wymaga Node `^22.12.0 || ^24.0.0 || >=26.0.0`; jsdom 31.0.0 wymaga `^22.22.2 || ^24.15.0 || >=26.0.0`; lokalny Node 22.23.2 spełnia oba. React Testing Library 16.3.3 deklaruje React 18/19 i `@testing-library/dom ^10`; user-event 14.6.10 oraz MSW 3.0.5 pasują do przyjętej linii Node. Są to sprawdzone ograniczenia manifestów, nie dowód wykonania zestawu. Dodać wersje do devDependencies z lockfile; brakujące wymagane peers jawnie rozwiązać przy instalacji, bez aktualizacji zależności aplikacji. Ustawić dla zadania `ci` Node 22.23.2, aby nowy test miał odtwarzalne minimum; zadanie smoke nie wymaga zmiany runtime.

### Granica względnego fetch

Node fetch wymaga absolutnego URL, a komponent używa względnego. Testowy adapter transportu ma rozwiązać względny URL względem `window.location.href` i przekazać żądanie do przechwytywanego przez MSW fetch, zachowując metodę, nagłówki, body i sygnał. Adapter nie zwraca fixture ani nie podejmuje decyzji o sukcesie. Przywracać go po teście; MSW uruchomić przed przechwyceniem delegowanego fetch. Sprawdzić faktyczne dotarcie POST/PATCH do handlera, aby nie uznać błędu konfiguracji URL za pokrycie awarii sieciowej.

## Phase 1: Uruchomienie testów interakcji

### Overview

Dostarczyć działające środowisko DOM z pierwszym testem rzeczywistego formularza, bez zależności od sekretów i procesów serwerowych.

### Changes Required:

#### 1. Zależności i komenda

**Files**: `package.json`, `package-lock.json`

**Intent**: Dodać narzędzia potrzebne do bezpośredniego dowodu zachowania formularza, zachowując istniejący runner unit.

**Contract**: DevDependencies: Vitest 5.1.0, jsdom 31.0.0, React Testing Library 16.3.3, user-event 14.6.10, MSW 3.0.5, kompatybilne `@testing-library/dom` 10.x i typy jsdom/Node 22 potrzebne nowym plikom. `test:interaction` uruchamia jednorazowo `vitest run --config vitest.config.ts`; błąd lub brak znalezionych testów ma dawać niezerowy exit code.

#### 2. Konfiguracja i izolacja

**Files**: `vitest.config.ts`, `tests/interaction/setup.ts`, `tests/interaction/http.ts`

**Intent**: Zapewnić TSX, DOM i kontrolowane HTTP bez ładowania Cloudflare/Astro env. Ograniczyć współdzielone narzędzia do cyklu życia środowiska i transportu.

**Contract**: Użyć importów API Vitest zamiast globalnych funkcji testowych. Ustawić alias do `src`, automatyczny JSX i URL jsdom. Setup uruchamia MSW z błędem dla nieobsłużonych żądań, czyści DOM i handlery pomiędzy testami oraz zamyka serwer i przywraca transport. Nie dodawać `public/mockServiceWorker.js`: MSW działa w Node. Jawnie rozwiązać peers i typy, a ewentualne dostosowanie ESLint zawęzić do nowych plików, bez osłabiania reguł produktu.

#### 3. Pierwszy test R2

**File**: `tests/interaction/timeline-note-draft.test.tsx`

**Intent**: Udowodnić, że rzeczywisty formularz i handler HTTP uczestniczą w teście, zanim rozszerzymy macierz.

**Contract**: Renderować komponent z poprawną datą urodzenia; otworzyć tworzenie przez przycisk, wpisać jawnie datę i wieloliniową treść, wysłać formularz, zwrócić JSON 500. Potwierdzić POST na właściwy URL z oczekiwanym payloadem, komunikat błędu, niezmienione wartości DOM i możliwość dalszej edycji. Nie sprawdzać wewnętrznego stanu komponentu.

### Success Criteria:

#### Automated Verification:

- `npm run test:interaction` przechodzi bez sekretów i usług; test potwierdza przechwycony POST oraz zachowane pola po JSON 500.
- `npm run test:unit`, `npm run lint`, `npx astro check` i `npm run build` przechodzą po dodaniu konfiguracji.

#### Manual Verification:

Nie jest wymagana osobna bramka ręczna: faza dodaje automatyczną kontrolę istniejącego zachowania i nie zmienia UI.

## Phase 2: Dowód ochrony szkicu R2

### Overview

Rozszerzyć test z fazy 1 na tworzenie i edycję w PL/EN, tak aby regresja czyszcząca szkic po błędzie była wykrywalna.

### Changes Required:

#### 1. Dane i macierz błędów

**File**: `tests/interaction/timeline-note-draft.test.tsx`

**Intent**: Sprawdzić obserwowalne zachowanie po awarii, wykorzystując rozgałęzienia potwierdzone w researchu. Parametryzacja ogranicza powielanie, ale nazwy testów muszą wskazywać tryb, język i błąd.

**Contract**: Dla obu trybów tworzenie/edycja i obu języków PL/EN wykonać poniższe scenariusze. W edycji początkowa notatka ma inną treść i datę niż wpisany szkic. Użyć jawnych wartości: birthDate `2000-01-01`, data szkicu `2024-05-17`, treść `  Pierwsza linia\nDruga linia  ` (w tym przykładzie `\n` oznacza rzeczywisty znak nowej linii); payload ma body `Pierwsza linia\nDruga linia`, ale pola po błędzie zachowują wpisany szkic ze spacjami. Nie wyliczać tych oczekiwań przez produkcyjny normalizator. Fixtures są syntetyczne.

- JSON 400 `{ error: "validation_failed", errors: { event_date: "before_birth_date" } }`: błędna data oznaczona w DOM i powiązany komunikat pola. To kontrakt odpowiedzi po zmianie daty urodzenia na serwerze po renderze; test nie deklaruje odtworzenia samego wyścigu bazy.
- JSON 401 `{ error: "unauthorized" }`: komunikat wygaśnięcia sesji przy zachowanym szkicu.
- JSON 409 `{ error: "birth_date_required" }`: komunikat dotyczący daty urodzenia przy zachowanym szkicu. Nie przypisywać kodowi 23514 wyłącznej przyczyny wyścigu dat.
- JSON 500 `{ error: "server_error" }`: komunikat ogólny przy zachowanym szkicu.
- Błąd transportu wyemitowany na granicy MSW po przechwyceniu żądania: ostrzeżenie o niepewnym wyniku i zachowany szkic.
- HTTP 502 z tekstem/HTML niebędącym JSON: ostrzeżenie o niepewnym wyniku i zachowany szkic. To fixture awarii infrastruktury/odczytu, a nie deklarowana odpowiedź handlera API.

W wymienionych scenariuszach sprawdzić właściwy POST/PATCH oraz docelowy URL, wartości daty i treści po rozstrzygnięciu, pozostanie formularza, komunikat właściwego typu i dostępność dalszej edycji. Wartość wiadomości można zaczerpnąć z realnego słownika; oczekiwany typ błędu wynika z kontraktu scenariusza. Nie dodawać osobnych przypadków 403/404/415 dla wspólnej gałęzi ogólnej bez nowej potrzeby.

#### 2. Pending, walidacja lokalna i niepewność

**File**: `tests/interaction/timeline-note-draft.test.tsx`

**Intent**: Wykryć utratę szkicu, utknięcie pending i niezamierzone ponowienie bez polegania wyłącznie na natychmiastowej odpowiedzi.

**Contract**: Dla tworzenia i edycji przytrzymać odpowiedź przez sterowaną obietnicę, sprawdzić zachowane pola i wyłączone kontrolki w pending oraz brak dodatkowego żądania po ponownym kliknięciu. Następnie rozstrzygnąć błąd i potwierdzić odblokowanie oraz możliwość zmiany tekstu/daty. Użyć oczekiwania na stan lub sygnał handlera, bez arbitralnych sleep.

Dodać lokalne odrzucenie daty sprzed birthDate, z niepustą treścią: błąd pola, zachowane wpisane wartości i zero HTTP. Nie podstawiać walidatora. W scenariuszach niejednoznacznych potwierdzić pojedyncze żądanie w zakończonym cyklu obsługi i ostrzeżenie zalecające sprawdzenie osi czasu. Nie asertować stanu bazy ani automatycznej nawigacji/retry jako sposobu odzyskania. Zawieszone bez końca połączenie i trwałość po opuszczeniu formularza pozostają poza zakresem.

**Evidence**: `research.md`, sekcje „Granica szkicu i formularza”, „Błędy i ich znaczenie”, „Niejednoznaczny wynik”; `TimelineNotes.tsx:44–80,108–176`. Wykrywane regresje: czyszczenie/reset pól, przywrócenie starej notatki zamiast edytowanego szkicu, błędny komunikat, brak zwolnienia pending, ponowienie bez działania użytkownika. Unikany antywzorzec: test samego walidatora, happy path lub mockowanie wnętrza komponentu.

### Success Criteria:

#### Automated Verification:

- `npm run test:interaction` potwierdza zachowanie treści i daty dla tworzenia/edycji w PL/EN przy 400, 401, 409, 500, błędzie transportu i nieczytelnym body odpowiedzi błędnej.
- `npm run test:interaction` potwierdza kontrolowany pending, odblokowanie i dalszą edycję po błędzie, lokalną walidację bez HTTP oraz brak automatycznego retry w zakończonym scenariuszu niejednoznacznym.
- `npm run test:unit`, `npm run lint`, `npx astro check` i `npm run build` przechodzą po rozszerzeniu testów.

#### Manual Verification:

Nie jest wymagana osobna bramka ręczna. Testy nie twierdzą, że sprawdzają hydratację Astro lub natywny date-picker.

## Phase 3: Bramka CI i cookbook

### Overview

Uczynić ochronę R2 obowiązkową kontrolą istniejącego CI i opisać wzorzec dla kolejnych testów. Potwierdzić, że test reaguje na regresję, zamiast jedynie przechodzić dla obecnego kodu.

### Changes Required:

#### 1. Podłączenie do istniejącego CI

**File**: `.github/workflows/ci.yml`

**Intent**: Uruchamiać dowód R2 na push/PR, bez zależności od zadania smoke i sekretów Supabase.

**Contract**: W istniejącym zadaniu `ci` ustawić Node 22.23.2 i dodać `npm run test:interaction` po `test:unit`, przed Astro check/build. Zachować istniejące kroki i osobne zadanie smoke. Nie maskować porażki przez `continue-on-error` ani retry. Workflow musi uruchamiać tę samą komendę, co lokalnie.

#### 2. Czułość na utratę danych

**File**: `src/components/patient/TimelineNotes.tsx` — wyłącznie tymczasowe mutacje do weryfikacji, bez końcowej zmiany produktu.

**Intent**: Sprawdzić, czy asercje wykrywają utratę każdego pola niezależnie.

**Contract**: Najpierw zapisać dokładne wyjściowe bajty komponentu. Osobno wprowadzić tymczasowe czyszczenie body i tymczasowy reset event_date w obsługiwanej ścieżce błędu; uruchomić odpowiedni test R2 i oczekiwać porażki asercji zachowania danego pola. Przywracać plik po każdej próbie, także przy błędzie narzędzia, bez `git reset` i bez nadpisywania cudzych zmian. Końcowy komponent ma być identyczny z wejściem. Wynik prób odnotować przy zamykaniu Progress; nie dodawać frameworka mutation testing.

#### 3. Kanoniczny wzorzec

**Files**: `context/foundation/test-plan.md`, `README.md`

**Intent**: Zapewnić przyszłym zmianom konkretną instrukcję dodawania testu szkicu oraz lokalnego uruchomienia bramki.

**Contract**: Wypełnić §6.1: lokalizacja, konwencja nazw scenariuszy, referencyjny test, komenda `npm run test:interaction`, realny komponent/słownik/walidator, MSW na granicy HTTP, asercje wartości DOM, cleanup i zakres gwarancji pamięciowego szkicu. W README dopisać tę komendę obok istniejących kontroli. Zaktualizować status fazy rollout 1 w §3 na `complete` dopiero po zamknięciu kryteriów tej fazy implementacji; do tego czasu status ma odzwierciedlać faktyczny etap. Nie zmieniać strategii §1–§5, poza dozwolonym statusem/folderem w §3. Cookbook dokumentuje rzeczywiście dostarczone wersje i wzorzec; nie obiecuje hydratacji, trwałego szkicu ani idempotencji.

### Success Criteria:

#### Automated Verification:

- Próby tymczasowego wyczyszczenia body i resetu event_date powodują porażki właściwych asercji R2; komponent po próbach jest identyczny z wejściem.
- `npm run test:interaction`, `npm run test:unit`, `npm run lint`, `npx astro check` i `npm run build` przechodzą na przywróconym kodzie; krok interakcji jest obowiązkowy w istniejącym zadaniu CI.
- README i cookbook §6.1 wskazują istniejący test referencyjny, jego rzeczywistą nazwę i działającą komendę; status rollout 1 odzwierciedla zamknięcie kryteriów.

#### Manual Verification:

Nie jest wymagana bramka wizualna. Weryfikacja workflow lokalnie obejmuje komendę i konfigurację; zdalny wynik GitHub Actions raportować dopiero po rzeczywistym uruchomieniu, bez deklarowania go na podstawie lokalnego sukcesu.

## Testing Strategy

### Unit Tests:

Zachować istniejące testy Node walidacji; nie kopiować ich do nowego runnera. Zmiana nie dodaje nowych reguł domeny.

### Integration Tests:

Test DOM jest integracją komponentu, walidacji, słownika i transportu z kontrolowanym serwerem HTTP. Granicą asercji są etykietowane input/textarea, komunikaty, dostępność kontrolek i przechwycone żądanie. W oczekiwaniach daty/treści używać niezależnych literałów. MSW odrzuca nieobsłużone żądania; test ma dowodzić, że kontrolowana awaria nastąpiła na właściwym URL, a nie wskutek brakującego środowiska. Realne API, baza i hydratacja pozostają odrębnymi granicami istniejących/innych kontroli.

### Manual Testing Steps:

Brak wymaganych ręcznych kroków w tym zakresie. Ewentualny przegląd aplikacji nie zastępuje testów R2 i nie uzasadnia deklaracji trwałości szkicu po opuszczeniu strony.

## Performance Considerations

Nie dodawać serwera Astro, sesji Cloud ani instalacji przeglądarki do testów interakcji. Używać kontrolowanych odpowiedzi i sygnałów zamiast opóźnień czasowych; czyścić handlery i DOM pomiędzy przypadkami. Nie dodawać progu coverage jako miary realizacji R2.

## Migration Notes

Brak migracji danych i wdrożenia produkcyjnego. Zmiana dotyczy devDependencies, testów, CI i dokumentacji. Wycofanie obejmuje odpowiadające im pliki/krok CI oraz opis cookbooka, bez operacji na danych użytkowników. Błąd produktu odkryty podczas testów wymaga wskazania dowodu i osobnego uzgodnienia zmiany zachowania; nie osłabiać testu ani mockować wnętrza komponentu, by uzyskać zielony wynik.

## References

- `context/changes/testing-note-draft-retention/change.md`
- `context/changes/testing-note-draft-retention/research.md`
- `context/foundation/test-plan.md` — R2, rollout 1 i §6.1.
- `context/archive/2026-09-29-record-dated-timeline-note/plan.md:29,102,156` — kontrakt pamięciowego szkicu i granice HTTP smoke.
- `src/components/patient/TimelineNotes.tsx:27–80,108–176`
- `.github/workflows/ci.yml:14–23`
- [Vitest configuration](https://vitest.dev/config/), [Vitest environments](https://vitest.dev/guide/environment) — osobna konfiguracja i DOM (checked: 2026-11-13).
- [React Testing Library setup](https://testing-library.com/docs/react-testing-library/setup/), [user-event](https://testing-library.com/docs/user-event/intro/), [MSW Node integration](https://mswjs.io/guides/integrations/node) — cykl życia i granica HTTP (checked: 2026-11-13).
- Metadane wersji/engines/peers odczytane przez `npm view` podczas planowania 2026-11-13; nie instalowano zależności na etapie planu.

## Progress

### Phase 1: Uruchomienie testów interakcji

#### Automated

- [x] 1.1 `npm run test:interaction` przechodzi bez sekretów i usług; test potwierdza przechwycony POST oraz zachowane pola po JSON 500. — b069ec9
- [x] 1.2 `npm run test:unit`, `npm run lint`, `npx astro check` i `npm run build` przechodzą po dodaniu konfiguracji. — b069ec9

### Phase 2: Dowód ochrony szkicu R2

#### Automated

- [x] 2.1 `npm run test:interaction` potwierdza zachowanie treści i daty dla tworzenia/edycji w PL/EN przy 400, 401, 409, 500, błędzie transportu i nieczytelnym body odpowiedzi błędnej.
- [x] 2.2 `npm run test:interaction` potwierdza kontrolowany pending, odblokowanie i dalszą edycję po błędzie, lokalną walidację bez HTTP oraz brak automatycznego retry w zakończonym scenariuszu niejednoznacznym.
- [x] 2.3 `npm run test:unit`, `npm run lint`, `npx astro check` i `npm run build` przechodzą po rozszerzeniu testów.

### Phase 3: Bramka CI i cookbook

#### Automated

- [ ] 3.1 Próby tymczasowego wyczyszczenia body i resetu event_date powodują porażki właściwych asercji R2; komponent po próbach jest identyczny z wejściem.
- [ ] 3.2 `npm run test:interaction`, `npm run test:unit`, `npm run lint`, `npx astro check` i `npm run build` przechodzą na przywróconym kodzie; krok interakcji jest obowiązkowy w istniejącym zadaniu CI.
- [ ] 3.3 README i cookbook §6.1 wskazują istniejący test referencyjny, jego rzeczywistą nazwę i działającą komendę; status rollout 1 odzwierciedla zamknięcie kryteriów.
