---
date: 2026-11-12T22:46:55+01:00
researcher: Codex
git_commit: 725d33549868b8dcad8d52ffc1fea39815a0fe37
branch: main
repository: 10xdevs4
topic: "Kontrakt UI dla /dashboard z profilem pacjenta"
tags: [research, codebase, dashboard, design-system]
status: complete
last_updated: 2026-11-12
last_updated_by: Codex
---

# Research: kontrakt UI dashboardu

## Research Question

Jak podłączyć istniejący `/dashboard` i formularz profilu do tokenów oraz komponentów repozytorium, zachowując zachowanie profilu i przygotowując bramkę wizualną?

## Summary

Istniejący system Tailwind v4 + shadcn/ui ma wartości w `src/styles/global.css:6`, wariant `.dark` w `:41` i publikację przez `@theme inline` w `:75`. Dashboard omija semantyczne kolory na poziomie swoich klas, ale tokeny działają pośrednio przez globalny CSS i są używane przez istniejący `Button`. To rozszerzenie istniejącego systemu, nie potrzeba instalowania kolejnego.

Skan dwóch plików znalazł 22 pasujące linie: 7 w `src/pages/dashboard.astro` (33, 35, 40, 43, 44, 47, 56) i 15 w `src/components/patient/PatientProfile.tsx` (14, 15, 107, 111, 115, 123, 145, 166, 189, 217, 222, 250, 254, 260, 274). To liczba linii, nie pojedynczych klas ani defektów. W tych plikach brak bezpośrednich semantycznych klas kolorów, odwołań `var(--...)` i importów z `components/ui`; strona importuje komponent domenowy `PatientProfile` (`dashboard.astro:6`).

Gotowy `Button` nadaje się do ponownego użycia. Istniejący auth `FormField` wymaga rozszerzenia przed zastosowaniem do profilu: obecny profil ma atrybuty walidacji i powiązania ARIA, których ten wrapper nie udostępnia. Nie należy pogorszyć dostępności przez mechaniczną zamianę.

## Charges

1. **Brak konsumpcji tokenów — potwierdzone.** `src/pages/dashboard.astro:33` oraz `src/components/patient/PatientProfile.tsx:14`: karta, teksty, pola, fokus i błędy używają klas palety zamiast istniejących ról `card`, `foreground`, `input`, `ring`, `destructive`. **Efekt dla użytkownika:** dostosowanie wspólnego motywu nie obejmuje spójnie tych elementów. Docelowe mapowanie wymaga sprawdzenia kontrastu po renderowaniu.
2. **Powielone przyciski — potwierdzone.** `src/components/patient/PatientProfile.tsx:15`, `:127`, `:268`, `:272` i `src/pages/dashboard.astro:54` omijają `src/components/ui/button.tsx:8`. **Efekt dla użytkownika:** akcje edycji, zapisu, anulowania i wylogowania mają niezależne reguły interakcji i fokusu. Nie stwierdzono braku widocznego fokusu w przeglądarce; lokalne klasy przycisków go nie definiują, a globalna reguła outline istnieje.
3. **Brak odpowiedniego współdzielonego pola — potwierdzone z korektą audytu.** `src/components/patient/PatientProfile.tsx:14`, `:152`, `:198`, `:232` definiują lokalne input/select. `src/components/auth/FormField.tsx:8` ma węższy interfejs i renderuje input (`:42`), nie select. **Efekt dla użytkownika:** stany pól mogą rozchodzić się między formularzami; prosta zamiana na auth wrapper usunęłaby część istniejących gwarancji walidacji/dostępności. Plan powinien wybrać ograniczone prymitywy lub świadomą generalizację.
4. **Brak utrwalonego kontraktu — potwierdzone.** `AGENTS.md:3` zawiera zasady ogólne, a blok od `:16` opisuje proces bez repozytoryjnej reguły źródeł tokenów i komponentów. W sprawdzonych regułach `eslint.config.js:24`, `:54`, `:66` nie ma kontroli kolorów palety. **Efekt dla użytkownika:** kolejne zmiany mogą ponownie wprowadzać niespójne kolory i kontrolki. Regułę UI należy umieścić poza zarządzanym blokiem CLI, a kontrolę ograniczyć do oczyszczonych plików.
5. **Niepełny jawny kontrakt stanów — potwierdzone w kodzie, wygląd niezweryfikowany.** `src/components/patient/PatientProfile.tsx:147` blokuje fieldset podczas zapisu, `:269` zmienia etykietę; brak jawnego busy/spinnera w tym komponencie, a anulowanie (`:274`) nie ma własnego hover/disabled stylu. **Efekt dla użytkownika:** oczekiwanie i dostępność kontrolek mogą być mniej czytelne. Wymagana jest ocena wyrenderowanych stanów; sam brak spinnera nie dowodzi złego UX.

