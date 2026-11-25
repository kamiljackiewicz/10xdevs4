---
type: observability-audit
date: 2026-11-26 00:14
timezone: Europe/Warsaw (+0100)
mode: audit
commit: 7b6c412
branch: main
dirty_tree: false
areas: [auth, patient-history]
area_source: foundation
runtime_proof: partial
error_tracker: "Cloudflare platform logs; app SDK not found; external tracker setup unknown"
previous_report: null
findings: { critical: 2, high: 4, medium: 0, low: 0 }
---

# Audyt obserwowalności — auth i historia pacjenta

## 1. TL;DR

- **Ignorowane wyniki SDK:** błąd odczytu sesji staje się zwykłym brakiem użytkownika, a wynik wylogowania nie jest sprawdzany (`src/middleware.ts:12`, `src/pages/api/auth/signout.ts:7`).
- **Bezpieczny komunikat zastępuje diagnostykę:** awarie logowania zmieniają się w 302, odczytu danych w stronę 200, a zapisu w anonimowy 500 (`src/pages/api/auth/signin.ts:16`, `src/pages/dashboard.astro:24`, `src/pages/api/patient.ts:36`).
- **Operacyjne catch odrzucają obiekt błędu:** klient pokazuje komunikat, lecz traci przyczynę błędu transportu/protokołu (`src/components/patient/PatientProfile.tsx:87`, `src/components/patient/TimelineNotes.tsx:76`).
- Potwierdzono lokalnie **8 konwersji awarii bez identyfikatora przyczyny w konsoli**, wobec kontrolnego wyjątku, którego stack Astro zapisało. Nie dowodzi to braku alertów w zewnętrznym systemie.
- Pierwsza poprawka: wspólny, sanitizowany mechanizm **raportuj przed konwersją**, zastosowany najpierw do awarii odczytu Auth i danych SSR. Nie ujawniać szczegółów błędu użytkownikowi.

## 2. Model przechwytywania

### W repozytorium

| Element                  | Dowód i zakres                                                                                                                                                                                                                                                                                                                       |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Runtime                  | Astro SSR, React islands, Cloudflare adapter: `astro.config.mjs:11`, `:14`, `:18`; Worker entrypoint `wrangler.jsonc:4`.                                                                                                                                                                                                             |
| Zbieranie platformowe    | `wrangler.jsonc:12` deklaruje `observability.enabled: true`. To dowód intencji w repo, nie weryfikacja działającego wdrożenia.                                                                                                                                                                                                       |
| Granica żądania          | Middleware aplikacji: `src/middleware.ts:7`. Astro obejmuje middleware i rendering granicą try/catch: `node_modules/astro/dist/core/routing/handler.js:80`, `:101`. Nieprzechwycony wyjątek jest logowany ze stackiem i zmieniany w 500. Adapter oczekuje `app.render`: `node_modules/@astrojs/cloudflare/dist/utils/handler.js:79`. |
| Zwykłe odpowiedzi        | Normalna ścieżka Astro loguje metadane żądania i status (`node_modules/astro/dist/core/routing/handler.js:94`); zwrócony Response 500 nie uruchamia gałęzi obsługi wyjątku. Metadane nie odtworzą porzuconego błędu.                                                                                                                 |
| Logger frameworka        | Domyślna implementacja: `node_modules/astro/dist/core/logger/manifest-logger.js:4`, `node_modules/astro/dist/core/logger/impls/console.js:10`. Kontrolna sonda potwierdziła tekst stacka w lokalnej konsoli.                                                                                                                         |
| Tracker/logger aplikacji | Przeszukanie produkcyjnego `src`, manifestu i konfiguracji nie znalazło inicjalizacji SDK trackera, aplikacyjnego loggera ani wywołań capture/report. Wspólny layout `src/layouts/Layout.astro:1` importuje style, banner i lokalizację; nie instaluje granicy raportowania. **Sam ten brak nie jest ustaleniem audytu.**            |
| Wyniki Auth              | Domyślne `throwOnError: false`: `node_modules/@supabase/auth-js/src/GoTrueClient.ts:211`, `:590`. `_getUser` zwraca rozpoznany błąd w wyniku: `:3272`. Retryable transport error nie jest tu logowany: `node_modules/@supabase/auth-js/src/lib/fetch.ts:230`.                                                                        |
| Wyniki DB                | PostgREST bez throwOnError zwraca błąd wraz z przyczyną/details i statusem 0 przy awarii transportu: `node_modules/@supabase/postgrest-js/src/PostgrestBuilder.ts:292`, `:345`. Te dane traci następnie kod aplikacji.                                                                                                               |
| Klient                   | Komponenty przechwytują błędy fetch/JSON lokalnie. Dodatkowo Astro emituje zdarzenie hydration-error i może zapisać błąd hydratacji w browser console (`node_modules/astro/dist/runtime/server/astro-island.js:75`, `:125`); to nie gwarantuje dostarczenia do zgłoszeń.                                                             |
| Scrubbing i sampling     | W kodzie aplikacji nie znaleziono własnego hooka czyszczenia/próbkowania ani ustawień loggera, które aktywnie pogarszałyby zdarzenia.                                                                                                                                                                                                |
| Wydanie i środowisko     | Nazwa Workera: `wrangler.jsonc:3`; build/CI: `.github/workflows/ci.yml:24`, `:45`. Kod nie zawiera inicjalizacji SDK pozwalającej ocenić jego tagowanie. Mapy źródeł, retencja i tagi dostawcy nie były sprawdzane na produkcji.                                                                                                     |
| Praca w tle              | W produkcyjnym `src` nie znaleziono aplikacyjnych kolejek, cronów ani waitUntil. Sam parametr waitUntil adaptera nie oznacza takiego przepływu w aplikacji.                                                                                                                                                                          |

