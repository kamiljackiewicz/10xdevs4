# Auth and SSR failure diagnostics — Implementation Plan

## Overview

Przywrócić bezpieczny sygnał diagnostyczny dla nieoczekiwanych błędów odczytu sesji oraz profilu/osi czasu SSR: A1 i H1 z audytu obserwowalności. Emitować strukturalne zdarzenia przez console.error do istniejącego kanału Cloudflare, przed obecnym fallbackiem. Użytkownik zatwierdził zakres, kanał i zachowanie obecnych statusów HTTP oraz UI.

## Current State Analysis

- `src/middleware.ts:12` pobiera tylko data.user, ignorując wynikowy error z getUser. Oczekiwany brak sesji i awaria providera mogą skończyć się tym samym 302 lub 401.
- `src/pages/dashboard.astro:19` redukuje błąd zapytania do loadFailed; catch przy `:27` odrzuca wyjątek. Strona pozostaje HTTP 200 z bezpiecznym komunikatem.
- `src/pages/dashboard/timeline.astro:21` ma dwa etapy odczytu (profil i notatki). Błędy wynikowe oraz wyjątki przy `:41` stają się loadFailed bez zachowania przyczyny.
- Astro już loguje nieprzechwycone wyjątki middleware/handlerów; dodanie ogólnej granicy catch-and-rethrow grozi podwójnym raportowaniem. Źródło: `node_modules/astro/dist/core/routing/handler.js:80`, `:101`.
- Auth SDK domyślnie zwraca błędy jako wyniki. Jego AuthError.toJSON zawiera message (`node_modules/@supabase/auth-js/src/lib/errors.ts:35`), więc serializacja całego błędu jest niedopuszczalna.
- Repo deklaruje observability Cloudflare (`wrangler.jsonc:12`), ale produkcyjnych alertów użytkownik nie sprawdzał. W tej zmianie gwarantujemy emisję bezpiecznego logu, nie jego dostarczenie do człowieka.
- Audyt i dziewięć sond są zapisane w `context/audits/observability/2026-11-26_auth-patient-history.md`; izolowany baseline pozostał w `/private/tmp/medlab-observability-20261126-001`.

## Desired End State

Każdy obsługiwany, nieoczekiwany błąd A1/H1 pozostawia jeden kontrolowany wpis diagnostyczny przed utratą obiektu błędu. Normalne stany sesji i danych nie generują incydentów. Wszystkie dotychczasowe statusy, przekierowania, komunikaty i granice dostępu pozostają zachowane.

### Key Discoveries:

- Reporter może być synchroniczny i bez sieci; console.error jest obsługiwane przez runtime Workers.
- Nazwa katalogu server sama nie blokuje importu klientowego; side-effect import `astro:env/server` zapewnia taką bramkę w zainstalowanym Astro (`node_modules/astro/dist/env/vite-plugin-env.js:65`).
- Obecny `npm run test:unit` obejmuje `scripts/*.test.mjs` i czysty TypeScript przez strip-types; Vitest/jsdom obejmuje wyłącznie interakcje React. Nie rozszerzać jego zakresu o SSR.
- Stały identyfikator operacji/miejsca zastąpi surowy stack w tym pierwszym kontrakcie. Nie obiecywać zachowania oryginalnego stack trace ani pełnej przyczyny z zewnętrznego systemu.

## What We're NOT Doing

- A2/A3/H2/H3: endpointy signin/signup/signout, zapisy i usuwanie danych, klientowe błędy sieci/hydratacji.
- Zmiana statusów na 503, nowych stron błędów, tekstów UI, dat, sortowania, RLS lub migracji.
- Nowy tracker, SDK, zewnętrzny transport, automatyczne alerty, dashboardy, wdrożenie ani zmiany CI.
- Zapisywanie haseł, tokenów, cookies, nagłówków, payloadów, danych pacjenta, dowolnych URL, raw message/details/hint/stack/cause/originalError.
- Traktowanie braku konfiguracji, brakującej sesji lub pustego profilu jako automatycznego incydentu. Zachować obecne zachowanie banera konfiguracji.
- Zamknięcie wszystkich ustaleń audytu lub dowód działania monitoringu produkcyjnego.

