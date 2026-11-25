---
name: 10x-configure-hook
description: >
  Turn the quality gates from context/foundation/test-plan.md into working
  agent hooks and prove them before handing off. Detects the harness from the
  repo (your AI coding assistant, Cursor, Codex, GitHub Copilot), audits existing hook
  config, maps each gate to a moment (per edit, end of turn, commit, push,
  CI), generates config and scripts in that harness's signal protocol, and
  runs every script against a deliberately broken file. Trigger phrases:
  "configure hooks", "set up agent hooks", "lint after every edit", "hook
  fires but the agent ignores it", "skonfiguruj hooki", "hook po edycji",
  "agent nie widzi błędów z hooka". Use AFTER /10x-test-plan (M3L1). Does
  not write git pre-commit/pre-push config — it only recommends it.
---
# 10x Configure Hook — bramki jakości jako hooki agenta, sprawdzone

Ta umiejętność zamienia bramki, na które projekt już się zdecydował, w hooki, które agent faktycznie odbiera. Hook jest użyteczny tylko wtedy, gdy jego komunikat dociera do agenta przez kanał odczytywany przez harness dla tego zdarzenia. Większość uszkodzonych hooków działa poprawnie i wypisuje dane na kanał, którego nikt nie nasłuchuje — dlatego ta umiejętność nigdy nie przekazuje hooka, którego nie uruchomiła.

Pracuj w tej kolejności. Każdy krok ma wynik wykorzystywany przez następny krok; raport końcowy (Krok 8) je zbiera.

## Zasady krytyczne

1. **Przeprowadź wywiad z repo, nie z użytkownikiem.** Wszystko widoczne na dysku — harness, toolchain, istniejące hooki, plan testów — należy odczytać, a nie o to pytać. Pytaj tylko o to, na co repo nie potrafi odpowiedzieć.
2. **Kanał sygnału zależy od harnessu i zdarzenia.** Nigdy nie zakładaj, że kody wyjścia, stderr, stdout lub pole JSON znaczą to samo w dwóch harnessach. Fakty znajdują się w `references/<harness>.md`; korzystaj z nich i preferuj aktualną dokumentację, gdy możesz ją przeglądać i jest sprzeczna z referencją.
3. **Dla każdej edycji oznacza edytowany plik.** Hook dla każdej edycji odczytuje edytowaną ścieżkę z payloadu i sprawdza wyłącznie ten plik. Kontrole całego projektu przenieś na koniec tury lub później.
4. **Najpierw udowodnij, potem przekaż.** Każdy wygenerowany skrypt uruchom z przykładowym payloadem na celowo uszkodzonym pliku i na czystym pliku przed napisaniem raportu.
5. **Scalaj, nigdy nie nadpisuj.** Istniejąca konfiguracja hooków jest audytowana i scalana; diff jest pokazywany przed zapisaniem.

---

## Krok 1 — Warunki wstępne: przeczytaj plan testów

Poszukaj `context/foundation/test-plan.md`. Znajdź jego sekcję bramek jakości **po tytule** („Quality Gates” lub bliskim wariancie) — nigdy po numerze sekcji; numeracja zmienia się między wersjami schematu.

Z tabeli bramek zapisz po jednym wierszu dla każdej bramki: nazwę bramki, miejsce jej uruchamiania („local”, „local (agent loop)”, „CI on PR”…), wymagalność („required”, „required after §3 Phase N”, „recommended after…”, „optional”) oraz to, co wykrywa. Wiersze dotyczące pętli agenta — „post-edit hook”, „lint + typecheck”, „unit + integration” — są głównym wejściem.

Zapisz także **jawne odroczenia**: każdą bramkę lub wiersz oznaczony jako „deferred”, „not v1”, „later”, „out of scope” lub podobnie, wraz z cytowanym sformułowaniem i powodem podanym przez plan. Odroczenia są decyzjami, a nie lukami.

