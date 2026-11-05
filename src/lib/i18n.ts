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
  sessionsTitle: "Zalogowane urządzenia",
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
  noAccounts: "Brak kont pocztowych. Dodaj konto w wersji przeglądarkowej Silo.",
  unknownLabel: "Nie ma takiej etykiety",
  thread: "Wątek",
  threadSoon: "Widok wątku pojawi się w kolejnej wersji.",
  searchSoon: "Wyszukiwanie pojawi się w kolejnej wersji.",
  composeSoon: "Edytor wiadomości pojawi się w kolejnej wersji.",
  draftSoon: (id: string) => `Wersja robocza ${id} otworzy się tu w kolejnej wersji.`,
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
  },
  undoExpired: "Tej operacji nie można już cofnąć.",
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
};
