# silo-mobile

Mobile app of [Silopost](https://github.com/silopost/silo), a self-hosted IMAP/SMTP mail client in
the style of Gmail. It is a thin client of the same `/api/v1` as
[silo-web](https://github.com/silopost/silo-web): all domain logic lives in
[silo-server](https://github.com/silopost/silo-server); the app renders state, caches it and does
optimistic updates (plan 2.6). It signs in with an opaque bearer token (ADR 0007) kept in the
Android Keystore / iOS Keychain through `expo-secure-store`. The target look is the Gmail app for
Android (Material 3).

Status: slice 9b – the rest of phase 4 (settings synchronised through the server, filters,
label management, attachment thumbnails, inline pictures in compose; needs silo-server ≥ 0.4.0,
see "Faza 4" below). Slice 9a: search with suggestions and filter chips, snooze, scheduled send.
Slice 8: settings. Slice 7:
compose. Slice 6: the thread screen (message cards, HTML in a WebView, attachments, reply →
draft). Slice 5: server events (SSE over fetch with a polling fallback, AppState lifecycle,
offline banner). Slice 4: thread actions with optimistic update and "Cofnij" (swipes, star,
selection bar, "Etykiety" and "Przenieś do" sheets, creating labels). Slice 3: the Gmail thread list (rows,
swipe, multi-select, pull-to-refresh, sync banners); slice 2: the Gmail shell (routes, drawer,
search bar, account switcher, compose FAB, theme); slice 1: API client and bearer sign-in.

## Stack

- [Expo](https://expo.dev) SDK 58 (React Native 0.88, new architecture), TypeScript `strict`
- [expo-router](https://docs.expo.dev/router/introduction/) (file-based routes in `app/`)
- [openapi-fetch](https://openapi-ts.dev/openapi-fetch/) with types generated from silo-server's
  OpenAPI contract by [openapi-typescript](https://openapi-ts.dev/) (`src/api/schema.d.ts`)
- [FlashList](https://shopify.github.io/flash-list/) 2 for the thread list, `date-fns` (`pl`
  locale) for list dates, `expo-haptics` for the swipe threshold tick
- [TanStack Query](https://tanstack.com/query) for server state, [zustand](https://zustand.docs.pmnd.rs)
  for the auth state and the device preferences (persisted to AsyncStorage)
- `@react-native-community/netinfo` for TanStack Query's `onlineManager` and reconnecting the
  event stream when the network comes back
- expo-router's `Drawer` (its bundled react-navigation drawer on `react-native-drawer-layout`,
  `react-native-gesture-handler`, `react-native-reanimated`)
- [react-native-paper](https://callstack.github.io/react-native-paper/) 5 (Material 3)
- Tests: `jest-expo`, `@testing-library/react-native`, [msw](https://mswjs.io)

## Mapowanie Gmail → ekrany

Routes mirror silo-web's URLs (plan 6.2); `<n>` is `Account.position`.

| Gmail app             | silo-mobile                                                                 |
| --------------------- | --------------------------------------------------------------------------- |
| start (Inbox)         | `/` → `/u/<n>/inbox` of `settings.activeAccountId`, else the first          |
| label list            | `/u/<n>/<label>`: system slug (`inbox`, `starred`, …) or `l_<id>`           |
| draft (Drafts view)   | `/compose?draftId=d_…`                                                      |
| thread                | `/u/<n>/<label>/<threadId>`                                                 |
| search                | `/u/<n>/search?q=`, a thread found: `/u/<n>/search/<threadId>?q=`           |
| compose (full screen) | `/compose?accountId=…` (creates the draft) → `?draftId=d_…`                 |
| settings              | `/settings` → `general`, `account/<id>`, `add-account`, `about`, `sessions` |

- **Drawer** (`src/features/nav`): opened by a swipe from the left edge or the menu button.
  Logotype, system views in Gmail's order (`src/lib/labels.ts`, a port of silo-web's
  `SYSTEM_VIEWS`) with counters from `GET /labels` (unread: Inbox, Spam; total: Scheduled,
  Drafts; `99+` above 99), "Etykiety" with the user's labels (colour dot, unread counter),
  server folders, "Utwórz nową" (a name-only dialog, `POST /labels`), "Ustawienia", "Pomoc i opinie" (disabled). The active
  entry sits on an MD3 pill (`secondaryContainer`, rounded right end) and is announced as
  selected.
- **Search bar** (`src/features/topbar`): floating rounded field (`surfaceContainerHigh`) with the
  menu button, "Szukaj w poczcie" (opens search) and the account avatar (initial on a colour
  hashed from the address). Outside the Inbox a section title names the label above the list.
- **Accounts** (`src/features/accounts`): the avatar opens the account dialog – current account,
  "Zarządzaj kontami" (settings), the other accounts by position with unread Inbox counters (one
  `GET /labels` each, fetched only while the dialog is open), "Dodaj konto" (`/settings/add-account`), sign-out.
  Choosing an account opens `/u/<position>/inbox`.
- **FAB** (`src/features/shell`): extended "Utwórz" with a pencil, bottom right, opens
  `/compose`; folded to the pencil while the list scrolls down, extended again on scrolling up
  or at the top, as in Gmail.
- **Thread list** (`src/features/threadlist/ThreadList.tsx`): `GET /threads` of the label as an
  infinite query (keyset cursor, 50 per page, `src/api/queries/threads.ts`) on FlashList; the
  next page loads near the end with a spinner below the last row. Pull-to-refresh refetches the
  list and the label counters. Empty views as in Gmail ("Brak wiadomości w Odebranych", "Brak
  spamu", "Kosz jest pusty", otherwise "Nic tu nie ma") with a large icon; an error view with
  "Spróbuj ponownie"; a spinner on the first load.
- **Row** (`ThreadRow.tsx`): avatar of the last participant who is not the user (the account's
  for a thread of one's own messages), senders (one full name, else up to three short names,
  "ja" for the user) with the message count, date ("09:12" today, "4 lis" this year,
  "04.11.2025" before), subject (or "(bez tematu)"), snippet (hidden in the compact density),
  user label chips in their colours (not the chip of the open label), star toggle, paperclip,
  clock for Scheduled, and the pending clock after 3 s of `pendingSync`. Unread rows are bold
  on the plain surface, read rows on the tinted one. TalkBack reads one label per row
  ("Nieprzeczytane, Jan Kowalski, Oferta na Q4, 09:12, załącznik").
- **Swipe** (`SwipeableRow.tsx`): a row follows the finger over a green archive or red delete
  background; released past 40 % of its width it slides out and runs the action of that side
  (device preferences `swipeLeftAction`/`swipeRightAction`, `src/state/ui.ts`), with a haptic
  tick at the threshold. No swipes in Trash and Spam, nor while selecting. A pan starting in
  the 32 dp left edge opens the drawer instead.
- **Multi-select** (`SelectionBar.tsx`, `src/state/selection.ts`): a long press or a tap on the
  avatar selects (the avatar turns into a check mark), further taps toggle rows; the search
  bar gives way to the selection bar – close and count, archive, delete, mark read/unread
  (restore and delete forever in Trash and Spam), and ⋮ with "Przenieś do", "Etykiety",
  "Oznacz gwiazdką", "Zgłoś spam", "Zaznacz wszystko". Back ends the selection.
- **Banners** (`src/features/sync/Banners.tsx`): above the list, from
  `GET /accounts/{id}/sync-status` (polled every 15 s while the account is not live): a
  rejected mailbox password ("Zaktualizuj hasło" opens settings), an unreachable mail server
  with the pending changes and "Ponów teraz" (`POST /accounts/{id}/resync`), and the progress
  of the initial sync.
- **Actions** (`src/features/threadlist/actions.ts`): rows, swipes and the selection bar call
  `useThreadActions().run(action, ids, opts)`, implemented by `ThreadActionsRoot` around the
  account's drawer with `runThreadAction` (`src/api/mutations/threads.ts`, see below). Without a
  choice, `run('labels')` opens the "Etykiety" sheet, `run('moveTo')` the "Przenieś do" sheet and
  `run('deleteForever')` a confirmation ("Tej operacji nie można cofnąć"), so the thread screen
  of a later slice gets the same flows.
- **Selection bar**: archive, delete, read/unread (unread once every selected thread is read);
  in Trash delete forever (restore in the menu), in Spam "To nie spam" and delete forever.
  Menu ⋮: "Przenieś do", "Etykiety", star/unstar (unstar once all are starred), "Zgłoś spam"
  (not in Spam/Trash), "Przywróć z kosza" (Trash), "Zaznacz wszystko" (loaded rows).
- **Sheets** (`src/features/labels`): MD3 modal bottom sheets on Paper's `Modal`
  (`src/components/BottomSheet.tsx`, no drag-to-dismiss). "Etykiety": user labels as checkboxes
  (all / some / none of the threads), "Nowa etykieta" (`POST /labels`, checked at once), changes
  sent as one modify after "OK". "Przenieś do": Odebrane, Spam, Kosz, Archiwum, server folders,
  user labels; the current place greyed out.
- **Snackbar** (`src/state/toasts.ts`, `src/features/toasts/Snackbar.tsx`): one at a time above
  the FAB, a newer one replaces the shown one; an undoable action shows "Cofnij" until the
  server's `undoUntil`.

### Actions → endpoints (plan 4.4, 5.2, 6.5)

| Action                              | Request                                                                                        |
| ----------------------------------- | ---------------------------------------------------------------------------------------------- |
| archive                             | `POST /threads/modify` `-INBOX` (folder view: `-<folder>`; user label view: `-INBOX -<label>`) |
| delete; "Kosz" in "Przenieś do"     | `POST /threads/trash`                                                                          |
| restore from Trash                  | `POST /threads/untrash`                                                                        |
| delete forever (after confirmation) | `POST /threads/delete` (no undo)                                                               |
| report spam / not spam              | modify `+SPAM` / `-SPAM`                                                                       |
| read / unread                       | modify `-UNREAD` / `+UNREAD`                                                                   |
| star / unstar (no snackbar)         | modify `+STARRED` / `-STARRED`                                                                 |
| labels (sheet, after OK)            | modify with the added and removed user labels, one request                                     |
| move to Inbox / Spam / folder       | modify `+<target>` (the server leaves the old location)                                        |
| move to a user label                | modify `+<label> -INBOX` (as Gmail)                                                            |
| move to Archiwum                    | as archive                                                                                     |
| Cofnij                              | `POST /operations/{id}/undo`                                                                   |

Each action snapshots the cached lists, labels and open threads, applies the change locally (the
row leaves a list it no longer belongs to, label counters follow, as in silo-web), sends the
request and writes the returned threads over the cache. The snackbar names the result with
"Cofnij" until `undoUntil`; pressing it restores the snapshot at once and calls the undo
endpoint, whose answer is merged (409 `undo_expired` → "Tej operacji nie można już cofnąć.").
No local timer decides about undo and no inverse modify is sent (plan 2.6). On an error the
snapshot comes back with "Nie udało się. Spróbuj ponownie."; once no thread operation is in
flight the lists and labels are refetched. Operations on the same threads are serialised (the
mutation `scope`). `handleOperationFailed` (snapshot from the in-memory `recentOps`, message by
`kind`) and `isThreadOpRunning` wait for the SSE handling of slice 5.

- **Theme** (`src/lib/theme.ts`): MD3 light and dark palettes tuned to the Gmail app (Google blue
  primary, white or `#131314` list background, light-blue pill and FAB, Gmail red for the
  logotype); system colour scheme unless overridden in settings. Device preferences (theme, swipe
  actions, density) live in `src/state/ui.ts` (zustand + AsyncStorage).

## Faza 4 – wymaga serwera ≥ 0.4.0

Search with suggestions, snooze and scheduled send use API 0.4.0 (`silo.serverRef` = `v0.4.0`).
`GET /meta` has no feature flags, so `src/lib/features.ts` (`hasServerFeature`,
`useServerFeature`) compares `Meta.serverVersion` with 0.4.0 (MAJOR.MINOR.PATCH, a pre-release
counts as its release, `dev`/empty = newest, unknown = oldest). Against a 0.3.0 server the search
field searches the text only (no suggestions, history or chips) and snooze and "Zaplanuj wysyłkę"
are not offered. The rule of plan 2.6 holds: the query is sent as `q` as typed and parsed by the
server, suggestions and history are the server's, snooze presets come from the server, send times
are only proposed; no local parser, no local wake or send timer.

| Gmail app                    | silo-mobile                                                                                                                                                         | API                                                                             |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| tap on "Szukaj w poczcie"    | `/u/<n>/search`: field in the top bar (autofocus, "x", back)                                                                                                        |                                                                                 |
| – recent searches            | "Ostatnie wyszukiwania" with "x" and "Wyczyść wszystko"; tapping one searches it                                                                                    | `GET /search/suggest?q=` (empty q: 5 latest), `DELETE /search/history[?query=]` |
| – suggestions while typing   | 150 ms debounce; icons by `kind` (clock, contact, label, code); tapping puts the server's `text` in the field                                                       | `GET /search/suggest?q=&accountId=`                                             |
| – filter chips               | Etykiety, Od, Do, Data (sheets), Załącznik, Nieprzeczytane, Oznaczone gwiazdką (switches); each adds/removes text (`src/lib/searchText.ts`) and searches again      | –                                                                               |
| – results                    | thread list of `{q}` with swipes and selection, "Około N wyników", notes for `approximate` and `indexing.done < 1`, 422 → "Nieprawidłowe zapytanie"                 | `GET /threads?q=`                                                               |
| – a result                   | `/u/<n>/search/<id>?q=` (the thread screen in search mode: acts as in "Wszystkie", ↑/↓ page through the results)                                                    | `GET /threads/{id}`                                                             |
| Odłóż (snooze)               | sheet "Odłóż do…" (`src/features/snooze/SnoozeSheet.tsx`): server presets in Polish by `key`, time in the zone answered; "Wybierz datę i godzinę" (date, then time) | `GET /snooze/presets`, `POST /threads/{id}/snooze {until}` per thread           |
| – from                       | swipe (preference "Odłóż"), clock in the selection bar, thread menu                                                                                                 |                                                                                 |
| – snackbar                   | "Odłożono do <czas> · Cofnij" until `undoUntil`; 422 `invalid_snooze`, 409 `not_in_inbox` explained                                                                 | `POST /operations/{id}/undo` (each thread)                                      |
| Odłożone                     | rows show "Odłożono do <czas>"; "Anuluj odłożenie" in the selection bar and the thread menu (no undo, 409 `not_snoozed`); `thread.updated.snoozedUntil` followed    | `DELETE /threads/{id}/snooze`                                                   |
| Zaplanuj wysyłkę (compose ⋮) | sheet: Jutro rano 8:00, Jutro po południu 13:00, Poniedziałek rano 8:00 (device clock, proposals), "Wybierz datę i godzinę"                                         | `POST /drafts/{id}/send {sendAt}`                                               |
| – snackbar                   | "Zaplanowano na <czas> · Cofnij" (shown at most 10 s; the message stays cancellable)                                                                                | `POST /outbound/{id}/cancel`                                                    |
| Zaplanowane                  | rows with the clock and "Zaplanowano: <czas>"; the thread says "Zaplanowano na <czas>" with "Anuluj wysyłkę" → the draft opens in compose (409 `send_in_progress`)  | `POST /outbound/{outboundId}/cancel`                                            |

Decisions:

- **Route of results:** search is its own stack (`app/(app)/u/[account]/search/`), so a thread
  opened from the results returns to them and pages through them, instead of jumping to the
  `all` label route.
- **History for an empty `q`:** the server answers `GET /search/suggest?q=` with the five most
  recent queries (silo-server `mailview.Suggest`), so no local history is kept.
- **Picker:** `@react-native-community/datetimepicker` (`npx expo install`, in Expo Go), through
  `DateTimePickerAndroid.open` (`src/lib/pickDateTime.ts`): the date dialog, then the time dialog,
  as in Gmail. Android only for now (iOS needs the inline component).
- **Snooze is per thread:** the contract has no batch snooze, so N selected threads are N
  requests and one "Cofnij" undoes N operations (`runThreadAction` with "snooze"/"unsnooze").

Deviations from the Gmail app: no row long-press menu exists in the app, so snooze is offered from
the swipe, the selection bar and the thread menu; the send presets are computed on the device
(Gmail's come from Google); the "Data" chip offers relative ranges and after/before a day instead of
Gmail's date-range dialog; the "Od"/"Do" chips take typed text, without contact suggestions.

## Faza 4 – ustawienia, filtry, etykiety, miniatury (slice 9b)

Also behind `hasServerFeature` (`settings`, `filters`, `labels`, `thumbnails`, `inlineImages`, all
0.4.0): against a 0.3.0 server none of it is shown and the device preferences of slice 8 work as
before. Settings, filter matching and applying, label keywords and thumbnails are the server's
(plan 2.6); the app sends one field per request, updates optimistically and only glues text.

| Gmail app / silo-web                    | silo-mobile                                                                                                                                                                                                                                                          | API                                                                           |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Ustawienia ogólne → synced section      | "Konto Silo (synchronizowane)": Gęstość (Domyślna/Wygodna/Kompaktowa), Czas na cofnięcie wysyłki (5/10/20/30 s), Podpis (multi-line text dialog), Strefa czasowa (IANA list with search, "Ustaw strefę urządzenia"), desktop notifications as an inactive entry      | `GET /settings`, `PATCH /settings` (one field each)                           |
| – errors                                | optimistic `setQueryData`; 422 `invalid_setting`/`invalid_timezone` → snackbar and the previous value back                                                                                                                                                           |                                                                               |
| – other devices                         | `settings.updated` with a foreign `origin` refetches `GET /settings`                                                                                                                                                                                                 | SSE                                                                           |
| account switcher                        | the chosen account is stored as the default account                                                                                                                                                                                                                  | `PATCH /settings {activeAccountId}`                                           |
| Filtry (silo-web `FiltersPanel`)        | `/settings/filters?accountId=` from the account settings: name/criteria, actions as chips, switch (PUT of the whole filter, `filterBody()`), ↑/↓ (PUT with the new `position`), FAB "Utwórz filtr"                                                                   | `GET /filters?accountId=`, `PUT /filters/{id}`                                |
| – editor (`FilterEditor`)               | `/settings/filter`: name, criteria as text with the search chips (Od, Do, Temat, Etykiety, Załącznik; text only), "Testuj wyszukiwanie", five action switches, "Nadaj etykietę" sheet, "Przekaż do", "Zastosuj też do istniejących wiadomości", delete with a dialog | `POST /filters`, `PUT`, `DELETE /filters/{id}`, `POST /filters/{id}/apply`    |
| – errors and apply                      | 422 `invalid_query` under the criteria, `invalid_label` under the labels, `invalid_filter` below the form; "Stosowanie filtra… (ok. N wątków)" from `matchedEstimate`, "Filtr zastosowano do N wątków" on `filter.applied` (lists and labels refetched)              | SSE `filter.applied`                                                          |
| search results ⋮                        | "Utwórz filtr z tego wyszukiwania" → the editor with `criteria = q`                                                                                                                                                                                                  |                                                                               |
| Etykiety (silo-web `LabelsPanel`)       | `/settings/labels?accountId=`: tree of user labels with colour dot, counters, `keywordState` warnings (`local_only`, `partial` with folder names), switch "Pokaż w menu nawigacji"                                                                                   | `GET /labels`, `PATCH /labels/{id} {showInList}`                              |
| – edit / delete                         | dialog: name, palette of 20 Gmail colours, "Umieść pod etykietą" (no own subtree); only changed fields are sent; delete with a dialog; "Nowa etykieta" gets colour and parent too; the drawer indents child labels                                                   | `PATCH /labels/{id}`, `DELETE /labels/{id}`, `POST /labels`                   |
| attachment thumbnails                   | chips of a thread and tiles of compose show the server thumbnail (`thumbnail: true`), 415/error → the type icon; a picture opens a full-screen preview with "Udostępnij lub zapisz"                                                                                  | `GET /attachments/{id}/thumbnail?size=s\|m`, `GET /attachments/{id}?inline=1` |
| inline picture (compose 📎)             | "Wstaw obraz w treści": upload with `inline=true`, picture in the editor, `<img src="cid:…">` saved; drafts with `cid:` pictures show them                                                                                                                           | `POST /uploads` (`inline` field first), `PUT /drafts/{id}`                    |
| forward with the original's attachments | the server copies them; `Draft.warnings` are shown in a snackbar                                                                                                                                                                                                     | `POST /drafts {mode: forward}`                                                |

Decisions:

- **Density: the server is the source of truth on 0.4.0.** `useDensity()` takes `Settings.density`
  and copies it to the device preference (`useUi.density`), which stays the value of a 0.3.0
  server and the first frame before `GET /settings` answers. Migration: the device value is not
  sent to the server (another device may have set it); a user who had "Kompaktowa" only locally
  sees the server's value after the upgrade. `comfortable` is a 64 dp row (72 default, 56 compact).
- **Signature as text.** The server stores sanitised HTML; the phone edits it as lines of text
  (`src/lib/signature.ts`: `<br>`/block ends ↔ new lines, escaped on save). Formatting made in
  silo-web is lost when the signature is saved from the phone. It is not inserted into new
  drafts: `POST /drafts` does not add it, and the client does not either (plan 2.6; see notes).
- **Time zone list:** `Intl.supportedValuesOf("timeZone")` where the engine has it (Node,
  recent Hermes), with a search field and at most 40 rows shown; otherwise a text field, and the
  server validates (422 `invalid_timezone`).
- **Thumbnails: React Native `Image` with `source.headers`** (Authorization, X-Silo-Client), no new
  native module (`expo-image` was not needed). The token never goes into a URL; the native image
  cache may keep thumbnails after sign-out (no public API to clear it on Android).
- **Inline pictures:** TenTap's `ImageBridge` (`editor.setImage`) shows a data URI read from the
  device (`expo-file-system`); `src/lib/inlineImages.ts` turns it into `cid:` for `bodyHtml` and
  into silo-web's form (`/api/v1/attachments/{u_…}?inline=1` + `cid`) for `bodyJson`. Loaded drafts
  fetch their inline uploads with the bearer header and show them unless the user already typed.
- **Filters by account.** Filters belong to an account (`Filter.accountId`), so "Filtry" and
  "Etykiety" are entries of the account settings, not of "Ustawienia ogólne".

## Ustawienia (slice 8)

The settings of the Gmail app for Android, as a Stack under `app/(app)/settings/`:

| Gmail app                                   | silo-mobile                                                                                                                                                                                          | source                                                                             |
| ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Ustawienia (list)                           | `/settings`: Ustawienia ogólne, accounts, Dodaj konto, O aplikacji                                                                                                                                   | `GET /session` (`accounts` by `position`)                                          |
| Ustawienia ogólne                           | `/settings/general`                                                                                                                                                                                  | device (`useUi`, AsyncStorage)                                                     |
| – Motyw                                     | radio dialog Systemowy/Jasny/Ciemny                                                                                                                                                                  | `theme`                                                                            |
| – Gęstość listy rozmów                      | Domyślna/Kompaktowa                                                                                                                                                                                  | `density`                                                                          |
| – Działania przy przesuwaniu                | W prawo / W lewo: Archiwizuj/Usuń/Brak, colour+icon preview                                                                                                                                          | `swipeRightAction`, `swipeLeftAction`                                              |
| – Potwierdzaj przed usunięciem/archiwizacją | switches; `ThreadActionsRoot` asks before `trash`/`archive` from a row, the bar and a thread                                                                                                         | `confirmTrash`, `confirmArchive`                                                   |
| – (thread opened → read)                    | switch; `ThreadScreen` skips the `read` modify when off                                                                                                                                              | `markReadOnOpen`                                                                   |
| – Obrazy (Pytaj/Zawsze)                     | `MessageHtml` loads remote images without "Pokaż obrazy" when `always`                                                                                                                               | `showRemoteImages`                                                                 |
| – Powiadomienia                             | inactive entry: the server has no push devices yet                                                                                                                                                   | –                                                                                  |
| account (address)                           | `/settings/account/<id>`                                                                                                                                                                             | `GET /accounts/{id}/sync-status`, `PATCH`/`DELETE /accounts/{id}`, `POST …/resync` |
| – Nazwa                                     | dialog → `PATCH {displayName}`                                                                                                                                                                       |                                                                                    |
| – Synchronizacja                            | state line (live · time, initial sync progress, backoff host, auth_failed, disabled), pending/dead counters, "Synchronizuj teraz" (`incremental`), "Pełne porównanie" (`full`)                       |                                                                                    |
| – (server)                                  | capabilities chips, keywords warning, folders (read only), IMAP/SMTP host:port (TLS), login, `sentAppend` switch, "Zmień hasło" (`PATCH {password}`)                                                 |                                                                                    |
| – Usuń konto                                | "Usuń konto z Silo" → `DELETE`; the active or last account → `/`                                                                                                                                     |                                                                                    |
| Dodaj konto → Inne                          | `/settings/add-account`: address, password, name, advanced (login; servers only with `Meta.allowCustomServers`), "Sprawdź połączenie" (`POST /accounts/test`), "Dodaj" (`POST /accounts`, 422 steps) |                                                                                    |
| Informacje                                  | `/settings/about`: app version, `silo.serverRef`, server URL and `GET /meta`, AGPL-3.0 source link, sessions, sign-out                                                                               |                                                                                    |
| (Konto Google → urządzenia)                 | `/settings/sessions`: revoke one, "Wyloguj się", "Wyloguj wszędzie"                                                                                                                                  | `GET /sessions`, `DELETE /sessions/{id}`                                           |

Decisions:

- **Device preferences only.** API 0.3.0 has no `GET/PATCH /settings`, so everything in
  "Ustawienia ogólne" lives in `useUi` on this device. They decide only how the app looks and
  which request it sends (a confirmation before `trash`, no `read` modify, images in the
  WebView); nothing the server does depends on them (plan 2.6). After phase 4 `density`,
  `undoSendSeconds` and `signature` move to `PATCH /settings` (`Settings` of `GET /session`
  already carries them).
- **Removing an account** goes back to `/` when it was the active account (`settings.
activeAccountId`, else the first) or the last one: the start screen opens the next account, or
  offers "Dodaj konto" when none is left. The user stays signed in (a Silo session is not tied to
  one mailbox).
- **Errors of account requests** show a Polish sentence for the stable `code` and the server's
  `detail` (limit, refused host, what the mail server said); request fields, the password above
  all, never reach a snackbar or a log.
- **Snackbars on settings screens** (`SettingsSnackbar`): the mail shell's snackbar is not
  mounted there.

Deviations from the Gmail app: one form for "Dodaj konto" instead of Gmail's step-by-step
wizard (and no provider list – Silo is IMAP/SMTP only); no per-account notifications, signature,
vacation responder or "Synchronizuj Gmaila" switch (no contract for them); "Pełne porównanie" and
the folder list are Silo-specific; sessions replace Google's device list.

## Widok wątku (slice 6)

- **Screen** (`src/screens/ThreadScreen.tsx`): `GET /threads/{id}` (`threadQuery`) with the cached
  list row as `placeholderData`, so the subject and chips show at once; 404 → "Nie znaleziono
  wątku". Header: subject (headline), location chip (Odebrane, Spam, Kosz, a server folder), user
  label chips in their colours, importance marker, thread star.
- **Bar**: back, then the selection bar's logic (`primaryActions`) for the thread's place –
  archive (or "Przenieś do Odebranych" out of the Inbox), delete; in Trash delete forever; in Spam
  "To nie spam" and delete forever – mark unread, ⋮ (Przenieś do, Etykiety, star, Zgłoś spam / To
  nie spam, Przywróć z kosza). All through `useThreadActions().run` with the new `after`
  (called once applied locally: leave to the list) and `onUndo` ("Cofnij" reopens the thread).
  Leaving actions: archive, inbox, trash, untrash, spam, not spam, delete forever, move, unread.
- **Mark read**: once loaded (not the placeholder), an unread thread is marked read once per
  thread with `run('read', …, {silent: true})` → `POST /threads/modify -UNREAD` (plan 5.2).
- **Cards** (`src/features/thread/MessageCard.tsx`): unread messages and the last one expanded,
  the rest collapsed; 3+ collapsed messages after the first fold into a round counter bar.
  Collapsed: avatar, sender, snippet, date, star. Expanded: sender, date (tap: full date), "do mnie
  ▾" with Od/Do/DW/Data, star, reply, ⋮ (Odpowiedz, Odpowiedz wszystkim, Przekaż dalej, Oznacz jako
  nieprzeczytane od tej wiadomości), body, attachments; `PendingIcon`; "Wysyłanie…" for
  `SCHEDULED` (no reply). A draft is a "Wersja robocza" row → `/compose?draftId=<draftId>`. The
  star of a message and "unread from here" use `POST /messages/modify`
  (`src/api/mutations/messages.ts`, optimistic on the open thread, no undo; "unread from here"
  returns to the list).
- **Reply bar**: outlined Odpowiedz / Odpowiedz wszystkim / Przekaż dalej for the last message
  that is neither a draft nor scheduled (`replyTarget`); `src/features/compose/actions.ts`
  `openReply` → `POST /drafts {replyToMessageId, mode}` → `/compose?draftId=<id>` (one draft per
  double tap). Below, newer/older arrows from the cached list (`neighbourInList`), replacing the
  route so back still returns to the list.
- **Body** (`src/features/thread/MessageHtml.tsx`): `messageHtmlQuery` (`GET /messages/{id}/html`
  as text, `staleTime: Infinity`, 503 retried after `Retry-After` up to 6×; "Pobieranie treści…"
  meanwhile, "Treść niedostępna · Spróbuj ponownie" after). `prepareHtml` (`src/lib/messageHtml.ts`)
  wraps it in a document with a CSP (`default-src 'none'`; images only `data:`/`blob:` until "Pokaż
  obrazy", which adds `https:`/`http:` for that message), a device-width viewport (wide mail
  scrolls sideways in the card), and cid: images swapped for data URIs that the app fetched with
  the bearer header (`fetchInlineImages`, 5 MB per message). `react-native-webview` loads it with
  JavaScript only for the injected height script (`injectedJavaScript` → `onMessage` sets the
  height); every navigation is refused – http(s) links open in a Custom Tab (`expo-web-browser`),
  `mailto:`/`tel:` through `expo-linking`, other schemes are ignored. No file access, DOM
  storage, cookies or cache. The page is white in dark mode too (mail is designed for it).
- **Attachments** (`src/features/thread/AttachmentChips.tsx`): chips for non-inline files – icon
  by type, name, `formatSize`; a tap downloads with `expo-file-system/legacy`
  `createDownloadResumable` (headers `Authorization` and `X-Silo-Client`, into
  `cacheDirectory`, progress bar in the chip) and opens the share sheet (`expo-sharing`); 503 →
  "Załącznik jeszcze niepobrany, spróbuj za chwilę".

## Compose (slice 7)

Full-screen compose of the Gmail app at `/compose` (`src/screens/ComposeScreen.tsx`, a
`fullScreenModal` of the stack without the stack header).

- **Opening.** The FAB pushes `/compose?accountId=<account of the list>`: the screen sends
  `POST /drafts {accountId}` once and puts the id in the route (`router.setParams`). Reply, reply
  all and forward (`openReply`) and a cancelled send seed the session with the draft the server
  answered, so compose opens without a GET; a draft from the Drafts view or the "Nie udało się
  wysłać · Otwórz" toast is loaded with `GET /drafts/{id}`.
- **Top bar**: back arrow ("Zapisz i zamknij": closes and saves), paperclip, send (enabled with at
  least one recipient) and ⋮ with "Zapisz wersję roboczą" (close and save) and "Odrzuć" (dialog,
  then `DELETE /drafts/{id}`, "Odrzucono wersję roboczą"; no undo, the server has none).
- **Fields**: Od (the draft's account, read-only), Do with chips, "∨" for DW and UDW, Temat, body,
  attachment tiles. `RecipientInput` (`src/features/compose`): Enter, comma, semicolon, a space
  after `…@…` or leaving the field make chips (avatar with the initial); a pasted list is split by
  `src/lib/addresses.ts` (port of silo-web); suggestions from `GET /contacts/autocomplete?q=`
  (150 ms debounce, `staleTime` 60 s) with avatar, name and address; a chip goes with its x or a
  long press. A chip is red only for the address the server refused (`Problem.address/field` of a
  400/422, or `lastSend.failedRecipients`): the app validates nothing but "≥ 1 recipient".
- **Body**: `@10play/tentap-editor` (TipTap in a WebView, `src/features/compose/Editor.tsx`) with
  TenTap's starter kit and a placeholder; every change hands `bodyHtml` and `bodyJson` (TipTap
  JSON, the format of silo-web) to the session. The server's quote of a reply is part of the
  body, as in silo-web. The editor grows inside the screen's ScrollView (`dynamicHeight`,
  `useScrollToCaret`); the toolbar (B, I, U, lists, link, quote) sits on top of the keyboard
  (`EditorKeyboardAvoidingView`).
- **Draft session** (`src/features/compose/session.ts`, port of silo-web's `DraftSession`, a class
  outside React read with `useSyncExternalStore`): the form, `version`/`syncedVersion`, `dirty`,
  save state, `conflict` + `conflictCurrent`, `serverChanged`, `invalid`, uploads. Edits live only
  in memory (plan 2.6: no local draft store). `PUT /drafts/{id}` with the edited `version` after
  2 s idle (`composeConfig.autosaveMs`), when a recipient field or the subject loses focus, and
  with `syncNow: true` when the screen is removed (navigation's `removed` event) and when the app
  goes to the background (`AppState`). Closing a new draft nobody edited deletes it (as Gmail and
  silo-web do); otherwise the last save and "Zapisano wersję roboczą".
- **Conflicts**: a 409 `draft_version_conflict` keeps the local edits and shows "Wersja robocza
  zmieniona w innym miejscu · Wczytaj / Nadpisz" (Wczytaj loads `Problem.current`, Nadpisz saves
  again with its version); the same bar appears for a `draft.updated` event of a newer version
  from another client (`useCompose.remoteVersions`; Wczytaj then fetches the draft).
  `Draft.serverChanged` → "Zmieniono w innym programie · Wczytaj". A failed send
  (`Draft.lastSend`, or the `outbound.status failed` event → `useCompose.setFailure` plus
  invalidation of the draft) → red "Nie udało się wysłać: <error>" with the refused recipients.
- **Attachments**: the paperclip opens a sheet "Załącz plik" (`expo-document-picker`, several
  files) / "Wstaw z galerii" (`expo-image-picker`, the system photo picker). A file over
  `GET /meta` `maxAttachmentBytes` is refused before the upload ("Plik X jest za duży (limit Y)").
  `uploadFile` (`src/api/drafts.ts`) posts `multipart/form-data` (`file` as `{uri, name, type}`)
  to `<server>/api/v1/uploads` through `XMLHttpRequest` for `upload.onprogress`, with
  `Authorization: Bearer` and `X-Silo-Client`; at most 3 at once (`queueUpload`). The tile shows
  a progress bar and its x aborts the request (`AbortSignal`); the returned id joins
  `attachmentIds` (autosave). 413 `upload_too_large` → the tile states the server's `limit`.
  Removing an attachment drops it from `attachmentIds` (the server detaches it).
- **Send and undo send** (plan 3.9): "Wyślij" → the last PUT → `POST /drafts/{id}/send {}` →
  compose closes and the list shows "Wysłano · Cofnij" until `undoUntil` (only the snackbar's
  duration; no local timer delays the send). "Cofnij" → `POST /outbound/{id}/cancel` → compose
  opens again with the returned `Draft`; 409 → "Za późno, wiadomość została wysłana". Refusals
  keep compose open: 422 `no_recipients`, `invalid_address` (red chip), 413 `message_too_large`
  (with `limit`), 502 `upstream_smtp_error` (with `detail`), 409 `send_in_progress`. The lists of
  the account are invalidated after a save, a send and a cancel.
- **Drafts and Scheduled views**: a row of Wersje robocze opens compose; a row of Zaplanowane has
  the clock icon and opens the thread read-only, where the message shows "Wysyłanie…".
- **Snackbar**: one toast store; the list renders its snackbar only while focused and compose has
  its own above the toolbar, so "Wysłano · Cofnij" shown as compose closes appears on the list.

## Zdarzenia: SSE, polling, AppState

Server events (plan 3.14, 5.4) keep the cache current without refetching:

- **Stream.** `src/api/sse.ts` opens `GET /api/v1/events` with `fetch` and parses
  `text/event-stream` incrementally. React Native has no `EventSource`; Expo SDK 58's global
  `fetch` is `expo/fetch`, whose `Response.body` is a `ReadableStream` filled as data arrives.
  Every attempt sends `Authorization: Bearer <token>`, `X-Silo-Client` (the same `clientId()` as
  REST, so the app recognises its own events by `origin`) and, on reconnect, `Last-Event-ID`
  as a header. The token is never put in the URL (ADR 0007). A stream silent for 60 s (the
  server pings every 25 s) is treated as dead and reopened.
- **Reconnect and fallback** (`connectEvents` in `src/api/events.ts`, settings in
  `eventsConfig`): a failed or dropped stream reconnects after 1 s, 2 s, ... (capped at 30 s);
  after 3 failures in a row the app polls `GET /events/poll?after=<lastId>` every **15 s** (plan
  3.14; silo-web polls every 5 s, a phone saves battery) and tries SSE again every 5 min. The
  first poll without a position skips the retained backlog and refetches everything. A failing
  stream is followed by a `GET /meta` probe: if Silo does not answer, the state is `offline`.
  A 401 from the stream does not loop: it stops and signs out like the REST client.
- **Mapping** (`applyEvent`, a port of silo-web's): `thread.updated` patches rows and the open
  thread (lists refetch when the thread is new or moved), `label.counts` writes counters into
  `/labels`, `operation.failed` rolls back through `handleOperationFailed`, `draft.updated`
  stores the remote version in `src/state/compose.ts` for the compose screen,
  `outbound.status: failed` shows "Nie udało się wysłać · Otwórz" (opens `/compose?draftId=`),
  account events refetch the sync status and session, `resync` refetches everything. The app's
  own `thread.updated` (`origin` = its `X-Silo-Client`) is ignored while a thread operation is
  in flight. `message.new` only refetches lists (no local notification; push is phase 6).
- **App lifecycle** (`src/features/sync/useEvents.ts`, mounted once in `app/(app)/_layout.tsx`):
  the stream is open only while signed in and in the foreground. `background`/`inactive` close
  the stream or polling; coming back reconnects with `Last-Event-ID` and invalidates the lists,
  labels and sync status as a safety net (the web's `refetchOnWindowFocus`). Network back
  (NetInfo) reconnects at once. Signing out disconnects and forgets the last event id. The root
  layout feeds TanStack Query's `focusManager` from `AppState` and `onlineManager` from NetInfo.
- **Connection state** (`src/state/connection.ts`: `connecting | live | polling | offline`): the
  list shows "Brak połączenia z Silo. Ponawiam…" when `offline`, nothing while polling. The sync
  status of a non-live account is polled every 15 s only while events are polled or offline.

After more than 24 h without the stream (the retention of `events`), the server answers `resync`
and the app refetches every query; the delta endpoint `GET /changes` of phase 5 would replace
that.

## Running

Requirements: Node 22+ (`.nvmrc`), a running silo-server (see the `silo` repository for the dev
stack) reachable from the phone.

```sh
npm ci
npm start          # Expo dev server; scan the QR code with Expo Go
npm run android    # same, and open it on a connected device or a running emulator
```

On the sign-in screen enter the address of your Silo instance (e.g. `https://mail.example.com`
or, in the dev stack, `http://<your-computer's-LAN-IP>:<port>`; `localhost` on the phone is the
phone itself), then your mailbox address and password.

- **Expo Go** runs the app without any Android SDK: install Expo Go on the phone and scan the QR
  code from `npm start`. All native modules used so far are part of Expo Go.
- **Development build / emulator**: requires the Android SDK (Android Studio, `adb`, an AVD).
  `npx expo run:android` generates `android/` (continuous native generation, not committed) and
  installs a debug build on the emulator. A release APK, e.g. for F-Droid, is built the same way
  from the prebuilt project (`npx expo prebuild`, then Gradle); there is no EAS project.

The machine this slice was written on has no Android SDK, so the evidence that the app works is
the CI checks: `npm run typecheck`, `npm run lint`, `npm test` and `npm run export:android`
(bundles the JavaScript for Android into `dist/`, the same step a release build runs).

## Scripts

| Script                            | What it does                                  |
| --------------------------------- | --------------------------------------------- |
| `npm start` / `npm run android`   | Expo dev server (Android: also opens the app) |
| `npm run typecheck`               | `tsc --noEmit`                                |
| `npm run lint`                    | ESLint (`eslint-config-expo`, flat config)    |
| `npm run format` / `format:check` | Prettier                                      |
| `npm test`                        | Jest (`jest-expo` preset for Android)         |
| `npm run gen:api`                 | regenerate `src/api/schema.d.ts` (see below)  |
| `npm run export:android`          | `expo export --platform android` into `dist/` |

## API contract

`src/api/schema.d.ts` is generated from silo-server's `api/openapi.yaml` and committed. The server
release the app is built against is declared in `package.json` as `"silo": {"serverRef": ...}`.

```sh
npm run gen:api                          # fetch openapi.yaml of silo.serverRef (v0.4.0) from GitHub
npm run gen:api -- --server-ref v0.3.0   # another git ref
npm run gen:api -- --local [path]        # a local file (default ../silo-server/api/openapi.yaml)
```

The `api-contract` CI job checks out silo-server at `silo.serverRef`, regenerates the schema and
fails when it differs from the committed one.

The committed schema is contract 0.4.0: `../silo-server/api/openapi.yaml` at the tag `v0.4.0`
(identical to the phase 4 worktree it was first generated from). The phase 4 features need a
server ≥ 0.4.0; the `api-contract` job passes once the tag `v0.4.0` is published in the
silo-server repository on GitHub.

## Tests

Tests talk to the API through [msw](https://mswjs.io) (`setupServer` from `msw/node`, see
`src/test/server.ts`). Two adjustments make msw work under `jest-expo`:

- `jest.environment.js` (jest-expo's Android environment) saves Node's WHATWG `fetch`, `Request`,
  `Response`, `Headers` and `FormData`, and `jest.polyfills.js` puts them back after jest-expo's
  setup. That setup installs Expo's native-backed "winter" fetch, whose `Response` cannot carry a
  body built in JavaScript, so msw's mocked responses would arrive empty. The API client resolves
  `globalThis.fetch` per call, so it uses the restored one. (The `undici` npm package does not work
  as a replacement here: its bodies hang on jest-expo's web-streams polyfill.)
- `jest.config.js` lets Babel transform msw and its ES-module-only dependencies (`.mjs` files and a
  few packages) like the React Native packages.

`@10play/tentap-editor` is a fake bridge that keeps the content as HTML (`typeInEditor` in
`src/test/editor.ts` fires its `onChange`); uploads go to a fake `XMLHttpRequest`
(`src/test/xhr.ts`, through `uploadConfig.createXhr`). `react-native-webview` is a View that keeps its props (tests read `source.html` and call
`onMessage`); `expo-file-system/legacy`, `expo-sharing`, `expo-web-browser` and `expo-linking`
are mocked per test file. `expo-secure-store` and `expo-device` are replaced by in-memory fakes in `jest.setup.ts`, as are
AsyncStorage, NetInfo, gesture-handler, worklets and the safe-area insets (the libraries' jest
mocks). `jest.setup.ts` also replaces `fetchEventSource` with a source that never opens, so
screen tests make no SSE requests; `src/api/sse.test.ts` tests the real one against an msw
stream, and the `connectEvents`/`useEvents` tests inject a fake through
`eventsConfig.createEventSource` (short intervals instead of fake timers, which
`fakeTimers.doNotFake` leaves real).

Route tests render the real `app/` tree with expo-router's `renderRouter`
(`src/test/router.tsx`). Two more adjustments make that work:

- `renderRouter` turns on fake timers, under which msw never answers; `jest.config.js` sets
  `fakeTimers.doNotFake` so fake timers only freeze the clock.
- `react-native-reanimated/mock` loads the real library, whose native initializer throws under
  jest-expo's Android preset (reanimated 4.7: JSReanimated has no `setCSSEventHandler`). The
  path is mapped to a minimal stand-in, `src/test/reanimated-mock.js`, covering what the drawer
  uses.

The thread list renders on the real FlashList with the library's jest setup
(`@shopify/flash-list/jestSetup` in `jest.setup.ts`: a fixed 400 x 900 viewport). Tests reach
`onEndReached` and the `RefreshControl` through the props of FlashList's scroll view. The swipe
pan is not driven in jest (gesture-handler's jest setup runs no native pans); the mapping of
preferences to actions (`swipeActionFor`) is unit-tested, the gesture and the FAB folding are
checked on a device.

Known: a single test file run in band (`npx jest <file>`) passes, but jest does not exit
afterwards (an open handle that already existed in slice 1); `npm test` runs the files in
workers and finishes. Add `--forceExit` when running one file.

## Out of scope (so far)

- Push notifications: hook point for a later slice – register the device for the current bearer
  session with `POST /devices` (plan 5.1, phase 6) after sign-in, and unregister on sign-out.
- Folder management (create/delete server folders, folder roles and `syncMode`), push
  notifications (`desktopNotifications` has no mobile counterpart yet) and inserting the
  signature into new drafts (the server does not, see docs/NOTES-FOR-SILO.md).
- Local notifications for `message.new` (hook point in `applyEvent`); system push is phase 6.

## License

[AGPL-3.0-only](LICENSE)