Jeśli plik nie istnieje lub nie ma sekcji bramek jakości: wyprowadź kandydatów na bramki z własnych skryptów repo (Krok 3) i podaj w raporcie „Nie znaleziono planu testów — bramki wyprowadzone z toolchainu”. Zasugeruj `/10x-test-plan` w celu podjęcia rzeczywistej decyzji o bramkach, ale nie zatrzymuj się.

## Krok 2 — Wykryj harness(y)

Każdy plik referencyjny rozpoczyna się sekcją **Detection signals**. Przeczytaj te sekcje dla każdego pliku w `references/` i dopasuj je do repo. Typowe sygnały:

- Twój asystent kodowania AI: katalog konfiguracji narzędzia AI (`settings.json`, `settings.local.json`, `skills/`), plik konfiguracji AI projektu (AGENTS.md).
- Cursor: `.cursor/` (`hooks.json`, `rules/`, `skills/`), `.cursor/rules/10x-course.mdc`.
- Codex: `.codex/` (`hooks.json`, `config.toml`), `.agents/skills/`, `AGENTS.md`.
- GitHub Copilot: `.github/hooks/`, `.github/skills/`, `.github/copilot-instructions.md`.
- Manifest 10x-cli: katalog konfiguracji narzędzia AI, `.cursor/`, `.github/` lub `.agents/.10x-cli-manifest.json` — jego pole `"tool"` wskazuje harness, dla którego zainstalowano artefakty kursu.

Katalogi konfiguracji specyficzne dla harnessu oraz manifest są silnymi sygnałami. `AGENTS.md` i `.agents/skills/` są słabe: wiele harnessów odczytuje `AGENTS.md`, a 10x-cli zapisuje również `.agents/skills/` w repozytoriach Twojego asystenta kodowania AI.

**Rozstrzygnięcie remisu:** katalog, z którego załadowano tę umiejętność, decyduje o harnessie do skonfigurowania. Wypisz każdy inny znaleziony harness wraz z jego ścieżką dowodową; zapytaj raz — oferując wykryte opcje — tylko jeśli potrzebny jest również inny harness albo ma już konfigurację hooków.

## Krok 3 — Wykryj toolchain

Czytaj manifest i konfigurację, nie polegaj na pamięci. Dla każdej bramki zapisz dokładne polecenie używane przez to repo:

- **Lint / formatowanie** — linter projektu oraz to, czy akceptuje ścieżkę pojedynczego pliku (ESLint, Biome, Ruff, golangci-lint, RuboCop…). Preferuj lokalny binarny plik (`npx`, `pnpm exec`, `uv run`, …), którego repo już używa. Wyprowadź sprawdzane rozszerzenia plików z konfiguracji lintowania, a nie z przykładów (np. dodaj `.astro`, gdy skonfigurowano `eslint-plugin-astro`, analogicznie `.vue` / `.svelte`). **Brak lintera w ogóle:** kontrola dla każdej edycji to diagnostyka typecheckera przefiltrowana do edytowanego pliku oraz `node --check` dla zwykłego JavaScriptu (`check-edited-file.sh` w referencji Twojego asystenta kodowania AI); zarekomenduj linter w raporcie, nie instaluj go.
- **Typecheck** — polecenie dla całego projektu (`tsc --noEmit`, `astro check`, `mypy`, `cargo check`, …) oraz przybliżony czas jego działania. Frameworki z generowanymi typami najpierw potrzebują kroku synchronizacji (`tsc` kończy się błędem dla modułów `astro:*`, dopóki `astro sync` nie wygeneruje `.astro/`; `astro check` synchronizuje sam, ale jest wolniejszy). Wygenerowane katalogi są zwykle ignorowane przez git, więc synchronizacja naprawiająca baseline powinna znajdować się wewnątrz skryptu końca tury, a nie w jednorazowym poleceniu.
- **Baseline** — uruchom każdą kontrolę końca tury raz na niezmodyfikowanym drzewie. Jeśli jest już czerwona (brak wygenerowanych typów, zagnieżdżony pakiet z niezainstalowanymi zależnościami wciągnięty przez główny include `**/*`, …): napraw warunek wstępny (wygeneruj typy), zawęź polecenie (project tsconfig, filtr ścieżek, diagnostyka ograniczona do zmienionych plików) albo zgłoś to jako blokadę. Nigdy nie przekazuj hooka Stop, który blokuje na czystym drzewie.
  **Czerwony z powodu hosta, nie kodu** (test przypięty do dokładnej wersji narzędzia, test trybu pliku zależny od `umask`, współdzielona lokalna usługa): skrypt wykrywa ten warunek, pomija tylko dotkniętą część i informuje o tym w swoim wyjściu (wzorzec `SKIPPED` w referencji). Napraw środowisko poza hookiem, jeśli możesz; ciche pominięcie nigdy nie jest akceptowalne.