### Założenia poza repozytorium — nie są ustaleniami

- Użytkownik odpowiedział, że nie sprawdzał jeszcze monitoringu; nie zgłosił konkretnego incydentu.
- Zakładamy działające zbieranie logów platformy; jego faktyczny stan jest niepotwierdzony.
- Istnienie zewnętrznego trackera, alertów statusowych, alertów zależności, integracji browser console, reguł grupowania i dostarczania powiadomień jest nieznane.
- Nie twierdzimy, że „Sentry nie działa”, że na pewno nie powstaje żaden alert, ani że brak konfiguracji w repo wyjaśnia awarie. Ustalenia opisują informację, którą aplikacja usuwa **przed** takim potokiem.

## 3. Co zostaje z awarii — dowód runtime

**Obserwowane:** produkcyjny build Astro 7.3.2 / Cloudflare adapter 14.3.1, lokalny Workers preview, port 4337. Wyłącznie izolowana kopia i deterministyczna atrapa wyników Supabase. Każda awaria miała unikalny marker `AUDIT_<id>`; poniżej „brak” oznacza brak tego markera w przechwyconej konsoli, nie brak metadanych żądania.

| Sonda / kształt awarii                         | Odpowiedź                                  | Lokalna konsola                | Tracker produkcyjny | Wniosek                                           |
| ---------------------------------------------- | ------------------------------------------ | ------------------------------ | ------------------- | ------------------------------------------------- |
| auth-user: getUser zwraca błąd 503 i user=null | 302 → /auth/signin                         | Status żądania; brak przyczyny | Niebadany           | Awaria staje się anonimową sesją.                 |
| auth-signin: provider error 503                | 302 → /auth/signin?error=generic           | Status; brak przyczyny         | Niebadany           | Mapowanie UI usuwa diagnostykę.                   |
| auth-signup: provider error 503                | 302 → /auth/signup?error=generic           | Status; brak przyczyny         | Niebadany           | Jak wyżej, w rejestracji.                         |
| auth-signout: zwrócony error                   | 302 → /                                    | Status; brak przyczyny         | Niebadany           | Kod ignoruje wynik revoke.                        |
| ssr-profile: wynik błędu odczytu profilu       | 200, HTML z komunikatem nieudanego odczytu | Status; brak przyczyny         | Niebadany           | Status zdrowej strony mimo niedostępności danych. |
| ssr-notes: błąd zapytania timeline_notes       | 200, HTML z komunikatem nieudanego odczytu | Status; brak przyczyny         | Niebadany           | Ten sam mechanizm w osi czasu.                    |
| write-result: SDK zwraca błąd zapisu           | 500, JSON server_error                     | Status; brak przyczyny         | Niebadany           | Awaria widoczna statusowo, bez źródła.            |
| write-throw: wyjątek podczas zapisu profilu    | 500, JSON server_error                     | Status; brak przyczyny         | Niebadany           | Lokalny catch blokuje dotarcie stacka do Astro.   |
| control: nieprzechwycony wyjątek handlera      | 500                                        | **Marker i stack obecne**      | Niebadany           | Framework potrafi przekazać przyczynę do konsoli. |

