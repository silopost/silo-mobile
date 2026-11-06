import type { components } from "../api/schema";

type AccountState = components["schemas"]["Account"]["state"];

const dateTime = new Intl.DateTimeFormat("pl-PL", { dateStyle: "medium", timeStyle: "short" });

/** Date and time in Polish, e.g. "5 lis 2026, 18:44"; the raw value when it does not parse. */
export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso : dateTime.format(date);
}

/** Polish plural form: 1 "one", 2–4 (not 12–14) "few", otherwise "many". */
export function plural(n: number, one: string, few: string, many: string): string {
  if (n === 1) return one;
  const d = n % 10;
  const dd = n % 100;
  return d >= 2 && d <= 4 && (dd < 12 || dd > 14) ? few : many;
}

/** "n" with its plural noun, e.g. "3 wątki". */
const n3 = (n: number, one: string, few: string, many: string) =>
  `${n} ${plural(n, one, few, many)}`;

/** UI strings (Polish, as in the plan). A plain map, as in silo-web; no i18n library yet. */
export const t = {
  appName: "Silo",
  loading: "Wczytywanie…",
  retry: "Ponów",
  cancel: "Anuluj",
  genericError: "Nie udało się. Spróbuj ponownie.",
  serverUnreachable: "Nie można połączyć z serwerem",

  // login
  loginTitle: "Zaloguj się",
  loginSubtitle: "Podaj adres serwera Silo oraz adres i hasło swojej skrzynki pocztowej",
  serverUrl: "Adres serwera",
  invalidServerUrl: "Wpisz adres serwera, np. https://poczta.example.com",
  checkingServer: "Sprawdzanie serwera…",
  serverInfo: (version: string) => `Silo · serwer ${version}`,
  email: "Adres e-mail",
  password: "Hasło",
  signIn: "Zaloguj",
  signingIn: "Logowanie…",
  invalidCredentials: "Nieprawidłowy e-mail lub hasło",
  rateLimited: (seconds?: number) =>
    seconds ? `Za dużo prób, spróbuj za ${seconds} s` : "Za dużo prób, spróbuj później",
  mailServerUnavailable: "Serwer poczty niedostępny",

  // accounts
  accountStates: {
    connecting: "Łączenie",
    discovering: "Wykrywanie folderów",
    initial_sync: "Pierwsza synchronizacja",
    live: "Zsynchronizowano",
    backoff: "Serwer niedostępny, ponowienie wkrótce",
    auth_failed: "Błąd logowania do skrzynki",
    disabled: "Wyłączone",
  } satisfies Record<AccountState, string>,

  // sessions
  sessionsTitle: "Sesje i urządzenia",
  thisDevice: "To urządzenie",
  sessionKinds: { bearer: "Aplikacja", cookie: "Przeglądarka" },
  unknownBrowser: "Przeglądarka",
  signedInAt: (date: string) => `Zalogowano: ${date}`,
  lastSeenAt: (date: string) => `Ostatnia aktywność: ${date}`,
  revoke: "Wyloguj",
  revokeLabel: (name: string) => `Wyloguj ${name}`,
  revokeTitle: "Wylogować urządzenie?",
  revokeBody: (name: string) => `${name} straci dostęp do poczty do czasu ponownego logowania.`,
  noSessions: "Brak innych sesji.",
  signOut: "Wyloguj się",
  signingOut: "Wylogowywanie…",

  // mail shell: drawer, search bar, account switcher, compose
  mainMenu: "Menu główne",
  openMenu: "Otwórz menu nawigacji",
  searchMail: "Szukaj w poczcie",
  labels: "Etykiety",
  folders: "Foldery",
  createLabel: "Utwórz nową",
  settings: "Ustawienia",
  helpFeedback: "Pomoc i opinie",
  comingSoon: "Dostępne wkrótce",
  compose: "Utwórz",
  unreadCount: (n: number) =>
    `${n} ${plural(n, "nieprzeczytany", "nieprzeczytane", "nieprzeczytanych")}`,
  totalCount: (n: number) => `${n} ${plural(n, "wątek", "wątki", "wątków")}`,
  accountMenu: (email: string) => `Konto ${email}, przełącz konto lub wyloguj się`,
  switchTo: (email: string) => `Przełącz na ${email}`,
  addAccount: "Dodaj konto",
  manageAccounts: "Zarządzaj kontami",
  close: "Zamknij",
  noAccounts: "Brak kont pocztowych. Dodaj konto, aby zobaczyć pocztę.",
  unknownLabel: "Nie ma takiej etykiety",
  thread: "Wątek",
  themeTitle: "Motyw",

  // thread list
  me: "ja",
  noSubject: "(bez tematu)",
  unread: "Nieprzeczytane",
  hasAttachment: "załącznik",
  scheduledLabel: "zaplanowane",
  starredLabel: "oznaczone gwiazdką",
  pendingSync: "Oczekuje na zapis na serwerze poczty",
  star: "Oznacz gwiazdką",
  unstar: "Usuń gwiazdkę",
  selectThread: "Zaznacz wątek",
  deselectThread: "Odznacz wątek",
  archive: "Archiwizuj",
  trash: "Usuń",
  untrash: "Przywróć z kosza",
  deleteForever: "Usuń na zawsze",
  notSpam: "To nie spam",
  reportSpam: "Zgłoś spam",
  markRead: "Oznacz jako przeczytane",
  markUnread: "Oznacz jako nieprzeczytane",
  moveTo: "Przenieś do",
  selectAll: "Zaznacz wszystko",
  moreActions: "Więcej opcji",
  endSelection: "Zakończ zaznaczanie",
  selectedCount: (n: number) => `Zaznaczono: ${n}`,
  authFailedBanner: "Hasło do skrzynki przestało działać",
  updatePassword: "Zaktualizuj hasło",
  mailServerOffline: (host: string) => `Brak połączenia z serwerem poczty (${host}).`,
  pendingOps: (n: number) =>
    `${n} ${plural(n, "zmiana oczekuje", "zmiany oczekują", "zmian oczekuje")}.`,
  retryNow: "Ponów teraz",
  siloOffline: "Brak połączenia z Silo. Ponawiam…",
  sendFailedOpen: "Nie udało się wysłać",
  open: "Otwórz",
  initialSync: (done: string, total: string) => `Synchronizacja: ${done} z ${total} wiadomości`,
  initialSyncLabel: "Postęp pierwszej synchronizacji",
  listError: "Nie udało się wczytać wiadomości",
  tryAgain: "Spróbuj ponownie",
  loadingMore: "Wczytywanie kolejnych wiadomości",
  emptyInbox: "Brak wiadomości w Odebranych",
  emptySpam: "Brak spamu",
  emptyTrash: "Kosz jest pusty",
  emptyView: "Nic tu nie ma",
  messageCount: (n: number) => `${n} ${plural(n, "wiadomość", "wiadomości", "wiadomości")}`,
  themes: { system: "Systemowy", light: "Jasny", dark: "Ciemny" },

  // thread actions: snackbars, undo, sheets (texts of silo-web); n = number of threads
  undo: "Cofnij",
  ok: "OK",
  create: "Utwórz",
  newLabel: "Nowa etykieta",
  labelName: "Nazwa etykiety",
  labelExists: "Etykieta o tej nazwie już istnieje.",
  labelInvalidParent: "Etykiety nie można umieścić pod nią samą ani pod jej podetykietą.",
  labelRefused: "Serwer odrzucił zmianę etykiety.",
  labelDeleted: "Usunięto etykietę",
  labelsTitle: "Etykiety",
  labelsHint: "Etykiety tego konta, zapisywane na serwerze poczty jako słowa kluczowe",
  labelsEmpty: "Brak etykiet. Utwórz etykietę w menu nawigacji lub tutaj.",
  labelEdit: "Edytuj etykietę",
  labelColor: "Kolor",
  labelNoColor: "Bez koloru",
  labelColorChoice: (n: number) => `Kolor ${n}`,
  labelParent: "Umieść pod etykietą",
  labelNoParent: "Brak (najwyższy poziom)",
  labelShowInList: "Pokaż w menu nawigacji",
  labelShowIfUnread: "Gdy są nieprzeczytane",
  labelCounts: (unread: number, total: number) =>
    unread > 0
      ? `${n3(unread, "nieprzeczytany", "nieprzeczytane", "nieprzeczytanych")} · ${n3(total, "wątek", "wątki", "wątków")}`
      : n3(total, "wątek", "wątki", "wątków"),
  labelLocalOnly: "Tylko lokalnie – serwer poczty nie obsługuje słów kluczowych",
  labelPartial: (folders: string) => `Tylko lokalnie w folderach: ${folders}`,
  labelDeleteTitle: (name: string) => `Usunąć etykietę „${name}”?`,
  labelDeleteBody:
    "Usunie etykietę i jej słowo kluczowe z wiadomości na serwerze. Same wiadomości zostaną.",
  labelSaved: "Zapisano etykietę",
  labelOnSome: (name: string) => `${name}, na części zaznaczonych wątków`,
  deleteForeverTitle: "Usunąć na zawsze?",
  deleteForeverBody: (n: number) =>
    `Usunąć na zawsze ${n3(n, "wątek", "wątki", "wątków")}? Tej operacji nie można cofnąć.`,
  /** Names of the fixed places of "Przenieś do", as in Gmail. */
  locations: {
    INBOX: "Odebrane",
    SPAM: "Spam",
    TRASH: "Kosz",
    ARCHIVE: "Archiwum",
  } as Record<string, string>,
  currentLocation: "bieżąca lokalizacja",
  done: {
    archive: (n: number) =>
      n === 1
        ? "Wątek zarchiwizowany"
        : n3(n, "wątek zarchiwizowany", "wątki zarchiwizowane", "wątków zarchiwizowanych"),
    trash: (n: number) =>
      n === 1
        ? "Wątek przeniesiony do kosza"
        : `${n3(n, "wątek przeniesiony", "wątki przeniesione", "wątków przeniesionych")} do kosza`,
    untrash: (n: number) =>
      n === 1
        ? "Wątek przywrócony z kosza"
        : `${n3(n, "wątek przywrócony", "wątki przywrócone", "wątków przywróconych")} z kosza`,
    spam: (n: number) =>
      n === 1
        ? "Wątek oznaczony jako spam"
        : `${n3(n, "wątek oznaczony", "wątki oznaczone", "wątków oznaczonych")} jako spam`,
    inbox: (n: number) =>
      n === 1
        ? "Wątek przeniesiony do Odebranych"
        : `${n3(n, "wątek przeniesiony", "wątki przeniesione", "wątków przeniesionych")} do Odebranych`,
    read: (n: number) =>
      n === 1
        ? "Wątek oznaczony jako przeczytany"
        : `${n3(n, "wątek oznaczony", "wątki oznaczone", "wątków oznaczonych")} jako przeczytane`,
    unread: (n: number) =>
      n === 1
        ? "Wątek oznaczony jako nieprzeczytany"
        : `${n3(n, "wątek oznaczony", "wątki oznaczone", "wątków oznaczonych")} jako nieprzeczytane`,
    labels: (n: number) =>
      n === 1
        ? "Zmieniono etykiety wątku"
        : `Zmieniono etykiety: ${n3(n, "wątek", "wątki", "wątków")}`,
    moved: (n: number, to: string) =>
      n === 1
        ? `Wątek przeniesiony do: ${to}`
        : `${n3(n, "wątek przeniesiony", "wątki przeniesione", "wątków przeniesionych")} do: ${to}`,
    deleted: (n: number) =>
      n === 1
        ? "Wątek usunięty trwale"
        : `${n3(n, "wątek usunięty", "wątki usunięte", "wątków usuniętych")} trwale`,
    snooze: (n: number, when: string) =>
      n === 1 ? `Odłożono do ${when}` : `Odłożono ${n3(n, "wątek", "wątki", "wątków")} do ${when}`,
    unsnooze: (n: number) =>
      n === 1
        ? "Wątek wrócił do Odebranych"
        : `${n3(n, "wątek wrócił", "wątki wróciły", "wątków wróciło")} do Odebranych`,
  },
  undoExpired: "Tej operacji nie można już cofnąć.",

  /** Titles of the confirmations of the device preferences (Gmail: "Usunąć tę wiadomość?"). */
  confirmAction: {
    trash: (n: number) =>
      n === 1
        ? "Przenieść wątek do kosza?"
        : `Przenieść do kosza ${n3(n, "wątek", "wątki", "wątków")}?`,
    archive: (n: number) =>
      n === 1 ? "Zarchiwizować wątek?" : `Zarchiwizować ${n3(n, "wątek", "wątki", "wątków")}?`,
  },

  // thread screen (slice 6)
  back: "Wróć",
  threadNotFound: "Nie znaleziono wątku",
  moveToInbox: "Przenieś do Odebranych",
  important: "Ważne",
  to: "do",
  toMe: "do mnie",
  recipients: "Pokaż szczegóły odbiorców",
  from: "Od",
  toLabel: "Do",
  cc: "DW",
  date: "Data",
  folded: (n: number) =>
    `Pokaż ${n3(n, "zwiniętą wiadomość", "zwinięte wiadomości", "zwiniętych wiadomości")}`,
  expandedState: "rozwinięta",
  collapsedState: "zwinięta",
  contentLoading: "Pobieranie treści…",
  contentError: "Treść niedostępna",
  showImages: "Pokaż obrazy",
  imagesBlocked: "Obrazy zewnętrzne są ukryte.",
  messageMenu: "Więcej opcji wiadomości",
  messageBody: "Treść wiadomości",
  reply: "Odpowiedz",
  replyAll: "Odpowiedz wszystkim",
  forward: "Przekaż dalej",
  unreadFromHere: "Oznacz jako nieprzeczytane od tej wiadomości",
  draftLabel: "Wersja robocza",
  sendingLabel: "Wysyłanie…",
  attachmentLabel: (name: string, size: string) => `Załącznik ${name}, ${size}`,
  attachmentNotReady: "Załącznik jeszcze niepobrany, spróbuj za chwilę",
  shareAttachment: "Udostępnij lub zapisz",
  draftWarnings: {
    quote_unavailable: "Nie udało się pobrać treści oryginału – cytat zawiera tylko fragment.",
    attachments_unavailable: "Części załączników oryginału nie udało się pobrać.",
    attachments_too_large: "Załączniki przekraczające limit rozmiaru zostały pominięte.",
  } as Record<string, string>,
  previewAttachment: (name: string) => `Podgląd: ${name}`,
  newerLabel: "Nowszy wątek",
  olderLabel: "Starszy wątek",
  /** operation.failed by kind (plan 5.4): what the server could not do. */
  operationFailed: (kind: string | undefined, n: number): string => {
    const what = n3(n, "wątku", "wątków", "wątków");
    const action: Record<string, string> = {
      move: `przenieść ${what}`,
      flags: `zmienić oznaczeń ${what}`,
      labels: `zmienić etykiet ${what}`,
      expunge: `usunąć ${what}`,
      append: "zapisać wersji roboczej w folderze Wersje robocze",
      delete_draft: "usunąć wersji roboczej z folderu Wersje robocze",
      create_folder: "utworzyć folderu",
      delete_folder: "usunąć folderu",
    };
    const a = kind ? action[kind] : undefined;
    return a
      ? `Nie udało się ${a} na serwerze poczty – przywrócono stan z serwera`
      : `Nie udało się zmienić ${what} na serwerze poczty – przywrócono stan z serwera`;
  },

  // compose (slice 7; texts of silo-web and the Gmail app). Sizes come formatted (formatSize).
  newMessage: "Nowa wiadomość",
  saveAndClose: "Zapisz i zamknij",
  attach: "Załącz",
  attachFile: "Załącz plik",
  insertFromGallery: "Wstaw z galerii",
  send: "Wyślij",
  sending: "Wysyłanie…",
  composeMenu: "Więcej opcji wiadomości",
  discard: "Odrzuć",
  discardTitle: "Odrzucić wersję roboczą?",
  discardBody: "Wersja robocza zostanie usunięta. Tej operacji nie można cofnąć.",
  saveDraft: "Zapisz wersję roboczą",
  bcc: "UDW",
  subject: "Temat",
  bodyPlaceholder: "Napisz e-mail",
  showCcBcc: "Pokaż pola DW i UDW",
  recipientsOf: (field: string) => `Odbiorcy: ${field}`,
  recipientInput: (field: string) => `Dodaj odbiorców: ${field}`,
  removeRecipient: (who: string) => `Usuń ${who}`,
  invalidRecipient: "Nieprawidłowy adres",
  suggestions: "Podpowiedzi adresów",
  suggestion: (name: string, email: string) => (name ? `${name}, ${email}` : email),
  formatting: "Formatowanie",
  bold: "Pogrubienie",
  italic: "Kursywa",
  underline: "Podkreślenie",
  bulletList: "Lista punktowana",
  orderedList: "Lista numerowana",
  link: "Wstaw link",
  quote: "Cytat",
  linkUrl: "Adres linku",
  apply: "Zastosuj",
  removeLink: "Usuń link",
  attachments: "Załączniki",
  removeAttachment: (name: string) => `Usuń załącznik ${name}`,
  cancelUpload: (name: string) => `Anuluj przesyłanie ${name}`,
  uploading: (name: string) => `Przesyłanie ${name}`,
  saving: "Zapisywanie…",
  saved: "Zapisano",
  saveError: "Nie udało się zapisać",
  creatingDraft: "Tworzenie wersji roboczej…",
  draftLoadError: "Nie udało się wczytać wersji roboczej.",
  draftNotSaved: "Nie udało się zapisać wersji roboczej.",
  draftConflict: "Wersja robocza zmieniona w innym miejscu",
  draftServerChanged: "Zmieniono w innym programie",
  reload: "Wczytaj",
  overwrite: "Nadpisz",
  draftSaved: "Zapisano wersję roboczą",
  draftDiscarded: "Odrzucono wersję roboczą",
  messageSent: "Wysłano",
  sendUndone: "Wysyłanie cofnięte",
  tooLateToUndo: "Za późno, wiadomość została wysłana",
  sendFailedIn: (error: string) => `Nie udało się wysłać: ${error}`,
  failedRecipients: (list: string) => `Odrzuceni odbiorcy: ${list}`,
  noRecipients: "Dodaj co najmniej jednego odbiorcę.",
  invalidAddress: "Nieprawidłowy adres odbiorcy. Popraw adresy oznaczone na czerwono.",
  invalidAddressOf: (address: string) =>
    `Nieprawidłowy adres odbiorcy: ${address}. Popraw adres oznaczony na czerwono.`,
  messageTooLarge: (limit?: string, size?: string) =>
    limit
      ? `Wiadomość z załącznikami${size ? ` (${size})` : ""} przekracza limit ${limit}.`
      : "Wiadomość z załącznikami przekracza limit rozmiaru serwera.",
  smtpError: (detail?: string) =>
    detail ? `Serwer poczty odrzucił wiadomość: ${detail}` : "Serwer poczty odrzucił wiadomość.",
  sendInProgress: "Ta wiadomość jest już wysyłana.",
  uploadsPending: "Poczekaj na zakończenie przesyłania załączników.",
  uploadTooLarge: (name: string, limit?: string) =>
    limit ? `Plik ${name} jest za duży (limit ${limit})` : `Plik ${name} jest za duży`,
  uploadFailed: (name: string) => `Nie udało się przesłać pliku ${name}.`,

  // settings (slice 8; the screens of the Gmail app's settings)
  generalSettings: "Ustawienia ogólne",
  aboutApp: "O aplikacji",
  accountSettings: "Ustawienia konta",
  settingsSection: (name: string) => `${name}, otwórz`,
  densityTitle: "Gęstość listy wiadomości",
  densities: { default: "Domyślna", comfortable: "Wygodna", compact: "Kompaktowa" },
  swipeTitle: "Działania przy przesuwaniu",
  swipeRight: "Przesunięcie w prawo",
  swipeLeft: "Przesunięcie w lewo",
  swipeActions: { archive: "Archiwizuj", trash: "Usuń", snooze: "Odłóż", none: "Brak" },
  swipeHint: "Wybierz, co ma się dziać po przesunięciu wiadomości na liście",
  confirmTitle: "Potwierdzanie działań",
  confirmBeforeTrash: "Potwierdzaj przed usunięciem",
  confirmBeforeArchive: "Potwierdzaj przed archiwizacją",
  markReadOnOpenTitle: "Oznaczaj jako przeczytane po otwarciu",
  markReadOnOpenOn: "Otwarty wątek zostaje oznaczony jako przeczytany",
  markReadOnOpenOff: "Otwarty wątek pozostaje nieprzeczytany",
  remoteImagesTitle: "Obrazy zewnętrzne",
  remoteImages: { ask: "Pytaj przed wyświetleniem", always: "Zawsze wyświetlaj" },
  on: "Włączone",
  off: "Wyłączone",
  pushTitle: "Powiadomienia",
  pushUnavailable: "Niedostępne: serwer nie obsługuje powiadomień push",
  localSettingsNote:
    "Te ustawienia dotyczą tylko tego urządzenia. Ustawienia wspólne dla wszystkich urządzeń pojawią się z nową wersją serwera.",
  generalSectionDisplay: "Wyświetlanie",
  generalSectionActions: "Działania",
  generalSectionMessages: "Wiadomości",

  // server settings (phase 4: GET/PATCH /settings)
  syncedSection: "Konto Silo (synchronizowane)",
  syncedNote:
    "Te ustawienia są zapisywane na serwerze Silo i obowiązują na wszystkich urządzeniach i w przeglądarce.",
  deviceSettingsNote: "Ustawienia poza sekcją „Konto Silo” dotyczą tylko tego urządzenia.",
  undoSendTitle: "Czas na cofnięcie wysyłki",
  undoSendSeconds: (n: number) => `${n} s`,
  signatureTitle: "Podpis",
  signatureNone: "Brak podpisu",
  signatureHint:
    "Podpis jest zapisywany na serwerze (HTML jest oczyszczany). Ta wersja nie wstawia go jeszcze do nowych wiadomości.",
  timezoneTitle: "Strefa czasowa",
  timezoneHint: "Nazwa strefy IANA, np. Europe/Warsaw",
  timezoneDevice: (zone: string) => `Ustaw strefę urządzenia (${zone})`,
  timezoneDiffers: (zone: string) => `Inna niż strefa urządzenia (${zone})`,
  timezoneSearch: "Szukaj strefy",
  conversationViewTitle: "Widok wątków",
  conversationViewNote: "Aplikacja zawsze grupuje wiadomości w wątki.",
  desktopNotificationsTitle: "Powiadomienia na komputerze",
  desktopNotificationsNote:
    "Ustawienie przeglądarki; powiadomienia w telefonie wymagają obsługi push na serwerze.",
  invalidSetting: "Serwer odrzucił tę wartość ustawienia.",
  invalidTimezone: "Nieznana strefa czasowa.",

  // filters (phase 4: /filters, plan 3.11)
  filtersTitle: "Filtry",
  filtersHint: "Filtry działają na serwerze dla nowej poczty w Odebranych",
  filtersEmpty: "Brak filtrów. Dodaj filtr, aby porządkować nową pocztę automatycznie.",
  filterCreate: "Utwórz filtr",
  filterEdit: "Edytuj filtr",
  filterName: "Nazwa (opcjonalnie)",
  filterCriteria: "Kryteria",
  filterCriteriaHint: "Tak jak w wyszukiwarce, np. from:sklep@example.com has:attachment",
  filterNoCriteria: "Wpisz kryteria filtra.",
  filterTest: "Testuj wyszukiwanie",
  filterActionsTitle: "Działania",
  filterActions: {
    archive: "Pomiń Odebrane (archiwizuj)",
    markRead: "Oznacz jako przeczytane",
    star: "Oznacz gwiazdką",
    important: "Oznacz jako ważne",
    trash: "Usuń",
  },
  filterAddLabels: "Nadaj etykietę",
  filterNoLabels: "Brak",
  filterForwardTo: "Przekaż do",
  filterForwardHint: "Adres e-mail; tylko nowa poczta",
  filterApplyExisting: "Zastosuj też do istniejących wiadomości",
  filterEnabled: (name: string) => `Włącz filtr ${name}`,
  filterMoveUp: (name: string) => `Przesuń w górę: ${name}`,
  filterMoveDown: (name: string) => `Przesuń w dół: ${name}`,
  filterMenu: (name: string) => `Więcej opcji filtra ${name}`,
  filterRemoveTitle: "Usunąć filtr?",
  filterRemoveBody: (name: string) =>
    `Filtr „${name}” przestanie działać. Wiadomości, które już zmienił, zostaną bez zmian.`,
  filterRemoved: "Usunięto filtr",
  filterSaved: "Zapisano filtr",
  filterApplying: (n: number | null) =>
    n === null
      ? "Stosowanie filtra…"
      : `Stosowanie filtra… (ok. ${n3(n, "wątek", "wątki", "wątków")})`,
  filterApplied: (n: number) => `Filtr zastosowano do ${n3(n, "wątku", "wątków", "wątków")}`,
  filterInvalidQuery: "Nieprawidłowe kryteria – sprawdź składnię wyszukiwania.",
  filterInvalidFilter:
    "Serwer odrzucił filtr: wybierz co najmniej jedno działanie, nie łącz archiwizacji z usuwaniem, kryteria nie mogą obejmować całej poczty, a adres przekazania musi być poprawny.",
  filterInvalidLabel: "Wybrana etykieta nie należy już do tego konta.",
  filterFromSearch: "Utwórz filtr z tego wyszukiwania",
  filterSummary: {
    label: (name: string) => `Etykieta: ${name}`,
    forward: (email: string) => `Przekaż do ${email}`,
  },
  filterDisabled: "Wyłączony",

  // account settings
  displayName: "Nazwa wyświetlana",
  displayNameHint: "Nazwa nadawcy w wysyłanych wiadomościach",
  noDisplayName: "Nie ustawiono",
  save: "Zapisz",
  syncTitle: "Synchronizacja",
  syncLive: (when: string | null) => (when ? `Zsynchronizowane · ${when}` : "Zsynchronizowane"),
  syncInitial: "Pierwsza synchronizacja",
  syncInitialProgress: (done: string, total: string) => `${done} z ${total} wiadomości`,
  syncBackoff: (host: string) => `Brak połączenia z serwerem (${host})`,
  syncAuthFailed: "Hasło przestało działać",
  syncDisabled: "Synchronizacja wyłączona",
  syncConnecting: "Łączenie z serwerem…",
  pendingOpsCount: (n: number) => `Oczekujące operacje: ${n}`,
  deadOpsCount: (n: number) => `Nieudane operacje: ${n}`,
  deadOpsHint: "Zmiany, których nie udało się zapisać na serwerze poczty",
  syncNow: "Synchronizuj teraz",
  syncRequested: "Synchronizacja rozpoczęta",
  fullCompare: "Pełne porównanie",
  fullCompareHint: "Porównuje wszystkie wiadomości i oznaczenia z serwerem. Może potrwać dłużej.",
  capabilitiesTitle: "Możliwości serwera",
  keywordsUnsupported: "Etykiety tylko lokalnie – serwer nie obsługuje słów kluczowych",
  foldersTitle: "Foldery",
  folderRoles: {
    inbox: "Odebrane",
    sent: "Wysłane",
    drafts: "Wersje robocze",
    trash: "Kosz",
    junk: "Spam",
    archive: "Archiwum",
    all: "Wszystkie",
    user: "Folder",
  } as Record<string, string>,
  folderMessages: (n: number) => `${n} ${plural(n, "wiadomość", "wiadomości", "wiadomości")}`,
  folderIgnored: "nie synchronizowany",
  serverTitle: "Serwer",
  incomingServer: "Serwer poczty przychodzącej (IMAP)",
  outgoingServer: "Serwer poczty wychodzącej (SMTP)",
  tlsModes: { implicit: "TLS", starttls: "STARTTLS", none: "bez szyfrowania" },
  serverAddress: (host: string, port: number, tls: string) => `${host}:${port} (${tls})`,
  username: "Nazwa użytkownika",
  sentAppend: "Zapisuj wysłane w folderze Wysłane",
  sentAppendHint: "Włącz, jeśli serwer sam nie zapisuje kopii wysłanych wiadomości",
  changePassword: "Zmień hasło",
  changePasswordHint: "Nowe hasło do skrzynki na serwerze poczty",
  newPassword: "Nowe hasło",
  showPassword: "Pokaż hasło",
  hidePassword: "Ukryj hasło",
  passwordChanged: "Hasło zmienione",
  removeAccount: "Usuń konto z Silo",
  removeAccountTitle: "Usunąć konto z Silo?",
  removeAccountBody:
    "Usunie cache i ustawienia tego konta w Silo. Skrzynka na serwerze pozostaje nietknięta.",
  remove: "Usuń",
  accountRemoved: "Konto usunięte z Silo",
  accountNotFound: "Nie ma takiego konta",

  // add account
  addAccountTitle: "Dodaj konto",
  addAccountIntro: "Dodaj skrzynkę IMAP/SMTP. Silo sprawdzi połączenie przed zapisaniem.",
  displayNameOptional: "Nazwa wyświetlana (opcjonalnie)",
  advanced: "Ustawienia zaawansowane",
  imapHost: "Serwer IMAP",
  smtpHost: "Serwer SMTP",
  port: "Port",
  security: "Zabezpieczenia",
  usernameOptional: "Nazwa użytkownika (domyślnie adres e-mail)",
  defaultServer: "Konto na domyślnym serwerze poczty tej instancji Silo",
  defaultServerNoCustom:
    "Ta instancja Silo pozwala dodawać tylko konta na swoim domyślnym serwerze poczty.",
  testConnection: "Sprawdź połączenie",
  testing: "Sprawdzanie…",
  add: "Dodaj",
  adding: "Dodawanie…",
  accountAdded: "Konto dodane · Trwa pierwsza synchronizacja",
  testOk: "Połączenie działa",
  testFailed: "Połączenie nie działa",
  steps: {
    connect: "Połączenie",
    tls: "TLS",
    starttls: "STARTTLS",
    ehlo: "EHLO",
    login: "Logowanie",
    auth: "Uwierzytelnianie",
    capability: "Możliwości serwera",
    list: "Lista folderów",
  } as Record<string, string>,
  stepOk: "udane",
  stepFailed: "nieudane",
  requiredEmailPassword: "Podaj adres e-mail i hasło",
  invalidPort: "Port musi być liczbą od 1 do 65535",
  accountErrors: {
    account_test_failed: "Nie udało się połączyć z kontem. Sprawdź kroki poniżej.",
    account_limit_reached: "Osiągnięto limit kont na tym serwerze Silo.",
    account_exists: "To konto jest już dodane.",
    custom_servers_disabled: "Ta instancja nie pozwala na inne serwery poczty.",
    host_not_allowed: "Ten serwer poczty nie jest dozwolony.",
    validation_failed: "Nieprawidłowe dane konta.",
    upstream_imap_error: "Serwer IMAP zwrócił błąd.",
    upstream_smtp_error: "Serwer SMTP zwrócił błąd.",
    not_found: "Nie ma takiego konta.",
  } as Record<string, string>,

  // about
  appVersion: "Wersja aplikacji",
  apiContract: "Kontrakt API",
  serverAddressTitle: "Serwer Silo",
  serverVersion: "Wersja serwera",
  apiVersion: "Wersja API",
  authModeTitle: "Logowanie",
  authModes: { imap: "Hasłem skrzynki pocztowej", local: "Kontem Silo" },
  attachmentLimit: "Limit załączników",
  license: "Licencja",
  licenseValue: "AGPL-3.0 · kod źródłowy",
  sessionsAndDevices: "Sesje i urządzenia",
  signOutEverywhere: "Wyloguj wszędzie",
  signOutEverywhereTitle: "Wylogować wszystkie urządzenia?",
  signOutEverywhereBody:
    "Wszystkie przeglądarki i urządzenia, łącznie z tym, stracą dostęp do poczty do czasu ponownego logowania.",

  // search (phase 4; the query is parsed by the server, plan 3.12)
  searchBack: "Wróć",
  clearSearch: "Wyczyść",
  searchSubmit: "Szukaj",
  recentSearches: "Ostatnie wyszukiwania",
  clearAllHistory: "Wyczyść wszystko",
  removeFromHistory: (q: string) => `Usuń z historii: ${q}`,
  suggestionKinds: {
    history: "Ostatnie wyszukiwanie",
    contact: "Kontakt",
    label: "Etykieta",
    operator: "Operator",
  } as Record<string, string>,
  searchFilters: "Filtry wyszukiwania",
  searchChips: {
    labels: "Etykiety",
    from: "Od",
    to: "Do",
    subject: "Temat",
    date: "Data",
    attachment: "Załącznik",
    unread: "Nieprzeczytane",
    starred: "Oznaczone gwiazdką",
  },
  chipFromTitle: "Od",
  chipToTitle: "Do",
  chipAddressHint: "Adres lub nazwa",
  chipSubjectTitle: "Temat",
  chipSubjectHint: "Słowa z tematu",
  chipApply: "Zastosuj",
  dateChipTitle: "Data",
  dateOptions: {
    older_than_1w: "Starsze niż tydzień",
    older_than_1m: "Starsze niż miesiąc",
    older_than_6m: "Starsze niż 6 miesięcy",
    older_than_1y: "Starsze niż rok",
    newer_than_7d: "Z ostatnich 7 dni",
    newer_than_30d: "Z ostatnich 30 dni",
  } as Record<string, string>,
  dateAfter: "Po dniu…",
  dateBefore: "Przed dniem…",
  resultCount: (n: number) =>
    n === 0 ? "Brak wyników" : `Około ${n3(n, "wynik", "wyniki", "wyników")}`,
  emptySearch: "Brak wyników wyszukiwania",
  approximate: "Wyniki przybliżone – wyszukiwanie trwało za długo",
  indexing: (pct: number) => `Indeksowanie w toku (${pct}%) – wyniki mogą być niepełne`,
  invalidQuery: "Nieprawidłowe zapytanie",

  // snooze (plan 3.10)
  today: "dziś",
  tomorrow: "jutro",
  snooze: "Odłóż",
  snoozeTitle: "Odłóż do…",
  snoozePresets: {
    later_today: "Dziś później",
    tomorrow: "Jutro",
    this_weekend: "W ten weekend",
    next_week: "W przyszłym tygodniu",
  } as Record<string, string>,
  pickDateTime: "Wybierz datę i godzinę",
  unsnooze: "Anuluj odłożenie",
  snoozedUntil: (when: string) => `Odłożono do ${when}`,
  snoozeNotInInbox: "Odłożyć można tylko wątki z Odebranych.",
  snoozeInvalid: "Wybierz termin od 30 sekund do roku od teraz.",
  notSnoozed: "Ten wątek nie jest już odłożony.",

  // scheduled send (plan 3.9)
  scheduleSend: "Zaplanuj wysyłkę",
  schedulePresets: {
    tomorrowMorning: "Jutro rano",
    tomorrowAfternoon: "Jutro po południu",
    mondayMorning: "Poniedziałek rano",
  },
  scheduledFor: (when: string) => `Zaplanowano na ${when}`,
  scheduledAt: (when: string) => `Zaplanowano: ${when}`,
  cancelSend: "Anuluj wysyłkę",
  sendCancelled: "Wysyłka anulowana – wiadomość wróciła do wersji roboczych",
};
