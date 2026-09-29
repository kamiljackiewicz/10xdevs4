# Repository Guidelines

## Critical Rules

- Never write to `context/archive/`. Archived changes are immutable; open a new change instead.
- Never commit real Supabase credentials. Keep the variable names from @.env.example and use local values only in ignored `.env` and `.dev.vars` files.
- Run `npm run lint` and `npm run build` before finishing a code change. For any authentication-flow change, also start the local app and run `npm run smoke` against it.

## Validation Context

CI runs on pushes and pull requests to `master`. It runs `astro sync`, linting, Astro check, and the production build; its separate smoke job starts local Supabase, creates local environment files, previews the build on port 4321, then exercises the authentication flow. See @.github/workflows/ci.yml for the canonical commands.

## References

Use @README.md for local setup and @package.json for scripts and dependencies. Do not duplicate their contents here.
<!-- BEGIN @przeprogramowani/10x-cli -->

## Zestaw narzędzi AI 10xDevs — Moduł 2, Lekcja 3

Przed scaleniem przejrzyj kod wygenerowany przez AI za pomocą **łańcucha przeglądu implementacji**:

```
/10x-implement -> /10x-impl-review -> triage -> (/10x-lesson | fix | skip | disagree)
```

`/10x-impl-review` jest głównym tematem lekcji. Przegląd jest bramką jakości, a nie poleceniem naprawienia każdego znaleziska.

### Router zadań — od czego zacząć

| Umiejętność | Użyj jej, gdy |
| --- | --- |
| **Przegląd kodu (główny temat lekcji)** | |
| `/10x-impl-review <change-id>` | Zaimplementowałeś kod i chcesz przeprowadzić ustrukturyzowany przegląd przed scaleniem. Umiejętność sprawdza zgodność z planem, dyscyplinę zakresu, bezpieczeństwo i jakość, architekturę, spójność wzorców oraz kryteria sukcesu, a następnie przedstawia znaleziska do triage. |
| **Rezultat powtarzającej się lekcji** | |
| `/10x-lesson` | Znalezisko ujawnia powtarzającą się regułę projektu lub wzorzec błędów agenta. Zapisz je w `context/foundation/lessons.md` zamiast traktować jako jednorazową notatkę. |

### Dyscyplina triage

- Severity określa, jak poważne jest znalezisko. Impact określa, jak duże znaczenie ma teraz decyzja.
- Prawidłowe rezultaty: napraw teraz, napraw inaczej, pomiń, zaakceptuj jako ryzyko, zapisz jako powtarzającą się regułę (`/10x-lesson`), nie zgódź się.
- Napraw krytyczne znaleziska. Nie poświęcaj godzin na obserwacje o niskim wpływie tylko dlatego, że agent je znalazł.
- Świadome pomijanie znalezisk o niskim wpływie jest prawidłowym wynikiem przeglądu, a nie zaniedbaniem.
- Jeśli nie zgadzasz się ze znaleziskiem, zapisz dlaczego. Błędne rozumowanie agenta również jest sygnałem.

### Granice przeglądu

- Ta lekcja dotyczy przeglądu zaimplementowanego kodu. Nie tworzy planu, nie wykonuje nowych faz ani nie uczy przeglądu CI.
- Strategia testowania i bramki jakości są wprowadzane w Module 3.
- W tej lekcji nie używaj `/10x-contract` jako wyniku triage.

### Ścieżki używane przez tę lekcję

- `context/changes/<change-id>/plan.md` — oczekiwany kontrakt implementacji
- `context/changes/<change-id>/reviews/` — wynik przeglądu
- `context/foundation/lessons.md` — powtarzające się lekcje

Umiejętności nie mogą zapisywać do `context/archive/`. Zarchiwizowane zmiany są niezmienne; jeśli rozwiązana ścieżka docelowa zaczyna się od `context/archive/`, przerwij z komunikatem: „Ta zmiana jest zarchiwizowana. Zamiast tego otwórz nową zmianę za pomocą `/10x-new`.”

<!-- END @przeprogramowani/10x-cli -->
