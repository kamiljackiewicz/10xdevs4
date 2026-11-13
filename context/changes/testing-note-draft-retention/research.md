---
date: 2026-11-13T00:19:49Z
researcher: Codex
git_commit: d386cb061e6e2c92c4e40ca022506f20e650c2f0
branch: main
repository: 10xdevs4
topic: "Phase 1 — Ochrona szkicu notatki (R2)"
tags: [research, codebase, timeline-notes, draft-retention, interaction]
status: complete
last_updated: 2026-11-13
last_updated_by: Codex
---

# Research: Ochrona szkicu notatki

## Research Question

Jak udowodnić zachowanie wpisanej treści i daty po błędzie zapisu, bez utożsamiania HTTP smoke z testem stanu formularza? Ustalić obsługiwane błędy, niejednoznaczne wyniki sieciowe i najtańszą wiarygodną granicę interaction/integration dla R2 z `context/foundation/test-plan.md:49` i fazy z `:60`.

## Summary

- W sprawdzonej ścieżce `submit` szkic pozostaje w stanie React: gałęzie błędu zmieniają błędy/pending, ale nie `values` ani `editing`. Sukces prowadzi do nawigacji. To dowód z kodu, nie wykonany test interakcji (`src/components/patient/TimelineNotes.tsx:27–80`).
- HTTP smoke wysyła żądania Node i sprawdza odpowiedzi/SSR; nie obserwuje wartości formularza po błędzie. Obecne testy walidatora i integracja Supabase nie zamykają tej luki (`scripts/smoke.mjs:27–46,177–213`; `scripts/timeline-notes.test.mjs:1–35`; `scripts/supabase-cloud-access.mjs:95–149`).
- Rekomendacja: test DOM rzeczywistego `TimelineNotes`, z rzeczywistą walidacją i słownikiem, interakcją przez kontrolki oraz kontrolowaną granicą HTTP. Zakres gwarancji to zachowanie szkicu w zamontowanym formularzu, nie trwałość po przeładowaniu (`TimelineNotes.tsx:28,38–43,108–176`; archiwalny plan `:29,102`).
- Utrata odpowiedzi może nastąpić po zapisie. Test ma dowodzić zachowania szkicu i ostrzeżenia o niepewnym wyniku, bez wnioskowania, że baza odrzuciła operację (`src/pages/api/timeline-notes/index.ts:38–48`; `TimelineNotes.tsx:76–79`).

## Detailed Findings

### Granica szkicu i formularza

`src/components/patient/TimelineNotes.tsx:27–43` przechowuje `editing`, `values`, błędy i pending. Rozpoczęcie tworzenia ustawia lokalny dzień i pustą treść; rozpoczęcie edycji kopiuje zapisaną treść i datę. Dlatego test edycji powinien zmienić oba pola względem wartości początkowych — samo sprawdzenie starej notatki nie wykryje utraty edytowanego szkicu.

`submit` waliduje aktualne pola, następnie wysyła POST dla tworzenia lub PATCH z identyfikatorem notatki dla edycji (`:44–60`). Lokalny błąd kończy obsługę przed `fetch` (`:47–50`). Przy sukcesie `response.ok` następuje `window.location.assign`, bez parsowania odpowiedzi (`:61–64`). Nieczytelne JSON w odpowiedzi błędnej trafia do `catch`; nie należy oczekiwać tej samej ścieżki dla nieczytelnego body sukcesu (`:65–79`).

Data i treść są kontrolowanymi polami z etykietami, a formularz używa `noValidate`; fieldset jest wyłączony podczas pending (`:108–145`). Po rozstrzygnięciu obsłużonej odpowiedzi lub wyjątku `finally` zwalnia pending (`:78–80`). R2 wymaga asercji wartości DOM i możliwości dalszej edycji, a nie asercji wywołania setterów. Nie obejmuje awarii pozostawiającej żądanie nierozstrzygnięte bez końca: w tej ścieżce nie ma limitu czasu (`:55–80`).