Nie uruchamiano ingest trackera: aplikacja nie ma w repo SDK/transportu, który można przekierować. Dodanie fikcyjnej integracji zmieniłoby przedmiot audytu. Nie badano klientowych błędów fetch/hydratacji w runtime. `runtime_proof: partial` odzwierciedla te granice.

## 4. Systemowe przyczyny źródłowe

1. **Result-style errors są ignorowane zamiast klasyfikowane.** Pobranie wyłącznie data.user i zignorowanie signOut.error usuwa jedyne rozróżnienie między normalną sesją a awarią providera (`src/middleware.ts:12`, `src/pages/api/auth/signout.ts:7`). Wyjaśnia A1 i A3.
2. **Mapowanie do bezpiecznej odpowiedzi jest końcem obsługi błędu.** Dobre decyzje UX — komunikat zamiast stacka, brak PII w odpowiedzi — nie mają równoległej ścieżki diagnostycznej. Obiekt staje się generic, boolean albo server_error (`src/lib/i18n.ts:289`, `src/pages/dashboard.astro:24`, `src/pages/api/patient.ts:36`, `src/pages/api/timeline-notes/[id].ts:25`). Wyjaśnia A2, H1 i H2.
3. **Catch obsługuje UX, lecz odrzuca przyczynę.** Catch bez bindingu usuwa wyjątek zanim framework/global handler go zobaczy (`src/pages/api/patient.ts:48`, `src/components/patient/PatientProfile.tsx:87`, `src/components/patient/TimelineNotes.tsx:76`). Wyjaśnia H2 i H3; również część H1.

## 5. Ustalenia według obszaru

### Logowanie, rejestracja i dostęp

| ID  | Lokalizacja                                                                                 | Kategoria          | Ważność  | Co dzieje się na produkcji                                                                                                                                                                                                                     | Kierunek naprawy                                                                                                                 |
| --- | ------------------------------------------------------------------------------------------- | ------------------ | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| A1  | `src/middleware.ts:12`, `:20`                                                               | missing-throw      | critical | Przy nieoczekiwanym błędzie Auth wynik user=null kieruje opiekuna do logowania, a API zachowuje się jak dla anonimowego użytkownika. Kod nie przekazuje przyczyny; 302/401 wyglądają jak normalny brak sesji, mimo awarii krytycznego dostępu. | Rozróżnić brak/wygasłą sesję od provider/transport failure; raportować tylko nieoczekiwane awarie przed bezpiecznym fallbackiem. |
| A2  | `src/pages/api/auth/signin.ts:14`, `src/pages/api/auth/signup.ts:14`, `src/lib/i18n.ts:275` | flattened-response | high     | Awaria providera jest zamieniana na redirect z generic; użytkownik widzi ogólny komunikat, a responder traci pierwotny status/kod i przyczynę na granicy aplikacji.                                                                            | Zachować komunikaty UI, ale przed mapowaniem raportować sklasyfikowane nieoczekiwane błędy Auth.                                 |
| A3  | `src/pages/api/auth/signout.ts:5`                                                           | missing-throw      | high     | Kod ignoruje error z signOut i przekierowuje jak po sukcesie. Nieudane globalne unieważnienie innych sesji nie ma sygnału diagnostycznego z aplikacji. Nie oznacza to, że bieżąca lokalna sesja na pewno pozostaje aktywna.                    | Sprawdzić wynik revoke, rozróżnić oczekiwane brakujące sesje od awarii i raportować te drugie bez tokenów.                       |

