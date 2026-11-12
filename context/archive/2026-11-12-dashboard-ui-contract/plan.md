# Dashboard UI contract — Implementation Plan

## Overview

Uporządkować `/dashboard` jako spokojny, ciemny panel profilu pacjenta. Wykorzystać istniejący system Tailwind v4 + shadcn/ui, poprawić hierarchię treści i spójność kontrolek oraz udokumentować siedem stanów na desktopie i mobile.

Użytkownik zatwierdził rekomendacje: jeden ciemny motyw bez przełącznika, uporządkowanie jednego panelu oraz cztery fazy poniżej. Plan nie upoważnia do wdrożenia produkcyjnego.

## Current State Analysis

Dashboard odczytuje profil właściciela przez SSR, pokazuje podsumowanie albo formularz i zachowuje odpowiedź `private, no-store`. `PatientProfile` zarządza tworzeniem, edycją, błędami i pending. Pola mają etykiety i powiązania ARIA, a data lokalizowany opis oraz ciemny natywny kalendarz.

Research wskazuje 22 linie z kolorami palety w dwóch plikach widoku, lokalne warianty przycisków i brak trwałej reguły UI. Istniejący `Button` nadaje się do użycia, natomiast auth `FormField` nie przenosi wszystkich potrzebnych atrybutów i nie obsługuje select. Smoke działa przez HTTP i nie zastępuje sprawdzenia renderowania. Aktualnego wyglądu nie obejrzano jeszcze w przeglądarce.

## Desired End State

Właściciel widzi czytelny nagłówek, podsumowanie pacjenta i wyraźne akcje. Formularz ma spójne pola, błędy, fokus i oczekiwanie na zapis. Powrót do Home pozostaje nad zawartością, również przy błędzie odczytu; wylogowanie pozostaje dostępne.

Dashboard używa semantycznych tokenów w zakresie własnego wrappera. PL/EN, zachowanie zapisu i ochrona danych pozostają zgodne z obecnym kontraktem. Bramka obejmuje 1440 × 1000 i 390 × 844 px oraz siedem stanów na syntetycznych danych.

### Key Discoveries:

- `src/styles/global.css:6`, `:41`, `:75`: istniejące wartości i publikacja tokenów; nie uruchamiać kolejnego `shadcn init`.
- `src/components/ui/button.tsx:41`, `:50`: natywne props oraz eksport `buttonVariants`, przydatny także w Astro.
- `src/components/patient/PatientProfile.tsx:198`: zachować min/max daty, ARIA i kontrast kalendarza.
- `src/layouts/Layout.astro:2`, `src/styles/global.css:113`: zmiana root lub `bg-cosmic` dotknęłaby innych ekranów; motyw musi być zakresowany.
- `src/middleware.ts:20`, `src/pages/dashboard.astro:21`: zachować przekierowanie anonimowego użytkownika i filtr właściciela.

## What We're NOT Doing

- Przebudowa Home, timeline, logowania ani wspólnego paska języka.
- Przełącznik motywu, zapis preferencji i automatyczny wybór motywu systemowego.
- Zmiana API, uwierzytelniania, danych, migracje lub wdrożenie.
- Obsługa formularza bez JavaScript; ograniczenie progressive enhancement z researchu pozostaje deferred.
- Generalizacja auth `FormField`, czyszczenie całego katalogu UI lub zakaz kolorów w całym repo.
- Nowe zależności ani instalacja runnera screenshotów.

## Implementation Approach

Rozszerzyć istniejący katalog UI o minimalne natywne kontrolki. W globalnym pliku CSS dodać zakres `.dashboard-theme`, który przypisuje istniejącym rolom wybrane wartości i jest używany wyłącznie na dashboardzie oraz jego deweloperskiej demonstracji. Zachować globalne root, `.dark` i utility `bg-cosmic` dla pozostałych ekranów. Wrapper dashboardu otrzyma lokalną klasę `dark`, aby istniejące warianty komponentów odpowiadały jego stałemu ciemnemu motywowi.