Walidacja normalizuje końce linii i skrajne białe znaki w payloadzie (`src/lib/timeline-notes.ts:26–47`), ale kontrolowane `values` nie są zastępowane wynikiem walidacji przy błędzie (`TimelineNotes.tsx:47–79`). Warto użyć szkicu z wieloma liniami i skrajnymi spacjami oraz jawnej daty innej niż domyślna; oczekiwanie zachowanych pól powinno pochodzić z wpisanych danych, a nie z funkcji normalizującej produkcji.

SSR montuje komponent przez `client:load`, gdy załadowano profil z datą urodzenia (`src/pages/dashboard/timeline.astro:58–85`). Test komponentowy może dostarczyć taki profil przez props; nie dowodzi przez to poprawności sesji, SSR ani hydratacji Astro.

### Błędy i ich znaczenie

POST ma jawne odpowiedzi 401, 403, 415, 400, 500, 404 i 409; PATCH dodatkowo rozpoznaje brak/niewidoczną notatkę lub niepoprawny identyfikator jako 404 (`src/pages/api/timeline-notes/index.ts:16–48`; `src/pages/api/timeline-notes/[id].ts:28–57`). To zbiór jawnych odpowiedzi tych handlerów, nie obietnica formatu błędów infrastruktury ani rzuconych wyjątków.

W sprawdzonej obsłudze UI (`TimelineNotes.tsx:65–77`):

- 400 z polem `errors` pokazuje błędy pól; 400 bez tego pola przechodzi do błędu ogólnego.
- 401 pokazuje komunikat wygaśnięcia sesji. API zwraca JSON 401 przy braku użytkownika, podczas gdy chroniona strona `/dashboard` przekierowuje do logowania (`src/middleware.ts:9–26`; POST `:17`; PATCH `:29`).
- 409 pokazuje komunikat o wymaganej dacie urodzenia, niezależnie od kodu `error` w body.
- Inne poprawnie odczytane odpowiedzi błędne pokazują komunikat ogólny; reprezentatywnym przypadkiem jest 500.
- Odrzucony `fetch` albo błąd parsowania JSON odpowiedzi błędnej pokazuje `timelineNetworkAmbiguous`. Treść PL/EN zaleca sprawdzenie osi czasu przed ponowieniem (`src/lib/i18n.ts:100–102,208–210`).

Fixtures 400 muszą odzwierciedlać kontrakt walidacji (`src/lib/timeline-notes.ts:23–47`). Realny powód rozbieżności klient–serwer to aktualizacja daty urodzenia po renderze: serwer odczytuje ją ponownie przed walidacją (POST `:28–37`; PATCH `:39–44`). Fixture 409 może reprezentować brak daty lub odrzucenie zapisu przez constraint. Kod SQL `23514` jest mapowany na `birth_date_changed`, ale trigger używa go także dla długości treści i braku daty; ten kod sam nie dowodzi wyścigu dat (`supabase/migrations/20260929210000_timeline_notes.sql:29–38`; POST `:43–46`; PATCH `:51–54`).

### Niejednoznaczny wynik

Wniosek architektoniczny: po zakończeniu insert/update, a przed dostarczeniem odpowiedzi klientowi, połączenie może zostać utracone. Handler odpowiada po operacji bazy (POST `:38–48`; PATCH `:45–57`). Odrzucone żądanie po stronie klienta nie rozstrzyga, czy zapis nastąpił. Tworzenie nadaje nowy UUID; sprawdzona ścieżka POST nie ma klucza idempotencji (`supabase/migrations/20260929210000_timeline_notes.sql:1–7,21–23`; POST `:16–48`). Ponowienie tworzenia może więc utworzyć kolejny wpis — jest to wniosek z kodu, nie odtworzony incydent.