## Detailed Findings

### Źródło wartości i komponenty

- `components.json:8` wskazuje `src/styles/global.css`, a `:16` alias UI. Wartości root/dark są publikowane jako zmienne kolorów (`global.css:75`). `global.css:119` i `:122` wykorzystują je globalnie; nie należy nazywać całego pliku martwym.
- `Button` obsługuje natywne props (`src/components/ui/button.tsx:41`), przekazuje je do elementu (`:47`) oraz eksportuje `buttonVariants` (`:50`). Klasy wariantów można wykorzystać w przycisku Astro bez dodawania interaktywnej wyspy.
- Auth `FormField` wymaga ikony i nie przyjmuje ogólnych natywnych props (`src/components/auth/FormField.tsx:8`). Profil już ma `required`, autocomplete, ograniczenia daty, `aria-invalid`, `aria-describedby` i identyfikatory błędów (`PatientProfile.tsx:152`, `:198`, `:232`). Zachować je przy ekstrakcji.
- Istniejące klasy odstępów i typografii korzystają ze skali Tailwind, a radius ma mapowanie w `global.css:76`. Skan kolorów nie jest oceną poprawności całej skali layoutu.

### Wejścia i siedem stanów

- **Domyślny:** kompletny profil pokazuje podsumowanie i edycję (`PatientProfile.tsx:99`); dane należą do zalogowanego właściciela (`dashboard.astro:18`).
- **Hover:** główne akcje zmieniają kolor (`PatientProfile.tsx:15`), link powrotu i wylogowanie mają hover (`dashboard.astro:35`, `:56`); anulowanie bez własnego hover (`PatientProfile.tsx:274`).
- **Focus-visible:** pola mają `focus:ring-purple-400` (`PatientProfile.tsx:14`), DS Button ma semantyczny `focus-visible` (`button.tsx:8`). Globalny outline (`global.css:119`) nie zastępuje kontroli klawiaturą na renderze.
- **Disabled:** fieldset i submit są blokowane przez pending (`PatientProfile.tsx:147`, `:268`); główny przycisk ma opacity (`:15`). Czytelność pozostałych wyłączonych pól wymaga sprawdzenia.
- **Error:** błędy pól są tekstowe i powiązane ARIA (`PatientProfile.tsx:161`, `:166`); błąd zapisu ma alert i przeładowanie (`:259`), a błąd odczytu zastępuje formularz komunikatem (`dashboard.astro:46`).
- **Pusty:** brak pacjenta otwiera formularz tworzenia (`PatientProfile.tsx:18`, `:25`, `:143`), nie pustą ramkę.
- **Ładowanie:** zapis ustawia pending (`PatientProfile.tsx:55`) i etykietę (`:269`); początkowy odczyt odbywa się w SSR (`dashboard.astro:13`). Skeleton nie jest automatycznie wymagany przy takim odczycie; plan powinien rozróżnić początkowy SSR i oczekiwanie na zapis oraz sprawdzić stabilność layoutu.

Anonimowe wejście w chronioną trasę kieruje do logowania (`src/middleware.ts:20`). Zalogowane wejście bezpośrednie korzysta z tej samej ścieżki SSR. Nie znaleziono podstaw do zarzutu surowego JSON przy normalnym anonimowym wejściu na dashboard.

### Weryfikacja i ograniczenia zakresu

`scripts/smoke.mjs:27` używa HTTP fetch, a `:111` sprawdza odmowę anonimowego dostępu; ścieżka od `:160` obejmuje zapis i treść renderowanego profilu. Ten driver nie sprawdza hover, fokusu ani responsywnego wyglądu. W przeglądzie `package.json`, plików konfiguracji i inwentarza nazw nie znaleziono istniejącego kitchen sink ani runnera screenshotów. Możliwa bramka bez nowej zależności: deweloperski widok stanów z danymi syntetycznymi i zrzutami desktop/mobile. Nie publikować w nim danych pacjentów ani nie omijać ochrony rzeczywistego dashboardu.