Wspólna warstwa prezentacji profilu będzie używana przez produkcyjny komponent i demonstrację stanów; produkcyjny kontroler zachowa transport i walidację. Bramka demonstracyjna nie będzie wysyłała żądań do API. Zabezpieczenia procesu obejmą regułę w AGENTS oraz wąski skan w lint.

Mapowanie Charges: C1 → fazy 2–3; C2 → fazy 1 i 3; C3 → fazy 1 i 3; C4 → faza 4; C5 → fazy 3–4. Żaden z pięciu zarzutów nie jest usuwany ani pomijany; odroczenie dotyczy wyłącznie zachowania bez JS opisanego poza Charges.

## Critical Implementation Details

Tailwindowe `@theme inline` już publikuje role przez istniejące zmienne. Wartości motywu należy nadpisać na wrapperze, bez ponownej publikacji palety i bez zmiany globalnego body. Deweloperska demonstracja ma kończyć się 404 w buildzie produkcyjnym przed generowaniem treści; nie może stanowić obejścia sesji na `/dashboard`.

## Phase 1: Współdzielone kontrolki

### Overview

Przygotować kontrolki bez zmiany wyglądu działającego dashboardu.

### Changes Required:

#### 1. Natywne pola UI

**Files**: `src/components/ui/input.tsx`, `src/components/ui/select.tsx`, `src/components/ui/field.tsx`.

**Intent**: Ujednolicić styl pól i ich opisów bez utraty możliwości natywnych elementów.

**Contract**: `Input` i `Select` przekazują natywne props, ref i atrybuty ARIA. `Field` łączy label, kontrolkę oraz hint/error przez identyfikatory przekazane przez wywołującego, bez przejmowania walidacji domenowej. Kontrolki korzystają z istniejących ról input, background, foreground, ring i destructive oraz skali Tailwind. Obsługują focus-visible, disabled i aria-invalid. Select pozostaje natywny. Nie kopiować drugiego Button ani zmieniać auth FormField.

#### 2. Kontrakt istniejącego przycisku

**File**: `src/components/ui/button.tsx`.

**Intent**: Użyć obecnych wariantów jako źródła zachowania akcji dashboardu.

**Contract**: Zachować API Button/buttonVariants. Ta faza nie wymaga zmiany ich globalnych stylów ani wariantu destructive. Dostosowania dashboardu mają wynikać z jego tokenów i wyboru wariantu.

### Success Criteria:

#### Automated Verification:

- Nowe kontrolki przechodzą `npm run lint`, `npx astro check` i `npm run build`.
- Przegląd typów potwierdza obsługę required, autoComplete, min/max, disabled oraz powiązań ARIA bez rozszerzania auth FormField.

#### Manual Verification:

- Przegląd zmian potwierdza zachowanie istniejącego API Button i brak podłączenia nowych styli do innych ekranów.

**Implementation Note**: Po weryfikacji fazy zatrzymać się na potwierdzenie kryterium ręcznego przed kolejną fazą. To faza przygotowawcza bez zmiany renderowanego dashboardu.

## Phase 2: Tokeny dashboardu

### Overview

Przygotować zakresowany, spokojny ciemny motyw, bez globalnego rebrandingu.

### Changes Required:

#### 1. Wartości i ich pochodzenie

**Files**: `src/styles/global.css`, `context/changes/dashboard-ui-contract/theme-tokens.md`.

**Intent**: Zdeponować role i wartości motywu w repozytorium oraz uczynić ich zakres jednoznacznym.

**Contract**: Dodać `.dashboard-theme` z wartościami: background `#0f172a`, foreground `#f1f5f9`, card `#1e293b`, card-foreground `#f1f5f9`, primary `#c4b5fd`, primary-foreground `#1e1b4b`, secondary/accent `#334155`, secondary-foreground/accent-foreground `#f1f5f9`, muted `#334155`, muted-foreground `#cbd5e1`, destructive `#fca5a5`, border/input `#64748b`, ring `#c4b5fd`, radius `0.625rem`. Ustawić lokalne `color-scheme: dark`. Źródło: istniejąca skala Tailwind, uporządkowana zgodnie z zatwierdzonym kierunkiem; zapisać pochodzenie obok CSS i pełną tabelę w theme-tokens.md. Bez gradientu i przezroczystych powierzchni dashboardu. Globalne root, `.dark`, body oraz `bg-cosmic` zachować.