Obsługa `submit` nie ponawia automatycznie żądania (`TimelineNotes.tsx:44–80`). Test powinien po błędzie sieci sprawdzić brak dodatkowego żądania w rozstrzygniętym scenariuszu i zachowany szkic z ostrzeżeniem. Nie powinien asercją „brak rekordu w bazie” nadawać symulowanej utracie odpowiedzi znaczenia pewnego odrzucenia. Fizyczne odtworzenie zapisu z utraconą odpowiedzią nie jest konieczne do testu R2; pozostaje osobną kontrolą trwałości/idempotencji.

## Existing Evidence and Historical Context

- `scripts/timeline-notes.test.mjs:1–35`: testy normalizacji, limitu treści i dat; brak renderowania komponentu w tym pliku.
- `scripts/smoke.mjs:27–46,177–213`: HTTP i CRUD/SSR. Przechwycenie regresji typu „wyczyść values w catch” nie wynika z tych asercji.
- `scripts/supabase-cloud-access.mjs:95–149`: własność i reguły bazy; zachowany rekord bazy nie jest szkicem formularza.
- `context/archive/2026-09-29-record-dated-timeline-note/plan.md:102`: kontrakt pamięciowego szkicu i ostrzeżenia przy niepewnej sieci jest zgodny z obecną ścieżką kodu. `:29` wyklucza trwałe szkice, offline sync i automatyczne retry — te wyłączenia są nadal zgodne ze sprawdzonym komponentem.
- Archiwalne `plan.md:198` rejestruje ukończoną kontrolę ręczną. Jest dowodem historycznego przeglądu, nie aktualnej automatycznej bramki. Sam plan rozdziela HTTP od kontroli hydratacji/formularza (`:156`).

## Recommendation for Planning

Najtańsza uzasadniona warstwa to integracja interakcji komponentu w DOM: rzeczywisty `TimelineNotes` + walidator + słownik, z odpowiedziami HTTP kontrolowanymi poza komponentem. Bez mockowania hooków, setterów, funkcji `submit` czy walidatora. To rekomendacja zakresu testu, nie stwierdzenie gotowości runnera.

