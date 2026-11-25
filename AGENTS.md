# Repository Guidelines

## Critical Rules

- Never write to `context/archive/`. Archived changes are immutable; open a new change instead.
- Never commit real Supabase credentials. Keep the variable names from @.env.example and use local values only in ignored `.env` and `.dev.vars` files.
- Run `npm run lint` and `npm run build` before finishing a code change. For any authentication-flow change, also start the local app and run `npm run smoke` against it.

## Validation Context

CI runs on pushes and pull requests to `master`. It runs `astro sync`, linting, Astro check, and the production build; its separate smoke job starts local Supabase, creates local environment files, previews the build on port 4321, then exercises the authentication flow. See @.github/workflows/ci.yml for the canonical commands.

## References

Use @README.md for local setup and @package.json for scripts and dependencies. Do not duplicate their contents here.

## Dashboard UI Contract

- Dashboard token values live in `src/styles/global.css`, scoped to `.dashboard-theme`; use semantic roles and the existing Tailwind scale in dashboard views, without literal colors, palette classes or arbitrary dimensions. Keep the global root, `.dark` and other views unchanged when adjusting this local theme.
- Check `src/components/ui/` before creating a control. Reuse `Button`, `Input`, `Select` and `Field`; add missing primitives through the existing local shadcn/Tailwind conventions rather than copying controls into views.
- Use the development-only `/dev/dashboard-ui` showcase (`src/components/patient/DashboardUiShowcase.tsx`) for PL/EN, keyboard focus, hover, disabled, error, empty and loading checks. Preserve native date-picker contrast and stable pending actions. Record desktop/mobile evidence before accepting visual changes.
- `npm run lint` includes `scripts/check-dashboard-ui.mjs`, restricted to `dashboard.astro`, `PatientProfile.tsx` and `PatientProfileView.tsx`. Keep this scope explicit; token definitions and the shared component directory are not scan targets.

<!-- BEGIN @przeprogramowani/10x-cli -->

## Zestaw narzędzi AI 10xDevs — Moduł 3, Lekcja 4 (testy E2E)

**W przypadku testów E2E użyj dwóch umiejętności M3L4 w tej kolejności:**

1. **`/10x-e2e-setup`** — jednorazowa konfiguracja: konfiguracja Playwright (`webServer`,
   projekt `setup` autoryzacji, `storageState`), zielony test seed oraz `context/foundation/test-stack.md`.
2. **`/10x-e2e`** — pętla dla każdego ryzyka: ryzyko → eksploracja działającej aplikacji za pomocą
   `playwright-cli` → generowanie → przegląd względem pięciu antywzorców →
   ponowne wywołanie promptu po nazwie → weryfikacja przez celowe zepsucie.

Katalogi `references/` umiejętności zawierają pełne reguły, antywzorce, wzorzec seed oraz
szablon promptu.

Kilka twardych zasad obowiązujących jeszcze przed wywołaniem umiejętności:

- **Lokatory:** najpierw `getByRole` / `getByLabel` / `getByText`; `getByTestId`
  tylko wtedy, gdy atrybuty dostępności są niejednoznaczne. Nigdy selektory CSS, XPath
  ani struktura DOM.
- **Nigdy `page.waitForTimeout()`.** Czekaj na stan: `toBeVisible()`,
  `waitForURL()`, `waitForResponse()`.
- **Niezależność testów + sprzątanie.** Każdy test uruchamia się samodzielnie — ma własną konfigurację,
  akcję, asercję i sprzątanie; unikalne id (sufiks timestamp), aby uruchomienia równoległe
  i ponowne uruchomienia nie kolidowały.

Dwie granice, które należy wyraźnie rozróżniać:

- **DOM (snapshot) jest domyślny.** Wizja (`--caps=vision`) jest uzupełnieniem dla
  ryzyk wyłącznie wizualnych (układ, z-index, animacja); w przypadku regresji pikselowych preferuj
  deterministyczne narzędzia (`toHaveScreenshot`, Argos, Lost Pixel). Wybór/koszt modelu VLM
  to temat debugowania (Lekcja 5), nie testowania.
- **Czerwony test to sygnał, a nie obowiązek do odhaczenia.** Zmieniony selektor → zaktualizuj
  lokator w sprawdzonym diffie. Zmienione zachowanie biznesowe → test wykrył
  błąd; nigdy nie edytuj asercji, aby je dopasować. Naprawianie nieudanych testów to Lekcja 5.

<!-- END @przeprogramowani/10x-cli -->