### Success Criteria:

#### Automated Verification:

- Zakresowane tokeny i dokument wartości przechodzą `npm run lint` i `npm run build`.
- Przegląd diff potwierdza brak zmiany wartości root, globalnego `.dark`, body i `bg-cosmic` oraz zgodność tabeli wartości z CSS.

#### Manual Verification:

- Przegląd kontraktu potwierdza jeden stały ciemny motyw, semantyczne role i brak nowej zależności lub przełącznika.

**Implementation Note**: Faza definiuje nieużywany jeszcze zakres motywu; po potwierdzeniu ręcznym przejść do podłączenia w fazie 3.

## Phase 3: Widok profilu

### Overview

Podłączyć kontrolki i tokeny do jednego panelu oraz poprawić czytelność akcji i informacji.

### Changes Required:

#### 1. Panel i prezentacja profilu

**Files**: `src/pages/dashboard.astro`, `src/components/patient/PatientProfile.tsx`, `src/components/patient/PatientProfileView.tsx`, `src/lib/i18n.ts` (wyłącznie ewentualne etykiety stanów).

**Intent**: Oddzielić prezentację od istniejącego kontrolera, zachowując działający przepływ tworzenia i edycji.

**Contract**: Wrapper `dashboard-theme dark` jest lokalny dla zawartości dashboardu. Jeden panel z czytelnym nagłówkiem, powrotem do Home nad gałęziami stanu, podsumowaniem/formularzem i drugorzędnym wylogowaniem. Przyciski React używają Button; przycisk Astro korzysta z buttonVariants. Pola używają prymitywów fazy 1. `PatientProfileView` jest bez transportu: otrzymuje wartości, profil, tryb, błędy, failure, pending, today, locale, messages i callbacki zmiany/zapisu/edycji/anulowania. Kontroler zachowuje walidację, POST/PATCH, filtrowanie błędów, pamięć wartości przy błędzie i przejście do `/dashboard` po sukcesie. Nie wystawiać demonstracyjnych stanów przez query parametry produkcyjnej trasy.

#### 2. Interakcje i responsywność

**Files**: te same pliki widoku.

**Intent**: Uczytelnić formularz i oczekiwanie na zapis dla myszy, klawiatury i urządzeń mobilnych.

**Contract**: PL/EN, nazwy kontrolek, id, aria-invalid/describedby, min/max daty, autocomplete i lokalizowana data pozostają zachowane. Pending blokuje formularz i duplikację zapisu, pokazuje tekst statusu i ikonę oczekiwania oraz aria-busy; akcja ma stabilny rozmiar bez przesuwania sąsiednich elementów. Error jest tekstowy obok pola/akcji z tokenem destructive. Brak profilu pozostaje formularzem tworzenia. Powrót i błąd odczytu pozostają dostępne; nie zmieniać semantyki wylogowania. Przy 390 px panel i akcje zawijają się bez poziomego przewijania. Fokus i disabled mają jawny styl semantyczny.

### Success Criteria:

#### Automated Verification:

- Widok przechodzi `npm run lint`, `npx astro check`, `npm run build` i `npm run test:unit`.
- `npm run smoke` przeciw lokalnie uruchomionej aplikacji z konfiguracją testową potwierdza istniejący kontrakt profilu, języka i sesji.
- Skan z researchu daje 0 pasujących linii w dashboard.astro, PatientProfile.tsx oraz nowym PatientProfileView.tsx; poprzednia baza dwóch plików wynosiła 22.

#### Manual Verification:

- Dashboard z syntetycznym profilem pokazuje odczyt, tworzenie, uzupełnienie i edycję w PL/EN; anulowanie zachowuje poprzednie wartości, błędny zapis zachowuje szkic, powrót do Home i wylogowanie działają.
- Zrzuty po fazie przy 1440 × 1000 i 390 × 844 px potwierdzają czytelny panel, brak poziomego scrolla i kontrast ikony daty; klawiatura ujawnia fokus na kontrolkach.
- Kontrola Home, timeline i logowania potwierdza brak zamierzonej zmiany ich wyglądu po dodaniu lokalnego motywu.

**Implementation Note**: Zachować zrzuty na danych syntetycznych w `context/changes/dashboard-ui-contract/evidence/phase-3/`; przed fazą 4 uzyskać potwierdzenie ręcznych wyników.

## Phase 4: Stany i zabezpieczenia

### Overview

Udokumentować i pokazać siedem stanów oraz zapobiec powrotowi lokalnych kolorów i kontrolek.

### Changes Required:

#### 1. Deweloperska demonstracja

**Files**: `src/pages/dev/dashboard-ui.astro`, `src/components/patient/DashboardUiShowcase.tsx`, `context/changes/dashboard-ui-contract/evidence/README.md`.

**Intent**: Pokazać rzeczywistą warstwę prezentacji profilu w powtarzalnych stanach bez bazy danych i zapisu danych pacjentów.

**Contract**: `/dev/dashboard-ui` działa wyłącznie przy `import.meta.env.DEV`; produkcyjna odpowiedź to 404, bez prerenderowania. Showcase używa PatientProfileView, syntetycznych fixture, stałej daty i lokalnych callbacków bez fetch/API. Obejmuje odczyt, tworzenie, niekompletny profil, edycję, błędy pól, błąd zapisu, błąd odczytu i pending. Id formularzy są unikalne w instancjach. Pokazuje działający hover i keyboard focus, nie wyłącznie imitację klas. Obsługuje PL/EN przez istniejące messages. Nie zmienia middleware ani sesji prawdziwego dashboardu. README zapisuje wyniki macierzy, szerokości i ścieżki dowodów; brakujące dowody pozostają jawnie niezaliczone.

#### 2. Trwała reguła i guard

**Files**: `AGENTS.md`, `scripts/check-dashboard-ui.mjs`, `package.json`.

**Intent**: Utrwalić źródła tokenów i komponentów oraz wykrywać ponowne wprowadzanie kolorów w oczyszczonym widoku.

**Contract**: Reguła UI poza blokiem CLI wskazuje global.css, zakres dashboard-theme, katalog UI i demonstrację; nakazuje sprawdzenie istniejących kontrolek przed dodaniem nowych. Dodać bez zależności skan linii wg wzorca `/10x-ui`, ograniczony do dashboard.astro, PatientProfile.tsx i PatientProfileView.tsx. Przy trafieniach wypisać plik:linia i zwrócić kod niezerowy. Podpiąć go do `npm run lint`, zachowując ESLint. Nie skanować definicji tokenów ani katalogu całego DS. Sprawdzić guard na tymczasowym pliku testowym, bez pozostawiania mutacji w kodzie produkcyjnym.

### Success Criteria:

#### Automated Verification:

- Końcowe `npm run lint`, `npx astro check`, `npm run build`, `npm run test:unit` oraz smoke przeciw lokalnej aplikacji przechodzą po zmianach fazy 4.
- Guard odrzuca fixture z kolorem palety i akceptuje fixture z rolami semantycznymi; skan trzech plików widoku pozostaje zerowy.
- Żądanie `/dev/dashboard-ui` do lokalnego podglądu produkcyjnego buildu zwraca 404, a demonstracja w trybie dev nie wysyła żądań do API profilu.

#### Manual Verification:

- Macierz siedmiu stanów jest pokazana i opisana: default, hover, focus-visible, disabled, error, empty i loading; użycie klawiatury, czytelność disabled, komunikaty i stabilność pending są potwierdzone na renderze.
- Końcowe zrzuty desktop 1440 × 1000 i mobile 390 × 844 dla PL/EN w evidence potwierdzają brak obcięcia treści, czytelny kontrast tekstu i kontrolek oraz kalendarza.
- Przegląd potwierdza pokrycie C1–C5, regułę poza blokiem CLI oraz gotowość do `/10x-impl-review dashboard-ui-contract`; ewentualne nowe ustalenia mają jawny triage.