### Profil pacjenta i oś czasu

| ID  | Lokalizacja                                                                                                                                                           | Kategoria          | Ważność  | Co dzieje się na produkcji                                                                                                                                                                                                     | Kierunek naprawy                                                                                                                                                       |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| H1  | `src/pages/dashboard.astro:19`, `:27`, `:48`; `src/pages/dashboard/timeline.astro:21`, `:38`, `:41`, `:58`                                                            | flattened-response | critical | Błąd odczytu staje się loadFailed=true i komunikatem HTML. Dane są niedostępne, lecz HTTP 200 pozostaje zdrowy dla monitoringu statusowego. Obiekt błędu nie jest przekazywany do diagnostyki.                                 | Raportować sklasyfikowaną awarię odczytu; dla rzeczywistej niedostępności rozważyć odpowiedni status 503 przy zachowaniu bezpiecznego UI.                              |
| H2  | `src/pages/api/patient.ts:30`, `:45`, `:48`; `src/pages/api/timeline-notes/index.ts:28`, `:43`; `src/pages/api/timeline-notes/[id].ts:20`, `:39`, `:51`, `:64`, `:68` | identity-lost      | high     | Lookup/zapis/usunięcie może skończyć się generic 500. Responder może wykryć status, ale nie odróżni przyczyn zależności; helper patientForRequest redukuje error do boolean.                                                   | Wspólny report-and-respond zachowujący kod/status/przyczynę i operację; bezpieczna odpowiedź dla klienta pozostaje osobna.                                             |
| H3  | `src/components/patient/PatientProfile.tsx:51`, `:87`; `src/components/patient/TimelineNotes.tsx:55`, `:76`, `:87`, `:96`                                             | swallowed          | high     | Odrzucony fetch lub błędny JSON kończy się tekstem UI bez obiektu błędu. Przy awarii przed wysłaniem żądania Worker nie ma nawet żądania do zdiagnozowania. Przy utracie odpowiedzi po zapisie wynik może być niejednoznaczny. | Raportować niespodziewane błędy klienta z operacją, metodą i correlation ID; zachować komunikat o niejednoznacznym zapisie. Nie wysyłać danych formularzy ani notatek. |

### Wspólna infrastruktura kodu

Nie dodano duplikujących ustaleń. Nieprzechwycone wyjątki w middleware nie wykonują się automatycznie poza granicą Astro. Brak aplikacyjnego SDK, reguł alertów lub widocznego uploadu source maps nie jest osobną usterką w tym audycie. Hydration-error pozostaje kandydatem do osobnej sondy, ponieważ zachowanie zewnętrznego trackera przeglądarkowego jest nieznane.

## 6. Zalecana kolejność poprawek

1. **Report-before-fallback dla Auth i odczytu SSR** (A1, H1). Wspólny kontrakt raportowania z nazwą operacji, klasą błędu, kodem/status upstream oraz request ID. Oczekiwany brak sesji i pusty profil nie są incydentem. Przypisanie wdrożenia/środowiska weryfikować z rzeczywistym potokiem.
2. **Report-and-respond dla operacji zapisu i auth** (H2, A2, A3). Zachować szczegóły błędu przed mapowaniem; unikać podwójnego raportowania tego samego wyjątku. Potwierdzić politykę nieoczekiwanego 5xx versus oczekiwanych 4xx.
3. **Raportowanie klientowych błędów transportu/protokołu** (H3). Zachować correlation ID, metodę i bezpieczną nazwę operacji; odróżnić błąd sieci od parsowania nie-JSON. Nie uzależniać zachowania UX od powodzenia wysyłki telemetrii.
4. **Dowód przed/po**: zastosować poprawkę w izolowanej kopii i uruchomić ten sam katalog sond; oczekiwać zachowanej przyczyny przy nadal bezpiecznych odpowiedziach. Uzupełnić osobno sondę klienta i sprawdzenie produkcyjnej drogi log → alert.

