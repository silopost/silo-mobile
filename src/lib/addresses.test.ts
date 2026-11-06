import { parseAddresses } from "./addresses";

describe("parseAddresses", () => {
  it("splits at commas, semicolons and line breaks", () => {
    expect(parseAddresses("a@x.pl, b@y.pl;c@z.pl\nd@w.pl")).toEqual([
      { name: "", email: "a@x.pl" },
      { name: "", email: "b@y.pl" },
      { name: "", email: "c@z.pl" },
      { name: "", email: "d@w.pl" },
    ]);
  });

  it("reads display names, quoted names with commas and mailto:", () => {
    expect(
      parseAddresses('Jan Kowalski <jan@firma.pl>, "Nowak, Ola" <ola@firma.pl>, mailto:x@y.pl'),
    ).toEqual([
      { name: "Jan Kowalski", email: "jan@firma.pl" },
      { name: "Nowak, Ola", email: "ola@firma.pl" },
      { name: "", email: "x@y.pl" },
    ]);
  });

  it("splits bare addresses separated by spaces, keeps other text whole", () => {
    expect(parseAddresses("a@x.pl b@y.pl")).toHaveLength(2);
    expect(parseAddresses("  ")).toEqual([]);
    expect(parseAddresses("nie adres")).toEqual([{ name: "", email: "nie adres" }]);
  });
});