**Implementation Note**: Zapisać zrzuty w `evidence/phase-4/`. Ręczne kryteria wymagają potwierdzenia; nie oznaczać ich jako spełnionych na podstawie samego kodu lub zielonego CI. Następnie wykonać oddzielnie review.

## Testing Strategy

### Unit Tests:

Użyć istniejących testów walidacji profilu i i18n; nie dodawać testów odtwarzających markup. Guard sprawdzić na przykładzie pozytywnym i negatywnym. Nowe testy domenowe są potrzebne tylko przy niezamierzonej zmianie zachowania, którą należy najpierw wyeliminować lub jawnie uzgodnić.

### Integration Tests:

Smoke po podłączeniu widoku i po finale sprawdza profil, język i sesję zgodnie z README i CI. Użyć konfiguracji testowej oraz danych syntetycznych, bez wypisywania sekretów. Uruchomić lokalną aplikację lub preview właściwe dla istniejącego smoke; nie traktować konfiguracji Supabase jako automatycznie dostępnej. Jeśli dostęp jest niedostępny, zapisać konkretną blokadę i pozostawić kryterium pending.

### Manual Testing Steps:

1. Przed pierwszą zmianą wizualną uruchomić aplikację, zalogować syntetycznego użytkownika i zachować bazowe zrzuty dashboardu w evidence/baseline przy obu szerokościach.
2. Po fazie 3 przejść przez formularz, edycję, anulowanie, błędy i zapis; sprawdzić PL/EN, date picker i kolejność Tab.
3. W fazie 4 pokazać siedem stanów w demonstracji i porównać zrzuty; sprawdzić zmianę etykiety podczas zapisu i czytelność disabled. Dla tekstu przyjąć kontrast co najmniej 4.5:1, dla dużego tekstu 3:1 oraz obramowań/fokusu istotnych kontrolek 3:1; odnotować pary i wynik w evidence/README.md. W razie niespełnienia skorygować wartości tokenów w ich źródle i tabeli, nie doraźne klasy widoku.
4. Zweryfikować anonimowe wejście na dashboard, powrót do Home, wylogowanie i produkcyjne 404 demonstracji. Użyć dostępnego narzędzia przeglądarkowego; jeśli brak dostępu do zrzutów lub konta testowego, zgłosić brak dowodu i pozostawić odpowiednie kryteria pending.

## Performance Considerations

Zachować SSR odczytu profilu i istniejącą wyspę React. Nie dodawać transportu do warstwy prezentacji ani nowych żądań przy renderze; wylogowanie Astro pozostaje formularzem. Nie ładować demonstracji w dashboardzie produkcyjnym. Zachować rozmiar akcji w pending, aby ograniczyć przeskok układu.

## Migration Notes

Brak migracji danych, nowych sekretów i zmian API. Wdrożenie poza zakresem planu. Wycofanie polega na cofnięciu zmian dashboardu, lokalnych tokenów i nowych demonstracji/guardów, bez cofania bazy. Nie cofać niezwiązanych zmian użytkownika. Artefakty pozostają w aktywnym folderze; nie pisać do archiwum.

## References

- `context/changes/dashboard-ui-contract/change.md` — tożsamość i zakres.
- `context/changes/dashboard-ui-contract/research.md` — Charges, stany i dowody.
- `context/foundation/lessons.md:5` — kontrast kalendarza.
- `src/components/ui/button.tsx:8` — stany współdzielonego przycisku.
- `src/components/patient/PatientProfile.tsx:146` — istniejący kontrakt formularza.
- `README.md` i `.github/workflows/ci.yml` — lokalna konfiguracja i smoke.
- `.agents/skills/10x-ui/references/ui-quality-checklist.md` — bramka UI.

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: Współdzielone kontrolki