- **Testy** — runner oraz to, czy ma tryb powiązanych testów (`vitest related <file> --run`, `jest --findRelatedTests <file> --passWithNoTests`, `pytest` ze ścieżką, …). Zanotuj, co runner robi, gdy żaden test nie pasuje (czy kończy się kodem 0, czy nie). **Brak trybu powiązanego** (`node --test`, `bun test`): wybierz pliki testowe importujące edytowany moduł przez `git grep` po plikach testowych (`related-tests-by-import.sh` w referencji Twojego asystenta kodowania AI); jeden poziom importu, przegląd końca tury i bramka commita pokrywają resztę. Zmierz raz całą suitę unit: jeśli kończy się w około 30 s lub krócej, skrypt końca tury uruchamia całość (wykryje wtedy także czerwony test w module, który agent jedynie zaimportował); w przeciwnym razie uruchamia testy powiązane ze zmienionymi plikami.
- **Menedżer git-hooków** — Husky, lint-staged, Lefthook, pre-commit albo brak. Ta umiejętność nigdy nie modyfikuje istniejących git-hooków.
- **Wymagania wstępne skryptów** — `jq` dla skryptów bash albo Node/Python, jeśli skrypt niebashowy jest bezpieczniejszy (Windows bez Git Bash).

## Krok 4 — Przypisz bramki do momentów; wykonaj audyt istniejących elementów

**Momenty**, od najtańszego sygnału:

| Moment | Należy tutaj | Dociera do agenta |
| --- | --- | --- |
| Dla każdej edycji | Lint/formatowanie edytowanego pliku; powiązane testy, gdy kończą się w kilka sekund | Tak |
| Koniec tury | Lint + testy dla każdego pliku zmienionego w tej turze; typecheck całego projektu | Tak |
| Przed commitem | Lint + testy na plikach w stage (wychwytuje edycje wykonane bez agenta) | Nie |
| Przed push | Cięższe suity, lokalne e2e | Nie |
| CI | Integracja, współdzielony stan, infrastruktura niedostępna lokalnie | Nie |

Heurystyka szybkości: **im wolniejsza kontrola, tym rzadszy moment.** Kilka sekund pasuje do każdej edycji; dziesiątki sekund albo zakres całego projektu należy do końca tury; minuty należą do commita, push lub CI.

Moment dla każdej edycji widzi tylko narzędzia edycji harnessu. Agenci przepisują także pliki przez polecenia powłoki (`cat > file <<EOF`, `sed -i`), których nie odbiera żaden hook dla każdej edycji. Koniec tury jest zatem siatką bezpieczeństwa dla całej tury, nie tylko momentem typechecka: ponownie sprawdza każdy zmieniony plik z `git diff`.

**Odroczenia.** Gdy plan testów jawnie odracza bramkę, która stałaby się hookiem (na przykład „post-edit hook — deferred, not v1”), zacytuj użytkownikowi odroczenie i jego powód, a następnie zapytaj raz: skonfigurować ją mimo to czy uszanować odroczenie? Zapisz odpowiedź jako `override` lub `skip` w raporcie. Nie pytaj ponownie dla każdego hooka.

