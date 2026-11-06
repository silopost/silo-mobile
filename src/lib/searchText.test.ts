import {
  dateToQuery,
  hasPart,
  hasPrefix,
  quoteValue,
  splitQuery,
  togglePart,
  withPart,
  withoutPrefix,
} from "./searchText";

describe("searchText", () => {
  it("splits outside quotes and brackets without interpreting", () => {
    expect(splitQuery('from:jan "umowa najmu"  (a OR b) -{x y}')).toEqual([
      "from:jan",
      '"umowa najmu"',
      "(a OR b)",
      "-{x y}",
    ]);
  });

  it("adds, toggles and removes text parts", () => {
    expect(withPart("faktura", "has:attachment")).toBe("faktura has:attachment");
    expect(withPart("has:attachment", "has:attachment")).toBe("has:attachment");
    expect(togglePart("faktura has:attachment", "has:attachment")).toBe("faktura");
    expect(togglePart("", "is:unread")).toBe("is:unread");
    expect(hasPart("a is:starred", "is:starred")).toBe(true);
    expect(hasPrefix("from:jan x", ["to:", "from:"])).toBe(true);
    expect(
      withoutPrefix('after:2026/01/01 x older_than:1y "after: y"', ["after:", "older_than:"]),
    ).toBe('x "after: y"');
  });

  it("quotes values with spaces and writes days as the query syntax does", () => {
    expect(quoteValue("Moje projekty")).toBe('"Moje projekty"');
    expect(quoteValue(' jan@x.pl"')).toBe("jan@x.pl");
    expect(dateToQuery(new Date(2026, 0, 5))).toBe("2026/01/05");
  });
});