## Implementation Approach

Oddzielić czysty konstruktor zdarzenia i klasyfikator Auth od małego adaptera serwerowego. Adapter emituje wyłącznie nowy rekord z kontrolowanych prymitywów. Middleware generuje lokalny request ID i przekazuje go w App.Locals. SSR raportuje wynik lub przechwycony wyjątek przed loadFailed; etapy odczytu osi czasu mają odrębne operacje.

Weryfikacja składa się z testów kontraktu w istniejącym runnerze Node i produkcyjnego buildu w izolowanej kopii z atrapą Supabase. Nie zastępować testu rzeczywistych stron SSR testem przepisującym ich logikę.

## Critical Implementation Details

Reporter nie może serializować wejściowego błędu ani uruchamiać jego toJSON/getterów. Zdarzenie używa bezpiecznych, ograniczonych wartości i stałych identyfikatorów miejsc; nie próbuje czyścić dowolnego tekstu regularnym wyrażeniem. Błąd samej diagnostyki nie może zmieniać odpowiedzi żądania. Jeśli sink nie działa, dostarczenie logu nie jest gwarantowane.

Nieprzechwycone wyjątki getUser nadal trafiają do istniejącej granicy Astro i zachowują 500. Nie dodawać lokalnego logowania i ponownego rzucania tego samego wyjątku. Nowe raportowanie A1 dotyczy wynikowego error, który dotychczas znikał; H1 obejmuje również już istniejące catch SSR.

## Phase 1: Bezpieczny reporter i klasyfikacja Auth

### Overview

Zdefiniować minimalny, testowalny kontrakt sygnału bez danych wrażliwych i bez nowej zależności.

### Changes Required:

#### 1. Czysty kontrakt i klasyfikator

**Files**: `src/lib/observability.ts` (nowy), `scripts/observability.test.mjs` (nowy).

**Intent**: Budować diagnostykę z jawnie dozwolonych pól; rozróżniać oczekiwany brak/nieważność sesji od awarii zależności i błędów nieznanych.

**Contract**: Eksportować czysty konstruktor zdarzenia, predykat nieoczekiwanego błędu odczytu Auth i fabrykę reportera z wstrzykiwanym sinkiem, aby testować normalizację oraz błędy emisji w Node bez wirtualnych modułów Astro. Schemat v1: event=application_failure, version=1, operation, kind=result|exception, request_id, callsite oraz kontrolowane error_type/upstream_code/upstream_status, jeśli dostępne. Operacje to zamknięty zbiór auth.get_user, patient.read, timeline.profile.read, timeline.notes.read; callsite wynika wyłącznie ze stałej mapy operacji. Nazwy typów i kody przechodzą jawną allowlistę; nieznane wartości stają się stałym unknown. request_id przyjmuje wyłącznie lokalny UUID; nieprawidłowa wartość nie jest kopiowana do logu. Status ma postać całkowitego HTTP 400–599; status 0 z SDK oznacza brak odpowiedzi i nie jest emitowany jako status HTTP. Nie serializować błędu ani jego zagnieżdżeń.

Klasyfikator wyklucza jawne brakujące/wygasłe/nieważne sesje rozpoznawane przez zainstalowane SDK: AuthSessionMissingError, AuthInvalidJwtError oraz kody session_not_found, session_expired, refresh_token_not_found, refresh_token_already_used, bad_jwt i invalid_jwt. Łagodny AuthRefreshDiscardedError również nie jest incydentem. Nie uznawać dowolnego 400/401 za oczekiwany brak sesji. Status 0, 5xx, błąd transportu i nierozpoznany error są nieoczekiwane. Null/undefined error nie generuje zdarzenia. Odwoływać się do kontrolowanych pól/bibliotecznych kodów, nigdy do message.