**Przeprowadź audyt istniejącej konfiguracji hooków przed zaproponowaniem czegokolwiek.** Przeczytaj pliki konfiguracji hooków harnessu (ścieżki w referencji) oraz każdy skrypt w jego katalogu hooków, w tym skrypty, do których nie odwołuje się żadna konfiguracja (np. osierocony `the AI tool's configuration directory/hooks/run-related-tests.mjs`, który wypisuje tylko na stdout). Dla każdego istniejącego hooka nazwij konkretne wady, na przykład:

- lint całego projektu lub `--fix .` przy każdej edycji (wolne, dotyka plików, których agent nie edytował, zgłasza stare błędy jako szum);
- polecenie, którego niepowodzenie kończy się kodem traktowanym przez harness jako nieblokujący albo wypisuje na kanał, który nigdy nie dociera do agenta (np. exit 1 + stdout, gdy harness przekazuje tylko stderr przy exit 2);
- timeouty wyglądające jak milisekundy (`10000`, `30000`), gdy harness oczekuje sekund;
- typecheck całego projektu dla każdej edycji zamiast na końcu tury;
- hook końca tury bez zabezpieczenia ponownej próby (może zapętlić się aż do limitu harnessu);
- ta sama kontrola zarejestrowana dwa razy (Cursor i Copilot mogą importować `the AI tool's configuration directory/settings*.json` — zobacz ich referencje).

Przedstaw mapę momentów i wyniki audytu razem jako propozycję. Zaczekaj na zgodę użytkownika przed zapisaniem plików — **chyba że prośba już jest taką zgodą**: użytkownik poprosił o skonfigurowanie konkretnych hooków w tym repo, a propozycja nie dodaje niczego, o co nie prosił (brak nadpisania odroczenia, brak zastąpionego hooka, brak zmiany poza katalogiem hooków i konfiguracją). Wtedy przedstaw propozycję i kontynuuj; pytaj tylko o to, co wykracza poza prośbę.

## Krok 5 — Załaduj referencję harnessu

Przeczytaj `references/<harness>.md` dla każdego harnessu, który skonfigurujesz:

- `references/anthropic.md` — Twój asystent kodowania AI
- `references/cursor.md`
- `references/codex.md`
- `references/copilot.md`
- `references/other-harnesses.md` — Devin Desktop, Gemini CLI, OpenCode, Kiro, Junie: wyłącznie linki i uwagi o możliwościach. W ich przypadku wyjaśnij ograniczenie i wskaż dokumentację zamiast generować konfigurację, której nie możesz udowodnić.

Każda referencja zaczyna się od `Verified on:` i kanonicznych URL-i dokumentacji. Jeśli możesz przeglądać internet, otwórz podlinkowaną dokumentację i ponownie sprawdź pole payloadu dla edytowanego pliku, kanał docierający do agenta oraz jednostkę timeoutu. W przypadku konfliktu stosuj aktualną dokumentację i odnotuj rozbieżność w raporcie („referencja mówi X, dokumentacja teraz mówi Y”).

## Krok 6 — Wygeneruj konfigurację i skrypty

Postępuj zgodnie z minimalnymi przykładami z referencji; dostosuj polecenia do toolchainu z Kroku 3.

