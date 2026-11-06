# silo-mobile

Aplikacja mobilna [Silopost](https://github.com/silopost/silo) – self-hosted klienta poczty
IMAP/SMTP w stylu Gmaila. Wzorem wyglądu i zachowania jest aplikacja Gmail na Androida
(Material 3).

## Cel i status

silo-mobile ma **parytet funkcji pocztowych z [silo-web](https://github.com/silopost/silo-web)
0.3.0** (Fazy 3 i 4 planu) i z aplikacją Gmail na telefon: szuflada z etykietami, wiele kont,
lista wątków ze swipe i zaznaczaniem, akcje z „Cofnij”, widok wątku, compose z załącznikami i
obrazami w treści, undo send, wyszukiwanie z podpowiedziami, snooze, zaplanowana wysyłka,
ustawienia, filtry, zarządzanie etykietami, miniatury załączników, zdarzenia na żywo. Odstępstwa
są zebrane w [„Odstępstwa od parytetu”](#odstępstwa-od-parytetu), braki – w
[„Poza zakresem”](#poza-zakresem).

Wymagany serwer [silo-server](https://github.com/silopost/silo-server):

| Serwer          | Co działa                                                                                                                                                                                                                             |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0.3.0 (minimum) | logowanie bearer, lista, wątek, akcje i „Cofnij”, compose i undo send, załączniki, konta, sesje, zdarzenia; ustawienia tylko na urządzeniu; wyszukiwanie tylko tekstu (bez podpowiedzi, historii i chipów)                            |
| ≥ 0.4.0         | do tego wyszukiwanie z operatorami i podpowiedziami, snooze, zaplanowana wysyłka, ustawienia synchronizowane (`/settings`), filtry, zarządzanie etykietami (kolory, rodzic, `showInList`, `keywordState`), miniatury, obrazy w treści |

`GET /meta` nie ma flag funkcji, więc o dostępności decyduje `src/lib/features.ts`
(`hasServerFeature`, `useServerFeature`): porównuje `Meta.serverVersion` z wersją, od której
funkcja istnieje (`search`, `snooze`, `schedule`, `settings`, `filters`, `labels`, `thumbnails`,
`inlineImages` – wszystkie 0.4.0). Porównanie po MAJOR.MINOR.PATCH, pre-release liczy się jak
wydanie, wersja nieparsowalna (`dev`, pusta, commit) jest najnowsza, a dopóki `/meta` nie jest
znane – żadna funkcja 0.4.0 nie jest dostępna. Funkcje niedostępne na serwerze nie są pokazywane.

Kontrakt: schemat wygenerowany z OpenAPI silo-server `v0.4.0` (`silo.serverRef` w
`package.json`). Wersja aplikacji: `0.1.0` (jeszcze niewydana).

## Architektura

### Cienki klient (plan 2.6)

Cała logika domenowa żyje w silo-server; aplikacja renderuje stan, cache'uje go i robi
optimistic update. Nie podejmuje decyzji, których silo-web nie mógłby powtórzyć: okno „Cofnij”
to `undoUntil` serwera (żadnego lokalnego timera ani odwrotnego modify), autosave draftów to
`PUT /drafts/{id}` z `version`, zapytanie wyszukiwania idzie jako `q` tak, jak je wpisano (parser,
podpowiedzi i historia są serwera), presety snooze są serwera, wybudzanie i wysyłka zaplanowana
dzieją się na serwerze, filtry dopasowuje i stosuje serwer. Lokalnie zostaje tylko prezentacja,
gesty, preferencje urządzenia i bufor edytowanego draftu w pamięci.

Warstwy (zależności tylko w dół):

| Warstwa                       | Katalog                                                                                            | Rola                                                                                                                                                               |
| ----------------------------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| trasy                         | `app/`                                                                                             | expo-router (pliki = URL-e jak w silo-web, plan 6.2); cienkie, renderują ekrany                                                                                    |
| ekrany                        | `src/screens/`                                                                                     | ekran = jedna trasa (lista etykiety, wątek, compose, wyszukiwanie, ustawienia)                                                                                     |
| funkcje                       | `src/features/`                                                                                    | komponenty i hooki per obszar: `nav`, `topbar`, `accounts`, `shell`, `threadlist`, `thread`, `compose`, `labels`, `snooze`, `search`, `settings`, `sync`, `toasts` |
| zapytania, mutacje, zdarzenia | `src/api/queries`, `src/api/mutations`, `src/api/events.ts`, `src/api/sse.ts`, `src/api/drafts.ts` | TanStack Query (`keys.ts`), optimistic update i cofanie, strumień zdarzeń i ich mapowanie na cache, uploady                                                        |
| klient API                    | `src/api/client.ts`, `auth.ts`, `errors.ts`, `schema.d.ts`                                         | `openapi-fetch` z typami z OpenAPI, nagłówki, 401 → wylogowanie, `ApiError` nad RFC 9457                                                                           |
| stan i biblioteki             | `src/state/`, `src/lib/`                                                                           | zustand (auth, preferencje, zaznaczenie, toasty, połączenie, compose), czyste funkcje (formatowanie, adresy, HTML, motyw)                                          |

### Stan: co lokalne, a co serwerowe

| Dane                                                                                                                           | Gdzie                                                     | Uwagi                                                                                                       |
| ------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| wątki, etykiety, drafty, konta, sesje, ustawienia, filtry, `sync-status`, `/meta`                                              | serwer; w aplikacji cache TanStack Query                  | aktualizowany zdarzeniami; `/meta` i HTML wiadomości `staleTime: Infinity`                                  |
| token bearer, adres serwera, id instalacji                                                                                     | `expo-secure-store` (Android Keystore / iOS Keychain)     | token także w pamięci (zustand `src/state/auth.ts`); nigdy w URL-u ani w cache zapytań                      |
| preferencje urządzenia: motyw, akcje swipe, gęstość (0.3.0), potwierdzenia, oznacz jako przeczytane po otwarciu, obrazy zdalne | AsyncStorage przez `persist` zustanda (`src/state/ui.ts`) | nie są tajne i nie zmieniają zachowania serwera – decydują tylko o wyglądzie i o tym, jakie żądanie pójdzie |
| gęstość, czas cofania wysyłki, podpis, strefa czasowa, aktywne konto (0.4.0)                                                   | serwer (`GET/PATCH /settings`)                            | `density` kopiowana do preferencji urządzenia jako wartość pierwszej klatki i serwera 0.3.0                 |
| edytowany draft                                                                                                                | pamięć (`DraftSession`)                                   | brak lokalnego magazynu draftów; zapis na serwer po 2 s bezczynności, przy blur, zamknięciu i wyjściu w tło |
| zaznaczenie, toasty, stan połączenia, zdalne wersje draftów                                                                    | zustand w pamięci                                         | `selection.ts`, `toasts.ts`, `connection.ts`, `compose.ts`                                                  |

### Uwierzytelnienie i nagłówki

- Logowanie (`src/api/auth.ts`): `POST /session` z
  `client: {kind: "bearer", name: <nazwa urządzenia>}` (ADR 0007; nazwa z `expo-device`, do 100
  znaków). Token z odpowiedzi trafia do secure store; ciało sesji służy jako `GET /session` w
  cache (bez tokenu).
- Każde żądanie (`src/api/client.ts`) niesie `Authorization: Bearer <token>` i
  `X-Silo-Client: silo-mobile/<wersja>#<id instalacji>`: serwer zwraca tę wartość jako `origin`
  zdarzeń, po którym aplikacja rozpoznaje własne zmiany. `fetch` jest rozwiązywany przy każdym
  wywołaniu (msw w testach).
- 401 (poza nieudanym `POST /session`) oznacza koniec sesji: aplikacja czyści token i cache i
  pokazuje logowanie; spóźnione odpowiedzi na żądania ze starym tokenem są ignorowane.
- Wylogowanie: `DELETE /session`, a przy błędzie innym niż 401 (np. offline) i tak lokalnie
  (sesję można potem unieważnić z innego urządzenia). „Wyloguj wszędzie”: `DELETE /sessions/{id}`
  dla każdej innej sesji z `GET /sessions` (404 = już wygasła), potem `DELETE /session`; gdy
  którejś nie udało się unieważnić, urządzenie zostaje zalogowane i pokazuje błąd.
- Błędy: `ApiError` (`src/api/errors.ts`) ze `status`, `code` (stabilne pole do rozgałęzień),
  `retryAfter` (sekundy z `Retry-After` na 429/503) i całym `Problem` (`limit`, `current`,
  `address`/`field`). Komunikaty po polsku według `code` plus `detail` serwera; pola żądania (hasło)
  nigdy nie trafiają do snackbara ani logu.

### Zdarzenia: SSE, polling, AppState (plan 3.14, 5.4)

- **Strumień** (`src/api/sse.ts`): `GET /api/v1/events` przez `fetch` z przyrostowym parserem
  `text/event-stream`. React Native nie ma `EventSource`; globalny `fetch` Expo SDK 58 to
  `expo/fetch`, którego `Response.body` jest `ReadableStream` zasilanym na bieżąco (OkHttp na
  Androidzie, URLSession na iOS). Każda próba wysyła `Authorization`, `X-Silo-Client` i przy
  wznowieniu `Last-Event-ID` jako nagłówek; token nigdy w URL-u. Strumień cichy przez 60 s
  (serwer pinguje co 25 s) uznaje się za martwy i otwiera ponownie.
- **Reconnect i fallback** (`connectEvents` w `src/api/events.ts`, nastawy w `eventsConfig`):
  ponowienie po 1 s, 2 s, … (do 30 s); po 3 porażkach z rzędu polling
  `GET /events/poll?after=<lastId>` co **15 s** (silo-web: 5 s; telefon oszczędza baterię) i co
  5 min próba powrotu do SSE. Pierwszy poll bez pozycji pomija zaległości i odświeża wszystko. Po
  nieudanym strumieniu sonda `GET /meta`: gdy Silo nie odpowiada, stan `offline`. 401 ze strumienia
  nie zapętla się – kończy sesję jak REST.
- **Mapowanie** (`applyEvent`, port z silo-web): `thread.updated` łata wiersze i otwarty wątek
  (listy odświeżane, gdy wątek jest nowy lub przeniesiony; `snoozedUntil` też), `label.counts`
  zapisuje liczniki w `/labels`, `operation.failed` cofa zmianę przez `handleOperationFailed`
  (migawka z `recentOps` w pamięci, komunikat według `kind`), `draft.updated` zapisuje zdalną
  wersję dla compose (`src/state/compose.ts`), `outbound.status: failed` pokazuje „Nie udało się
  wysłać · Otwórz” (`/compose?draftId=`), `settings.updated` z obcym `origin` odświeża
  `GET /settings`, `filter.applied` pokazuje wynik i odświeża listy i etykiety, zdarzenia kont
  odświeżają `sync-status` i sesję, `resync` odświeża wszystko, `message.new` tylko listy (bez
  lokalnego powiadomienia). Własne `thread.updated` (`origin` = własny `X-Silo-Client`) są
  ignorowane, dopóki trwa operacja na wątkach (`isThreadOpRunning`).
- **Cykl życia** (`src/features/sync/useEvents.ts`, montowany raz w `app/(app)/_layout.tsx`):
  strumień jest otwarty tylko po zalogowaniu i na pierwszym planie. `background`/`inactive`
  zamykają strumień lub polling; powrót łączy ponownie z `Last-Event-ID` i unieważnia listy,
  etykiety i `sync-status` (odpowiednik `refetchOnWindowFocus`). Powrót sieci (NetInfo) łączy od
  razu. Wylogowanie rozłącza i zapomina ostatnie id. Główny layout zasila `focusManager` z
  `AppState` i `onlineManager` z NetInfo.
- **Stan połączenia** (`src/state/connection.ts`: `connecting | live | polling | offline`): przy
  `offline` lista pokazuje „Brak połączenia z Silo. Ponawiam…”, przy pollingu nic.
- Po ponad 24 h bez strumienia (retencja `events`) serwer odpowiada `resync` i aplikacja odświeża
  wszystkie zapytania; zastąpi to endpoint delta `GET /changes` (Faza 5).

### Treść wiadomości: WebView i obrazy

- `messageHtmlQuery` pobiera `GET /messages/{id}/html` jako tekst (`staleTime: Infinity`; 503
  ponawiane po `Retry-After` do 6 razy; w międzyczasie „Pobieranie treści…”, potem „Treść
  niedostępna · Spróbuj ponownie”).
- `prepareHtml` (`src/lib/messageHtml.ts`) owija treść w dokument z własnym CSP
  (`default-src 'none'`; obrazy tylko `data:`/`blob:` do „Pokaż obrazy”, które dla tej wiadomości
  dodaje `https:`/`http:`; preferencja „Obrazy: Zawsze” pomija pytanie) i viewportem szerokości
  urządzenia (szeroka poczta przewija się w bok w karcie). CSP z nagłówka serwera nie działa, bo
  HTML ładowany jest jako napis. Skrypty usuwa serwer i ponownie `prepareHtml`.
- Obrazy `cid:` są podmieniane na data URI pobrane klientem API z nagłówkiem bearer
  (`fetchInlineImages`, do 5 MB na wiadomość; większe zostają zepsute).
- `react-native-webview`: JavaScript włączony tylko dla wstrzykniętego skryptu wysokości
  (`injectedJavaScript` → `onMessage`; CSP zostawia dla niego `script-src 'unsafe-inline'`); każda
  nawigacja odrzucana – linki http(s) w Custom Tab (`expo-web-browser`), `mailto:`/`tel:` przez
  `expo-linking`, inne schematy ignorowane; bez dostępu do plików, DOM storage, cookies i cache.
  Strona jest biała także w trybie ciemnym.

### Załączniki i uploady

- **Pobieranie** (`AttachmentChips.tsx`): `expo-file-system/legacy` `createDownloadResumable` z
  nagłówkami `Authorization` i `X-Silo-Client` do `cacheDirectory`, pasek postępu w chipie, potem
  arkusz udostępniania (`expo-sharing`); 503 → „Załącznik jeszcze niepobrany, spróbuj za chwilę”.
- **Miniatury** (0.4.0): `GET /attachments/{id}/thumbnail?size=s|m` przez React Native `Image` z
  `source.headers` (bez nowego modułu natywnego; `expo-image` niepotrzebne); 415/błąd → ikona typu.
  Natywny cache obrazów może trzymać miniatury po wylogowaniu (Android nie ma publicznego API do
  jego czyszczenia). Obraz otwiera podgląd pełnoekranowy (`GET /attachments/{id}?inline=1`) z
  „Udostępnij lub zapisz”.
- **Upload** (`uploadFile` w `src/api/drafts.ts`): `multipart/form-data` (`file` jako
  `{uri, name, type}`) na `<serwer>/api/v1/uploads` przez `XMLHttpRequest` (dla
  `upload.onprogress`), z `Authorization` i `X-Silo-Client`; najwyżej 3 naraz (`queueUpload`);
  „x” na kafelku przerywa (`AbortSignal`). Plik większy niż `Meta.maxAttachmentBytes` jest
  odrzucany przed wysłaniem; pliki bez rozmiaru (pickery Androida) polegają na 413
  `upload_too_large` z `limit`. Obraz w treści: `inline=true` (pole wysyłane jako pierwsze).

### Akcje na wątkach, optimistic update i „Cofnij” (plan 4.4, 5.2, 6.5)

Wiersze, swipe, pasek zaznaczenia i ekran wątku wołają `useThreadActions().run(action, ids, opts)`
(`src/features/threadlist/actions.ts`), zaimplementowane przez `ThreadActionsRoot` wokół szuflady
konta z `runThreadAction` (`src/api/mutations/threads.ts`). Bez wyboru `run('labels')` otwiera
arkusz „Etykiety”, `run('moveTo')` – „Przenieś do”, `run('deleteForever')` – potwierdzenie („Tej
operacji nie można cofnąć”); `opts.after` jest wołane po lokalnym zastosowaniu (wyjście do listy),
`opts.onUndo` po „Cofnij” (ponowne otwarcie wątku).

| Akcja                                        | Żądanie                                                                                          |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| archiwizuj                                   | `POST /threads/modify` `-INBOX` (widok folderu: `-<folder>`; widok etykiety: `-INBOX -<label>`)  |
| usuń; „Kosz” w „Przenieś do”                 | `POST /threads/trash`                                                                            |
| przywróć z kosza                             | `POST /threads/untrash`                                                                          |
| usuń na zawsze (po potwierdzeniu)            | `POST /threads/delete` (bez cofania)                                                             |
| zgłoś spam / to nie spam                     | modify `+SPAM` / `-SPAM`                                                                         |
| przeczytane / nieprzeczytane                 | modify `-UNREAD` / `+UNREAD`                                                                     |
| gwiazdka / bez gwiazdki (bez snackbara)      | modify `+STARRED` / `-STARRED`                                                                   |
| etykiety (arkusz, po „OK”)                   | jedno modify z dodanymi i usuniętymi etykietami                                                  |
| przenieś do Odebranych / Spamu / folderu     | modify `+<cel>` (serwer zdejmuje starą lokalizację)                                              |
| przenieś do etykiety użytkownika             | modify `+<label> -INBOX` (jak Gmail)                                                             |
| przenieś do Archiwum                         | jak archiwizuj                                                                                   |
| odłóż / anuluj odłożenie (0.4.0)             | `POST /threads/{id}/snooze {until}` / `DELETE /threads/{id}/snooze` – po jednym żądaniu na wątek |
| gwiazdka wiadomości, „nieprzeczytane od tej” | `POST /messages/modify` (`src/api/mutations/messages.ts`, bez cofania)                           |
| Cofnij                                       | `POST /operations/{id}/undo` (przy snooze – dla każdego wątku)                                   |

Każda akcja robi migawkę list, etykiet i otwartych wątków z cache, stosuje zmianę lokalnie
(wiersz znika z listy, do której już nie należy, liczniki etykiet podążają – jak w silo-web),
wysyła żądanie i nadpisuje cache wątkami z odpowiedzi. Snackbar nazywa wynik z „Cofnij” do
`undoUntil` (4 s, gdy `undoUntil` jest null, a jest `operationId`); „Cofnij” od razu przywraca
migawkę i woła endpoint undo, którego odpowiedź jest scalana (409 → „Tej operacji nie można już
cofnąć.”). Przy błędzie migawka wraca z „Nie udało się. Spróbuj ponownie.”; gdy żadna operacja nie
trwa, listy i etykiety są odświeżane. Operacje na tych samych wątkach są serializowane (`scope`
mutacji). Opcjonalne potwierdzenia (preferencje) pytają przed `trash`/`archive` z wiersza, paska i
wątku.

### Compose i drafty

- **Otwarcie**: FAB → `/compose?accountId=<konto listy>`; ekran raz wysyła
  `POST /drafts {accountId}` i wpisuje id w trasę (`router.setParams`). Odpowiedź, odpowiedź
  wszystkim, przekazanie (`openReply` → `POST /drafts {replyToMessageId, mode}`, jeden draft na
  podwójne stuknięcie) i anulowana wysyłka zasilają sesję draftem z odpowiedzi (bez GET); draft z
  Wersji roboczych lub toastu „Nie udało się wysłać · Otwórz” – `GET /drafts/{id}`.
  `Draft.warnings` (np. przy przekazaniu z załącznikami oryginału, które kopiuje serwer) – snackbar.
- **Sesja draftu** (`src/features/compose/session.ts`, port `DraftSession` z silo-web, klasa poza
  Reactem czytana przez `useSyncExternalStore`): formularz, `version`/`syncedVersion`, `dirty`,
  stan zapisu, `conflict` + `conflictCurrent`, `serverChanged`, `invalid`, uploady. Zmiany tylko w
  pamięci. `PUT /drafts/{id}` z edytowaną `version` po 2 s bezczynności
  (`composeConfig.autosaveMs`), gdy pole odbiorców lub temat traci fokus, oraz z `syncNow: true`
  przy usunięciu ekranu (zdarzenie `removed` nawigacji) i przejściu aplikacji w tło. Zamknięcie
  nowego, nieedytowanego draftu go usuwa (jak Gmail i silo-web); w przeciwnym razie ostatni zapis i
  „Zapisano wersję roboczą”.
- **Konflikty**: 409 `draft_version_conflict` zachowuje lokalne zmiany i pokazuje „Wersja robocza
  zmieniona w innym miejscu · Wczytaj / Nadpisz” (Wczytaj bierze `Problem.current`, Nadpisz
  zapisuje z jego wersją); ten sam pasek po `draft.updated` nowszej wersji z innego klienta
  (`useCompose.remoteVersions`; Wczytaj pobiera draft). `Draft.serverChanged` → „Zmieniono w innym
  programie · Wczytaj”. Nieudana wysyłka (`Draft.lastSend` lub `outbound.status failed` →
  `useCompose.setFailure` i unieważnienie draftu) → czerwone „Nie udało się wysłać: <błąd>” z
  odrzuconymi odbiorcami.
- **Treść**: `@10play/tentap-editor` (TipTap w WebView, `src/features/compose/Editor.tsx`) z
  zestawem startowym i placeholderem; każda zmiana oddaje `bodyHtml` i `bodyJson` (TipTap JSON,
  format silo-web). Cytat odpowiedzi serwera jest częścią treści. Edytor rośnie w ScrollView
  ekranu (`dynamicHeight`, `useScrollToCaret`); pasek (B, I, U, listy, link, cytat) nad klawiaturą
  (`EditorKeyboardAvoidingView`).
- **Obrazy w treści** (0.4.0): `ImageBridge` TenTap (`editor.setImage`) pokazuje data URI
  odczytany z urządzenia (`expo-file-system`); `src/lib/inlineImages.ts` zamienia go na `cid:` w
  `bodyHtml` i na formę silo-web (`/api/v1/attachments/{u_…}?inline=1` + `cid`) w `bodyJson`.
  Wczytane drafty pobierają swoje obrazy z nagłówkiem bearer i pokazują je, o ile użytkownik nie
  zaczął już pisać.
- **Wysyłka i cofanie** (plan 3.9): „Wyślij” → ostatni PUT → `POST /drafts/{id}/send {}` →
  compose się zamyka, lista pokazuje „Wysłano · Cofnij” do `undoUntil` (tylko czas snackbara).
  „Cofnij” → `POST /outbound/{id}/cancel` → compose otwiera się z odesłanym `Draft`; 409 → „Za
  późno, wiadomość została wysłana”. Odmowy zostawiają compose otwarte: 422 `no_recipients`,
  `invalid_address` (czerwony chip), 413 `message_too_large` (z `limit`), 502
  `upstream_smtp_error` (z `detail`), 409 `send_in_progress`. Listy konta są unieważniane po
  zapisie, wysyłce i anulowaniu.
- **Snackbar**: jeden magazyn toastów; lista renderuje snackbar tylko gdy jest na wierzchu, compose
  ma własny nad paskiem narzędzi, więc „Wysłano · Cofnij” pojawia się na liście.

### Stack

- [Expo](https://expo.dev) SDK 58 (React Native 0.88, React 19.3, nowa architektura, React
  Compiler), TypeScript `strict`
- [expo-router](https://docs.expo.dev/router/introduction/) (trasy w `app/`, `Drawer` na
  `react-native-drawer-layout`, `react-native-gesture-handler` 3, `react-native-reanimated` 4)
- [openapi-fetch](https://openapi-ts.dev/openapi-fetch/) z typami z
  [openapi-typescript](https://openapi-ts.dev/) (`src/api/schema.d.ts`)
- [TanStack Query](https://tanstack.com/query), [zustand](https://zustand.docs.pmnd.rs)
  (+ AsyncStorage), `expo-secure-store`, `@react-native-community/netinfo`
- [react-native-paper](https://callstack.github.io/react-native-paper/) 5 (Material 3),
  [FlashList](https://shopify.github.io/flash-list/) 2, `date-fns` (locale `pl`), `expo-haptics`
- `react-native-webview`, `@10play/tentap-editor`, `@react-native-community/datetimepicker`,
  `expo-document-picker`, `expo-image-picker`, `expo-file-system`, `expo-sharing`,
  `expo-web-browser`, `expo-linking`
- Testy: `jest-expo`, `@testing-library/react-native` 14, [msw](https://mswjs.io) 3

Uzasadnienia wyborów: [docs/NOTES-FOR-SILO.md](docs/NOTES-FOR-SILO.md#decyzje-stacku).

## Mapowanie aplikacja Gmail → ekrany → endpointy

Trasy odpowiadają URL-om silo-web (plan 6.2); `<n>` to `Account.position`. Ścieżki API względem
`/api/v1`; „0.4.0” – tylko na serwerze ≥ 0.4.0.

| Aplikacja Gmail             | silo-mobile (trasa, ekran)                                                                                                             | Endpointy                                                                                                                         |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| logowanie                   | `/login`: adres instancji, adres skrzynki, hasło; „Silo · serwer <wersja>”                                                             | `GET /meta`, `POST /session {client: bearer}`                                                                                     |
| start (Odebrane)            | `/` → `/u/<n>/inbox` konta `settings.activeAccountId`, inaczej pierwszego; bez kont – „Dodaj konto”                                    | `GET /session`                                                                                                                    |
| szuflada                    | widoki systemowe, „Etykiety”, foldery serwera, „Utwórz nową”, „Ustawienia”                                                             | `GET /labels?accountId=`, `POST /labels`                                                                                          |
| pasek wyszukiwania          | menu, „Szukaj w poczcie” (→ wyszukiwanie), awatar konta                                                                                | –                                                                                                                                 |
| przełącznik kont            | dialog z awatara: konta z licznikami Odebranych, „Zarządzaj kontami”, „Dodaj konto”, wyloguj                                           | `GET /labels` per konto (gdy dialog otwarty), `PATCH /settings {activeAccountId}` (0.4.0)                                         |
| FAB „Utwórz”                | `/compose?accountId=…` → `?draftId=d_…`                                                                                                | `POST /drafts {accountId}`                                                                                                        |
| lista wątków                | `/u/<n>/<label>` (slug systemowy `inbox`, `starred`, … lub `l_<id>`); przewijanie nieskończone, pull-to-refresh, banery synchronizacji | `GET /threads?accountId=&labelId=&cursor=` (50), `GET /accounts/{id}/sync-status`, `POST /accounts/{id}/resync`                   |
| swipe                       | archiwizuj / usuń / odłóż wg preferencji                                                                                               | jak akcje (wyżej)                                                                                                                 |
| zaznaczanie wielu           | długie przytrzymanie lub awatar → pasek zaznaczenia i menu ⋮; arkusze „Etykiety”, „Przenieś do”                                        | `POST /threads/modify\|trash\|untrash\|delete`, `POST /labels`                                                                    |
| wątek                       | `/u/<n>/<label>/<threadId>`: karty wiadomości, treść w WebView, załączniki, odpowiedź, strzałki nowszy/starszy                         | `GET /threads/{id}`, `GET /messages/{id}/html`, `GET /attachments/{id}[?inline=1]`, `/thumbnail` (0.4.0), `POST /messages/modify` |
| odpowiedz / przekaż         | pasek odpowiedzi i menu wiadomości → compose                                                                                           | `POST /drafts {replyToMessageId, mode}`                                                                                           |
| compose                     | `/compose?draftId=d_…` (pełny ekran): Od, Do/DW/UDW, Temat, treść, załączniki, ⋮                                                       | `GET/PUT/DELETE /drafts/{id}`, `GET /contacts/autocomplete?q=`, `POST /uploads`                                                   |
| wyślij, cofnij wysyłkę      | „Wysłano · Cofnij” do `undoUntil`                                                                                                      | `POST /drafts/{id}/send {}`, `POST /outbound/{id}/cancel`                                                                         |
| cofnij akcję                | snackbar „Cofnij” do `undoUntil`                                                                                                       | `POST /operations/{id}/undo`                                                                                                      |
| odłóż (0.4.0)               | arkusz „Odłóż do…”: presety serwera, „Wybierz datę i godzinę”; ze swipe, paska zaznaczenia, menu wątku                                 | `GET /snooze/presets`, `POST`/`DELETE /threads/{id}/snooze`                                                                       |
| Odłożone                    | wiersze „Odłożono do <czas>”, „Anuluj odłożenie”                                                                                       | `DELETE /threads/{id}/snooze`                                                                                                     |
| zaplanuj wysyłkę (0.4.0)    | compose ⋮ → arkusz z propozycjami i „Wybierz datę i godzinę”                                                                           | `POST /drafts/{id}/send {sendAt}`                                                                                                 |
| Zaplanowane                 | wiersze z zegarem „Zaplanowano: <czas>”; w wątku „Anuluj wysyłkę” → draft w compose                                                    | `POST /outbound/{outboundId}/cancel`                                                                                              |
| Wersje robocze              | wiersz otwiera `/compose?draftId=d_…`                                                                                                  | `GET /drafts/{id}`                                                                                                                |
| wyszukiwanie                | `/u/<n>/search?q=`; wynik `/u/<n>/search/<threadId>?q=`; historia, podpowiedzi, chipy filtrów (0.4.0)                                  | `GET /threads?q=`, `GET /search/suggest?q=&accountId=`, `DELETE /search/history[?query=]` (0.4.0)                                 |
| ustawienia                  | `/settings`: Ustawienia ogólne, konta, Dodaj konto, O aplikacji                                                                        | `GET /session`                                                                                                                    |
| – ustawienia ogólne         | `/settings/general`: sekcja urządzenia + „Konto Silo (synchronizowane)” (0.4.0)                                                        | `GET /settings`, `PATCH /settings` (0.4.0)                                                                                        |
| – konto                     | `/settings/account/<id>`: nazwa, synchronizacja, serwer, hasło, foldery (odczyt), „Filtry”, „Etykiety”, usuń                           | `GET /accounts/{id}/sync-status`, `PATCH`/`DELETE /accounts/{id}`, `POST /accounts/{id}/resync`                                   |
| – dodaj konto               | `/settings/add-account`: jeden formularz, „Sprawdź połączenie”, „Dodaj”                                                                | `POST /accounts/test`, `POST /accounts`                                                                                           |
| – filtry (0.4.0)            | `/settings/filters?accountId=`, edytor `/settings/filter`                                                                              | `GET/POST /filters`, `PUT`/`DELETE /filters/{id}`, `POST /filters/{id}/apply`                                                     |
| – etykiety (0.4.0)          | `/settings/labels?accountId=`: drzewo, edycja, usuwanie                                                                                | `GET /labels`, `POST /labels`, `PATCH`/`DELETE /labels/{id}`                                                                      |
| – urządzenia (konto Google) | `/settings/sessions`: unieważnij, „Wyloguj się”, „Wyloguj wszędzie”                                                                    | `GET /sessions`, `DELETE /sessions/{id}`, `DELETE /session`                                                                       |
| – informacje                | `/settings/about`: wersja aplikacji, `silo.serverRef`, adres i `/meta` serwera, link do źródeł AGPL-3.0, sesje, wyloguj                | `GET /meta`                                                                                                                       |
| (na żywo)                   | odświeżanie list, liczników, wątku, compose bez przeładowania                                                                          | `GET /events` (SSE), `GET /events/poll`                                                                                           |

### Szczegóły ekranów

**Szuflada** (`src/features/nav`): otwierana swipe od lewej krawędzi lub przyciskiem menu.
Logotyp, widoki systemowe w kolejności Gmaila (`src/lib/labels.ts`, port `SYSTEM_VIEWS` silo-web)
z licznikami (nieprzeczytane: Odebrane, Spam; wszystkie: Zaplanowane, Wersje robocze; `99+`
powyżej 99), „Etykiety” z etykietami użytkownika (kropka koloru, licznik nieprzeczytanych, dzieci
wcięte), foldery serwera, „Utwórz nową” (dialog nazwy, na 0.4.0 także kolor i rodzic), „Ustawienia”,
„Pomoc i opinie” (wyłączone). Aktywna pozycja na pigułce MD3 (`secondaryContainer`, zaokrąglony
prawy koniec), ogłaszana jako zaznaczona.

**Pasek wyszukiwania i konta** (`src/features/topbar`, `src/features/accounts`): pływające
zaokrąglone pole (`surfaceContainerHigh`); awatar = inicjał na kolorze z hasha adresu. Poza
Odebranymi tytuł sekcji nazywa etykietę nad listą. Dialog kont: bieżące konto, pozostałe wg
`position` z licznikami nieprzeczytanych w Odebranych (jedno `GET /labels` na konto, tylko przy
otwartym dialogu, cache 30 s); wybór otwiera `/u/<position>/inbox`.

**FAB** (`src/features/shell`): Paper `AnimatedFAB` „Utwórz” z ołówkiem, zwijany do ołówka przy
przewijaniu w dół i rozwijany przy przewijaniu w górę lub na górze (próg 8 dp).

**Lista** (`src/features/threadlist/ThreadList.tsx`): infinite query na FlashList (kursor keyset,
50 na stronę, `src/api/queries/threads.ts`), następna strona przy końcu ze spinnerem pod ostatnim
wierszem; pull-to-refresh odświeża listę i liczniki etykiet. Puste widoki jak w Gmailu („Brak
wiadomości w Odebranych”, „Brak spamu”, „Kosz jest pusty”, inaczej „Nic tu nie ma”) z dużą ikoną;
widok błędu ze „Spróbuj ponownie”; spinner przy pierwszym ładowaniu.

**Wiersz** (`ThreadRow.tsx`): awatar ostatniego uczestnika, który nie jest użytkownikiem (konta,
gdy wątek ma tylko własne wiadomości), nadawcy (jedno pełne imię, inaczej do trzech krótkich, „ja”
dla użytkownika) z liczbą wiadomości, data („09:12” dziś, „4 lis” w tym roku, „04.11.2025”
wcześniej), temat (lub „(bez tematu)”), fragment (ukryty w gęstości kompaktowej), chipy etykiet
użytkownika w ich kolorach (bez etykiety otwartego widoku), gwiazdka, spinacz, zegar dla
Zaplanowanych („Zaplanowano: <czas>”), „Odłożono do <czas>”, zegar oczekiwania po 3 s `pendingSync`.
Nieprzeczytane pogrubione na czystej powierzchni, przeczytane na przyciemnionej. Wysokość: 72 dp
(domyślna), 64 dp (`comfortable`, 0.4.0), 56 dp (kompaktowa). TalkBack czyta jedną etykietę na
wiersz („Nieprzeczytane, Jan Kowalski, Oferta na Q4, 09:12, załącznik”).

**Swipe** (`SwipeableRow.tsx`, własny pan gesture-handler 3 + reanimated 4): wiersz podąża za
palcem nad zielonym (archiwizuj) lub czerwonym (usuń) tłem; puszczony za 40 % szerokości wysuwa
się i wykonuje akcję tej strony (`swipeLeftAction`/`swipeRightAction`: Archiwizuj/Usuń/Odłóż/Brak),
z haptycznym tyknięciem na progu. Aktywacja po 16 dp w poziomie, porażka po 12 dp w pionie
(przewijanie listy); pan zaczęty w 32 dp lewej krawędzi otwiera szufladę. Bez swipe w Koszu, Spamie
i podczas zaznaczania.

**Zaznaczanie** (`SelectionBar.tsx`, `src/state/selection.ts`): długie przytrzymanie lub stuknięcie
awatara zaznacza (awatar zmienia się w ptaszka), kolejne stuknięcia przełączają wiersze; pasek
wyszukiwania ustępuje paskowi zaznaczenia: zamknij i liczba, archiwizuj, usuń, odłóż (0.4.0),
przeczytane/nieprzeczytane („nieprzeczytane”, gdy wszystkie są przeczytane); w Koszu „usuń na
zawsze”, w Spamie „To nie spam” i „usuń na zawsze”. Menu ⋮: „Przenieś do”, „Etykiety”, gwiazdka /
bez gwiazdki (gdy wszystkie mają), „Zgłoś spam” (nie w Spamie i Koszu), „Przywróć z kosza” (Kosz),
„Anuluj odłożenie” (Odłożone), „Zaznacz wszystko” (wczytane wiersze). Wstecz kończy zaznaczanie.

**Arkusze** (`src/features/labels`, `src/components/BottomSheet.tsx` na Paper `Modal`): „Etykiety” –
etykiety użytkownika jako pola wyboru (wszystkie / część / żaden z wątków), „Nowa etykieta”
(`POST /labels`, od razu zaznaczona), zmiany jednym modify po „OK”. „Przenieś do” – Odebrane, Spam,
Kosz, Archiwum, foldery serwera, etykiety użytkownika; bieżące miejsce wyszarzone.

**Banery** (`src/features/sync/Banners.tsx`): nad listą, z `GET /accounts/{id}/sync-status`
(odpytywane co 15 s, gdy konto nie jest `live`, a zdarzenia są w pollingu lub offline): odrzucone
hasło skrzynki („Zaktualizuj hasło” → ustawienia), nieosiągalny serwer poczty z liczbą oczekujących
zmian i „Ponów teraz” (`POST /accounts/{id}/resync`), postęp synchronizacji początkowej.

**Snackbar** (`src/state/toasts.ts`, `src/features/toasts/Snackbar.tsx`): jeden naraz nad FAB, nowy
zastępuje pokazany; na ekranach ustawień własny `SettingsSnackbar` (snackbar powłoki nie jest tam
zamontowany).

**Wątek** (`src/screens/ThreadScreen.tsx`): `threadQuery` z wierszem listy z cache jako
`placeholderData` (temat i chipy od razu); 404 → „Nie znaleziono wątku”. Nagłówek: temat, chip
lokalizacji (Odebrane, Spam, Kosz, folder), chipy etykiet, znacznik ważności, gwiazdka wątku. Pasek:
wstecz i logika paska zaznaczenia (`primaryActions`) dla miejsca wątku – archiwizuj (lub „Przenieś
do Odebranych” poza Odebranymi), usuń; w Koszu usuń na zawsze; w Spamie „To nie spam” i usuń na
zawsze – oznacz jako nieprzeczytane, ⋮ (Przenieś do, Etykiety, gwiazdka, Zgłoś spam / To nie
spam, Przywróć z kosza, Odłóż i Anuluj odłożenie – 0.4.0). Akcje opuszczające wątek: archiwizuj, do
Odebranych, kosz, przywróć, spam, nie spam, usuń na zawsze, przenieś, nieprzeczytane. Po
wczytaniu (nie placeholdera) nieprzeczytany wątek jest raz oznaczany jako przeczytany
(`run('read', …, {silent: true})`), chyba że preferencja to wyłącza.

**Karty wiadomości** (`src/features/thread/MessageCard.tsx`): nieprzeczytane i ostatnia rozwinięte,
reszta zwinięta; 3+ zwinięte po pierwszej składają się w okrągły licznik. Zwinięta: awatar, nadawca,
fragment, data, gwiazdka. Rozwinięta: nadawca, data (stuknięcie: pełna), „do mnie ▾” z Od/Do/DW/Data,
gwiazdka, odpowiedz, ⋮ (Odpowiedz, Odpowiedz wszystkim, Przekaż dalej, Oznacz jako nieprzeczytane
od tej wiadomości – wraca do listy), treść, załączniki; `PendingIcon`; „Wysyłanie…” dla `SCHEDULED`
(bez odpowiedzi). Draft to wiersz „Wersja robocza” → compose. Gwiazdka wiadomości i „nieprzeczytane
od tej” – optimistic na otwartym wątku (wątek ma gwiazdkę/nieprzeczytane, gdy ma je którakolwiek
wiadomość). Pasek odpowiedzi: Odpowiedz / Odpowiedz wszystkim / Przekaż dalej dla ostatniej
wiadomości niebędącej draftem ani zaplanowaną (`replyTarget`); pod nim strzałki nowszy/starszy z
listy w cache (`neighbourInList`), zastępujące trasę, więc wstecz wraca do listy. W trybie
wyszukiwania wątek działa jak w „Wszystkie”, a ↑/↓ przechodzą po wynikach. Zaplanowana wiadomość:
„Zaplanowano na <czas>” z „Anuluj wysyłkę” (409 `send_in_progress`).

**Compose** (`src/screens/ComposeScreen.tsx`, `fullScreenModal` bez nagłówka stosu): wstecz
(„Zapisz i zamknij”), spinacz (arkusz „Załącz plik” – `expo-document-picker`, wiele plików; „Wstaw z
galerii” – systemowy picker zdjęć `expo-image-picker`; „Wstaw obraz w treści” – 0.4.0), wyślij
(aktywne przy ≥ 1 odbiorcy), ⋮ („Zapisz wersję roboczą”, „Zaplanuj wysyłkę” – 0.4.0, „Odrzuć” –
dialog, `DELETE /drafts/{id}`, „Odrzucono wersję roboczą”). Pola: Od (konto draftu, tylko
odczyt), Do z chipami, „∨” dla DW i UDW, Temat, treść, kafelki załączników z postępem (413 → kafelek
podaje `limit` serwera; usunięcie odpina załącznik przez `attachmentIds`). `RecipientInput`: Enter,
przecinek, średnik, spacja po `…@…` lub opuszczenie pola tworzą chipy (awatar z inicjałem);
wklejona lista dzielona przez `src/lib/addresses.ts` (port z silo-web); podpowiedzi z
`GET /contacts/autocomplete?q=` (150 ms debounce, `staleTime` 60 s) z awatarem, nazwą i adresem;
chip znika przez „x” lub długie przytrzymanie. Chip jest czerwony tylko dla adresu odrzuconego
przez serwer (`Problem.address/field` z 400/422 lub `lastSend.failedRecipients`) – aplikacja
sprawdza tylko „≥ 1 odbiorca”.

**Wyszukiwanie** (`/u/<n>/search`, osobny stos: wynik wraca do wyników i pozwala po nich
przechodzić): pole w górnym pasku (autofocus, „x”, wstecz). Na 0.4.0: „Ostatnie wyszukiwania” z „x”
i „Wyczyść wszystko” (puste `q` → serwer zwraca 5 ostatnich; brak lokalnej historii); podpowiedzi
w trakcie pisania (150 ms debounce, ikony wg `kind`: zegar, kontakt, etykieta, kod; stuknięcie
wstawia `text` serwera); chipy filtrów Etykiety, Od, Do, Data (arkusze), Załącznik,
Nieprzeczytane, Oznaczone gwiazdką (przełączniki) – każdy dodaje lub usuwa tekst
(`src/lib/searchText.ts`) i szuka ponownie. Wyniki: lista wątków `{q}` ze swipe i zaznaczaniem,
„Około N wyników”, notki dla `approximate` i `indexing.done < 1`, 422 → „Nieprawidłowe zapytanie”;
⋮ „Utwórz filtr z tego wyszukiwania” (edytor z `criteria = q`). Na 0.3.0 pole szuka samego tekstu.

**Odłóż i zaplanuj** (0.4.0): arkusz „Odłóż do…” (`src/features/snooze/SnoozeSheet.tsx`) – presety
serwera po polsku wg `key`, czas w strefie z odpowiedzi; „Wybierz datę i godzinę” – dialog daty,
potem godziny (`DateTimePickerAndroid.open`, `src/lib/pickDateTime.ts`, jak w Gmailu). Snackbar
„Odłożono do <czas> · Cofnij” do `undoUntil`; N wątków = N żądań, jedno „Cofnij” cofa N operacji;
422 `invalid_snooze` i 409 `not_in_inbox` objaśnione; „Anuluj odłożenie” bez cofania (409
`not_snoozed`). „Zaplanuj wysyłkę”: Jutro rano 8:00, Jutro po południu 13:00, Poniedziałek rano 8:00
(zegar urządzenia, tylko propozycje) i „Wybierz datę i godzinę”; snackbar „Zaplanowano na <czas> ·
Cofnij” najwyżej 10 s (wiadomość można anulować z Zaplanowanych).

**Ustawienia ogólne** (`/settings/general`). Sekcja urządzenia (`useUi`, AsyncStorage): Motyw
(Systemowy/Jasny/Ciemny), Gęstość listy (Domyślna/Kompaktowa; na 0.4.0 z serwera), Działania przy
przesuwaniu (W prawo / W lewo, podgląd koloru i ikony), Potwierdzaj przed usunięciem /
archiwizacją, oznaczanie wątku jako przeczytanego po otwarciu, Obrazy (Pytaj/Zawsze),
Powiadomienia (nieaktywne – serwer nie ma jeszcze urządzeń push). Na 0.4.0 sekcja „Konto Silo
(synchronizowane)”: Gęstość (Domyślna/Wygodna/Kompaktowa), Czas na cofnięcie wysyłki (5/10/20/30
s), Podpis (dialog tekstu wielowierszowego), Strefa czasowa (lista IANA z
`Intl.supportedValuesOf("timeZone")` z wyszukiwaniem i najwyżej 40 wierszami, „Ustaw strefę
urządzenia”; bez `Intl` – pole tekstowe), powiadomienia na pulpicie jako pozycja nieaktywna. Jedno
pole na `PATCH`, optimistic `setQueryData`; 422 `invalid_setting`/`invalid_timezone` → snackbar i
poprzednia wartość. Gęstość: na 0.4.0 źródłem jest serwer – `useDensity()` bierze
`Settings.density` i kopiuje do `useUi.density`; wartość urządzenia nie jest wysyłana na serwer
(inne urządzenie mogło ją ustawić), więc kto miał „Kompaktowa” tylko lokalnie, po aktualizacji
serwera widzi wartość serwera. Podpis: serwer przechowuje oczyszczony HTML, telefon edytuje go jako
linie tekstu (`src/lib/signature.ts`: `<br>`/końce bloków ↔ nowe linie, escapowanie przy zapisie).

**Konto** (`/settings/account/<id>`): Nazwa (`PATCH {displayName}`), Synchronizacja (stan: live ·
czas, postęp synchronizacji początkowej, host w backoffie, `auth_failed`, wyłączone; liczniki
oczekujących i nieudanych operacji; „Synchronizuj teraz” = `incremental`, „Pełne porównanie” =
`full`), serwer (chipy capabilities, ostrzeżenie o keywordach, foldery tylko do odczytu, IMAP/SMTP
host:port (TLS), login, przełącznik `sentAppend`, „Zmień hasło” = `PATCH {password}`), „Filtry” i
„Etykiety” (0.4.0; filtry należą do konta – `Filter.accountId`), „Usuń konto z Silo” (`DELETE`; gdy
było aktywne lub ostatnie → `/`, który otwiera następne konto albo proponuje „Dodaj konto”;
użytkownik zostaje zalogowany, bo sesja Silo nie jest związana ze skrzynką).

**Dodaj konto** (`/settings/add-account`): adres, hasło, nazwa, zaawansowane (login; serwery tylko
przy `Meta.allowCustomServers`), „Sprawdź połączenie” (`POST /accounts/test`), „Dodaj” (`POST
/accounts`, 422 z krokami). Błędy żądań konta: polskie zdanie dla `code` i `detail` serwera
(limit, odrzucony host, odpowiedź serwera poczty).

**Filtry** (0.4.0, port `FiltersPanel`/`FilterEditor` silo-web): lista – nazwa/kryteria, akcje jako
chipy, przełącznik (PUT całego filtra, `filterBody()`), ↑/↓ (PUT z nowym `position`), FAB „Utwórz
filtr”. Edytor: nazwa, kryteria jako tekst z chipami wyszukiwania (Od, Do, Temat, Etykiety,
Załącznik), „Testuj wyszukiwanie”, pięć przełączników akcji, arkusz „Nadaj etykietę”, „Przekaż do”,
„Zastosuj też do istniejących wiadomości”, usuwanie z dialogiem. 422 `invalid_query` pod kryteriami,
`invalid_label` pod etykietami, `invalid_filter` pod formularzem; „Stosowanie filtra… (ok. N
wątków)” z `matchedEstimate`, „Filtr zastosowano do N wątków” po `filter.applied`.

**Etykiety** (0.4.0, port `LabelsPanel`): drzewo etykiet użytkownika z kropką koloru, licznikami,
ostrzeżeniami `keywordState` (`local_only`, `partial` z nazwami folderów), przełącznik „Pokaż w
menu nawigacji” (`show`/`hide`; `show_if_unread` z silo-web pokazany jako włączony z „Gdy są
nieprzeczytane”). Dialog edycji: nazwa, paleta 20 kolorów Gmaila (`src/lib/labelColors.ts`), „Umieść
pod etykietą” (bez własnego poddrzewa); wysyłane tylko zmienione pola; usuwanie z dialogiem.

**Motyw** (`src/lib/theme.ts`): jasna i ciemna paleta MD3 dostrojona do aplikacji Gmail (primary =
niebieski Google, tło listy białe lub `#131314`, jasnoniebieska pigułka i FAB, czerwień Gmaila
`#C5221F`/`#F28B82` jako `brand` logotypu i akcentów, nie `primary`); kolory swipe stałe (zielony,
czerwony) w obu trybach; schemat systemowy, o ile nie wybrano inaczej.

## Uruchomienie

Wymagania: Node ≥ 22 (`.nvmrc`: 22; sprawdzone też na Node 24), działający silo-server (stos dev –
repozytorium `silo`) osiągalny z telefonu.

```sh
npm ci
npx expo start          # serwer deweloperski Expo; kod QR skanuje się w Expo Go
npm run android         # to samo i otwarcie na podłączonym urządzeniu lub emulatorze
```

- **Expo Go (Android)**: zainstaluj Expo Go na telefonie i zeskanuj kod QR z `npx expo start`. Nie
  potrzeba Android SDK. Wszystkie moduły natywne aplikacji są w Expo Go – także WebView
  (`react-native-webview`), edytor TenTap (jego opcjonalny moduł `TenTapKeyboard` służy tylko
  własnym klawiaturom) i datetimepicker.
- **Adres instancji** na ekranie logowania: w emulatorze Androida `http://10.0.2.2:8090` (host
  maszyny), na telefonie adres LAN komputera, np. `http://192.168.1.10:8090` (`localhost` na
  telefonie to sam telefon); produkcyjnie `https://mail.example.com`. Następnie adres skrzynki i
  hasło.
- **Cleartext HTTP** działa tylko w trybie deweloperskim (Expo Go i debug build dopuszczają ruch
  bez TLS); build release Androida domyślnie go blokuje – instancja produkcyjna musi mieć HTTPS.
- **Development build / emulator**: `npx expo run:android` wymaga Android SDK (Android Studio,
  `adb`, AVD); generuje `android/` (continuous native generation, niecommitowane) i instaluje build
  debug. APK release (np. dla F-Droid) buduje się tak samo z wygenerowanego projektu
  (`npx expo prebuild`, potem Gradle); projektu EAS nie ma.
- **Weryfikacja bez urządzenia.** Na maszynie deweloperskiej nie było Android SDK ani urządzenia,
  więc aplikacja **nie była uruchamiana na urządzeniu ani emulatorze**. Dowodem działania są
  `npm run typecheck`, `npm run lint`, `npm test`, `npm run export:android` (bundel JavaScript
  Androida w `dist/`, ten sam krok co w buildzie release) oraz smoke-test warstwy API na żywym
  serwerze (niżej). Gesty, klawiatura w edytorze, WebView i pickery wymagają sprawdzenia na
  urządzeniu.

## Skrypty

| Skrypt                            | Co robi                                                        |
| --------------------------------- | -------------------------------------------------------------- |
| `npm start` / `npm run android`   | serwer deweloperski Expo (Android: także otwiera aplikację)    |
| `npm run typecheck`               | `tsc --noEmit`                                                 |
| `npm run lint`                    | ESLint 9 (`eslint-config-expo`, flat config)                   |
| `npm run format` / `format:check` | Prettier                                                       |
| `npm test`                        | Jest (preset `jest-expo` dla Androida)                         |
| `npm run gen:api`                 | regeneracja `src/api/schema.d.ts` (niżej)                      |
| `npm run export:android`          | `expo export --platform android` do `dist/`                    |
| `npm run smoke:api`               | smoke-test tylko-odczyt na żywym API (`scripts/smoke-api.mjs`) |

## Kontrakt API

`src/api/schema.d.ts` jest generowany z `api/openapi.yaml` silo-server i commitowany. Wydanie
serwera, z którym budowana jest aplikacja, deklaruje `package.json`: `"silo": {"serverRef": ...}`
(teraz `v0.4.0`).

```sh
npm run gen:api                          # openapi.yaml z silo.serverRef (v0.4.0) z GitHuba
npm run gen:api -- --server-ref v0.3.0   # inny ref gita
npm run gen:api -- --local [ścieżka]     # plik lokalny (domyślnie ../silo-server/api/openapi.yaml)
```

Job CI `api-contract` pobiera silo-server na `silo.serverRef`, regeneruje schemat i failuje, gdy
różni się od zacommitowanego; przechodzi, gdy repozytorium silo-server z tagiem `v0.4.0` jest
publiczne na GitHubie. Zacommitowany schemat to kontrakt 0.4.0 (`../silo-server/api/openapi.yaml`
na tagu `v0.4.0`). Job `check` uruchamia `typecheck`, `lint`, `format:check`, `test` i
`export:android` (`CI=1`).

## Testy

Testy rozmawiają z API przez [msw](https://mswjs.io) (`setupServer` z `msw/node`,
`src/test/server.ts`). Dostosowania pod `jest-expo`:

- `jest.environment.js` (środowisko Androida jest-expo) zapisuje WHATWG `fetch`, `Request`,
  `Response`, `Headers` i `FormData` Node, a `jest.polyfills.js` przywraca je po setupie jest-expo,
  który instaluje natywny „winter” fetch Expo – jego `Response` nie przenosi ciała zbudowanego w
  JavaScripcie, więc odpowiedzi msw byłyby puste. Klient API rozwiązuje `globalThis.fetch` przy
  każdym wywołaniu. (Pakiet `undici` nie działa jako zamiennik: jego ciała wiszą na polyfillu
  web-streams jest-expo.)
- `jest.config.js` każe Babelowi transformować msw i jego zależności ES-module-only (pliki `.mjs`
  i kilka pakietów) jak pakiety React Native.
- Testy tras renderują prawdziwe drzewo `app/` przez `renderRouter` expo-router
  (`src/test/router.tsx`). `renderRouter` włącza fake timers, pod którymi msw nie odpowiada;
  `fakeTimers.doNotFake` zostawia fałszywy tylko zegar.
- `react-native-reanimated/mock` ładuje prawdziwą bibliotekę, której natywny inicjalizator rzuca
  pod presetem Androida (reanimated 4.7: JSReanimated nie ma `setCSSEventHandler`); ścieżka jest
  mapowana na minimalny zamiennik `src/test/reanimated-mock.js` (to, czego używa szuflada).
- Atrapy: `@10play/tentap-editor` – fałszywy mostek trzymający treść jako HTML (`typeInEditor` w
  `src/test/editor.ts` wywołuje `onChange`); uploady – fałszywy `XMLHttpRequest` (`src/test/xhr.ts`
  przez `uploadConfig.createXhr`); `react-native-webview` – View zachowujący propsy (testy czytają
  `source.html` i wołają `onMessage`); `expo-file-system/legacy`, `expo-sharing`,
  `expo-web-browser`, `expo-linking` – mockowane per plik. `expo-secure-store` i `expo-device` –
  fałszywki w pamięci w `jest.setup.ts`, podobnie AsyncStorage, NetInfo, gesture-handler, worklets
  i wcięcia safe-area (mocki bibliotek). `jest.setup.ts` zastępuje też `fetchEventSource` źródłem,
  które się nie otwiera, więc testy ekranów nie robią żądań SSE; `src/api/sse.test.ts` testuje
  prawdziwy czytnik na strumieniu msw, a testy `connectEvents`/`useEvents` wstrzykują atrapę przez
  `eventsConfig.createEventSource` (krótkie interwały zamiast fake timers).
- Lista działa na prawdziwym FlashList z `@shopify/flash-list/jestSetup` (stały viewport 400 × 900);
  testy sięgają `onEndReached` i `RefreshControl` przez propsy scroll view. Pan swipe nie jest
  sterowany w jest (gesture-handler nie uruchamia natywnych panów); mapowanie preferencji na akcje
  (`swipeActionFor`) ma testy jednostkowe, gest i zwijanie FAB – do sprawdzenia na urządzeniu.

### Smoke-test na żywym API

`npm run smoke:api` (`scripts/smoke-api.mjs`, czysty `fetch` Node) sprawdza warstwę klienta na
działającym serwerze bez urządzenia: sesja bearer jak w aplikacji, `X-Silo-Client:
silo-mobile/<wersja>#smoke`, odczyty ekranu startowego, wątku, jego HTML (bez `<script`) i
zdarzeń, a na serwerze ≥ 0.4.0 (lub `dev`) także wyszukiwania, presetów snooze, ustawień i filtrów.
**Tylko odczyt** – jedyne zmiany to utworzenie i usunięcie własnej sesji. Parametry z env:
`SILO_URL`, `SILO_EMAIL`, `SILO_PASSWORD`, `SILO_DEVICE` (nazwa sesji, domyślnie `smoke`). Wypisuje
krok → status → ms i same liczności (bez treści poczty i haseł); kod wyjścia 1 przy błędzie.

```sh
SILO_URL=http://localhost:8090 SILO_EMAIL=dev3@silo.test SILO_PASSWORD=devpass3 npm run smoke:api
```

**Smoke-test na dev compose 2026-11-06** (silo-server `dev`, konto `dev3@silo.test`): wszystkie
kroki OK.

| Krok                                            | Status | ms   | Wynik                      |
| ----------------------------------------------- | ------ | ---- | -------------------------- |
| `GET /meta`                                     | 200    | 78   | `serverVersion` dev, API 1 |
| `POST /session` (`client.kind: bearer`)         | 200    | 1014 | token bearer               |
| `GET /session`                                  | 200    | 7    | 1 konto                    |
| `GET /accounts`                                 | 200    | 4    | 1 konto                    |
| `GET /labels?accountId=`                        | 200    | 46   | 11 etykiet                 |
| `GET /threads?accountId=&labelId=INBOX&limit=5` | 200    | 15   | 5 wątków, ~5000 w widoku   |
| `GET /threads/{id}`                             | 200    | 12   | 1 wiadomość                |
| `GET /messages/{id}/html`                       | 200    | 8    | 146 znaków, bez `<script`  |
| `GET /events/poll?after=0&limit=1`              | 200    | 9    | 1 zdarzenie                |
| `GET /search/suggest?q=te&accountId=`           | 200    | 9    | 0 podpowiedzi              |
| `GET /snooze/presets`                           | 200    | 3    | 3 presety, strefa UTC      |
| `GET /settings`                                 | 200    | 3    | gęstość `default`          |
| `GET /filters?accountId=`                       | 200    | 4    | 0 filtrów                  |
| `DELETE /session`                               | 204    | 10   | sesja usunięta             |

Czas `POST /session` obejmuje logowanie IMAP na serwerze poczty. Smoke-test nie sprawdza mutacji,
SSE (`/events`) ani renderowania – to robią testy jednostkowe i ekranów.

### Znane problemy testów

- Pojedynczy plik uruchomiony w jednym procesie (`npx jest <plik>`) przechodzi, ale jest nie kończy
  się (otwarty uchwyt); dodaj `--forceExit`. `npm test` uruchamia pliki w workerach i kończy się.
- `console.warn` Paper „Tried to use the icon '…' … none of the required icon libraries are
  installed” jest oczekiwane: pod jest-expo Paper nie wykrywa `@expo/vector-icons` (w aplikacji
  ikony działają); nie oznacza błędu testu.
- Pod dużym obciążeniem maszyny pojedyncze testy z `waitFor` potrafią przekroczyć limit czasu
  (flaky); ponowne uruchomienie przechodzi.

## Odstępstwa od parytetu

Względem aplikacji Gmail i silo-web 0.3.0. Przyczyny po stronie kontraktu:
[docs/NOTES-FOR-SILO.md](docs/NOTES-FOR-SILO.md#luki-kontraktu-odkryte-przez-mobile).

Lista i akcje:

- Brak menu długiego przytrzymania wiersza (w aplikacji Gmail go nie ma; przytrzymanie zaznacza);
  odłożenie jest dostępne ze swipe, paska zaznaczenia i menu wątku.
- Brak swipe w Koszu i Spamie (preferencje znają tylko archiwizuj/usuń/odłóż); w zamian pasek
  zaznaczenia z „usuń na zawsze”, „To nie spam” i (menu) przywróć.
- Arkusze „Etykiety” i „Przenieś do” nie dają się przeciągać (Paper `Modal`: scrim, wstecz i
  przyciski je zamykają).
- Etykieta utworzona w arkuszu jest zaznaczana, a nie od razu nadawana (silo-web nadaje ją od
  razu); całość idzie jednym żądaniem po „OK”, jak w arkuszu Gmaila.
- Przeczytane/nieprzeczytane pokazuje snackbar z „Cofnij” (jak silo-web; Gmail oznacza po cichu).
- „Zaznacz wszystko” zaznacza wczytane wiersze, nie wszystkie wątki etykiety.
- Kolory swipe stałe (zielony, czerwony), nie z ról motywu.
- Brak miniatur w wierszach listy (w żadnym kliencie; wiersz nie ma listy załączników); awatary to
  inicjały, nie zdjęcia kontaktów.

Wątek:

- Strzałki nowszy/starszy na dole wątku zamiast opcjonalnego swipe między wątkami (poziomy pan
  walczyłby z przewijaniem szerokiej poczty w bok).
- Treść wiadomości zostaje biała w trybie ciemnym (Gmail przyciemnia).
- Załączniki otwierane przez arkusz udostępniania, nie przeglądarkę Gmaila.
- Brak „Drukuj” i „Pokaż oryginał”.
- „Oznacz jako nieprzeczytane od tej wiadomości” wraca do listy bez „Cofnij” (zmiany per
  wiadomość nie mają snackbara cofania).

Compose:

- Od tylko do odczytu (konto draftu ustalone przy `POST /drafts`).
- Brak „Cofnij” po „Odrzuć” – dialog potwierdzenia.
- Brak „Poufnie”.
- Podpis nie jest wstawiany do nowych draftów (serwer tego nie robi, silo-web robi to w kliencie);
  podpis edytowany jako tekst – zapis z telefonu traci formatowanie z silo-web.
- Pasek formatowania stale nad klawiaturą (Gmail – tylko przy zaznaczeniu tekstu).
- Cytat odpowiedzi jest częścią treści edytora (jak silo-web), nie zwiniętym „…” Gmaila.
- Podpowiedzi kontaktów tylko z adresów znanych serwerowi, nie z kontaktów telefonu.
- Presety zaplanowanej wysyłki liczone na urządzeniu (Gmail ma je od Google).
- Brak przechodzenia fokusu między polami (typ ref `TextInput` Paper 5 nie pasuje do React
  Native 0.88).

Wyszukiwanie:

- Chip „Data” oferuje zakresy względne i po/przed dniem zamiast dialogu zakresu dat Gmaila.
- Chipy „Od”/„Do” przyjmują wpisany tekst, bez podpowiedzi kontaktów.

Ustawienia:

- Jeden formularz „Dodaj konto” zamiast kreatora Gmaila (bez listy dostawców – Silo to tylko
  IMAP/SMTP).
- Brak powiadomień per konto, autorespondera i przełącznika „Synchronizuj Gmaila”; podpis tylko
  globalny (0.4.0); „Pełne porównanie” i lista folderów są specyficzne dla Silo; sesje zastępują
  listę urządzeń Google.
- Brak ustawienia skrótów klawiszowych (`keyboardShortcutsEnabled`; nie dotyczy telefonu) i
  przełącznika `conversationView` (aplikacja zawsze pokazuje wątki).
- Edytor filtra bez formularza „pól zaawansowanych” silo-web (`AdvancedFieldsForm`); kryteria to
  jedno pole tekstowe z chipami dodającymi `from:`, `to:`, `subject:`, `label:`, `has:attachment`;
  „Nie zawiera” i rozmiar wpisuje się ręcznie.
- Brak przeciągania filtrów (tylko ↑/↓, jak w silo-web).
- Gęstość „Wygodna” tylko na 0.4.0 (na 0.3.0 dwie gęstości, jak Gmail na Androidzie).
- Ekran etykiet zarządza tylko etykietami użytkownika; foldery serwera (tworzenie, usuwanie, role,
  `syncMode`) nie są zarządzane z telefonu.
- Nieudane operacje tylko jako licznik (brak listy w API); `rebuild` nieoferowany (501).
- Powiadomienia nieaktywne (brak push).

Platforma:

- Picker daty i godziny tylko na Androidzie (`DateTimePickerAndroid`); iOS wymaga komponentu
  inline.
- iOS niesprawdzony (ani build, ani urządzenie); Android sprawdzony tylko testami i bundlem, nie na
  urządzeniu.

## Poza zakresem

- **Push**: punkt zaczepienia – po zalogowaniu rejestracja urządzenia dla bieżącej sesji bearer
  `POST /devices` (plan 5.1, Faza 6: `push_devices`, job `push.notify`), wyrejestrowanie przy
  wylogowaniu; „Powiadomienia” stanie się aktywną pozycją. Lokalne powiadomienia dla `message.new`
  (punkt zaczepienia w `applyEvent`) – też dopiero z push.
- **Offline cache i `/changes`** (Faza 5): dziś cache żyje tylko w pamięci, a po > 24 h offline
  serwer odpowiada `resync`; docelowo `expo-sqlite` dla cache TanStack Query i delta
  `GET /changes?cursor=`.
- **Dystrybucja**: podpisany APK/AAB, sklepy, F-Droid – do ustalenia.
- Zarządzanie folderami serwera (role, `syncMode`), wstawianie podpisu do nowych draftów.
- Czat, Meet, Spaces i wszystko niezwiązane z pocztą (jak całe Silo).

## Licencja

[AGPL-3.0-only](LICENSE)