#### 2. Adapter serwerowy

**File**: `src/lib/server/report-failure.ts` (nowy).

**Intent**: Emitować zdarzenie do istniejącego kanału platformy, chroniąc aplikację przed błędem normalizacji lub sinka.

**Contract**: Eksportować synchroniczne reportFailure z operation, kind, requestId, error i opcjonalnym upstreamStatus; wynik void. Adapter importuje `astro:env/server` i podłącza testowaną fabrykę do sinka console.error, otrzymującego pojedynczy tekst JSON. Brak dodatkowego argumentu Error, sieci, globalnego stanu, timerów i zapisu body. Zwykły nieoczekiwany obiekt daje stałe unknown; awaria normalizacji daje minimalny rekord diagnostic_normalization_failed ze stałymi polami i zweryfikowanym request ID. Awaria sinka nie propaguje się do żądania ani nie uruchamia rekurencyjnego logowania.

### Success Criteria:

#### Automated Verification:

- Testy Node potwierdzają klasyfikację sesji, transportu, 5xx i nieznanych błędów oraz kontrolowany schemat zdarzeń: `npm run test:unit`.
- Testy końcowego wyjścia nie znajdują zasianych sekretów/PII w message, details, stack, cause, getterach, toJSON i obiektach cyklicznych; awaria sinka nie rzuca błędu.
- `npm run lint`, `npx astro check` i `npm run build` przechodzą bez nowych zależności.

#### Manual Verification:

- Przejrzano przykładowy JSON i potwierdzono zakres bezpiecznych pól oraz brak obietnicy zachowania oryginalnego stacka.

**Implementation Note**: Po automatycznej weryfikacji poczekać na potwierdzenie przeglądu ręcznego przed kolejną fazą.

## Phase 2: Podłączenie middleware i odczytów SSR

### Overview

Zastosować kontrakt do A1/H1, zachowując dotychczasowe zachowanie aplikacji.

### Changes Required:

#### 1. Identyfikator żądania i wynik Auth

**Files**: `src/env.d.ts`, `src/middleware.ts`.

**Intent**: Umożliwić powiązanie zdarzeń tego samego żądania i raportować nieoczekiwany wynik getUser przed utratą error.

**Contract**: Dodać requestId:string do App.Locals; ustawiać go na początku middleware przez crypto.randomUUID, bez zaufania do nagłówka klienta. Rozpakować error i raportować go raz jako auth.get_user wyłącznie po klasyfikacji. Nie zmieniać przypisania data.user ani obecnych przekierowań/locals. Brak klienta Supabase zachowuje obecne zachowanie. Rzucony wyjątek zachowuje istniejącą granicę Astro bez nowego catch-and-rethrow.

#### 2. Odczyt profilu

**File**: `src/pages/dashboard.astro`.

**Intent**: Zapisać bezpieczną diagnostykę błędu wynikowego i już przechwytywanego wyjątku przed fallbackiem.

**Contract**: Operacja patient.read, request ID z locals; wynikowy error raportowany raz, catch wiąże i raportuje wyjątek raz. Nadal HTTP 200 z obecnym komunikatem przy loadFailed; null data bez error nadal oznacza formularz utworzenia profilu. Nie zmieniać JSX, tokenów ani komponentów.

#### 3. Etapy odczytu osi czasu

**File**: `src/pages/dashboard/timeline.astro`.

**Intent**: Rozróżnić awarię profilu od awarii listy notatek, zachowując czytelny fallback bez kaskady zgłoszeń.

