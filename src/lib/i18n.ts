import type { components } from "../api/schema";

type AccountState = components["schemas"]["Account"]["state"];

const dateTime = new Intl.DateTimeFormat("pl-PL", { dateStyle: "medium", timeStyle: "short" });

/** Date and time in Polish, e.g. "5 lis 2026, 18:44"; the raw value when it does not parse. */
export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso : dateTime.format(date);
}

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

  // home (temporary, replaced by the mail views)
  signedInAs: (email: string) => `Zalogowano jako ${email}`,
  accounts: "Konta",
  accountStates: {
    connecting: "Łączenie",
    discovering: "Wykrywanie folderów",
    initial_sync: "Pierwsza synchronizacja",
    live: "Zsynchronizowano",
    backoff: "Serwer niedostępny, ponowienie wkrótce",
    auth_failed: "Błąd logowania do skrzynki",
    disabled: "Wyłączone",
  } satisfies Record<AccountState, string>,
  manageSessions: "Zalogowane urządzenia",

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
};
