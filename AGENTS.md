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

## Zestaw narzędzi AI 10xDevs — Moduł 2, Lekcja 5 (interfejs 10xDevs 4.0)

**W przypadku prac nad interfejsem w widoku, który jest już renderowany, zacznij od `/10x-ui <view>`.** To
punkt wejścia: krótki audyt wstępny, sugerowany change-id oraz polecenie `/10x-new`, które należy
uruchomić, a następnie opis audytu dla `/10x-research`. Zmiana wizualna przechodzi przez ten sam łańcuch
co każda inna zmiana (`/10x-new` → `/10x-research` → `/10x-plan` → `/10x-implement` →
`/10x-impl-review`); `/10x-ui <change-id>` wznawia proces na pierwszym kroku, który nie został jeszcze wykonany. Obejmuje
zasady:
kiedy zacząć i który widok wybrać, audyt pod kątem opłat, kontrakt systemu projektowego w formie,
w jakiej realizuje go to repozytorium, stany komponentów, bramkę zrzutu ekranu oraz zasadę, która
utrzymuje kolejnego agenta w ramach kontraktu. Katalog `references/` zawiera listę kontrolną jakości.

Tworzenie widoku po raz pierwszy nie jest zadaniem dla `/10x-ui` — zbuduj go poprzez
zwykły łańcuch, a następnie wróć do niego z `/10x-ui`.

<!-- END @przeprogramowani/10x-cli -->
