import {
  formatFullDate,
  formatListDate,
  formatNumber,
  formatSize,
  formatWhen,
  listDateLabel,
} from "./format";
import { deviceLocale, getLocale, plural, setLocale, t } from "./i18n";
import { en } from "./messages/en";
import { pl } from "./messages/pl";
import { pluralCategory } from "./plural";
import { startLanguage } from "../state/language";
import { useAuth } from "../state/auth";
import { defaultUi, useUi } from "../state/ui";

/** Every key path of a dictionary (nested objects), for comparing the two languages. */
function keyPaths(o: object, prefix = ""): string[] {
  return Object.entries(o).flatMap(([k, v]) =>
    v && typeof v === "object" ? keyPaths(v as object, `${prefix}${k}.`) : [`${prefix}${k}`],
  );
}

describe("dictionaries", () => {
  it("have the same keys in English and Polish", () => {
    expect(keyPaths(pl).sort()).toEqual(keyPaths(en).sort());
  });

  it("t reads the dictionary of the current language", () => {
    setLocale("en");
    expect(t.compose).toBe("Compose");
    expect(t.done.archive(3)).toBe("3 conversations archived");
    setLocale("pl");
    expect(t.compose).toBe("Utwórz");
    expect(t.done.archive(3)).toBe("3 wątki zarchiwizowane");
  });
});

describe("plural", () => {
  it("follows the English rule: one for 1, other otherwise", () => {
    expect([0, 1, 2, 5, 21].map((n) => pluralCategory("en", n))).toEqual([
      "other",
      "one",
      "other",
      "other",
      "other",
    ]);
  });

  it("follows the Polish rule: one, few for 2–4 except 12–14, many", () => {
    const pick = (n: number) => pluralCategory("pl", n);
    expect([1, 2, 4, 5, 12, 14, 21, 22, 24, 25, 102, 112, 0].map(pick)).toEqual([
      "one",
      "few",
      "few",
      "many",
      "many",
      "many",
      "many",
      "few",
      "few",
      "many",
      "few",
      "many",
      "many",
    ]);
    expect(pluralCategory("pl", 1.5)).toBe("other");
  });

  it("gives the forms of the current language", () => {
    setLocale("pl");
    expect(t.messageCount(1)).toBe("1 wiadomość");
    expect(t.totalCount(3)).toBe("3 wątki");
    expect(t.totalCount(5)).toBe("5 wątków");
    expect(t.totalCount(22)).toBe("22 wątki");
    expect(plural(12, { one: "a", few: "b", many: "c", other: "d" })).toBe("c");
    setLocale("en");
    expect(t.messageCount(1)).toBe("1 message");
    expect(t.totalCount(3)).toBe("3 conversations");
    expect(t.unreadCount(2)).toBe("2 unread");
  });
});

describe("dates and numbers", () => {
  const now = new Date(2026, 10, 25, 20, 0);
  const today = new Date(2026, 10, 25, 19, 31).toISOString();
  const thisYear = new Date(2026, 10, 7, 8, 5).toISOString();
  const older = new Date(2025, 10, 4, 9, 12).toISOString();

  it("are Gmail's in English", () => {
    setLocale("en");
    expect(formatListDate(today, now)).toBe("7:31 PM");
    expect(formatListDate(thisYear, now)).toBe("Nov 7");
    expect(formatListDate(older, now)).toBe("11/4/2025");
    expect(listDateLabel(today, now)).toBe("at 7:31 PM");
    expect(listDateLabel(thisYear, now)).toBe("on Nov 7");
    expect(formatFullDate(older)).toBe("Nov 4, 2025, 9:12 AM");
    expect(formatSize(2.4 * 1024 * 1024)).toBe("2.4 MB");
    expect(formatNumber(12345)).toBe("12,345");
    expect(formatNumber(2000)).toBe("2,000");
    expect(formatWhen(new Date(2026, 10, 25, 22, 0).toISOString(), { now })).toMatch(
      /^today, 10:00\sPM$/u,
    );
    expect(formatWhen(new Date(2026, 10, 30, 8, 0).toISOString(), { now })).toMatch(
      /^Mon, Nov 30, 8:00\sAM$/u,
    );
  });

  it("are Gmail's in Polish", () => {
    setLocale("pl");
    expect(formatListDate(today, now)).toBe("19:31");
    expect(formatListDate(thisYear, now)).toBe("7 lis");
    expect(formatListDate(older, now)).toBe("4.11.2025");
    expect(listDateLabel(today, now)).toBe("o 19:31");
    expect(listDateLabel(thisYear, now)).toBe("7 lis");
    expect(formatFullDate(older)).toBe("4 lis 2025, 09:12");
    expect(formatSize(2.4 * 1024 * 1024)).toBe("2,4 MB");
    // One rule with the counts of the texts: four digits ungrouped, five grouped.
    expect(formatNumber(2000)).toBe("2000");
    expect(formatNumber(12345)).toBe(t.totalCount(12345).split(" wątków")[0]);
    expect(formatNumber(12345)).toMatch(/^12\s345$/u);
    expect(formatWhen(new Date(2026, 10, 25, 22, 0).toISOString(), { now })).toBe("dziś, 22:00");
    expect(formatWhen(new Date(2026, 10, 26, 8, 0).toISOString(), { now })).toBe("jutro, 08:00");
  });
});

describe("counts in texts", () => {
  it("group thousands as each language writes them", () => {
    setLocale("en");
    expect(t.resultCount(2000)).toBe("About 2,000 results");
    expect(t.selectedCount(1234)).toBe("Selected: 1,234");
    expect(t.totalCount(5000)).toBe("5,000 conversations");
    setLocale("pl");
    // Polish leaves four digits ungrouped and groups from five on (with a no-break space).
    expect(t.resultCount(2000)).toBe("Około 2000 wyników");
    expect(t.resultCount(12345)).toMatch(/^Około 12\s345 wyników$/u);
    expect(t.totalCount(22)).toBe("22 wątki");
  });
});

describe("deviceLocale", () => {
  const device = (locale: string) =>
    jest.spyOn(Intl, "DateTimeFormat").mockImplementation(
      () =>
        ({
          resolvedOptions: () => ({ locale }),
        }) as unknown as Intl.DateTimeFormat,
    );

  afterEach(() => jest.restoreAllMocks());

  it("is Polish on a Polish device and English on any other", () => {
    device("pl-PL");
    expect(deviceLocale()).toBe("pl");
    device("pl");
    expect(deviceLocale()).toBe("pl");
    device("en-US");
    expect(deviceLocale()).toBe("en");
    device("de-DE");
    expect(deviceLocale()).toBe("en");
  });
});

describe("startLanguage", () => {
  let stop: () => void;
  afterEach(() => {
    stop();
    useUi.setState({ ...defaultUi });
  });

  it("starts in the language used last while signed in", () => {
    useAuth.setState({ status: "signedIn" });
    useUi.setState({ language: "en" });
    stop = startLanguage();
    expect(getLocale()).toBe("en");
  });

  it("goes back to the device language at sign-out and forgets the stored one", () => {
    useAuth.setState({ status: "signedIn" });
    useUi.setState({ language: "pl" });
    stop = startLanguage();
    expect(getLocale()).toBe("pl");
    useAuth.setState({ status: "signedOut" });
    expect(getLocale()).toBe(deviceLocale());
    expect(useUi.getState().language).toBeNull();
  });

  it("ignores the stored language when nobody is signed in", () => {
    useAuth.setState({ status: "signedOut" });
    useUi.setState({ language: "en" });
    setLocale("pl");
    stop = startLanguage();
    expect(getLocale()).toBe("pl");
  });
});