**Contract**: Operacje timeline.profile.read i timeline.notes.read. Dla wyjątku pamiętać bieżący etap. Po błędzie lookupu profilu nie wykonywać kolejnego odczytu notatek; jeden nieudany etap daje jeden wpis. Bez zmian statusu 200, bezpiecznego UI, paginacji i sortowania; brak profilu, brak daty urodzenia oraz brak notatek nadal nie są incydentami. Nie logować danych profilu ani notatek.

### Success Criteria:

#### Automated Verification:

- `npm run lint`, `npm run test:unit`, `npm run test:interaction`, `npx astro check` i `npm run build` przechodzą.
- Dotychczasowe przepływy logowania/profilu/osi czasu przechodzą: `npm run smoke` przy działającym lokalnym preview oraz `npx playwright test` z istniejącym dedykowanym kontem E2E.

#### Manual Verification:

- W PL i EN potwierdzono zachowanie dotychczasowych komunikatów oraz braku dodatkowych danych diagnostycznych w UI i odpowiedziach.

**Implementation Note**: Smoke i istniejące E2E mogą korzystać z wcześniej zatwierdzonego zdalnego Supabase i syntetycznych danych ze sprzątaniem. Sondy awarii z fazy 3 nigdy go nie używają. Po automatycznej weryfikacji poczekać na potwierdzenie ręczne.

## Phase 3: Dowód przed/po i dokumentacja

### Overview

Utrwalić powtarzalny harness rzeczywistego SSR/Workera i udowodnić przywrócenie sygnału bez zmiany HTTP/UI.

### Changes Required:

#### 1. Powtarzalne sondy w izolowanej kopii

**Files**: `scripts/observability-probes/run.mjs`, `scripts/observability-probes/supabase-double.ts` (nowe).

**Intent**: Przenieść wzorzec istniejącego harnessu do repo, umożliwiając identyczne uruchomienie przed/po bez sekretów i trwałych zmian produkcyjnego kodu.

**Contract**: Polecenia `node scripts/observability-probes/run.mjs --revision 0a7e115 --expect before` oraz `node scripts/observability-probes/run.mjs --working-tree --expect after`. Każde uruchomienie tworzy nowy katalog OS temp i podaje jego ścieżkę; niczego nie nadpisuje ani nie usuwa po zakończeniu. Źródło revision pochodzi z git archive; working-tree uwzględnia aktualne i nowe pliki implementacji przez jawny overlay źródeł/konfiguracji, a nie sam HEAD. Nigdy nie kopiować env, auth state, logów, prawdziwych danych ani sekretów. Zależności można współdzielić, ale cache i build pozostają w kopii.

Atrapa zastępuje wyłącznie integrację Supabase w kopii. Middleware, strony i reporter to rzeczywisty kod badanego źródła. Wyłączyć telemetrię narzędzi; backend lokalny/syntetyczny, bez realnych wywołań. Sprawdzić wolny port przed uruchomieniem; harness zarządza całym cyklem życia serwera, czeka na gotowość, buduje produkcyjnie i sprząta własne procesy także przy błędzie. Wynik to JSON z HTTP, warunkami UI, zdarzeniami i logami; porównania nie mogą opierać się na dowolnym markerze raw error.message.

Macierz A1/H1: Auth wynikowy nieoczekiwany błąd; Auth brak sesji; poprawny użytkownik; nieprzechwycony wyjątek Auth (nadal 500 z frameworka, bez duplikatu aplikacyjnego); SSR profil wynik/wyjątek; oś czasu profil wynik/wyjątek i notatki wynik/wyjątek; brak profilu, brak daty oraz puste notatki. Dla obsługiwanych awarii po poprawce dokładnie jeden zdarzeniowy rekord właściwej operacji/request ID, z bezpiecznym kodem/status lub unknown. Kontrole oczekiwane dają zero rekordów; zdrowe dane i HTML błędu pozostają zgodne z baseline. Dodać złośliwe dane testowe, aby sprawdzić brak wycieku na końcowym wyjściu. Nieodmienione sondy A2/A3/H2 pozostają poza naprawą i nie wolno ogłaszać ich jako zamkniętych.