- **Skrypt dla każdej edycji** — odczytuje payload ze stdin, wyodrębnia edytowaną ścieżkę przy użyciu pól wskazanych przez referencję, kończy się sukcesem, gdy ścieżki brakuje albo typ pliku nie jest sprawdzany, oraz uruchamia kontrolę **wyłącznie na tym pliku**. Przy niepowodzeniu wysyła krótki nagłówek oraz wyjście narzędzia kanałem docierającym do agenta.
- **Skrypt końca tury** — przegląda turę: zbiera zmienione i nowe pliki (`git diff --name-only HEAD` oraz nieśledzone), kończy wcześniej, gdy ich nie ma, uruchamia kontrole dla każdej edycji na wszystkich z nich (lint dla objętych plików; powiązane testy albo całą suitę unit, gdy Krok 3 uznał ją za szybką), następnie typecheck całego projektu i zgłasza wszystkie niepowodzenia w jednej wiadomości. Respektuje flagę ponownej próby harnessu (`stop_hook_active` w Twoim asystencie kodowania AI lub odpowiednik wskazany przez referencję), aby agent dostał **jedną** szansę na naprawę, po której może zakończyć pracę. To, czego nie może naprawić, pozostawia bramce commita. Utrzymuj łączny czas poniżej timeoutu (domyślnie 120 s); jeśli przegląd jest wolniejszy, najpierw ogranicz testy do tylko powiązanych.
- **Zwykłe wyjście** — wyjście hooka odczytuje model, nie terminal: `tsc --pretty false`, `grep --color=never`, `NO_COLOR=1 FORCE_COLOR=0` dla wszystkiego innego. Skrypty dziedziczą środowisko powłoki użytkownika (np. `GREP_OPTIONS=--color=always` psuje filtr grep), więc ustawiaj te wartości jawnie.
- **Payloady są niezaufanymi kształtami wejściowymi.** Akceptuj każdy udokumentowany kształt: toleruj brakujące pola, pusty stdin i alternatywne nazwy pól; nigdy nie kończ hooka błędem dlatego, że brakuje pola. Brakująca ścieżka oznacza „nic do sprawdzenia”, a nie błąd.
- **Timeouty** w jednostce oczekiwanej przez harness (zwykle sekundy): około 30 dla lintowania dla każdej edycji, 60 dla powiązanych testów, 120 dla typechecka — potem dostrój.
- **Ścieżki** — rozwiązuj checkout w sposób pokazany w referencji, nigdy wyłącznie przez `cd` do zmiennej katalogu projektu. W Twoim asystencie kodowania AI `$CLAUDE_PROJECT_DIR` jest katalogiem, w którym rozpoczęła się sesja, i staje się nieaktualny po `EnterWorktree`, a edycja w sąsiednim worktree nie należy ani do tej zmiennej, ani do `cwd`: polecenie znajduje skrypt przez `git rev-parse --show-toplevel`, skrypt dla każdej edycji bierze checkout z edytowanego pliku (ścieżki względne rozwiązywane względem `cwd`; pliki innych repozytoriów pomijane), a skrypt końca tury przegląda payload `cwd` oraz każdy checkout zarejestrowany dla `session_id`. Uczyń skrypty wykonywalnymi (`chmod +x`).
- **Brak cichego sukcesu** — exit 0 oznacza „sprawdzono i czysto” albo „nic do sprawdzenia”. Brakujące narzędzie (`jq`, niezainstalowany linter), typechecker, który się nie uruchomił, albo wrapper taki jak `[ -x script ] && exec script; exit 0` muszą widocznie kończyć się niepowodzeniem (kanał feedbacku lub komunikat widoczny dla użytkownika), nigdy sukcesem.
- **Konfiguracja commitowana** — sprawdź, czy pliki hooków nie są ignorowane (`git check-ignore -v the AI tool's configuration directory/settings.json`). Ignorowany katalog hooków istnieje tylko na jednym dysku; zaproponuj ponowne uwzględnienie z referencji i pokaż diff `.gitignore`.
- **Windows** — zanotuj powłokę używaną przez harness (Git Bash, PowerShell, pole polecenia per OS). Jeśli bash lub `jq` nie są dostępne, wygeneruj zamiast tego skrypt Node.
- **Istniejąca konfiguracja** — scal ją, zachowaj niezwiązane hooki, zastąp tylko wadliwe wpisy wymienione w Kroku 4 i pokaż diff przed zapisaniem. Skrypt pozostawiony przez zastąpiony lub osierocony hook pozostaje na dysku: wymień go w raporcie i zarekomenduj usunięcie; nigdy nie usuwaj go po cichu.
- **Podwójna rejestracja** — hooki `the AI tool's configuration directory/settings*.json` są również uruchamiane przez Cursor (import domyślnie włączony), przez Copilot CLI oraz przez VS Code, gdy `chat.useClaudeHooks` jest włączone. Jeśli jedno z nich jest używane, a `the AI tool's configuration directory/settings*.json` zawiera już hooki, nie rejestruj ponownie tej samej kontroli w jego natywnej konfiguracji bez zajęcia się importem (zobacz `references/cursor.md`, `references/copilot.md`).