Prywatność: nigdy nie raportować haseł, cookies, tokenów, pełnych URL z query, body formularzy, treści notatek, nazwisk ani surowych error.details bez scrubbera. Zachować typ, kod, stack po oczyszczeniu, przyczynę i stabilne nazwy operacji; identyfikatory korelacji lub zahashowane identyfikatory zamiast emaila. Oczekiwane invalid credentials, walidacja, brak/wygasła sesja, odmowa dostępu, duplikat 23505 i konflikt 23514 nie powinny zasypywać zgłoszeń wyjątków.

## 8. Metoda i ograniczenia

- Start: 2026-11-26 00:14 CET, commit `7b6c412`, gałąź main, czyste drzewo. Raport zakończony tego samego dnia. Brak wcześniejszych raportów do porównania.
- Zakres wyprowadzono z shape-notes, PRD FR-001/FR-004/Access Control i roadmapy S-01/S-02; użytkownik go zatwierdził. Import/porównania S-03–S-05 są planowane i nie były traktowane jako istniejące przepływy.
- Trzej audytorzy tylko do odczytu: auth, historia pacjenta, infrastruktura przekrojowa. Lider sprawdził źródłowo wszystkie mechanizmy sześciu ustaleń; szczególnie middleware, signout, SSR statusy, catch profilu oraz mapowanie i domyślny model wyników SDK.
- Zweryfikowano lokalne źródła Astro, adaptera Cloudflare i SDK Supabase, zamiast zakładać, że każdy błąd biblioteki jest rzucany albo automatycznie raportowany. Frameworkową tezę o logowaniu wyjątku potwierdziła sonda kontrolna.
- Sweep: **40 produkcyjnych plików** ts/tsx/astro/js/jsx pod src; wyłączono `DashboardUiShowcase.tsx` i `/dev/dashboard-ui.astro`. Wynik: 11 catch, wszystkie bez bindingu; 0 syntaktycznie pustych catch, 0 promise.catch, 0 console.*, 0 wywołań error loggera, 0 new Error i 0 throw w kodzie aplikacji. Z 11 catch **5 to uzasadnione fallbacki wejścia** (JSON/form/URL), **6 operacyjne**. Liczniki nie są liczbą ustaleń.
- Harness pozostaje w **`/private/tmp/medlab-observability-20261126-001`**. Powtórzenie: `cd /private/tmp/medlab-observability-20261126-001 && node probe/suite.mjs`. Wyniki: `probe/results.json`, `probe/runtime.log`, `probe/build.log`. Serwer sond został zatrzymany; port 4337 był wolny po zakończeniu.
- Kopia powstała z git archive HEAD; nie skopiowano prawdziwych env ani kont. Atrapa nie wykonuje wywołań sieciowych. Zależności są współdzielone przez symlink node_modules, lecz cache Vite skierowano do lokalnego `probe/vite-cache`. Wyłączono telemetrię narzędzi w środowisku sond.
- Zmiany tylko w kopii: `astro.config.mjs` (osobny cache), `src/lib/supabase.ts` (atrapa), `src/pages/audit-control.ts` (kontrola), syntetyczne `.env`/`.dev.vars`, `probe/suite.mjs` i wygenerowane logi/build. Brak commitów, pushów i wdrożeń z kopii. W głównym repo audyt utworzył wyłącznie ten raport.
- Sondy pokazują zachowanie aplikacji przy konkretnych wynikach SDK; nie mierzą rzeczywistej awarii sieci Supabase, retry ani semantyki unieważniania sesji. H3 pozostaje static-only; część lokalizacji H2 jest potwierdzona przez ten sam mechanizm statycznie, a runtime obejmuje endpoint profilu. Nie badano dostarczania produkcyjnych logów, alertów ani sesji użytkowników.