## Architecture Insights

- Zachować SSR, filtr właściciela, `private, no-store` (`dashboard.astro:10`, `:21`), metody POST/PATCH oraz powrót po zapisie (`PatientProfile.tsx:57`). Zmiana UI nie wymaga migracji bazy ani zmiany uwierzytelniania.
- `bg-cosmic` ma surowy gradient (`global.css:113`) używany także przez inne widoki. Globalny CSS importuje wspólny `Layout.astro:2`; zmiana wartości root lub utility ma szerszy zasięg niż profil. Plan musi świadomie ograniczyć zmianę motywu lub sprawdzić dotknięte ekrany.
- `.dark` jest zadeklarowane, ale `Layout.astro:18` nie ustawia tej klasy. W przeszukanym `src` nie znaleziono aktywatora; działający przełącznik runtime pozostaje niepotwierdzony. Sama obecność tokenów dark nie jest dowodem przełącznika.
- Pole daty ustawia `colorScheme: dark` (`PatientProfile.tsx:202`). Zmiana tła musi zachować kontrast kalendarza zgodnie z `context/foundation/lessons.md:5`.
- Formularz profilu bez JS ma natywny action POST (`PatientProfile.tsx:146`), podczas gdy API oczekuje JSON (`src/pages/api/patient.ts:15`). Taka ścieżka może zwrócić 415 JSON. **Deferred:** progressive enhancement poza zakresem wizualnym; nie zmieniać kontraktu API przy okazji.

## Historical Context

Wcześniejszy zaakceptowany follow-up wymagał stałego powrotu do strony głównej nad panelem, kontrastu natywnego kalendarza i lokalizowanej daty (`context/archive/2026-09-29-create-patient-profile/plan.md:282`, `:287`). Obecny link nad gałęziami profilu (`dashboard.astro:34`) oraz lokalizowana data (`PatientProfile.tsx:119`, `:217`) potwierdzają te elementy aktualnego kodu; historyczny opis nie stanowi bieżącego dowodu wizualnej poprawności. Archiwum odczytano bez zmian.

## Related Research

W przejrzanym inwentarzu aktywnej zmiany nie było wcześniejszego `research.md`. Punktem wejścia jest `change.md` z audytem `/10x-ui /dashboard`.

## Open Questions

- Wygląd i kontrast przed zmianą nie zostały obejrzane w przeglądarce. Zrzuty oraz klawiatura są wymaganą bramką implementacji, nie potwierdzonym wynikiem badania kodu.
- Plan musi określić docelowe wartości motywu i sposób ich zakresowania, minimalny zestaw pól współdzielonych oraz bezpieczne miejsce do demonstracji stanów. Wprowadzenie zależności nie jest zatwierdzone tym badaniem.
- Szerokości desktop/mobile, PL/EN i sposób pokazania oczekiwania na zapis należy ustalić jako konkretne kryteria planu. Nie należy uznawać za spełnionej macierzy stanów na podstawie samej obecności kodu.

## Planning Handoff

Kolejność wynikająca z `/10x-ui`: kontrakt środowiska i komponentów → wartości tokenów → dashboard → stany i bramka wizualna → trwała reguła i wąski guard → review. Każdy wpis `Charges` musi zostać pokryty lub jawnie odroczony. Zachować model danych, PL/EN, datę i dostępność formularza. Nie przebudowywać równolegle timeline, landing ani auth.

## Research Verification

Badanie wykonano na lokalnym kodzie przy podanym HEAD; przed zapisem artefaktów status Git wskazywał nieśledzony folder tej zmiany. Dwa zadania tylko do odczytu zbadały kontrakt komponentów oraz stany/wejścia; główny agent zweryfikował źródła, historię i bazowy skan. Nie uruchamiano aplikacji, buildów ani testów: nie były potrzebne do odpowiedzi o strukturze kodu. Brak ocen wizualnych opisano powyżej. Dokument nie oznacza zatwierdzenia planu lub implementacji.
