---
change_id: dashboard-ui-contract
title: Dashboard ui contract
status: impl_reviewed
created: 2026-11-12
updated: 2026-11-13
archived_at: null
---

## Notes

<!-- Free-form notes for this change: links, ad-hoc context, decisions that don't belong in research/frame/plan. -->

Zakres: jeden widok `/dashboard` (`src/pages/dashboard.astro`) wraz z profilem pacjenta (`src/components/patient/PatientProfile.tsx`).

Kontrakt: rozszerzenie istniejącego systemu Tailwind v4 + shadcn/ui. Źródło tokenów: `src/styles/global.css` (`:root`, `.dark`, publikacja przez `@theme inline`); współdzielone komponenty: `src/components/ui`. Bez drugiego systemu projektowego i bez rebrandingu całej aplikacji.

Punktem wyjścia do `/10x-research` jest wstępny audyt `/10x-ui /dashboard`: 22 linie z kolorami palety (7 w stronie, 15 w profilu), brak odwołań do semantycznych tokenów kolorów i brak importów komponentów `ui` w obu plikach. Research powinien zweryfikować pomijane tokeny, powielone przyciski, osobne style pól i brak trwałych zasad UI, zapisując 3–5 ustaleń z plikiem, linią i wpływem na użytkownika w `## Charges`.

W dalszym łańcuchu uwzględnić siedem stanów kontrolek oraz weryfikację renderowania na desktopie i jednej szerokości mobilnej. Dotychczasowy audyt dotyczył kodu; zrzuty ekranu pozostają do wykonania. Zachować regułę kontrastowego kalendarza z `context/foundation/lessons.md`.
