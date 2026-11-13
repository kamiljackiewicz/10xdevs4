# Test Plan

> Phased test rollout for this project. Strategy is frozen at the top
> (§1–§5); cookbook patterns at the bottom (§6) fill in as phases ship.
> Read before writing any new test.
>
> Refresh: re-run `/10x-test-plan --refresh` when stale (see §8).
>
> Last updated: 2026-11-13

## 1. Strategy

Tests follow three non-negotiable principles for this project:

1. **Cost × signal.** The cheapest test that gives a real signal for the
   risk wins. Do not promote to e2e because e2e "feels safer." Do not put a
   vision model on top of a deterministic visual diff that already catches
   the regression.
2. **User concerns are first-class evidence.** Risks anchored in "<the
   team is worried about X, and the failure would surface somewhere in
   <area>>" carry the same weight as PRD lines or hot-spot data.
3. **Risks are scenarios, not code locations.** This plan documents *what
   could fail* and *why we believe it's likely* — drawn from documents,
   interview, and codebase *signal* (churn, structure, test base). It does
   NOT claim to know which line owns the failure. That knowledge is
   produced by `/10x-research` during each rollout phase. If the plan and
   research disagree about where the failure lives, research is the
   ground truth.

Zakres hot-spotów: `src/`, `supabase/migrations/`; na życzenie użytkownika **90 dni** zamiast 30. Wykluczono dokumentację, testy, fixtures, archiwum i kod wygenerowany. Wynik: 15 commitów, 46 plików; najwięcej zmian plików w commitach: `src/lib/` 11, `src/pages/api/` 10, `src/components/auth/` 9, `src/components/patient/` 8; migracje 4. To sygnał zmian, nie dowód defektów. Brak zgłoszonych wcześniejszych incydentów; prawdopodobieństwo Medium jest oceną wstępną.

## 2. Risk Map

High impact: utrata danych/dostępu lub ujawnienie danych; Medium: pogorszenie funkcji z obejściem; Low: kosmetyka. High likelihood: częste zmiany lub znany incydent; Medium: zmiany okazjonalne; Low: obszar stabilny.

| # | Risk (failure scenario) | Impact | Likelihood | Source (evidence — not anchor) |
|---|---|---|---|---|
| R1 | Import przekłamuje wartość, jednostkę lub parametr, a opiekun nie zauważa błędu podczas przeglądu. | High | Medium | Wywiad Q1; PRD FR-002–003; roadmapa S-03 — funkcja planowana |
| R2 | Błąd zapisu usuwa wpisaną treść notatki. | High | Medium | Wywiad Q3–4; archiwum record-dated-timeline-note, kontrakt zachowania szkicu |
| R3 | Użytkownik odczytuje lub zmienia dane innego pacjenta. | High | Medium | PRD Access Control; archiwum patient-data-access-contract |
| R4 | Zapis lub wyświetlanie zmienia dzień notatki albo jej kolejność. | High | Medium | PRD FR-004; archiwum record-dated-timeline-note |
| R5 | Błędy formularza, fokus lub oczekiwanie utrudniają zapis profilu. | Medium | Medium | Archiwum dashboard-ui-contract; src/components/patient/ — 8 zmian plików/90 dni |

### Risk Response Guidance

| Risk | What would prove protection | Must challenge | Context `/10x-research` must ground | Likely cheapest layer | Anti-pattern to avoid |
|---|---|---|---|---|---|
| R1 | Ekstrakcja zgodna ze sprawdzonym dokumentem; korekta możliwa przed zatwierdzeniem. | Ręczne zatwierdzenie gwarantuje poprawność. | Niezależne wartości wzorcowe pięciu układów; granica ekstrakcja–przegląd–zapis. | Korpus + integracja | Oczekiwania skopiowane z ekstraktora. |
| R2 | Treść i data pozostają po odrzuconym zapisie. | HTTP smoke dowodzi zachowania formularza. | Szkic, obsługiwane błędy, niejednoznaczna odpowiedź sieciowa. | Interakcja formularza | Wyłącznie happy path; mockowanie wnętrza komponentu. |
| R3 | Anonimowy i drugi użytkownik nie uzyskują dostępu przez HTTP ani Supabase. | Logowanie oznacza własność. | Sesja, RLS, istniejące pokrycie, syntetyczne dane i cleanup. | Integracja HTTP/RLS | Asercje klientem administracyjnym; duplikowanie istniejących testów. |
| R4 | Dzień i kolejność zachowane po zapisie i odczycie. | Poprawne parsowanie oznacza poprawny ekran. | Kontrakt dat, strefy czasowe, sortowanie i granice dat. | Unit + integracja | Oczekiwania wyliczane kodem produkcyjnym. |
| R5 | Klawiatura pozwala rozpoznać błąd i dokończyć zapis; pending jest czytelny. | Zielony build dowodzi użyteczności. | PL/EN, siedem stanów, aktualna prezentacja i kontroler. | Interakcja + przegląd renderu | Snapshot bez znaczenia użytkowego. |

Challenger findings: import jest przyszłą powierzchnią, nie istniejącą regresją; nie utożsamiać churnu z błędem ani obecnego pokrycia dostępu z potrzebą nowych testów.

## 3. Phased Rollout