#### Automated

- [x] 1.1 Nowe kontrolki przechodzą `npm run lint`, `npx astro check` i `npm run build`. — f28d5c2
- [x] 1.2 Przegląd typów potwierdza obsługę required, autoComplete, min/max, disabled oraz powiązań ARIA bez rozszerzania auth FormField. — f28d5c2

#### Manual

- [x] 1.3 Przegląd zmian potwierdza zachowanie istniejącego API Button i brak podłączenia nowych styli do innych ekranów. — f28d5c2

### Phase 2: Tokeny dashboardu

#### Automated

- [x] 2.1 Zakresowane tokeny i dokument wartości przechodzą `npm run lint` i `npm run build`. — 9b61db5
- [x] 2.2 Przegląd diff potwierdza brak zmiany wartości root, globalnego `.dark`, body i `bg-cosmic` oraz zgodność tabeli wartości z CSS. — 9b61db5

#### Manual

- [x] 2.3 Przegląd kontraktu potwierdza jeden stały ciemny motyw, semantyczne role i brak nowej zależności lub przełącznika. — 9b61db5

### Phase 3: Widok profilu

#### Automated

- [x] 3.1 Widok przechodzi `npm run lint`, `npx astro check`, `npm run build` i `npm run test:unit`. — 9a62f0b
- [x] 3.2 `npm run smoke` przeciw lokalnie uruchomionej aplikacji z konfiguracją testową potwierdza istniejący kontrakt profilu, języka i sesji. — 9a62f0b
- [x] 3.3 Skan z researchu daje 0 pasujących linii w dashboard.astro, PatientProfile.tsx oraz nowym PatientProfileView.tsx; poprzednia baza dwóch plików wynosiła 22. — 9a62f0b

#### Manual

- [x] 3.4 Dashboard z syntetycznym profilem pokazuje odczyt, tworzenie, uzupełnienie i edycję w PL/EN; anulowanie zachowuje poprzednie wartości, błędny zapis zachowuje szkic, powrót do Home i wylogowanie działają. — 9a62f0b
- [x] 3.5 Zrzuty po fazie przy 1440 × 1000 i 390 × 844 px potwierdzają czytelny panel, brak poziomego scrolla i kontrast ikony daty; klawiatura ujawnia fokus na kontrolkach. — 9a62f0b
- [x] 3.6 Kontrola Home, timeline i logowania potwierdza brak zamierzonej zmiany ich wyglądu po dodaniu lokalnego motywu. — 9a62f0b

### Phase 4: Stany i zabezpieczenia

#### Automated

- [x] 4.1 Końcowe `npm run lint`, `npx astro check`, `npm run build`, `npm run test:unit` oraz smoke przeciw lokalnej aplikacji przechodzą po zmianach fazy 4. — 31b6289
- [x] 4.2 Guard odrzuca fixture z kolorem palety i akceptuje fixture z rolami semantycznymi; skan trzech plików widoku pozostaje zerowy. — 31b6289
- [x] 4.3 Żądanie `/dev/dashboard-ui` do lokalnego podglądu produkcyjnego buildu zwraca 404, a demonstracja w trybie dev nie wysyła żądań do API profilu. — 31b6289

#### Manual

- [x] 4.4 Macierz siedmiu stanów jest pokazana i opisana: default, hover, focus-visible, disabled, error, empty i loading; użycie klawiatury, czytelność disabled, komunikaty i stabilność pending są potwierdzone na renderze. — 31b6289
- [x] 4.5 Końcowe zrzuty desktop 1440 × 1000 i mobile 390 × 844 dla PL/EN w evidence potwierdzają brak obcięcia treści, czytelny kontrast tekstu i kontrolek oraz kalendarza. — 31b6289
- [x] 4.6 Przegląd potwierdza pokrycie C1–C5, regułę poza blokiem CLI oraz gotowość do `/10x-impl-review dashboard-ui-contract`; ewentualne nowe ustalenia mają jawny triage. — 31b6289