#### 2. Dowód i przekazanie operacyjne

**Files**: `context/changes/report-auth-and-read-failures/verification.md` (nowy), nowy datowany raport verify w `context/audits/observability/`.

**Intent**: Zachować wynik, polecenia i ograniczenia potrzebne do późniejszej weryfikacji wdrożenia oraz następnych poprawek.

**Contract**: Zapis odnosi się do oryginalnego raportu bez jego modyfikacji. A1/H1 oznaczyć changed: diagnostyka przywrócona, statusy zachowane; A2/A3/H2/H3 nadal otwarte lub not re-checked zgodnie z rzeczywistym dowodem. Zapisać ścieżki izolowanych kopii i wyniki before/after. Wyraźnie rozdzielić console.error, platformowe przechowywanie, zgłoszenie i powiadomienie; dostarczenie alertu pozostaje nieweryfikowane. Bez wdrożenia i bez sztucznych awarii produkcyjnych.

### Success Criteria:

#### Automated Verification:

- Oba polecenia harnessu przechodzą: baseline pokazuje brak zdarzeń aplikacyjnych, after dokładnie jeden wpis dla każdej obsługiwanej awarii A1/H1, zero dla oczekiwanych stanów oraz zachowane HTTP/UI.
- Końcowe logi sond nie zawierają zasianych sekretów/PII; kontrolny wyjątek Auth zachowuje frameworkowe 500 bez dodatkowego duplikatu aplikacyjnego.
- `npm run lint`, `npm run test:unit`, `npm run test:interaction`, `npx astro check`, `npm run build` i `npx playwright test` przechodzą; brak trwających zmian sond w głównym kodzie.

#### Manual Verification:

- Przejrzano dowód przed/po i potwierdzono, że changed dla A1/H1 nie oznacza zmiany HTTP ani zweryfikowanych alertów produkcyjnych.

**Implementation Note**: Po weryfikacji automatycznej poczekać na potwierdzenie ręczne przed zamknięciem fazy i commitem.

## Testing Strategy

### Unit Tests:

Istniejący Node runner: klasyfikacja oczekiwanego braku/nieważności sesji, awarii transportu/5xx i błędów nieznanych; stały schemat, allowlisty, brak odczytu getterów/toJSON, bezpieczne zachowanie dla nieprawidłowych wejść i niedziałającego sinka. Sprawdzać rzeczywisty serializowany rekord, nie tylko obiekt pośredni. Nie testować poprawności maskowania dowolnych danych, skoro kontrakt zabrania ich pobierania.

### Integration Tests:

Izolowany produkcyjny build i Workers preview są dowodem podłączenia middleware/SSR. Testy jednostkowe nie zastępują tej macierzy. Zachować wszystkie dotychczasowe unit, interaction, smoke i E2E; nie dodawać nowego browser speca do niewidocznego dla użytkownika kontraktu logowania.

### Manual Testing Steps:

1. Przejrzeć przykłady zdarzeń i sprawdzić, że nie zawierają danych pacjenta ani surowego błędu.
2. Porównać PL/EN i dotychczasowe przekierowania/fallbacki przy użyciu lokalnych danych syntetycznych.
3. Przeczytać wyniki before/after, osobno kontrolę nieprzechwyconego wyjątku i brak duplikatów.

## Performance Considerations

Jeden lokalny UUID na żądanie i jeden ograniczony rekord na obsługiwany, nieoczekiwany błąd; brak sieci, kolejek, retry i nieograniczonego traversowania błędu. Zdrowy odczyt oraz oczekiwany brak sesji nie emitują rekordu. Nie dodawać pamięciowego throttlingu, które ukrywałoby zdarzenia; regulacja wolumenu poza repo nie należy do tego zakresu.

## Migration Notes

