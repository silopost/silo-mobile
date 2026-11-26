import type { Locale as DateFnsLocale } from "date-fns";
import { enUS, pl as plDates } from "date-fns/locale";
import { useSyncExternalStore } from "react";
import { en, type Messages } from "./messages/en";
import { pl } from "./messages/pl";
import { plural as pluralOf, type Locale, type PluralForms } from "./plural";

export type { Messages } from "./messages/en";
export type { Locale } from "./plural";

/** UI languages of the app: the enum of settings.language (silo-server), English first. */
export const LOCALES: readonly Locale[] = ["en", "pl"];
export const DEFAULT_LOCALE: Locale = "en";

/** Names of the languages in their own language, for the language picker. */
export const LOCALE_NAMES: Record<Locale, string> = { en: "English", pl: "Polski" };

const DICTIONARIES: Record<Locale, Messages> = { en, pl };
const INTL: Record<Locale, string> = { en: "en-US", pl: "pl-PL" };
const DATE_FNS: Record<Locale, DateFnsLocale> = { en: enUS, pl: plDates };

export const isLocale = (v: unknown): v is Locale => LOCALES.includes(v as Locale);

/**
 * The language of the device: Polish when it is set to Polish, English otherwise (also for any
 * other language). Hermes reports the Android locale, including a per-app language.
 */
export function deviceLocale(): Locale {
  try {
    const tag = Intl.DateTimeFormat().resolvedOptions().locale;
    return /^pl(-|_|$)/i.test(tag) ? "pl" : "en";
  } catch {
    return DEFAULT_LOCALE;
  }
}

let current: Locale = deviceLocale();
const listeners = new Set<() => void>();

export function getLocale(): Locale {
  return current;
}

/**
 * Switches the UI language at once, without a restart: the root layout remounts the navigators
 * under a key (useLocale), module code reads `t` on its next call. Where the choice comes from
 * (device, the server's settings.language, the stored last language) is src/state/language.ts.
 */
export function setLocale(locale: Locale): void {
  if (locale === current) return;
  current = locale;
  for (const l of listeners) l();
}

export function subscribeLocale(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** The current language; re-renders the component when it changes. */
export function useLocale(): Locale {
  return useSyncExternalStore(subscribeLocale, getLocale, getLocale);
}

/** BCP 47 tag for Intl (dates, numbers) of the current language. */
export function intlLocale(): string {
  return INTL[current];
}

/** date-fns locale (month and day names) of the current language. */
export function dateFnsLocale(): DateFnsLocale {
  return DATE_FNS[current];
}

/** The form of a word for n in the current language (see lib/plural.ts). */
export function plural(n: number, forms: PluralForms): string {
  return pluralOf(current, n, forms);
}

/** Date and time, e.g. "Nov 5, 2026, 6:44 PM" / "5 lis 2026, 18:44"; the raw value when it does not parse. */
export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat(intlLocale(), { dateStyle: "medium", timeStyle: "short" }).format(
    date,
  );
}

/**
 * UI strings of the current language. Every property read goes to the current dictionary, so
 * `t.inboxTitle` in a component or a module function is always in the language set last; keep
 * reads inside functions (never in module-level constants).
 */
export const t: Messages = new Proxy({} as Messages, {
  get: (_, key) => Reflect.get(DICTIONARIES[current], key),
  has: (_, key) => Reflect.has(DICTIONARIES[current], key),
  ownKeys: () => Reflect.ownKeys(DICTIONARIES[current]),
  getOwnPropertyDescriptor: (_, key) => {
    const d = Reflect.getOwnPropertyDescriptor(DICTIONARIES[current], key);
    return d && { ...d, configurable: true };
  },
});
