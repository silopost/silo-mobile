/** The UI languages of the app: the enum of the server's `settings.language`. */
export type Locale = "en" | "pl";

/** CLDR plural categories the two languages use for whole numbers. */
export type PluralCategory = "one" | "few" | "many" | "other";

/** The forms of a word by plural category; `other` is the fallback of every language. */
export type PluralForms = Partial<Record<Exclude<PluralCategory, "other">, string>> & {
  other: string;
};

/**
 * The CLDR plural category of a whole number. Hermes on Android has no `Intl.PluralRules`, so the
 * two rules are written out: English has one (1) and other; Polish has one (1), few (2–4, 22–24…
 * but not 12–14) and many (0, 5–21, 25…). Fractions are "other" in both.
 */
export function pluralCategory(locale: Locale, n: number): PluralCategory {
  if (!Number.isInteger(n)) return "other";
  if (locale === "en") return n === 1 ? "one" : "other";
  if (n === 1) return "one";
  const d = n % 10;
  const dd = n % 100;
  return d >= 2 && d <= 4 && (dd < 12 || dd > 14) ? "few" : "many";
}

/** The form of a word for n in a language. */
export function plural(locale: Locale, n: number, forms: PluralForms): string {
  return forms[pluralCategory(locale, n)] ?? forms.other;
}