| # | Phase name | Goal (one line) | Risks covered | Test types | Status | Change folder |
|---|---|---|---|---|---|---|
| 1 | Ochrona szkicu notatki | Udowodnić zachowanie treści i daty po błędzie zapisu. | R2 | interaction/integration | planned | context/changes/testing-note-draft-retention/ |
| 2 | Prywatność i chronologia | Uzupełnić rzeczywiste luki izolacji i trwałości dat. | R3, R4 | unit + HTTP/database integration | not started | — |
| 3 | Obsługa formularza profilu | Chronić zapis klawiaturą oraz błędy i pending w PL/EN. | R5 | interaction + selective visual review | not started | — |
| 4 | Wiarygodność importu | Zweryfikować ekstrakcję i przegląd na niezależnym korpusie. | R1 | corpus + integration | not started | — |

Kolejność: istniejąca obawa użytkownika → granice danych → interakcja → przyszły import. Faza 4 wymaga koordynacji z S-03 i jego weryfikacją pięciu układów; nie tworzy implementacji produktu tylko dla testów. Każda faza kończy się aktualizacją §6 i podłączeniem swoich automatycznych kontroli do CI.

## 4. Stack

Profil **sparse**: trzy pliki `scripts/*.test.mjs`, natywny runner Node; dodatkowo HTTP smoke i integracja Supabase. Źródła: `package.json`, `package-lock.json`, `.github/workflows/ci.yml`, archiwalne plany. Tech-stack opisuje starsze założenia importu; zakres S-03 rozstrzyga roadmapa.

| Layer | Tool | Version | Notes |
|---|---|---|---|
| Unit | Node test runner | 22.23.2 lokalnie; CI 22 | `npm run test:unit`; checked: 2026-11-13 |
| HTTP/database | Własne skrypty + Supabase SDK | 2.116.0 | Smoke i izolacja Cloud; checked: 2026-11-13 |
| Aplikacja | Astro / React / Cloudflare adapter | 7.3.2 / 19.3.0 / 14.3.1 | Wersje rozwiązane w lockfile, nie minima z manifestu; checked: 2026-11-13 |
| Interakcje przeglądarkowe | Brak runnera | — | Wybór najtańszej warstwy w researchu faz 1 i 3; bez nowej zależności z góry. |
| AI-native | Brak osobnego etapu | — | Research fazy 3 oceni dodatkowy sygnał; nie stosować ponad wystarczającą asercją deterministyczną. |

**Stack grounding tools (current session):**
- Docs: Context7/framework docs MCP — not available in current session; bez zaleceń zależnych od nowych API; checked: 2026-11-13.
- Search: web search dostępny, Exa — not available in current session; nieużyty, strategia oparta na lokalnych źródłach; checked: 2026-11-13.
- Runtime/browser: CUA dostępne, Playwright MCP — not available in current session; nieużyte podczas strategii; checked: 2026-11-13.
- Provider/platform: brak dedykowanego MCP GitHub/Cloudflare/Supabase dla tego repo; lokalny workflow stanowi dowód bramek, nie sprawdzano usług na żywo; checked: 2026-11-13.

## 5. Quality Gates

| Gate | Where | Required? | Catches |
|---|---|---|---|
| Lint + UI guard + Astro check + build | Lokalnie / CI main i PR | Obecnie podłączone | Typy, składnia, kontrakt kolorów, build |
| Unit | Lokalnie / CI | Obecnie podłączone | Walidacja profilu/notatek i i18n |
| HTTP smoke + Cloud isolation | Workers preview / CI | Obecnie podłączone | Sesje, CRUD, izolacja; syntetyczne dane z cleanup |
| Zachowanie szkicu | CI | required after §3 Phase 1 | Utrata treści po błędzie |
| Uzupełniona izolacja i daty | CI | required after §3 Phase 2 | Dostęp obcy/anonimowy i przesunięcia dat |
| Formularz profilu | CI + ręczny przegląd renderu | required after §3 Phase 3 | Błędy, fokus, pending, PL/EN |
| Korpus importu i przegląd | CI | required after §3 Phase 4 | Przekłamania i przedwczesne zatwierdzenie |

Opis CI w AGENTS jest częściowo nieaktualny: źródłem prawdy jest workflow na `main`, z Supabase Cloud. Strategia nie zmienia konfiguracji CI ani hooków.

## 6. Cookbook Patterns

### 6.1 Zachowanie szkicu po błędzie

TBD — see §3 Phase 1.

### 6.2 Odmowa dostępu do cudzych danych

TBD — see §3 Phase 2.

### 6.3 Daty i chronologia

TBD — see §3 Phase 2.

### 6.4 Interakcje formularza profilu

TBD — see §3 Phase 3.

### 6.5 Niezależny korpus ekstrakcji i zatwierdzanie

TBD — see §3 Phase 4.

## 7. What We Deliberately Don't Test

- **Wygenerowany kod** — bez nowych testów odtwarzających wynik generatora; budżet przeznaczamy na zachowanie aplikacji na jego granicach. Ponownie ocenić, jeśli kod będzie ręcznie modyfikowany lub generowanie stanie się własną logiką produktu. Źródło: wywiad Q5.

Wywiad: Q1 „import przekłamie wartość wyniku”; Q2 skip; Q3 „zapis notatek”; Q4 „utrata treści po błędzie zapisu”; Q5 „wygenerowany kod”.

## 8. Freshness Ledger

- Strategy (§1–§5) last reviewed: 2026-11-13
- Stack versions last verified: 2026-11-13
- AI-native tool references last verified: 2026-11-13

Uruchom `/10x-test-plan --refresh`, gdy pojawi się nowe ryzyko top-3, data `checked:` przekroczy trzy miesiące, zmieni się stack/runner lub wyłączenia §7 przestaną odpowiadać decyzjom zespołu.