## Krok 7 — Udowodnij przed przekazaniem, jako commitowany test

Dowód to **plik testowy commitowany do repo**, uruchamiany przez własny runner testów repo, a nie jednorazowa sekwencja poleceń powłoki. Hooki się zmieniają; dowód, którego nikt nie może ponownie uruchomić, przestaje cokolwiek dowodzić po pierwszej edycji.

Nazwij go `agent-hooks.test.*` i umieść obok istniejących testów narzędziowych repo (w `scripts/__tests__/`, `tools/ci/` lub `tests/`, …) w runnerze, którego repo już używa. Każdy przypadek przekazuje payload (kształt z referencji) do rzeczywistego skryptu i asertywnie sprawdza kod wyjścia oraz kanał wyjściowy. Pracuj na tymczasowej kopii albo jednorazowym repo/worktree git, nigdy na plikach w drzewie dewelopera. Stubuj tylko to, co jest wolne lub nieobecne w środowisku testowym (binarny plik lintera na `PATH`, który oznacza marker jako błąd), zachowaj rzeczywiste git, `jq` i skrypty.

Przypadki:

1. **Uszkodzony plik** — celowy, oczywisty błąd w pliku objętym kontrolą (nieużywana zmienna, nieprawidłowy typ). Oczekuj blokującego lub feedbackowego sygnału udokumentowanego przez referencję oraz komunikatu wskazującego plik i problem. Dla skryptów uruchamiających testy błąd musi być behawioralny (nieudana asercja): błędy wyłącznie typów nie powodują niepowodzenia Vitest, który usuwa typy.
2. **Czysty plik** — oczekuj sukcesu i braku blokującego wyjścia. Dla skryptów końca tury wymaga to zielonego baseline z Kroku 3.
3. **Pomijany typ** — plik nieobjęty kontrolą (np. `README.md`). Oczekuj sukcesu.
4. **Nieistniejący plik** — payload wskazujący ścieżkę, która nie istnieje. Oczekuj sukcesu.
5. **Pusty payload** — `{}` oraz payload nieparsowalny lub bez ścieżki (np. `not json`, wywołanie narzędzia bez ścieżki). Oczekuj sukcesu.
6. **Koniec tury z ustawioną flagą ponownej próby** — oczekuj sukcesu nawet wtedy, gdy błąd nadal występuje.
7. **Edycja, która ominęła hook dla każdej edycji** — błąd lintowania zapisany bezpośrednio na dysku, bez payloadu dla każdej edycji, skrypt końca tury. Oczekuj, że zablokuje i wskaże ten plik. Gdy nie ma w ogóle zmienionych plików, oczekuj sukcesu bez uruchamiania żadnej kontroli.
8. **Rozwiązywanie checkoutu** — zmienna katalogu projektu wskazuje inny checkout zawierający błąd: hooki sprawdzają checkout sesji i pozostają zielone. Ścieżka względna rozwiązuje się względem `cwd`. Uszkodzony plik innego repozytorium jest pomijany. Edycja w sąsiednim worktree jest przeglądana przez skrypt końca tury. Każde `command` z konfiguracji, uruchomione z worktree przy zmiennej katalogu projektu ustawionej na nieistniejącą ścieżkę, dociera do wykonywalnego skryptu.
9. **Brak cichego sukcesu** — brakuje lintera lub typecheckera: oczekuj sygnału niepowodzenia, nie sukcesu.
10. **Kształty specyficzne dla harnessu** — dodatkowe przypadki wymienione przez referencję (np. Codex: payload niebędący patchem, patch wieloplikowy, `cwd` w podkatalogu).

Celowo zepsuj raz sam test: cofnij jedną poprawkę w skrypcie (np. usuń zabezpieczenie ponownej próby) i obserwuj, jak odpowiadający przypadek staje się czerwony, a następnie ją przywróć. Podłącz test do bramki, którą repo już uruchamia (suita unit, `verify`, pre-push), ograniczając go do zmian pod katalogiem hooków, jeśli suita jest wolna. Nie dodawaj zadania CI.