Kandydat techniczny: Vitest + jsdom, React Testing Library, user-event i MSW (checked: 2026-11-13). Oficjalne dokumentacje opisują renderowanie komponentu w DOM, interakcje użytkownika i symulację komunikacji HTTP zamiast wnętrza komponentu: [Testing Library example](https://testing-library.com/docs/react-testing-library/example-intro/), [user-event](https://testing-library.com/docs/user-event/intro/), [Vitest environments](https://vitest.dev/guide/environment). jsdom emuluje środowisko przeglądarki; nie daje dowodu działania hydratacji ani natywnego kalendarza. Zestaw nie został zainstalowany ani uruchomiony w tym researchu; wersje zgodne z Node/React projektu trzeba rozwiązać podczas planowania/implementacji.

Proponowany zakres dowodu:

- Dla tworzenia i edycji wpisać własną datę oraz zmienioną wieloliniową treść; wywołać zapis przez przycisk. Sprawdzić metodę/URL i payload na granicy HTTP, a po błędzie zachowane surowe wartości, odpowiedni komunikat oraz możliwość dalszej edycji.
- Pokryć rozgałęzienia: 400 z błędami pola, 401, 409, reprezentatywny błąd ogólny 500, odrzucenie żądania i nieczytelna odpowiedź błędna. Nie wymnażać statusów 403/404/415 bez dodatkowego sygnału — obecny UI kieruje je do wspólnej gałęzi (`TimelineNotes.tsx:65–75`).
- Użyć kontrolowanego oczekiwania na odpowiedź, aby sprawdzić pending oraz jego zwolnienie po błędzie. Dodać lokalny błąd walidacji bez żądania jako odrębną granicę. W przypadku 400 serwera wysłać dane poprawne według początkowego props `birthDate`, by test rzeczywiście dotarł do HTTP.
- Scenariusz niejednoznaczny sprawdza ostrzeżenie i brak automatycznego retry; nie obiecuje zachowania szkicu po nawigacji, logowaniu lub reloadzie. Niewielka kontrola sukcesu może wykazać różnicę między błędem a nawigacją, ale nie zastępuje przypadków awarii.
- Kluczowe są wartości pól po rozstrzygnięciu błędu, nie snapshot DOM. Wybrany test powinien zawieść po celowym wyczyszczeniu treści lub daty w gałęzi błędu; sprawdzenie tego należy do implementacji.

`package.json:13–15` ma obecnie Node unit runner i skrypty integracyjne, a deklaracje zależności nie zawierają powyższego zestawu DOM. Nowa konfiguracja musi obsłużyć TSX i alias `@/` z `tsconfig.json`, bez zastępowania istniejących testów. Preferowana jest oddzielna konfiguracja testowa, aby nie ładować adaptera Cloudflare i sekretów z `astro.config.mjs` do testu komponentu. Nie potwierdzono jeszcze wykonaniem, że wybrany zestaw obsłuży ten komponent bez dodatkowej konfiguracji.

CI uruchamia `test:unit` w zadaniu `ci`, przed Astro check/build; smoke ma osobne zadanie Workers preview (`.github/workflows/ci.yml:14–23,48–60`). Plan fazy ma wskazać nowe polecenie interakcji i podłączenie do istniejącego CI oraz zakończyć aktualizacją cookbook §6.1 (`context/foundation/test-plan.md:65,101–103`). Ten research nie zmienia CI ani zamrożonej strategii.

## Architecture Insights

Właścicielem niezapisanego szkicu jest komponent, a odpowiedzialność API obejmuje walidację i utrwalenie. Asercja HTTP nie przechodzi przez właściciela stanu szkicu. Test DOM przy tej granicy daje bezpośredni sygnał R2; pełne e2e warto dodać dopiero, gdy potrzebny będzie dowód związany z hydratacją/nawigacją, którego ten test nie daje.

## Code References

- `src/components/patient/TimelineNotes.tsx:27` — stan, rozpoczęcie edycji, submit i formularz.
- `src/lib/timeline-notes.ts:26` — normalizacja i walidacja.
- `src/pages/api/timeline-notes/index.ts:16` oraz `src/pages/api/timeline-notes/[id].ts:28` — kontrakty zapisu.
- `src/pages/dashboard/timeline.astro:77` — hydratacja komponentu.
- `scripts/smoke.mjs:177` — aktualna granica HTTP/SSR.

## Related Research

Brak osobnego `research.md` w archiwalnej zmianie notatek; wykorzystano jej plan oraz aktualny kod. `context/foundation/lessons.md` przeczytano; reguła kontrastu date-picker dotyczy zmian wizualnych, których ta faza badania nie wykonuje.

## Open Questions and Verification Limits

- Wybór konkretnych wersji runnera, obsługa względnego URL `fetch` i konfiguracja TSX/aliasów wymagają sprawdzenia w implementacji. Nie jest to potwierdzony błąd produktu.
- jsdom nie potwierdzi hydratacji Astro, natywnego date-picker ani rzeczywistego przerwania połączenia po commicie; nie przypisywać mu tych gwarancji.
- Nie uruchamiano testów, builda, przeglądarki ani usług Cloud. Ustalenia o obecnym zachowaniu są analizą statyczną. Badanie zakresu R2 jest zakończone; automatyczny dowód dopiero powstanie.
- Metadane wskazują bazowy HEAD. Zastane zmiany robocze obejmowały AGENTS, manifest umiejętności, umiejętność test-plan, test-plan i folder tej zmiany. Zapisano research i zaktualizowano metadane change.md; pozostałych zastanych zmian nie edytowano. Cytowane pliki produktu były czyste przy odczycie.

Następny krok: `/10x-plan testing-note-draft-retention`.
