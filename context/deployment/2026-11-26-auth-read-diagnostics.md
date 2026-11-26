---
project: 10x-med-lab-timeline
deployment_target: cloudflare-workers
status: deployed-pending-human-acceptance
source_commit: e55c3c3
previous_version: ce00cbfd-9e9b-4ee1-b109-fb743b09137e
deployed_version: 334c0e34-1456-4b1f-9730-5556285565c5
approved_at: 2026-11-26
deployed_at: 2026-11-26
---

# Aktualizacja diagnostyki Auth i odczytów SSR

## Zakres

Opublikować bieżący build Workera `10x-med-lab-timeline` pod adresem
`https://10x-med-lab-timeline.kamil-jack.workers.dev` na koncie
`Kamil.jack@gmail.com's Account` (`4cb5cbbf161663b6244ff210ada12ac6`).
Kod odpowiada zakończonej zmianie `report-auth-and-read-failures`, commit
`e55c3c3`. Ta aktualizacja dodaje diagnostykę A1/H1, zachowując HTTP/UI.
Bez migracji, zmian sekretów i sztucznych awarii produkcyjnych.

## Preflight

- Trzy fazy zmiany mają potwierdzone 11/11 kryteriów.
- Lint, 33 testy jednostkowe, 32 testy interakcji, Astro check i build przeszły.
- E2E: 4/4. Izolowane sondy: 34/34 przed i po; identyczne odpowiedzi,
  zero → 18 zdarzeń aplikacyjnych, bez zasianych sekretów.
- `npx wrangler deploy --dry-run` przeszedł: konfiguracja
  `dist/server/wrangler.json`, bindingi `IMAGES` i `ASSETS`.
- Sesja Cloudflare została odnowiona. `whoami` potwierdziło konto powyżej;
  `secret list` potwierdziło nazwy `SUPABASE_URL` i `SUPABASE_KEY`, bez wartości.
- `deployments list` wskazało poprzednią wersję podaną w metadanych.

## Publikacja i weryfikacja

1. Uzyskać potwierdzenie człowieka: właściwy projekt produkcyjny Supabase jest
   gotowy i publikacja na wskazany Worker jest zatwierdzona. Wymóg pochodzi
   z sekcji Explicit publication gate w `deploy-plan.md`.
2. Wykonać `npx wrangler deploy`; zapisać nowy identyfikator wersji i URL.
3. Potwierdzić wersję przez `npx wrangler deployments list`.
4. Uruchomić krótkie, lokalnie przechwycone `npx wrangler tail` i zwykłe
   anonimowe żądania do `/`, formularzy Auth oraz chronionych stron.
   Sprawdzić statusy, przekierowania i dostępność plików statycznych.
5. Potwierdzić dostęp do strumienia logów i obecność zwykłych żądań.
   Oczekiwany brak sesji nie powinien emitować `application_failure`.
   Bez rzeczywistej awarii nie deklarować dowodu produkcyjnej emisji tego
   zdarzenia. Alerty, retencja, sampling i zgłoszenia pozostają nieweryfikowane.
6. Zapisać wyniki publikacji i ograniczenia w tym dokumencie. Ręczna akceptacja
   zalogowanego przepływu pozostaje po stronie użytkownika.

## Rollback

Jeżeli opublikowana aplikacja nie przejdzie kontroli HTTP/statycznych zasobów,
przywrócić poprzednią wersję poleceniem:

```sh
npx wrangler rollback ce00cbfd-9e9b-4ee1-b109-fb743b09137e
```

Rollback dotyczy kodu Workera. W tej aktualizacji nie wykonujemy zmian bazy.

## Wynik

Użytkownik potwierdził gotowość produkcyjnego Supabase i zatwierdził publikację.
`npx wrangler deploy` zakończył się sukcesem; `deployments list` potwierdziło
100% ruchu na wersji `334c0e34-1456-4b1f-9730-5556285565c5`.

- URL: https://10x-med-lab-timeline.kamil-jack.workers.dev
- `/`, `/auth/signin`, `/auth/signup`: HTTP 200.
- `/dashboard` i `/dashboard/timeline`: HTTP 302 do `/auth/signin` bez sesji.
- Wszystkie 14 zbudowanych plików JS/CSS: HTTP 200; łącznie 19 kontroli HTTP.
- Odpowiedzi stron nie zawierają zdarzeń diagnostycznych.
- Strumień `wrangler tail` ograniczony nagłówkiem `x-release-check` i nowym
  identyfikatorem wersji odebrał pięć żądań stron. Wszystkie miały outcome `ok`,
  oczekiwane statusy i zero wyjątków/logów aplikacyjnych. Normalny brak sesji
  nie wygenerował `application_failure`.
- Dowody lokalne, poza repo: `/private/tmp/medlab-release-http-20261126.json`
  oraz `/private/tmp/medlab-release-tail-20261126.log`. Surowych logów żądań
  nie dodano do Git.
- Nie wywoływano awarii, nie zmieniano bazy ani sekretów. Nie było potrzeby
  rollbacku. Identyfikator rollbacku oznacza wersję zaobserwowaną podczas
  preflight; końcowa lista zawierała także pośrednią wersję
  `644d432a-bc91-4796-b3a7-f929d8c6b54d`, której ta sesja nie publikowała.

Potwierdzono dostęp do produkcyjnego strumienia logów. Dostarczenie samego
`application_failure` przy rzeczywistej awarii, trwałe przechowywanie,
retencja/sampling, zgłoszenia i alerty pozostają nieweryfikowane.
Ręczna akceptacja logowania, profilu/osi czasu i wylogowania na nowej wersji
produkcyjnej pozostaje do wykonania przez użytkownika.