Bez migracji danych, sekretów ani zmian uprawnień. Wycofanie to zwykły revert commitów zmiany; zachowanie HTTP/UI nie wymaga migracji klientów. Ta sesja zapisuje plan, nie implementuje ani nie wdraża poprawki. Artefakty planu pozostają niezacommitowane do pierwszej fazy implementacji.

## References

- Audyt: `context/audits/observability/2026-11-26_auth-patient-history.md`, A1/H1 i model przechwytywania.
- Baseline runtime: `/private/tmp/medlab-observability-20261126-001/probe/suite.mjs`, `probe/results.json`.
- Zasady testów: `context/foundation/test-plan.md`; istniejący E2E: `context/foundation/test-stack.md`.
- Źródła: `src/middleware.ts`, `src/env.d.ts`, `src/pages/dashboard.astro`, `src/pages/dashboard/timeline.astro`, `src/lib/supabase.ts`.
- Reguły wcześniejszych zmian: `context/foundation/lessons.md`.
- [Cloudflare Console API](https://developers.cloudflare.com/workers/runtime-apis/console/), sprawdzono 2026-11-26.
- [Cloudflare Workers Logs](https://developers.cloudflare.com/workers/observability/logs/workers-logs/), sprawdzono 2026-11-26; ustawienia alertów nie były weryfikowane.

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: Bezpieczny reporter i klasyfikacja Auth

#### Automated

- [x] 1.1 Testy Node potwierdzają klasyfikację sesji, transportu, 5xx i nieznanych błędów oraz kontrolowany schemat zdarzeń: `npm run test:unit`. — d543a60
- [x] 1.2 Testy końcowego wyjścia nie znajdują zasianych sekretów/PII w message, details, stack, cause, getterach, toJSON i obiektach cyklicznych; awaria sinka nie rzuca błędu. — d543a60
- [x] 1.3 `npm run lint`, `npx astro check` i `npm run build` przechodzą bez nowych zależności. — d543a60

#### Manual

- [x] 1.4 Przejrzano przykładowy JSON i potwierdzono zakres bezpiecznych pól oraz brak obietnicy zachowania oryginalnego stacka. — d543a60

### Phase 2: Podłączenie middleware i odczytów SSR

#### Automated

- [x] 2.1 `npm run lint`, `npm run test:unit`, `npm run test:interaction`, `npx astro check` i `npm run build` przechodzą. — 2a8c3f2
- [x] 2.2 Dotychczasowe przepływy logowania/profilu/osi czasu przechodzą: `npm run smoke` przy działającym lokalnym preview oraz `npx playwright test` z istniejącym dedykowanym kontem E2E. — 2a8c3f2

#### Manual

- [x] 2.3 W PL i EN potwierdzono zachowanie dotychczasowych komunikatów oraz braku dodatkowych danych diagnostycznych w UI i odpowiedziach. — 2a8c3f2

### Phase 3: Dowód przed/po i dokumentacja

#### Automated

- [x] 3.1 Oba polecenia harnessu przechodzą: baseline pokazuje brak zdarzeń aplikacyjnych, after dokładnie jeden wpis dla każdej obsługiwanej awarii A1/H1, zero dla oczekiwanych stanów oraz zachowane HTTP/UI. — 92a7c21
- [x] 3.2 Końcowe logi sond nie zawierają zasianych sekretów/PII; kontrolny wyjątek Auth zachowuje frameworkowe 500 bez dodatkowego duplikatu aplikacyjnego. — 92a7c21
- [x] 3.3 `npm run lint`, `npm run test:unit`, `npm run test:interaction`, `npx astro check`, `npm run build` i `npx playwright test` przechodzą; brak trwających zmian sond w głównym kodzie. — 92a7c21

#### Manual

- [x] 3.4 Przejrzano dowód przed/po i potwierdzono, że changed dla A1/H1 nie oznacza zmiany HTTP ani zweryfikowanych alertów produkcyjnych. — 92a7c21
