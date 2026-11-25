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

## Zestaw narzędzi AI 10xDevs — Moduł 3, Lekcja 5 (Debugowanie)

Zmień awarię w poprawkę, której agent może bronić: najpierw dowody, potem nieudany test, a następnie poprawka.

```
signal (monitoring | log | flaky E2E | stack trace) -> gather evidence -> reproduce -> failing test -> fix -> verify
```

### Router zadań — od czego zacząć

| Umiejętność | Użyj jej, gdy |
| --- | --- |
| `/10x-frame` | Zgłoszenie dociera jako „bug + proposed fix”. Sprawdź, czy zaobserwowany symptom i podana przyczyna faktycznie się zgadzają, zanim ktokolwiek zacznie cokolwiek naprawiać. |
| `/10x-new` -> `/10x-research` -> `/10x-plan` -> `/10x-implement` | Poprawka to więcej niż jednolinijkowa zmiana. Research zbiera dowody; plan zaczyna się od nieudanego testu regresji. |
| `/10x-tdd` | Pisanie testu regresji, który odtwarza błąd przed wprowadzeniem poprawki. |
| `/10x-e2e` | Błąd pojawia się tylko w działającej aplikacji. Odtwórz go w przeglądarce i zachowaj ten test. |
| `/10x-observability-audit` | Błędy są nieobecne, zaszumione lub niemożliwe do zdiagnozowania na produkcji. Audytuje krytyczne przepływy pod kątem kodu ukrywającego awarie i zapisuje raport z datą w `context/audits/observability/`. Użyj `--verify <report>`, aby ponownie sprawdzić wcześniejszy raport po poprawkach. |

### Twarde zasady

- **Dowody przed hipotezą.** Korzystaj z tego, co pokazują tracker błędów, logi, odtworzenie problemu i kod. Nigdy nie zgaduj przyczyny wyłącznie na podstawie stack trace.
- **Błąd najpierw staje się nieudanym testem.** Poprawka jest gotowa, gdy ten test zmienia status z czerwonego na zielony i pozostaje w zestawie testów.
- **Nigdy nie ukrywaj dowodów.** Żadnych pustych `catch`, żadnych ignorowanych odrzuceń promise, żadnych awarii zamienianych w przekierowania lub `200`s, żadnych pominiętych przyczyn błędów. Jeśli poprawka wymaga `catch`, loguje lub raportuje błąd wraz z jego przyczyną.
- **Napraw przyczynę, nie test.** Nie edytuj asercji, aby pasowała do nowego zachowania, chyba że zmieniło się samo wymaganie.

### Granice lekcji

- `/10x-observability-audit` czyta kod i zapisuje raport. Nigdy nie zmienia audytowanego kodu. Naprawianie tego, co znajdzie, przechodzi przez łańcuch zmian.
- Wybór dostawcy monitoringu należy do `/10x-infra-research`, a nie do tej lekcji.

<!-- END @przeprogramowani/10x-cli -->