Cofnij każdy celowy błąd i potwierdź, że `git status` pokazuje tylko pliki, które zamierzałeś utworzyć lub zmienić. Jeśli przypadek kończy się niepowodzeniem, napraw skrypt i uruchom test ponownie. Nigdy nie zgłaszaj hooka jako działającego wyłącznie na podstawie konfiguracji.

## Krok 8 — Raport

Wypisz zwięzły raport:

- **Wejścia** — ścieżka planu testów (lub „Nie znaleziono planu testów — bramki wyprowadzone z toolchainu”), harness(y) ze ścieżkami dowodowymi, polecenia toolchainu, baseline końca tury (zielony, naprawiony, zawężony lub blokada).
- **Odroczenia** — każde cytowane odroczenie i odpowiedź użytkownika (`override` / `skip`).
- **Audyt** — wady znalezione w istniejącej konfiguracji hooków i to, co je zastąpiło; pozostawione skrypty (osierocone lub zastąpione) z rekomendacją usunięcia.
- **Skonfigurowano** — dla każdego harnessu: plik(i) konfiguracji, skrypty, zdarzenia, timeouty; scalony diff.
- **Dowód** — commitowany plik testowy, polecenie go uruchamiające, jego wynik oraz celowe uszkodzenie, które zaobserwowałeś jako czerwone.
- **Nadal wymagane od użytkownika** — kroki zaufania lub zatwierdzenia (np. przegląd Codex `/hooks`, zaufanie do workspace Cursor, ponowne uruchomienie sesji) oraz sposób potwierdzenia, że hook jest załadowany (menu hooków harnessu lub log debugowania).
- **Rozbieżność referencji** — każda rozbieżność między referencją a aktualną dokumentacją.
- **Poza zasięgiem** — czego te hooki nie mogą udowodnić: zachowania uruchomionej aplikacji (komponent kliencki, który nigdy nie hydratuje, routing, polityki bazy danych, efekty uboczne). Lint, typy i testy unit mogą wszystkie przejść, gdy funkcja jest uszkodzona. Wymień zagrożone powierzchnie repo i wskaż weryfikację E2E lub w przeglądarce; nie konfiguruj jej tutaj.
- **Zalecane bramki git (niezapisane)** — co należy do pre-commit i pre-push dla tego repo, wraz z istniejącym menedżerem hooków, jeśli taki jest. Nie twórz ani nie edytuj konfiguracji git-hooków.
- **Następny krok** — poproś agenta o edycję pliku z błędem lintowania, następnie z błędem typu, i obserwuj, jak naprawia oba w tej samej sesji. Następnie poproś go o przepisanie pliku poleceniem powłoki z błędem lintowania i obserwuj, jak hook końca tury odsyła go z powrotem.

## Czego ta umiejętność NIE robi

- Nie zmienia bramek ani strategii ryzyka — od tego jest `/10x-test-plan`.
- Nie pisze testów aplikacji, scenariuszy E2E ani pipeline’ów CI (jedyny test, który pisze, to test hooka z Kroku 7).
- Nie instaluje ani nie rekonfiguruje menedżerów git-hooków (Husky, Lefthook, pre-commit).
- Nie generuje konfiguracji dla harnessów, których nie potrafi udowodnić (zobacz `references/other-harnesses.md`).

## Interaktywne prompty — niezależne od hosta

Za każdym razem, gdy ta umiejętność mówi „zapytaj użytkownika”, użyj dowolnego narzędzia pytań udostępnianego przez hosta; jeśli żadne nie istnieje, zapytaj zwykłym tekstem z oznaczonymi opcjami. Zapytaj co najwyżej o: harness (tylko jeśli jest niejednoznaczny), czy nadpisać odroczenie (raz), oraz zgodę po przedstawieniu propozycji (pomijane, gdy prośba już jest taką zgodą, Krok 4).

## Ton

Zwięzły, nakazowy, konkretny. Nazywaj pliki, polecenia i kody wyjścia. Bez języka marketingowego.