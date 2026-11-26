# Weryfikacja diagnostyki Auth i odczytów SSR

Data: 2026-11-26. Baseline: `0a7e115`; źródło after: working tree oparty na `2a8c3f2`.

## Polecenia i artefakty

```sh
node scripts/observability-probes/run.mjs --revision 0a7e115 --expect before
node scripts/observability-probes/run.mjs --working-tree --expect after
```

- Before: `/var/folders/t_/q9blmvrd0hj07jjxtb9dhxvh0000gn/T/medlab-observability-56gDPv/probe/results.json`.
- After: `/var/folders/t_/q9blmvrd0hj07jjxtb9dhxvh0000gn/T/medlab-observability-JABpSl/probe/results.json`.
- Każdy katalog `probe` zawiera też manifest źródeł/środowiska, `build.log`, `runtime.log` i log Wranglera. Kopie pozostawiono do przeglądu; oba porty preview były zamknięte po wyjściu harnessu.

Harness tworzy nową kopię do każdego uruchomienia. Kopiuje wyłącznie `src`, `public` i jawnie wymienioną konfigurację, bez env, stanu logowania i danych Git. W trybie working-tree uwzględnia nowe i zmienione źródła. Zależności są współdzielone; build, cache, konfiguracja, rejestr i nazwa Workera są odizolowane. Debugger jest wyłączony w konfiguracji kopii, aby równoległe sondy nie konkurowały o jego domyślny port. Procesy potomne otrzymują ograniczoną listę zmiennych, z wyłączoną telemetrią. Atrapa Supabase nie wykonuje połączeń sieciowych. Nie użyto zdalnej bazy ani produkcyjnego monitoringu w sondach.

## Wyniki przed/po

Każdy wiersz poniżej uruchomiono osobno w PL i EN: **34 sondy przed i 34 po, wszystkie PASS**. Każda para ma identyczne HTTP, przekierowanie i SHA-256 całej treści odpowiedzi; wszystkie warunki komunikatów UI i języka przeszły. Liczby zdarzeń w tabeli dotyczą jednego żądania.

| Przypadek                        | HTTP przed/po             | Zdarzenia przed → po                               |
| -------------------------------- | ------------------------- | -------------------------------------------------- |
| Auth wynik 503                   | 302 → signin              | 0 → 1 `auth.get_user`                              |
| Auth nieznany błąd 401           | 302 → signin              | 0 → 1 `auth.get_user`, kod `unknown`               |
| Auth transport/status 0          | 302 → signin              | 0 → 1 `auth.get_user`, bez statusu HTTP upstream   |
| Auth brak sesji                  | 302 → signin              | 0 → 0                                              |
| Nieprzechwycony wyjątek Auth     | 500                       | 0 → 0; przyczyna obecna w logu frameworka          |
| Poprawny użytkownik/profil       | 200                       | 0 → 0                                              |
| Profil wynik / wyjątek           | 200 z obecnym komunikatem | 0 → 1 `patient.read` dla każdego wariantu          |
| Profil osi czasu wynik / wyjątek | 200 z obecnym komunikatem | 0 → 1 `timeline.profile.read` dla każdego wariantu |
| Notatki wynik / wyjątek          | 200 z obecnym komunikatem | 0 → 1 `timeline.notes.read` dla każdego wariantu   |
| Brak profilu na dashboardzie     | 200, formularz            | 0 → 0                                              |
| Brak profilu na osi czasu        | 200, obecny komunikat     | 0 → 0                                              |
| Brak daty urodzenia              | 200, obecny komunikat     | 0 → 0                                              |
| Puste notatki                    | 200, obecny komunikat     | 0 → 0                                              |
| Zdrowa oś czasu z notatką        | 200                       | 0 → 0                                              |

Łącznie: **0 → 18 zdarzeń aplikacyjnych**. Harness sprawdza dokładny schemat, operację, rodzaj, stałe miejsce wywołania, dozwolony typ/kod/status oraz lokalny UUID v4. Identyfikatory są różne dla kolejnych żądań i nie pochodzą z podsuniętego nagłówka klienta. Awaria odczytu profilu osi czasu nie uruchamia odczytu notatek po poprawce; wywołania atrapy są obserwowane niezależnie od zdarzeń aplikacji.

Złośliwe błędy zawierają syntetyczny sekret/PII w polach tekstowych, zagnieżdżeniach i kodzie, cykl, getter i `toJSON`. Końcowe odpowiedzi, log runtime i log buildu nie zawierają zasianego sekretu. Diagnostyka nie pojawia się w body. Nieprzechwycony wyjątek Auth używa bezpiecznej stałej kontrolnej: Astro nadal loguje go i odpowiada 500, bez aplikacyjnego duplikatu. Nie rozszerza to gwarancji prywatności na dowolne nieprzechwycone błędy logowane przez framework.

## Bramki i kontrola celowego zepsucia

- `npm run lint`: PASS; dwa ostrzeżenia `no-console` dotyczą zamierzonego sinka i obserwacji atrapy. Poprawiono dwie uwagi typowania/spread w atrapie bez zmiany asercji.
- `npm run test:unit`: 33/33 PASS; `npm run test:interaction`: 32/32 PASS.
- `npx astro check`: 70 plików, zero błędów/ostrzeżeń; `npm run build`: PASS.
- `npx playwright test --reporter=line`: 4/4 PASS. Końcowy run sam zarządzał buildem i preview. Dwa wcześniejsze uruchomienia trafiły na 500 plików JS/CSS po przebudowie przy równolegle zarządzanym ręcznie preview; zatrzymanie tego procesu usunęło konflikt bez zmian speców.
- Kontrola mutacyjna: tymczasowo pominięto wywołanie reportera Auth w rzeczywistym middleware. Harness `--working-tree --expect after` zakończył się oczekiwanym błędem `auth-result/pl: diagnostic count`. Kopia: `/var/folders/t_/q9blmvrd0hj07jjxtb9dhxvh0000gn/T/medlab-observability-ltxoqk`. Plik zawsze przywracano przez `git checkout -- src/middleware.ts`; produkcyjne źródła pozostały zgodne z `2a8c3f2`.
- Po przywróceniu middleware harness ponownie przeszedł 34/34; wszystkie odpowiedzi pozostały identyczne z baseline.
- Po wykryciu konfliktu portu debuggera przy równoległych sondach wyłączono inspector w konfiguracji kopii. Końcowe before/after przeszły również uruchomione równolegle; nie zmieniano portów ani konfiguracji głównej aplikacji.

## Granice dowodu

- [Audyt źródłowy](../../audits/observability/2026-11-26_auth-patient-history.md) pozostaje bez zmian; [raport verify](../../audits/observability/2026-11-26_auth-patient-history-verify.md) opisuje wynik tej poprawki.
- A1/H1: changed — przywrócono bezpieczny sygnał aplikacyjny. Zachowano 302 dla Auth i 200 dla obsługiwanych awarii SSR zgodnie z decyzją użytkownika.
- A2/A3/H2/H3 pozostają otwarte, nie były ponownie badane w tym harnessie.
- Sondy potwierdzają lokalną emisję `console.error`. Produkcyjne przechowywanie logów, retencja, utworzenie zgłoszenia i dostarczenie powiadomienia pozostają nieweryfikowane.
- Rekord zawiera stałe miejsce operacji i kontrolowane metadane; nie zachowuje oryginalnego stacka ani pełnej przyczyny. Brak zmian wdrożenia, sekretów, migracji i alertów.
